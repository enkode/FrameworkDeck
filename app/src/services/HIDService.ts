/// <reference types="w3c-web-hid" />

import { log } from './Logger';

// VIA Protocol Constants (from quantum/via.h)
const VIA_GET_PROTOCOL_VERSION       = 0x01;
const VIA_DYNAMIC_KEYMAP_GET_KEYCODE = 0x04;
const VIA_DYNAMIC_KEYMAP_SET_KEYCODE = 0x05;
const VIA_CUSTOM_SET_VALUE           = 0x07; // V3: id_custom_set_value
const VIA_CUSTOM_GET_VALUE           = 0x08; // V3: id_custom_get_value
const VIA_CUSTOM_SAVE                = 0x09;

// VIA V3 Channel IDs (only used when protocolVersion >= 11)
const CHANNEL_RGB_MATRIX   = 3;

// RGB Matrix Value IDs
const RGB_MATRIX_BRIGHTNESS   = 1;
const RGB_MATRIX_EFFECT       = 2;
const RGB_MATRIX_EFFECT_SPEED = 3;
const RGB_MATRIX_COLOR        = 4;  // [hue, saturation]

// nucleardog rgb_remote protocol (custom firmware for per-key RGB)
// https://gitlab.com/nucleardog/qmk_firmware_fw16
const RGB_REMOTE_CMD             = 0xFE;
const RGB_REMOTE_QUERY           = 0x00;
const RGB_REMOTE_ENABLE          = 0x01;
const RGB_REMOTE_DISABLE         = 0x02;
const RGB_REMOTE_SET_LEDS        = 0x10;

// Standard VIA Vendor IDs (Framework + Generic QMK)
const SUPPORTED_VIDS = [0x32AC, 0x4657];

// QMK Raw HID interface identifiers
// The keyboard exposes multiple HID interfaces (boot keyboard, raw HID, consumer).
// VIA commands only work on the raw HID interface (usage page 0xFF60, usage 0x61).
const RAW_HID_USAGE_PAGE = 0xFF60;
const RAW_HID_USAGE = 0x61;

export interface HealthCheckResult {
    ok: boolean;
    deviceOpen: boolean;
    protocolResponds: boolean;
    protocolVersion: number;
    rgbReadable: boolean;
    rgbBrightness: number | null;
    rgbEffect: number | null;
    rgbWriteVerify: boolean;
    perKeySupport: boolean;
    log: string[];
}

export class HIDService {
    private device: HIDDevice | null = null;
    private isConnected: boolean = false;
    private connectionListeners: Set<(connected: boolean) => void> = new Set();
    private disconnectHandler: ((e: HIDConnectionEvent) => void) | null = null;
    private protocolVersion: number = 0; // 0 = unknown, >= 11 = V3
    private _hasPerKeySupport: boolean = false; // nucleardog rgb_remote firmware
    private _perKeyEnabled: boolean = false;
    // Command queue to serialize HID commands (prevents response mix-ups)
    private commandQueue: Promise<DataView | null> = Promise.resolve(null);
    private _reconnecting: boolean = false;

    constructor() {
        // Auto-reconnect when a supported device appears (e.g. after sleep/wake)
        navigator.hid.addEventListener('connect', async (e: HIDConnectionEvent) => {
            const d = e.device;
            if (this.isConnected || this._reconnecting) return;
            if (!SUPPORTED_VIDS.includes(d.vendorId)) return;
            if (!d.collections?.some(c => c.usagePage === RAW_HID_USAGE_PAGE && c.usage === RAW_HID_USAGE)) return;
            log.device(`Device reconnected after sleep/wake: ${d.productName} (PID: 0x${d.productId.toString(16)})`);
            this._reconnecting = true;
            try {
                await this.openDevice(d);
            } catch (err) {
                log.errorDevice(`Reconnect failed: ${err}`);
            } finally {
                this._reconnecting = false;
            }
        });
    }

    /** Whether the device uses VIA V3 (channel-based) protocol */
    get isV3(): boolean {
        return this.protocolVersion >= 11;
    }

