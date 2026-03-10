import { useState, useRef, useEffect } from 'react';
import { hid } from '../../../services/HIDService';
import { storageService } from '../../../services/StorageService';
import { log } from '../../../services/Logger';
import { useDeviceStore } from '../../../store/device';
import { FRAMEWORK_RGB_EFFECTS } from '../../../data/definitions/framework16';
import { rgbToHsv, hsvToRgb } from '../../../utils/color';
import { ChevronDown, RefreshCw, Terminal, Zap, RotateCcw, Download, Trash2, Search, Wrench } from 'lucide-react';
import { clsx } from 'clsx';
import type { VIAKeyboardDefinition } from '../../../types/via';

interface ColorPickerProps {
    definition?: VIAKeyboardDefinition;
    selectedKeyIndices?: number[];
    onKeyColorChange?: (indices: number[], color: string | null) => void;
    keyColors?: Record<number, string>;
    onSelectAll?: () => void;
}

export function ColorPicker({ definition, selectedKeyIndices = [], onKeyColorChange, keyColors, onSelectAll }: ColorPickerProps) {
    const { hasPerKeyRGB, connectedProductId, restoreComplete } = useDeviceStore();

    const [color, setColor] = useState({ r: 255, g: 0, b: 0 });
    const [brightness, setBrightness] = useState(128);
    const [effectId, setEffectId] = useState(1);
    const [speed, setSpeed] = useState(128);
    const [effectDropdownOpen, setEffectDropdownOpen] = useState(false);
    const [perKeyBrightness, setPerKeyBrightness] = useState(255);
    const [perKeyActive, setPerKeyActive] = useState(false);
    const [logEntries, setLogEntries] = useState<string[]>([]);
    const [showDiag, setShowDiag] = useState(false);
    const [testingLeds, setTestingLeds] = useState(false);
    const [testPhase, setTestPhase] = useState<null | 'asking' | 'diagnosing' | 'troubleshoot'>(null);
    const [diagResult, setDiagResult] = useState<{ brightness: number | null; effect: number | null; speed: number | null; color: [number, number] | null } | null>(null);
    const [resettingLeds, setResettingLeds] = useState(false);
    const [fixingStep, setFixingStep] = useState<string | null>(null);
    const [probing, setProbing] = useState(false);
    const [showTools, setShowTools] = useState(false);

    const isSending = useRef(false);
    const pendingColor = useRef<{ r: number; g: number; b: number } | null>(null);

    const hasSelectedKeys = selectedKeyIndices.length > 0;
    const isPerKeyMode = hasPerKeyRGB && hasSelectedKeys;
    const hasPerKeyColors = keyColors && Object.keys(keyColors).length > 0;

    // Auto-enable per-key firmware mode when keys are selected
    // Do NOT auto-disable on deselect — per-key colors should persist on the keyboard
    useEffect(() => {
        if (!hasPerKeyRGB || !isPerKeyMode || perKeyActive) return;
        hid.enablePerKeyMode().then(ok => {
            if (ok) setPerKeyActive(true);
        }).catch(err => log.errorRgb(`Per-key enable error: ${err}`));
    }, [isPerKeyMode, hasPerKeyRGB, perKeyActive]);

    // Sync color picker to selected key's existing color
    // Uses the first selected key's color as reference
    useEffect(() => {
        if (!isPerKeyMode || selectedKeyIndices.length === 0 || !keyColors) return;
        const existingColor = keyColors[selectedKeyIndices[0]];
        if (!existingColor) return;
        const match = existingColor.match(/rgb\((\d+),(\d+),(\d+)\)/);
        if (match) {
            const [, r, g, b] = match.map(Number);
            setColor({ r, g, b });
        }
    }, [selectedKeyIndices, isPerKeyMode]);

    // Global backlight color is no longer emitted to individual keys on the virtual keyboard.
    // Showing the VIA backlight color on every key was misleading — users thought it was
    // per-key readback from hardware. Per-key colors are only shown when explicitly set
    // through this app (stored in localStorage).


    const readDeviceState = async () => {
        if (!hid.isDeviceConnected()) {
            log.rgb('ERROR: No device connected');
            return;
        }
        log.rgb('Reading lighting state from device...');
        try {
            const b = await hid.getRGBBrightness();
            log.rgb(`  Brightness: ${b ?? 'null (no response)'}`);
            const e = await hid.getRGBEffect();
            log.rgb(`  Effect: ${e ?? 'null (no response)'}`);
            const s = await hid.getRGBEffectSpeed();
            log.rgb(`  Speed: ${s ?? 'null (no response)'}`);
            const c = await hid.getRGBColor();
            log.rgb(`  Color (HSV): ${c ? `H=${c[0]}, S=${c[1]}` : 'null (no response)'}`);

            if (b !== null) setBrightness(b);
            if (e !== null) setEffectId(e);
            if (s !== null) setSpeed(s);
            if (c !== null) {
                const [r, g, b2] = hsvToRgb(c[0], c[1], 255);
                setColor({ r, g, b: b2 });
                log.rgb(`  Color (RGB): R=${r}, G=${g}, B=${b2}`);
            }

            if (b === null && e === null && s === null && c === null) {
                log.rgb('WARNING: All reads returned null — device may not be responding to VIA commands');
            } else {
                log.rgb('Read complete');
            }
        } catch (err) {
            log.rgb(`ERROR: ${err}`);
        }
    };

    // Subscribe to centralized Logger for diagnostic display
    useEffect(() => {
        setLogEntries(log.getBuffer().slice(-50));
        const unsubscribe = log.onLog((entry) => {
            setLogEntries(prev => [...prev.slice(-49), entry]);
        });
        return unsubscribe;
    }, []);

    // Read device state only after auto-restore has completed
    useEffect(() => {
        if (!restoreComplete || !hid.isDeviceConnected()) return;
        readDeviceState();
    }, [restoreComplete]);


    const sendColorUpdate = async (r: number, g: number, b: number) => {
        if (isSending.current) {
            pendingColor.current = { r, g, b };
            return;
        }
        isSending.current = true;
        try {
            if (isPerKeyMode && hasSelectedKeys && definition) {
                // Per-key mode: apply brightness then send RGB to selected LED indices
                const scale = perKeyBrightness / 255;
                const ar = Math.round(r * scale);
                const ag = Math.round(g * scale);
                const ab = Math.round(b * scale);
                const ledIndices = selectedKeyIndices
                    .flatMap(idx => definition.ledIndices[idx] ?? []);
                if (ledIndices.length > 0) {
                    await hid.setPerKeyColor(ar, ag, ab, ledIndices);
                }
                // Update virtual keyboard visualization (use full color, not brightness-dimmed)
                onKeyColorChange?.(selectedKeyIndices, `rgb(${r},${g},${b})`);
            } else {
                // Global mode: convert to HSV and send via VIA protocol
                const [h, s] = rgbToHsv(r, g, b);
                await hid.setRGBColor(h, s);
            }
        } catch (err) {
            log.errorRgb(`Color command failed: ${err}`);
        } finally {
            isSending.current = false;
            if (pendingColor.current) {
                const p = pendingColor.current;
                pendingColor.current = null;
                setTimeout(() => sendColorUpdate(p.r, p.g, p.b), 10);
            }
        }
    };

    const handleColorChange = (key: 'r' | 'g' | 'b', val: number) => {
        const newColor = { ...color, [key]: val };
        setColor(newColor);
        sendColorUpdate(newColor.r, newColor.g, newColor.b);
    };

    const brightnessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handlePerKeyBrightnessChange = (val: number) => {
        setPerKeyBrightness(val);

        // If selected keys have individual per-key colors, scale each one proportionally
        // instead of overwriting them all with the single picker color
        const keysWithColors = keyColors ? selectedKeyIndices.filter(idx => keyColors[idx]) : [];
        if (keysWithColors.length > 0 && definition) {
            // Debounce to avoid flooding HID with rapid slider changes
            if (brightnessTimer.current) clearTimeout(brightnessTimer.current);
            brightnessTimer.current = setTimeout(async () => {
                const scale = val / 255;
                // Group keys by color to minimize HID commands
                const colorGroups: Record<string, number[]> = {};
                for (const idx of keysWithColors) {
                    const clr = keyColors![idx];
                    if (!colorGroups[clr]) colorGroups[clr] = [];
                    colorGroups[clr].push(idx);
                }
                try {
                    for (const [colorStr, indices] of Object.entries(colorGroups)) {
                        const match = colorStr.match(/rgb\((\d+),(\d+),(\d+)\)/);
                        if (!match) continue;
                        const [, r, g, b] = match.map(Number);
                        const ledIndices = indices.flatMap(i => definition.ledIndices[i] ?? []);
                        if (ledIndices.length > 0) {
                            await hid.setPerKeyColor(
                                Math.round(r * scale), Math.round(g * scale), Math.round(b * scale),
                                ledIndices,
                            );
                        }
                    }
                } catch (err) {
                    log.errorRgb(`Brightness adjustment failed: ${err}`);
                }
            }, 30);
        } else {
            // No individual colors — apply picker color at new brightness
            sendColorUpdate(color.r, color.g, color.b);
        }
    };

    const handleBrightnessChange = (val: number) => {
        setBrightness(val);
        hid.setRGBBrightness(val).catch(err => log.rgb(`Brightness set failed: ${err}`));
    };

    const handleEffectChange = (id: number) => {
        setEffectId(id);
        setEffectDropdownOpen(false);
        log.rgb(`Setting effect to ${id}`);
        hid.setRGBEffect(id).catch(err => log.rgb(`Effect set failed: ${err}`));
    };

    const handleSpeedChange = (val: number) => {
        setSpeed(val);
        hid.setRGBEffectSpeed(val).catch(err => log.rgb(`Speed set failed: ${err}`));
    };

    const handleTestLeds = async () => {
        if (testingLeds) return;
        setTestingLeds(true);
        setTestPhase(null);
        setShowDiag(true);
        log.rgb('═══ LED TEST START ═══');

        // Save original per-key colors (from React state) before test overwrites them
        const preTestKeyColors = keyColors ? { ...keyColors } : null;
        setSavedKeyColors(preTestKeyColors);

        // Save original VIA state
        const origBrightness = await hid.getRGBBrightness();
        const origEffect = await hid.getRGBEffect();
        const origSpeed = await hid.getRGBEffectSpeed();
        const origColor = await hid.getRGBColor();
        log.rgb(`Current state: brightness=${origBrightness}, effect=${origEffect}, speed=${origSpeed}, color=${origColor ? `H=${origColor[0]} S=${origColor[1]}` : 'null'}`);

        try {
            if (hasPerKeyRGB && definition) {
                // Use per-key RGB (proven to work on this hardware)
                log.rgb('Using per-key RGB mode for test...');
                const enabled = await hid.enablePerKeyMode();
                if (!enabled) {
                    log.rgb('ERROR: Failed to enable per-key mode');
                    return;
                }

                // Flash white
                log.rgb('Flashing WHITE...');
                await hid.setAllKeysColor(255, 255, 255, definition.ledCount);
                await new Promise(res => setTimeout(res, 800));

                // Flash red
                log.rgb('Flashing RED...');
                await hid.setAllKeysColor(255, 0, 0, definition.ledCount);
                await new Promise(res => setTimeout(res, 800));

                // Flash green
                log.rgb('Flashing GREEN...');
                await hid.setAllKeysColor(0, 255, 0, definition.ledCount);
                await new Promise(res => setTimeout(res, 800));

                // Flash blue
                log.rgb('Flashing BLUE...');
                await hid.setAllKeysColor(0, 0, 255, definition.ledCount);
                await new Promise(res => setTimeout(res, 800));

                // Back to white and hold
                log.rgb('Holding WHITE — look at your keyboard now...');
                await hid.setAllKeysColor(255, 255, 255, definition.ledCount);
                await new Promise(res => setTimeout(res, 1000));

                // Disable per-key mode to restore normal animations
                await hid.disablePerKeyMode();
                log.rgb('Per-key mode disabled, normal animations restored');
            } else {
                // Fallback: VIA global commands
                log.rgb('Per-key RGB not available, using VIA global commands...');

                log.rgb('Setting brightness to 255...');
                await hid.setRGBBrightness(255);
                const readB = await hid.getRGBBrightness();
                log.rgb(`  Readback: brightness=${readB} ${readB === 255 ? '(OK)' : readB === null ? '(NO RESPONSE)' : `(MISMATCH — sent 255, got ${readB})`}`);

                log.rgb('Setting effect to 1 (Solid Color)...');
                await hid.setRGBEffect(1);
                const readE = await hid.getRGBEffect();
                log.rgb(`  Readback: effect=${readE} ${readE === 1 ? '(OK)' : readE === null ? '(NO RESPONSE)' : `(MISMATCH — sent 1, got ${readE})`}`);

                log.rgb('Setting color to white (H=0, S=0)...');
                await hid.setRGBColor(0, 0);
                const readC = await hid.getRGBColor();
                log.rgb(`  Readback: color=${readC ? `H=${readC[0]} S=${readC[1]}` : 'null'} ${readC && readC[0] === 0 && readC[1] === 0 ? '(OK)' : readC === null ? '(NO RESPONSE)' : '(MISMATCH)'}`);

                if (readB === null && readE === null && readC === null) {
                    log.rgb('ERROR: Device not responding — HID connection may be stale');
                } else {
                    log.rgb('Commands sent — LEDs should now be bright white');
                }

                await new Promise(res => setTimeout(res, 3000));
            }
        } catch (err) {
            log.rgb(`LED Test ERROR: ${err}`);
        } finally {
            setTestingLeds(false);
            setDiagResult({ brightness: origBrightness, effect: origEffect, speed: origSpeed, color: origColor });
            setTestPhase('asking');
            log.rgb('═══ Waiting for user confirmation ═══');
        }
    };

    const [partialFlash, setPartialFlash] = useState(false);
    const [savedKeyColors, setSavedKeyColors] = useState<Record<number, string> | null>(null);

    const handleTestAnswer = async (result: 'all' | 'some' | 'none') => {
        if (result === 'all') {
            log.rgb('User confirmed all LEDs are working — restoring previous settings');
            if (diagResult) {
                if (diagResult.brightness !== null) { await hid.setRGBBrightness(diagResult.brightness); setBrightness(diagResult.brightness); }
                if (diagResult.effect !== null) { await hid.setRGBEffect(diagResult.effect); setEffectId(diagResult.effect); }
                if (diagResult.speed !== null) await hid.setRGBEffectSpeed(diagResult.speed);
                if (diagResult.color !== null) {
                    await hid.setRGBColor(diagResult.color[0], diagResult.color[1]);
                    const [r2, g2, b2] = hsvToRgb(diagResult.color[0], diagResult.color[1], 255);
                    setColor({ r: r2, g: g2, b: b2 });
                }
                log.rgb('Previous VIA settings restored');
            }
            // Re-apply per-key colors that were active before the test
            const colorsToRestore = savedKeyColors ?? keyColors;
            if (hasPerKeyRGB && definition && colorsToRestore && Object.keys(colorsToRestore).length > 0) {
                log.rgb('Re-applying per-key colors...');
                const enabled = await hid.enablePerKeyMode();
                if (enabled) {
                    setPerKeyActive(true);
                    const colorGroups: Record<string, number[]> = {};
                    for (const [keyIdx, clr] of Object.entries(colorsToRestore)) {
                        if (!colorGroups[clr]) colorGroups[clr] = [];
                        colorGroups[clr].push(Number(keyIdx));
                    }
                    for (const [colorStr, keyIndices] of Object.entries(colorGroups)) {
                        const match = colorStr.match(/rgb\((\d+),(\d+),(\d+)\)/);
                        if (!match) continue;
                        const [, cr, cg, cb] = match.map(Number);
                        const ledIndices = keyIndices.flatMap(idx => definition.ledIndices[idx] ?? []);
                        if (ledIndices.length > 0) await hid.setPerKeyColor(cr, cg, cb, ledIndices);
                    }
                    log.rgb('Per-key colors restored');
                }
            }
            setSavedKeyColors(null);
            setPartialFlash(false);
            setTestPhase(null);
            return;
        }
        // User saw partial or no lights — read current state for troubleshooting
        setPartialFlash(result === 'some');
        setTestPhase('diagnosing');
        log.rgb(`User reported ${result === 'some' ? 'partial' : 'no'} lights — reading device state...`);
        try {
            const b = await hid.getRGBBrightness();
            const e = await hid.getRGBEffect();
            const s = await hid.getRGBEffectSpeed();
            const c = await hid.getRGBColor();
            setDiagResult({ brightness: b, effect: e, speed: s, color: c });

            const issues: string[] = [];
            if (b !== null && b === 0) issues.push('Brightness is 0 (off)');
            if (b !== null && b === 255) issues.push('Brightness reads as 255 but no light — RGB may be toggled off via keyboard shortcut');
            if (e !== null && e === 0) issues.push('Effect is 0 (disabled)');
            if (b === null) issues.push('Brightness read returned null — device not responding');
            if (e === null) issues.push('Effect read returned null — device not responding');
            if (issues.length > 0) {
                log.rgb(`Issues: ${issues.join('; ')}`);
            } else {
                log.rgb(`Settings read OK but no light: brightness=${b}, effect=${e}`);
                log.rgb('RGB matrix may be disabled via keyboard shortcut (Fn+Space / Fn+F10)');
            }
            setTestPhase('troubleshoot');
        } catch (err) {
            log.rgb(`Diagnostics ERROR: ${err}`);
            setTestPhase('troubleshoot');
        }
    };

    const handleQuickFix = async (fix: 'brightness' | 'effect' | 'full-reset') => {
        setFixingStep(fix);
        setShowDiag(true);
        try {
            if (fix === 'brightness') {
                log.rgb('Fix: Setting brightness to maximum...');
                await hid.setRGBBrightness(255);
                const readback = await hid.getRGBBrightness();
                log.rgb(`  Readback: ${readback}`);
                setBrightness(255);
                const [h, s] = rgbToHsv(color.r, color.g, color.b);
                await hid.saveRGBSettings({ brightness: 255, effectId, speed, hue: h, saturation: s }, (msg: string) => log.rgb(msg));
                log.rgb('Brightness fix applied and saved');
            } else if (fix === 'effect') {
                log.rgb('Fix: Enabling solid color effect + max brightness...');
                await hid.setRGBEffect(1);
                await hid.setRGBBrightness(255);
                setEffectId(1);
                setBrightness(255);
                const [h, s] = rgbToHsv(color.r, color.g, color.b);
                await hid.saveRGBSettings({ brightness: 255, effectId: 1, speed, hue: h, saturation: s }, (msg: string) => log.rgb(msg));
                log.rgb('Effect fix applied and saved');
            } else {
                log.rgb('Fix: Full lighting reset...');
                await handleResetLighting();
            }
        } catch (err) {
            log.rgb(`Fix ERROR: ${err}`);
        } finally {
            setFixingStep(null);
        }
    };

    const handleResetLighting = async () => {
        if (resettingLeds) return;
        setResettingLeds(true);
        setShowDiag(true);
        log.rgb('═══ RESETTING LIGHTING ═══');

        // Snapshot current state before reset so user can undo
        if (connectedProductId !== null) {
            const [h, s] = rgbToHsv(color.r, color.g, color.b);
            storageService.saveSnapshot(connectedProductId, {
                label: 'Before lighting reset',
                rgbSettings: { brightness, effectId, speed, hue: h, saturation: s },
                perKeyColors: keyColors && Object.keys(keyColors).length > 0 ? keyColors : undefined,
            });
        }

        try {
            // Set known-good defaults: max brightness, solid color, medium speed, red
            const defaults = {
                brightness: 255,
                effectId: 1,
                speed: 128,
                hue: 0,
                saturation: 255,
            };

            log.rgb('Setting brightness=255...');
            await hid.setRGBBrightness(defaults.brightness);
            const rb = await hid.getRGBBrightness();
            log.rgb(`  Readback: ${rb} ${rb === 255 ? '(OK)' : rb === null ? '(NO RESPONSE)' : `(got ${rb})`}`);

            log.rgb('Setting effect=1 (Solid Color)...');
            await hid.setRGBEffect(defaults.effectId);
            const re = await hid.getRGBEffect();
            log.rgb(`  Readback: ${re} ${re === 1 ? '(OK)' : re === null ? '(NO RESPONSE)' : `(got ${re})`}`);

            log.rgb('Setting speed=128...');
            await hid.setRGBEffectSpeed(defaults.speed);

            log.rgb('Setting color=red (H=0, S=255)...');
            await hid.setRGBColor(defaults.hue, defaults.saturation);

            // Save to EEPROM so it persists
            const ok = await hid.saveRGBSettings(defaults, (msg: string) => log.rgb(msg));
            if (ok) {
                log.rgb('Reset complete — defaults saved to EEPROM');
            } else {
                log.rgb('Reset applied to RAM but EEPROM save may have failed');
            }

            // Also save to localStorage for auto-restore on reconnect
            if (connectedProductId !== null) {
                storageService.saveDeviceState(connectedProductId, { rgbSettings: defaults });
                log.rgb('Settings also saved to localStorage for auto-restore');
            }

            // Update UI to match
            setBrightness(defaults.brightness);
            setEffectId(defaults.effectId);
            setSpeed(defaults.speed);
            const [r, g, b2] = hsvToRgb(defaults.hue, defaults.saturation, 255);
            setColor({ r, g, b: b2 });
        } catch (err) {
            log.rgb(`Reset ERROR: ${err}`);
        } finally {
            setResettingLeds(false);
        }
    };

    const handleExportLog = () => {
        const text = log.export();
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fw-hid-diag-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleClearLog = () => {
        log.clear();
        setLogEntries([]);
    };

    const handleProbeFirmware = async () => {
        if (probing) return;
        setProbing(true);
        setShowDiag(true);
        log.rgb('═══ FIRMWARE PROTOCOL PROBE ═══');
        log.rgb('Testing if firmware supports reading per-key LED colors...');
        try {
            const results = await hid.probeFirmwareProtocol();
            for (const line of results) {
                log.rgb(line);
            }
            log.rgb('═══ PROBE COMPLETE ═══');
            log.rgb('Look for any response that is NOT "ff" (rejected) or "null" (timeout).');
            log.rgb('If any command returns color data (e.g., ff 00 00 for red), we can use it for readback.');
        } catch (err) {
            log.rgb(`Probe ERROR: ${err}`);
        } finally {
            setProbing(false);
        }
    };

    const currentEffect = FRAMEWORK_RGB_EFFECTS.find(e => e.id === effectId);

    return (
        <div className="space-y-4">
            {/* Per-Key RGB mode indicator (only when firmware supports it) */}
            {hasPerKeyRGB && (
                <div className={clsx(
                    "bg-surface border rounded-lg p-3",
                    isPerKeyMode ? "border-primary/40" : "border-border"
                )}>
                    <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-text-primary">
                            {isPerKeyMode
                                ? `Adjusting ${selectedKeyIndices.length} selected key${selectedKeyIndices.length > 1 ? 's' : ''}`
                                : 'Global backlight'}
                        </div>
                        {!isPerKeyMode && onSelectAll && (
                            <button
                                onClick={onSelectAll}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                            >
                                Select All Keys
                            </button>
                        )}
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">
                        {isPerKeyMode
                            ? 'Click elsewhere to deselect and return to global mode'
                            : hasPerKeyColors
                                ? 'Per-key colors override global backlight. Select keys to edit them.'
                                : 'Click keys on the keyboard to adjust individual colors'}
                    </div>
                </div>
            )}

            {/* Info when per-key is not available */}
            {!hasPerKeyRGB && (
                <div className="bg-surface border border-border rounded-lg p-3">
                    <div className="text-[10px] text-text-muted">
                        <span className="font-semibold text-text-secondary">Per-key RGB</span> requires custom firmware.
                        Use the <span className="text-primary font-semibold">Firmware</span> tab to flash it.
                    </div>
                </div>
            )}

            {/* Color Preview */}
            <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
                <h3 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                    {isPerKeyMode ? 'Per-Key Color' : 'Backlight Color'}
                </h3>

                <div className="flex justify-center my-2">
                    {(() => {
                        const scale = isPerKeyMode ? perKeyBrightness / 255 : 1;
                        const dr = Math.round(color.r * scale);
                        const dg = Math.round(color.g * scale);
                        const db = Math.round(color.b * scale);
                        return (
                            <div
                                className="w-24 h-24 rounded-full flex items-center justify-center transition-colors duration-300 border-2 border-white/10"
                                style={{
                                    backgroundColor: `rgb(${dr},${dg},${db})`,
                                    boxShadow: `0 0 30px rgba(${dr},${dg},${db}, 0.6), inset 0 0 20px rgba(0,0,0,0.3)`,
                                }}
                            >
                                <div className="text-[10px] font-mono font-bold text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                    {dr},{dg},{db}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* RGB Sliders */}
                <div className="space-y-2">
                    {(['r', 'g', 'b'] as const).map((c) => (
                        <div key={c} className="flex items-center gap-2 text-xs font-mono">
                            <span className={clsx("w-3 uppercase", c === 'r' ? 'text-red-400' : c === 'g' ? 'text-green-400' : 'text-blue-400')}>{c}</span>
                            <input
                                type="range"
                                min={0} max={255}
                                className="flex-1 h-1 bg-surface-highlight rounded-full appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full cursor-pointer hover:opacity-80"
                                value={color[c]}
                                onChange={(e) => handleColorChange(c, parseInt(e.target.value))}
                            />
                            <input
                                type="number"
                                min={0} max={255}
                                value={color[c]}
                                onChange={(e) => handleColorChange(c, Math.min(255, Math.max(0, parseInt(e.target.value) || 0)))}
                                className="w-10 text-right text-text-muted bg-transparent border-b border-transparent hover:border-text-muted focus:border-primary focus:text-text-primary outline-none text-xs font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                        </div>
                    ))}
                </div>

                {/* Per-key Brightness */}
                {isPerKeyMode && (
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-text-muted flex justify-between items-center">
                            <span>Brightness</span>
                            <span className="flex items-center gap-0.5">
                                <input
                                    type="number"
                                    min={0} max={100}
                                    value={perKeyBrightness === 0 ? 0 : Math.max(1, Math.round((perKeyBrightness / 255) * 100))}
                                    onChange={(e) => handlePerKeyBrightnessChange(Math.round(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) * 2.55))}
                                    className="w-8 text-right bg-transparent border-b border-transparent hover:border-text-muted focus:border-primary focus:text-text-primary outline-none text-xs font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />%
                            </span>
                        </label>
                        <input
                            type="range" min="0" max="255"
                            value={perKeyBrightness}
                            onChange={(e) => handlePerKeyBrightnessChange(parseInt(e.target.value))}
                            className="w-full h-1 bg-surface-highlight rounded-full appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full cursor-pointer hover:opacity-80"
                        />
                    </div>
                )}

                {/* Per-key hint */}
                {isPerKeyMode && !hasSelectedKeys && (
                    <div className="text-[10px] text-primary/70 text-center animate-pulse">
                        Click keys on the keyboard to select them, then adjust color
                    </div>
                )}
            </div>

            {/* Global Controls (only in global mode) */}
            {!isPerKeyMode && (
                <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
                    <h3 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Lighting Controls</h3>

                    {/* Brightness */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-text-muted flex justify-between items-center">
                            <span>Brightness</span>
                            <span className="flex items-center gap-0.5">
                                <input
                                    type="number"
                                    min={0} max={100}
                                    value={brightness === 0 ? 0 : Math.max(1, Math.round((brightness / 255) * 100))}
                                    onChange={(e) => handleBrightnessChange(Math.round(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) * 2.55))}
                                    className="w-8 text-right bg-transparent border-b border-transparent hover:border-text-muted focus:border-primary focus:text-text-primary outline-none text-xs font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />%
                            </span>
                        </label>
                        <input
                            type="range" min="0" max="255"
                            value={brightness}
                            onChange={(e) => handleBrightnessChange(parseInt(e.target.value))}
                            className="w-full h-1 bg-surface-highlight rounded-full appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full cursor-pointer hover:opacity-80"
                        />
                    </div>

                    {/* Effect Speed */}
                    {effectId > 1 && (
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-text-muted flex justify-between items-center">
                                <span>Speed</span>
                                <span className="flex items-center gap-0.5">
                                    <input
                                        type="number"
                                        min={0} max={100}
                                        value={speed === 0 ? 0 : Math.max(1, Math.round((speed / 255) * 100))}
                                        onChange={(e) => handleSpeedChange(Math.round(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) * 2.55))}
                                        className="w-8 text-right bg-transparent border-b border-transparent hover:border-text-muted focus:border-primary focus:text-text-primary outline-none text-xs font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    />%
                                </span>
                            </label>
                            <input
                                type="range" min="0" max="255"
                                value={speed}
                                onChange={(e) => handleSpeedChange(parseInt(e.target.value))}
                                className="w-full h-1 bg-surface-highlight rounded-full appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full cursor-pointer hover:opacity-80"
                            />
                        </div>
                    )}

                    {/* Effect Selector */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-text-muted">Effect</label>
                        <div className="relative">
                            <button
                                onClick={() => setEffectDropdownOpen(!effectDropdownOpen)}
                                className="w-full h-9 bg-surface-highlight border border-border rounded-md flex items-center justify-between px-3 hover:border-primary transition-colors text-xs"
                            >
                                <span>{currentEffect?.name ?? `Effect ${effectId}`}</span>
                                <ChevronDown size={14} className={clsx("text-text-muted transition-transform", effectDropdownOpen && "rotate-180")} />
                            </button>
                            {effectDropdownOpen && (
                                <div className="absolute bottom-full mb-1 left-0 w-full max-h-60 overflow-auto bg-surface border border-border rounded-md shadow-xl z-20">
                                    {FRAMEWORK_RGB_EFFECTS.map((e) => (
                                        <button
                                            key={e.id}
                                            onClick={() => handleEffectChange(e.id)}
                                            className={clsx(
                                                "w-full px-3 py-2 text-left text-xs transition-colors hover:bg-surface-highlight",
                                                effectId === e.id ? "text-primary bg-surface-highlight/50" : "text-text-muted"
                                            )}
                                        >
                                            {e.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Tools (collapsible) */}
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
                <button
                    onClick={() => setShowTools(!showTools)}
                    className="w-full px-3 py-2 flex items-center gap-2 text-[10px] text-text-muted hover:text-text-primary transition-colors"
                >
                    <Wrench size={12} />
                    <span>Tools</span>
                    <ChevronDown size={12} className={clsx("ml-auto transition-transform", showTools && "rotate-180")} />
                </button>
                {showTools && (
                    <div className="px-3 pb-3 space-y-2">
                        <div className="flex gap-2">
                            <button
                                onClick={handleTestLeds}
                                disabled={testingLeds}
                                className={clsx(
                                    "flex-1 py-2 rounded-lg font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition-all",
                                    testingLeds
                                        ? "bg-yellow-500/20 text-yellow-400 cursor-wait"
                                        : "bg-surface-highlight hover:bg-yellow-500/20 hover:text-yellow-400"
                                )}
                            >
                                <Zap size={14} />
                                {testingLeds ? 'Flashing...' : 'Test LEDs'}
                            </button>
                            <button
                                onClick={handleResetLighting}
                                disabled={resettingLeds}
                                className={clsx(
                                    "flex-1 py-2 rounded-lg font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition-all",
                                    resettingLeds
                                        ? "bg-orange-500/20 text-orange-400 cursor-wait"
                                        : "bg-surface-highlight hover:bg-orange-500/20 hover:text-orange-400"
                                )}
                            >
                                <RotateCcw size={14} />
                                {resettingLeds ? 'Resetting...' : 'Reset Lights'}
                            </button>
                        </div>
                        {hasPerKeyRGB && (
                            <button
                                onClick={handleProbeFirmware}
                                disabled={probing}
                                className={clsx(
                                    "w-full py-2 rounded-lg font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition-all",
                                    probing
                                        ? "bg-purple-500/20 text-purple-400 cursor-wait"
                                        : "bg-surface-highlight hover:bg-purple-500/20 hover:text-purple-400"
                                )}
                            >
                                <Search size={14} />
                                {probing ? 'Probing...' : 'Probe Firmware'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Post-test question */}
            {testPhase === 'asking' && (
                <div className="bg-surface border border-primary/30 rounded-lg p-3 space-y-2">
                    <div className="text-xs font-semibold text-text-primary">Did all the keys light up?</div>
                    <div className="flex flex-col gap-1.5">
                        <button
                            onClick={() => handleTestAnswer('all')}
                            className="w-full py-2 rounded-md text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                        >
                            All keys flashed
                        </button>
                        <button
                            onClick={() => handleTestAnswer('some')}
                            className="w-full py-2 rounded-md text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors"
                        >
                            Some keys flashed
                        </button>
                        <button
                            onClick={() => handleTestAnswer('none')}
                            className="w-full py-2 rounded-md text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                        >
                            No keys lit up
                        </button>
                    </div>
                </div>
            )}

            {/* Diagnosing spinner */}
            {testPhase === 'diagnosing' && (
                <div className="bg-surface border border-border rounded-lg p-3 flex items-center gap-2 text-xs text-text-muted">
                    <RefreshCw size={14} className="animate-spin" />
                    Running diagnostics...
                </div>
            )}

            {/* Troubleshooting panel */}
            {testPhase === 'troubleshoot' && diagResult && (
                <div className="bg-surface border border-yellow-500/30 rounded-lg p-3 space-y-3">
                    <div className="text-xs font-semibold text-yellow-400">Troubleshooting</div>

                    {partialFlash && (
                        <div className="text-[10px] text-yellow-400/80 bg-yellow-500/10 border border-yellow-500/20 rounded-md p-2 space-y-0.5">
                            <div className="font-semibold">Partial lighting detected</div>
                            <div className="text-text-muted">This may indicate individual LED failures or a loose module connection. Try reseating the keyboard module.</div>
                        </div>
                    )}

                    {/* Current state readout */}
                    <div className="text-[10px] font-mono text-text-muted space-y-0.5">
                        <div>Brightness: <span className={diagResult.brightness === 0 ? 'text-red-400 font-bold' : 'text-text-primary'}>{diagResult.brightness ?? 'N/A'}{diagResult.brightness === 0 ? ' (OFF)' : ''}</span></div>
                        <div>Effect: <span className={diagResult.effect === 0 ? 'text-red-400 font-bold' : 'text-text-primary'}>{diagResult.effect ?? 'N/A'}{diagResult.effect === 0 ? ' (DISABLED)' : ''}</span></div>
                        <div>Speed: <span className="text-text-primary">{diagResult.speed ?? 'N/A'}</span></div>
                        <div>Color: <span className="text-text-primary">{diagResult.color ? `H=${diagResult.color[0]} S=${diagResult.color[1]}` : 'N/A'}</span></div>
                    </div>

                    {/* Suggested fixes */}
                    <div className="space-y-1.5">
                        {diagResult.brightness === 0 && (
                            <button
                                onClick={() => handleQuickFix('brightness')}
                                disabled={fixingStep !== null}
                                className={clsx(
                                    "w-full py-2 px-3 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors border",
                                    fixingStep === 'brightness' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 cursor-wait" : "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                                )}
                            >
                                <Zap size={12} />
                                {fixingStep === 'brightness' ? 'Fixing...' : 'Fix: Set brightness to maximum'}
                            </button>
                        )}
                        {diagResult.effect === 0 && (
                            <button
                                onClick={() => handleQuickFix('effect')}
                                disabled={fixingStep !== null}
                                className={clsx(
                                    "w-full py-2 px-3 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors border",
                                    fixingStep === 'effect' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 cursor-wait" : "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                                )}
                            >
                                <Zap size={12} />
                                {fixingStep === 'effect' ? 'Fixing...' : 'Fix: Enable solid color effect'}
                            </button>
                        )}
                        <button
                            onClick={() => handleQuickFix('full-reset')}
                            disabled={fixingStep !== null}
                            className={clsx(
                                "w-full py-2 px-3 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors border",
                                fixingStep === 'full-reset' ? "bg-orange-500/10 text-orange-400 border-orange-500/20 cursor-wait" : "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20"
                            )}
                        >
                            <RotateCcw size={12} />
                            {fixingStep === 'full-reset' ? 'Resetting...' : 'Full reset: Max brightness + Solid Color + Save to EEPROM'}
                        </button>
                    </div>

                    {/* Manual tips */}
                    <div className="text-[10px] text-text-muted space-y-1 border-t border-border pt-2 mt-2">
                        <div className="font-semibold text-text-secondary">If fixes don't work:</div>
                        <ul className="list-disc list-inside space-y-0.5">
                            <li>Try pressing <span className="font-mono text-primary">Fn + Space</span> or <span className="font-mono text-primary">Fn + F10</span> — these keyboard shortcuts can toggle LEDs off</li>
                            <li>Disconnect and reconnect the device</li>
                            <li>Close the laptop lid, wait 5 seconds, reopen</li>
                            <li>Check if the keyboard module is seated properly</li>
                        </ul>
                    </div>

                    <button
                        onClick={() => setTestPhase(null)}
                        className="w-full py-1.5 rounded-md text-[10px] text-text-muted hover:text-text-primary transition-colors"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Diagnostic Log */}
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
                <div className="flex items-center">
                    <button
                        onClick={() => setShowDiag(!showDiag)}
                        className="flex-1 px-3 py-2 flex items-center gap-2 text-[10px] text-text-muted hover:text-text-primary transition-colors"
                    >
                        <Terminal size={12} />
                        <span>Diagnostics</span>
                        {logEntries.length > 0 && <span className="text-[9px] text-text-muted/50">({logEntries.length})</span>}
                        <ChevronDown size={12} className={clsx("ml-auto transition-transform", showDiag && "rotate-180")} />
                    </button>
                    {showDiag && logEntries.length > 0 && (
                        <div className="flex items-center gap-1 pr-2">
                            <button
                                onClick={handleExportLog}
                                title="Export log"
                                className="p-1 rounded text-text-muted hover:text-primary transition-colors"
                            >
                                <Download size={10} />
                            </button>
                            <button
                                onClick={handleClearLog}
                                title="Clear log"
                                className="p-1 rounded text-text-muted hover:text-red-400 transition-colors"
                            >
                                <Trash2 size={10} />
                            </button>
                        </div>
                    )}
                </div>
                {showDiag && (
                    <div className="border-t border-border px-3 py-2 max-h-40 overflow-auto font-mono text-[9px] leading-relaxed text-text-muted bg-black/20 space-y-0.5">
                        {logEntries.length === 0 ? (
                            <div className="text-text-muted/50 italic">No log entries yet. Try clicking the refresh button.</div>
                        ) : (
                            logEntries.map((entry, i) => (
                                <div key={i} className={clsx(
                                    entry.includes('ERROR') || entry.includes('FAILED') ? 'text-red-400' :
                                    entry.includes('WARNING') ? 'text-yellow-400' :
                                    entry.includes('SUCCESS') ? 'text-green-400' :
                                    entry.includes('New Session') ? 'text-primary/60' :
                                    'text-text-muted'
                                )}>{entry}</div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
