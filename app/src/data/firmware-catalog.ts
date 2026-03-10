export interface BootloaderMethod {
    title: string;
    steps: string[];
}

export interface FirmwareTarget {
    productId: number;
    deviceName: string;
    methods: BootloaderMethod[];
}

export interface FirmwareEntry {
    id: string;
    name: string;
    description: string;
    author: string;
    sourceUrl: string;
    downloadUrl: string;
    targets: FirmwareTarget[];
    features: string[];
    compatibility: 'full' | 'partial' | 'none';
    compatibilityNote: string;
}

// Shared bootloader instructions for Framework 16 devices
const KEYBOARD_BOOTLOADER: BootloaderMethod[] = [
    {
        title: 'Touchpad Method',
        steps: [
            'Slide the touchpad module downward until the input deck powers off',
            'Hold Left Alt + Right Alt keys simultaneously',
            'While holding both Alt keys, slide the touchpad back up',
            'Release the Alt keys — the keyboard is now in bootloader mode',
            'A new "RPI-RP2" drive should appear in File Explorer',
        ],
    },
    {
        title: 'BOOTSEL Button',
        steps: [
            'Power off the laptop completely',
            'Remove the keyboard input module',
            'Locate the small BOOTSEL button on the back of the module',
            'Hold the BOOTSEL button while reconnecting the module',
            'A "RPI-RP2" drive should appear in File Explorer',
        ],
    },
];

const MACROPAD_BOOTLOADER: BootloaderMethod[] = [
    {
        title: 'Key Hold Method',
        steps: [
            'Slide the touchpad module downward until the input deck powers off',
            'Hold the top-left key (M1) on the macropad',
            'While holding, slide the touchpad back up',
            'Release the key — the macropad is now in bootloader mode',
            'A new "RPI-RP2" drive should appear in File Explorer',
        ],
    },
    {
        title: 'BOOTSEL Button',
        steps: [
            'Power off the laptop completely',
            'Remove the macropad input module',
            'Locate the small BOOTSEL button on the back of the module',
            'Hold the BOOTSEL button while reconnecting the module',
            'A "RPI-RP2" drive should appear in File Explorer',
        ],
    },
];

export const FIRMWARE_CATALOG: FirmwareEntry[] = [
    {
        id: 'framework-official',
        name: 'Official Framework QMK',
        description: 'Stock firmware from Framework. Global RGB effects (no per-key), full VIA support. Use this to revert to factory firmware.',
        author: 'Framework',
        sourceUrl: 'https://github.com/FrameworkComputer/qmk_firmware',
        downloadUrl: 'https://github.com/FrameworkComputer/qmk_firmware/releases',
        targets: [
            { productId: 0x0012, deviceName: 'Framework 16 Keyboard (ANSI)', methods: KEYBOARD_BOOTLOADER },
            { productId: 0x0013, deviceName: 'Framework 16 RGB Macropad', methods: MACROPAD_BOOTLOADER },
        ],
        features: ['via-v3', 'rgb-effects', 'official'],
        compatibility: 'full',
        compatibilityNote: 'Fully compatible with this app (key mapping + global RGB).',
    },
    {
        id: 'tagno25-openrgb',
        name: 'OpenRGB Per-Key Firmware',
        description: 'Replaces VIA with OpenRGB protocol for full per-key RGB control via OpenRGB desktop app. Actively maintained with pre-built .uf2 downloads.',
        author: 'tagno25',
        sourceUrl: 'https://github.com/tagno25/qmk_firmware',
        downloadUrl: 'https://github.com/tagno25/qmk_firmware/releases/tag/latest',
        targets: [
            { productId: 0x0012, deviceName: 'Framework 16 Keyboard (ANSI)', methods: KEYBOARD_BOOTLOADER },
            { productId: 0x0013, deviceName: 'Framework 16 RGB Macropad', methods: MACROPAD_BOOTLOADER },
        ],
        features: ['per-key-rgb', 'openrgb', 'pre-built'],
        compatibility: 'none',
        compatibilityNote: 'Replaces VIA — this app cannot remap keys or control RGB. Use OpenRGB desktop app instead.',
    },
    {
        id: 'shandower81-cory',
        name: 'CORY Per-Key RGB Keymap',
        description: 'Custom keymap with per-key per-layer static colors baked into the firmware. Colors are set at compile time, not controllable from host.',
        author: 'Shandower81',
        sourceUrl: 'https://github.com/Shandower81/CORY-FRAMEWORK-RGB-KEYBOARD',
        downloadUrl: 'https://github.com/Shandower81/CORY-FRAMEWORK-RGB-KEYBOARD',
        targets: [
            { productId: 0x0012, deviceName: 'Framework 16 Keyboard (ANSI)', methods: KEYBOARD_BOOTLOADER },
        ],
        features: ['per-key-rgb', 'per-layer-colors', 'pre-built'],
        compatibility: 'partial',
        compatibilityNote: 'Per-key colors are baked in (not controllable from this app). Key mapping may still work via VIA.',
    },
    {
        id: 'nucleardog-perkey',
        name: 'Per-Key RGB (rgb_remote)',
        description: 'Adds the rgb_remote protocol for host-controlled per-key RGB while keeping full VIA support. Requires compiling from source (no pre-built binaries).',
        author: 'nucleardog',
        sourceUrl: 'https://gitlab.com/nucleardog/qmk_firmware_fw16',
        downloadUrl: 'https://gitlab.com/nucleardog/qmk_firmware_fw16',
        targets: [
            { productId: 0x0012, deviceName: 'Framework 16 Keyboard (ANSI)', methods: KEYBOARD_BOOTLOADER },
            { productId: 0x0013, deviceName: 'Framework 16 RGB Macropad', methods: MACROPAD_BOOTLOADER },
        ],
        features: ['per-key-rgb', 'via-v3', 'rgb-remote', 'build-from-source'],
        compatibility: 'full',
        compatibilityNote: 'Best option for this app — keeps VIA + adds per-key RGB control. Must compile with QMK toolchain.',
    },
];

/** Get firmware entries that support a given device product ID */
export function getFirmwareForDevice(productId: number | null): FirmwareEntry[] {
    if (!productId) return FIRMWARE_CATALOG;
    return FIRMWARE_CATALOG.filter(fw =>
        fw.targets.some(t => t.productId === productId)
    );
}

/** Get the target info for a specific device within a firmware entry */
export function getTargetForDevice(firmware: FirmwareEntry, productId: number): FirmwareTarget | undefined {
    return firmware.targets.find(t => t.productId === productId);
}