    /** Show the browser device picker and connect to the selected device */
    async requestDevice(): Promise<boolean> {
        try {
            const devices = await navigator.hid.requestDevice({
                filters: SUPPORTED_VIDS.map(vid => ({
                    vendorId: vid,
                    usagePage: RAW_HID_USAGE_PAGE,
                    usage: RAW_HID_USAGE,
                }))
            });

            if (devices.length > 0) {
                return await this.openDevice(devices[0]);
            }
        } catch (err) {
            log.errorHid(`Failed to connect: ${err}`);
        }
        return false;
    }

    /** Connect to a specific previously-permitted device by product ID */
    async connectToDevice(productId: number): Promise<boolean> {
        const granted = await this.getPermittedDevices();
        const device = granted.find(d => d.productId === productId);
        if (device) {
            return await this.openDevice(device);
        }
        return false;
    }

    /** Auto-reconnect to a previously-permitted device (for page load) */
    async autoConnect(): Promise<boolean> {
        const granted = await this.getPermittedDevices();
        if (granted.length > 0) {
            return await this.openDevice(granted[0]);
        }
        return false;
    }

    /** Get all previously-permitted devices matching our filters */
    async getPermittedDevices(): Promise<HIDDevice[]> {
        const granted = await navigator.hid.getDevices();
        return granted.filter(d =>
            SUPPORTED_VIDS.includes(d.vendorId) &&
            d.collections?.some(c => c.usagePage === RAW_HID_USAGE_PAGE && c.usage === RAW_HID_USAGE)
        );
    }

    async openDevice(device: HIDDevice): Promise<boolean> {
        try {
            // Clean up previous device if any
            if (this.device) {
                this.cleanupDevice();
            }

            if (!device.opened) {
                await device.open();
            }
            this.device = device;
            this.isConnected = true;

            // Listen for disconnection (single handler, cleaned up properly)
            this.disconnectHandler = (e: HIDConnectionEvent) => {
                if (e.device === this.device) {
                    this.disconnect();
                }
            };
            navigator.hid.addEventListener('disconnect', this.disconnectHandler);

            // Detect protocol version
            this.protocolVersion = await this.getProtocolVersion();

            // Detect per-key RGB firmware support (nucleardog rgb_remote)
            this._hasPerKeySupport = await this.detectPerKeySupport();

            log.device(`Connected: ${this.device.productName} (PID: 0x${device.productId.toString(16)}, VIA: ${this.protocolVersion}${this.isV3 ? ' [V3]' : ' [V2]'}, Per-Key: ${this._hasPerKeySupport ? 'YES' : 'NO'})`);

            this.notifyListeners();
            return true;
        } catch (err) {
            log.errorDevice(`Failed to open device: ${err}`);
            return false;
        }
    }

    /** Queue-wrapped sendCommand — ensures commands are serialized (no overlapping responses) */
    async sendCommand(commandId: number, data: number[] = []): Promise<DataView | null> {
        const result = this.commandQueue.then(
            () => this._sendCommandRaw(commandId, data),
            () => this._sendCommandRaw(commandId, data) // continue even if prev failed
        );
        this.commandQueue = result;
        return result;
    }

    private async _sendCommandRaw(commandId: number, data: number[]): Promise<DataView | null> {
        if (!this.device || !this.device.opened) return null;

        const reportId = 0x00;
        const packet = new Uint8Array(32);
        packet[0] = commandId;
        for (let i = 0; i < data.length; i++) {
            packet[i + 1] = data[i];
        }

        const hexData = Array.from(packet.slice(0, Math.max(data.length + 1, 4))).map(b => b.toString(16).padStart(2, '0')).join(' ');
        log.hid(`TX: [${hexData}]`);

        // Track listener and timeout for cleanup on error
        let listenerRef: ((event: HIDInputReportEvent) => void) | null = null;
        let timeoutRef: ReturnType<typeof setTimeout> | null = null;

        try {
            // Set up listener BEFORE sending to avoid race condition
            const responsePromise = new Promise<DataView | null>((resolve) => {
                if (!this.device) return resolve(null);

                timeoutRef = setTimeout(() => {
                    if (listenerRef) this.device?.removeEventListener('inputreport', listenerRef);
                    listenerRef = null;
                    log.warnHid(`RX: timeout for cmd 0x${commandId.toString(16).padStart(2, '0')}`);
                    resolve(null);
                }, 1000);

                listenerRef = (event: HIDInputReportEvent) => {
                    if (event.reportId === 0x00 || event.reportId === 0) {
                        if (timeoutRef) clearTimeout(timeoutRef);
                        if (listenerRef) this.device?.removeEventListener('inputreport', listenerRef);
                        listenerRef = null;
                        const rxBytes = [];
                        for (let i = 0; i < Math.min(event.data.byteLength, 8); i++) {
                            rxBytes.push(event.data.getUint8(i).toString(16).padStart(2, '0'));
                        }
                        log.hid(`RX: [${rxBytes.join(' ')}...]`);
                        // Check for id_unhandled (0xFF) response
                        if (event.data.byteLength > 0 && event.data.getUint8(0) === 0xFF) {
                            log.warnHid(`Command 0x${commandId.toString(16).padStart(2, '0')} REJECTED by firmware (0xFF)`);
                        }
                        resolve(event.data);
                    }
                };
                this.device.addEventListener('inputreport', listenerRef);
            });

            await this.device.sendReport(reportId, packet);
            return await responsePromise;

        } catch (err) {
            // Clean up listener immediately on send error (don't wait for timeout)
            if (listenerRef && this.device) {
                this.device.removeEventListener('inputreport', listenerRef);
            }
            if (timeoutRef) clearTimeout(timeoutRef);
            log.errorHid(`Send error: ${err}`);
            return null;
        }
    }

    // --- Keycode Commands (VIA: 0x04/0x05 - same in V2 and V3) ---

    async getKeycode(layer: number, row: number, col: number): Promise<number | null> {
        const data = await this.sendCommand(VIA_DYNAMIC_KEYMAP_GET_KEYCODE, [layer, row, col]);
        if (data && data.byteLength >= 6) {
            return (data.getUint8(4) << 8) | data.getUint8(5);
        }
        return null;
    }

    async setKeycode(layer: number, row: number, col: number, keycode: number) {
        const hi = (keycode >> 8) & 0xFF;
        const lo = keycode & 0xFF;
        await this.sendCommand(VIA_DYNAMIC_KEYMAP_SET_KEYCODE, [layer, row, col, hi, lo]);
    }

    // --- RGB Matrix Commands (auto-adapts V2 vs V3) ---

    private lightingSetData(valueId: number, ...values: number[]): number[] {
        if (this.isV3) {
            // V3: [channel, value_id, ...values]
            return [CHANNEL_RGB_MATRIX, valueId, ...values];
        }
        // V2: [value_id, ...values] (no channel byte)
        return [valueId, ...values];
    }

    private lightingGetData(valueId: number): number[] {
        if (this.isV3) {
            return [CHANNEL_RGB_MATRIX, valueId];
        }
        return [valueId];
    }

    /** Parse a get-value response. Returns the value byte(s) offset. */
    private lightingResponseOffset(): number {
        // V3 response: [cmd, channel, value_id, data...]  -> offset 3
        // V2 response: [cmd, value_id, data...]            -> offset 2
        return this.isV3 ? 3 : 2;
    }

    async setRGBBrightness(brightness: number) {
        await this.sendCommand(VIA_CUSTOM_SET_VALUE, this.lightingSetData(RGB_MATRIX_BRIGHTNESS, brightness & 0xFF));
    }

    async getRGBBrightness(): Promise<number | null> {
        const data = await this.sendCommand(VIA_CUSTOM_GET_VALUE, this.lightingGetData(RGB_MATRIX_BRIGHTNESS));
        const off = this.lightingResponseOffset();
        if (data && data.byteLength > off) {
            return data.getUint8(off);
        }
        return null;
    }

    async setRGBEffect(effectId: number) {
        await this.sendCommand(VIA_CUSTOM_SET_VALUE, this.lightingSetData(RGB_MATRIX_EFFECT, effectId & 0xFF));
    }

    async getRGBEffect(): Promise<number | null> {
        const data = await this.sendCommand(VIA_CUSTOM_GET_VALUE, this.lightingGetData(RGB_MATRIX_EFFECT));
        const off = this.lightingResponseOffset();
        if (data && data.byteLength > off) {
            return data.getUint8(off);
        }
        return null;
    }

    async setRGBEffectSpeed(speed: number) {
        await this.sendCommand(VIA_CUSTOM_SET_VALUE, this.lightingSetData(RGB_MATRIX_EFFECT_SPEED, speed & 0xFF));
    }

    async getRGBEffectSpeed(): Promise<number | null> {
        const data = await this.sendCommand(VIA_CUSTOM_GET_VALUE, this.lightingGetData(RGB_MATRIX_EFFECT_SPEED));
        const off = this.lightingResponseOffset();
        if (data && data.byteLength > off) {
            return data.getUint8(off);
        }
        return null;
    }

    async setRGBColor(hue: number, saturation: number) {
        await this.sendCommand(VIA_CUSTOM_SET_VALUE, this.lightingSetData(RGB_MATRIX_COLOR, hue & 0xFF, saturation & 0xFF));
    }

    async getRGBColor(): Promise<[number, number] | null> {
        const data = await this.sendCommand(VIA_CUSTOM_GET_VALUE, this.lightingGetData(RGB_MATRIX_COLOR));
        const off = this.lightingResponseOffset();
        if (data && data.byteLength > off + 1) {
            return [data.getUint8(off), data.getUint8(off + 1)];
        }
        return null;
    }

    /**
     * Save all RGB settings to device EEPROM.
     * Accepts an optional log callback for UI diagnostics.
     */
    async saveRGBSettings(currentState?: {
        brightness: number;
        effectId: number;
        speed: number;
        hue: number;
        saturation: number;
    }, logFn?: (msg: string) => void): Promise<boolean> {
        const _log = logFn ?? ((msg: string) => log.rgb(msg));

        // Step 1: Re-send all current values to ensure RAM is in sync
        if (currentState) {
            _log('Sending values to RAM...');
            await this.setRGBBrightness(currentState.brightness);
            await this.setRGBEffect(currentState.effectId);
            await this.setRGBEffectSpeed(currentState.speed);
            await this.setRGBColor(currentState.hue, currentState.saturation);
            _log('  RAM values sent');
        }

        // Step 2: Issue the EEPROM save command
        _log('Sending EEPROM save command...');
        let saveResponse: DataView | null;
        if (this.isV3) {
            saveResponse = await this.sendCommand(VIA_CUSTOM_SAVE, [CHANNEL_RGB_MATRIX]);
        } else {
            saveResponse = await this.sendCommand(VIA_CUSTOM_SAVE);
        }

        // Check if save was rejected (0xFF) or timed out (null)
        if (!saveResponse) {
            _log('ERROR: Save command timed out — no response');
            return false;
        }
        const responseByte0 = saveResponse.getUint8(0);
        _log(`  Save response byte[0]: 0x${responseByte0.toString(16).padStart(2, '0')}`);
        if (responseByte0 === 0xFF) {
            _log('ERROR: Save command rejected by firmware (0xFF)');
            return false;
        }

        // Step 3: Optional verify — log mismatches but don't fail
        if (currentState) {
            const readBrightness = await this.getRGBBrightness();
            const readEffect = await this.getRGBEffect();
            if (readBrightness !== null && readBrightness !== currentState.brightness) {
                _log(`  Verify note: brightness readback ${readBrightness} (sent ${currentState.brightness})`);
            }
            if (readEffect !== null && readEffect !== currentState.effectId) {
                _log(`  Verify note: effect readback ${readEffect} (sent ${currentState.effectId})`);
            }
        }

        _log('Save complete');
        return true;
    }

    // --- Per-Key RGB (nucleardog rgb_remote protocol) ---
    // Requires custom firmware: https://gitlab.com/nucleardog/qmk_firmware_fw16

    /** Probe whether firmware supports the rgb_remote per-key protocol */
    private async detectPerKeySupport(): Promise<boolean> {
        try {
            const data = await this.sendCommand(RGB_REMOTE_CMD, [RGB_REMOTE_QUERY]);
            // If firmware echoes 0xFE back (not 0xFF), it supports the protocol
            if (data && data.byteLength > 0 && data.getUint8(0) === RGB_REMOTE_CMD) {
                log.device('Per-key RGB firmware detected (rgb_remote)');
                return true;
            }
        } catch {
            // Silently fail — stock firmware
        }
        return false;
    }

    get hasPerKeySupport(): boolean {
        return this._hasPerKeySupport;
    }

    /** Enable per-key RGB mode (takes over LEDs from animations) */
    async enablePerKeyMode(): Promise<boolean> {
        if (!this._hasPerKeySupport) return false;
        const data = await this.sendCommand(RGB_REMOTE_CMD, [RGB_REMOTE_ENABLE]);
        this._perKeyEnabled = data !== null && data.getUint8(0) === RGB_REMOTE_CMD;
        return this._perKeyEnabled;
    }

    /** Disable per-key RGB mode (restores normal animations) */
    async disablePerKeyMode(): Promise<boolean> {
        if (!this._hasPerKeySupport) return false;
        await this.sendCommand(RGB_REMOTE_CMD, [RGB_REMOTE_DISABLE]);
        this._perKeyEnabled = false;
        return true;
    }

    /** Set color for specific LEDs using rgb_remote protocol (RGB 0-255) */
    async setPerKeyColor(r: number, g: number, b: number, ledIndices: number[]): Promise<boolean> {
        if (!this._hasPerKeySupport || !this._perKeyEnabled) return false;
        // Protocol: [0xFE, 0x10, R, G, B, flags=0, count, idx1, idx2, ...]
        // Keep batches small for reliable firmware processing
        const maxPerPacket = 10;
        for (let i = 0; i < ledIndices.length; i += maxPerPacket) {
            const batch = ledIndices.slice(i, i + maxPerPacket);
            await this.sendCommand(RGB_REMOTE_CMD, [
                RGB_REMOTE_SET_LEDS,
                r & 0xFF, g & 0xFF, b & 0xFF,
                0x00, // flags
                batch.length,
                ...batch
            ]);
            // Delay between packets to let firmware process each batch
            if (i + maxPerPacket < ledIndices.length) {
                await new Promise(r => setTimeout(r, 5));
            }
        }
        return true;
    }

    /** Set all LEDs to one color */
    async setAllKeysColor(r: number, g: number, b: number, totalLeds: number): Promise<boolean> {
        const indices = Array.from({ length: totalLeds }, (_, i) => i);
        return this.setPerKeyColor(r, g, b, indices);
    }

    // --- Firmware Protocol Probe (diagnostic) ---

    /**
     * Systematically probe the firmware for undocumented commands that might
     * support reading per-key LED colors. Logs raw hex responses for analysis.
     */
    async probeFirmwareProtocol(): Promise<string[]> {
        const results: string[] = [];

        const hexDump = (data: DataView | null, bytes: number = 16): string => {
            if (!data) return 'null (timeout)';
            const parts = [];
            for (let i = 0; i < Math.min(data.byteLength, bytes); i++) {
                parts.push(data.getUint8(i).toString(16).padStart(2, '0'));
            }
            return parts.join(' ');
        };

        // Step 1: Confirm rgb_remote support (read-only query)
        results.push('=== STEP 1: Confirm rgb_remote support ===');
        const query = await this.sendCommand(RGB_REMOTE_CMD, [RGB_REMOTE_QUERY]);
        results.push(`QUERY [fe 00] → ${hexDump(query)}`);
        if (!query || query.getUint8(0) !== RGB_REMOTE_CMD) {
            results.push('ABORT: Firmware does not support rgb_remote');
            return results;
        }

        // Step 2: Probe undocumented rgb_remote sub-commands (read-only — no SET_LEDS)
        results.push('=== STEP 2: Probe undocumented rgb_remote commands ===');
        for (const cmd of [0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x11, 0x12, 0x13, 0x14, 0x15, 0x20]) {
            const data = await this.sendCommand(RGB_REMOTE_CMD, [cmd]);
            const hex = hexDump(data);
            const rejected = data && data.byteLength > 0 && data.getUint8(0) === 0xFF;
            results.push(`[fe ${cmd.toString(16).padStart(2, '0')}] → ${hex}${rejected ? ' (REJECTED)' : ''}`);
        }

        // Step 3: Try specific GET_LEDS patterns with LED index payload
        results.push('=== STEP 3: Try GET_LEDS patterns ===');
        const getA = await this.sendCommand(RGB_REMOTE_CMD, [0x11, 0]);
        results.push(`Pattern A [fe 11 00] → ${hexDump(getA)}`);
        const getB = await this.sendCommand(RGB_REMOTE_CMD, [0x11, 1, 0]);
        results.push(`Pattern B [fe 11 01 00] → ${hexDump(getB)}`);
        const getC = await this.sendCommand(RGB_REMOTE_CMD, [0x20, 0]);
        results.push(`Pattern C [fe 20 00] → ${hexDump(getC)}`);

        // Step 4: VIA Custom Channel GET (channel 0 = custom/per-key)
        results.push('=== STEP 4: VIA Custom Channel GET (channel 0) ===');
        for (const valueId of [0, 1, 2, 3, 4, 5, 6, 7, 8, 0x10, 0x11]) {
            const data = await this.sendCommand(VIA_CUSTOM_GET_VALUE, [0x00, valueId]);
            const hex = hexDump(data);
            const rejected = data && data.byteLength > 0 && data.getUint8(0) === 0xFF;
            results.push(`GET_VALUE ch=0 val=0x${valueId.toString(16).padStart(2, '0')} [08 00 ${valueId.toString(16).padStart(2, '0')}] → ${hex}${rejected ? ' (REJECTED)' : ''}`);
        }

        // Step 5: VIA RGB Matrix Channel GET (channel 3) for baseline comparison
        results.push('=== STEP 5: VIA RGB Matrix GET (channel 3, baseline) ===');
        for (const valueId of [1, 2, 3, 4]) {
            const data = await this.sendCommand(VIA_CUSTOM_GET_VALUE, [CHANNEL_RGB_MATRIX, valueId]);
            results.push(`GET_VALUE ch=3 val=${valueId} [08 03 0${valueId}] → ${hexDump(data)}`);
        }

        return results;
    }

    // --- Protocol Version ---

    async getProtocolVersion(): Promise<number> {
        const data = await this.sendCommand(VIA_GET_PROTOCOL_VERSION);
        if (data && data.byteLength >= 3) {
            return (data.getUint8(1) << 8) | data.getUint8(2);
        }
        return 0;
    }

    getDetectedProtocolVersion(): number {
        return this.protocolVersion;
    }

    // --- Health Check ---

    async healthCheck(): Promise<HealthCheckResult> {
        const healthLog: string[] = [];
        const result: HealthCheckResult = {
            ok: false,
            deviceOpen: false,
            protocolResponds: false,
            protocolVersion: 0,
            rgbReadable: false,
            rgbBrightness: null,
            rgbEffect: null,
            rgbWriteVerify: false,
            perKeySupport: this._hasPerKeySupport,
            log: healthLog,
        };

        // 1. Check device is open
        if (!this.device || !this.device.opened) {
            healthLog.push('FAIL: No device connected or device not open');
            return result;
        }
        result.deviceOpen = true;
        healthLog.push(`OK: Device open — ${this.device.productName} (PID 0x${this.device.productId.toString(16)})`);

        // 2. Protocol version query
        try {
            const ver = await this.getProtocolVersion();
            result.protocolVersion = ver;
            if (ver > 0) {
                result.protocolResponds = true;
                healthLog.push(`OK: VIA protocol version ${ver} (${ver >= 11 ? 'V3' : 'V2'})`);
            } else {
                healthLog.push('FAIL: Protocol version query returned 0 — device not responding');
                return result;
            }
        } catch (e) {
            healthLog.push(`FAIL: Protocol version query threw: ${e}`);
            return result;
        }

        // 3. RGB read test
        try {
            result.rgbBrightness = await this.getRGBBrightness();
            result.rgbEffect = await this.getRGBEffect();
            const speed = await this.getRGBEffectSpeed();
            const color = await this.getRGBColor();

            if (result.rgbBrightness !== null) {
                result.rgbReadable = true;
                healthLog.push(`OK: RGB brightness = ${result.rgbBrightness}`);
            } else {
                healthLog.push('WARN: RGB brightness read returned null');
            }
            if (result.rgbEffect !== null) {
                healthLog.push(`OK: RGB effect = ${result.rgbEffect}`);
            } else {
                healthLog.push('WARN: RGB effect read returned null');
            }
            healthLog.push(`INFO: Speed = ${speed ?? 'null'}, Color HSV = ${color ? `H=${color[0]} S=${color[1]}` : 'null'}`);
        } catch (e) {
            healthLog.push(`FAIL: RGB read threw: ${e}`);
        }

        // 4. RGB write + readback verify
        if (result.rgbBrightness !== null) {
            try {
                const original = result.rgbBrightness;
                // Write the same value back (non-destructive)
                await this.setRGBBrightness(original);
                const readback = await this.getRGBBrightness();
                if (readback === original) {
                    result.rgbWriteVerify = true;
                    healthLog.push(`OK: Write/readback verify passed (brightness ${original} -> ${readback})`);
                } else {
                    healthLog.push(`WARN: Write/readback mismatch (wrote ${original}, read ${readback})`);
                }
            } catch (e) {
                healthLog.push(`FAIL: Write/readback threw: ${e}`);
            }
        }

        // 5. EEPROM save test
        try {
            const saveCmd = this.isV3
                ? await this.sendCommand(VIA_CUSTOM_SAVE, [CHANNEL_RGB_MATRIX])
                : await this.sendCommand(VIA_CUSTOM_SAVE);
            if (!saveCmd) {
                healthLog.push('WARN: EEPROM save command timed out');
            } else {
                const byte0 = saveCmd.getUint8(0);
                if (byte0 === 0xFF) {
                    healthLog.push('WARN: EEPROM save rejected by firmware (0xFF)');
                } else {
                    healthLog.push(`OK: EEPROM save command accepted (response 0x${byte0.toString(16).padStart(2, '0')})`);
                }
            }
        } catch (e) {
            healthLog.push(`FAIL: EEPROM save threw: ${e}`);
        }

        // 6. Per-key RGB check
        healthLog.push(`INFO: Per-key RGB firmware: ${this._hasPerKeySupport ? 'DETECTED' : 'not detected (stock firmware)'}`);

        result.ok = result.deviceOpen && result.protocolResponds && result.rgbReadable;
        healthLog.push(result.ok ? 'OVERALL: Connection healthy' : 'OVERALL: Issues detected — see above');

        return result;
    }

    // --- Device State ---

    isDeviceConnected() {
        return this.isConnected;
    }

    getConnectedProductId(): number | null {
        return this.device?.productId ?? null;
    }

    getConnectedProductName(): string | null {
        return this.device?.productName ?? null;
    }

    private cleanupDevice() {
        if (this.disconnectHandler) {
            navigator.hid.removeEventListener('disconnect', this.disconnectHandler);
            this.disconnectHandler = null;
        }
        if (this.device?.opened) {
            this.device.close().catch((err) => {
                log.warnDevice(`Device close error: ${err}`);
            });
        }
        this.device = null;
        this.protocolVersion = 0;
        this._hasPerKeySupport = false;
        this._perKeyEnabled = false;
    }

    disconnect() {
        log.device('Disconnecting device');
        this.cleanupDevice();
        this.isConnected = false;
        this.notifyListeners();
    }

    onConnectionChange(callback: (connected: boolean) => void): () => void {
        this.connectionListeners.add(callback);
        return () => {
            this.connectionListeners.delete(callback);
        };
    }

    private notifyListeners() {
        this.connectionListeners.forEach(cb => cb(this.isConnected));
    }
}

export const hid = new HIDService();
