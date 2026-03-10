import type { VIAKeyboardDefinition } from '../../types/via';

// Matrix positions and LED indices derived from:
// - VIA JSON: FrameworkComputer/the-via-keyboards (framework16 branch)
// - QMK firmware: FrameworkComputer/qmk_firmware (fl16-2025 branch)
//   keyboards/framework/ansi/ansi.c (g_led_config)
//   keyboards/framework/ansi/ansi.h (LAYOUT macro)

export const FRAMEWORK_16_ANSI: VIAKeyboardDefinition = {
    name: "Framework Laptop 16 (ANSI)",
    vendorId: 0x32AC,
    productId: 0x0012,
    lighting: 'qmk_rgb_matrix',
    matrix: { rows: 8, cols: 16 },
    ledCount: 97,

    // Matrix [row, col] for each key in visual layout order (78 keys)
    // Derived from VIA JSON key strings and LAYOUT macro
    matrixPositions: [
        // Row 0: F-row (14 keys)
        [7,5], [3,5], [2,5], [6,4], [3,4], [4,10], [3,10], [2,10], [1,15], [3,11], [4,8], [6,8], [3,13], [0,1],
        // Row 1: Number row (14 keys)
        [4,2], [5,2], [5,5], [5,4], [5,6], [4,6], [4,7], [5,7], [5,10], [5,8], [4,13], [2,13], [4,14], [5,14],
        // Row 2: QWERTY (14 keys)
        [3,2], [0,2], [6,5], [2,4], [6,6], [3,6], [3,7], [6,7], [6,10], [3,8], [5,13], [6,13], [6,14], [2,8],
        // Row 3: Home row (13 keys)
        [4,4], [7,2], [4,5], [7,14], [7,6], [2,6], [2,7], [7,7], [7,10], [7,8], [7,13], [0,14], [1,14],
        // Row 4: Shift row (12 keys)
        [1,9], [1,5], [0,5], [0,0], [0,6], [1,6], [1,7], [0,7], [0,10], [0,8], [0,13], [0,9],
        // Row 5: Bottom row (11 keys) - order: LCtrl,Fn,Win,Alt,Space,Alt,Ctrl,Left,Up,Down,Right
        [1,12], [2,2], [3,1], [1,3], [1,4], [0,3], [0,12], [6,11], [1,13], [1,8], [2,15],
    ],

    // LED indices for each key ([] = no LED, multiple entries for large keys)
    // Looked up from g_led_config matrix in ansi.c
    // Large keys have extra LEDs mapped by physical position proximity
    ledIndices: [
        // F-row (14 keys)
        [25, 23],  // Esc (1.25u)
        [21], [19], [18], [20], [22], [24], [26], [67], [74], [68], [66], [70],
        [73, 72],  // Del (1.75u)
        // Number row (14 keys)
        [16], [15], [13], [12], [11], [9], [14], [10], [17], [69], [61], [63], [62],
        [65, 64],  // Backspace (2u)
        // QWERTY (14 keys)
        [1, 0],    // Tab (1.5u)
        [5], [3], [2], [4], [7], [8], [6], [58], [59], [60], [57], [54], [55],
        // Home row (13 keys)
        [44, 38, 42],  // Caps Lock (1.75u)
        [36], [41], [37], [43], [39], [40], [49], [50], [51], [48], [52],
        [56, 53],      // Enter (2.5u)
        // Shift row (12 keys)
        [32, 28, 30],  // LShift (2.5u)
        [27], [29], [31], [33], [35], [76], [77], [78], [75], [79],
        [92, 80, 82, 83],  // RShift (3u)
        // Bottom row (11 keys)
        [34, 45],  // LCtrl (1.25u)
        [93], [46], [47],
        [94, 85, 86, 87, 95, 96],  // Space (6u)
        [84], [88],
        [89], [81], [90], [91],    // Arrow keys (1.25u each)
    ],

    layouts: {
        keymap: [
            // Row 0: Function Keys
            [{ y: 0, x: 0, w: 1.25 }, "Esc", { x: 0.25 }, "F1", { x: 0.25 }, "F2", { x: 0.25 }, "F3", { x: 0.25 }, "F4", { x: 0.25 }, "F5", { x: 0.25 }, "F6", { x: 0.25 }, "F7", { x: 0.25 }, "F8", { x: 0.25 }, "F9", { x: 0.25 }, "F10", { x: 0.25 }, "F11", { x: 0.25 }, "F12", { x: 0.25, w: 1.75 }, "Del"],
            // Row 1: Number Row
            [{ y: 0.25 }, "~\n`", { x: 0.25 }, "!\n1", { x: 0.25 }, "@\n2", { x: 0.25 }, "#\n3", { x: 0.25 }, "$\n4", { x: 0.25 }, "%\n5", { x: 0.25 }, "^\n6", { x: 0.25 }, "&\n7", { x: 0.25 }, "*\n8", { x: 0.25 }, "(\n9", { x: 0.25 }, ")\n0", { x: 0.25 }, "_\n-", { x: 0.25 }, "+\n=", { x: 0.25, w: 2 }, "Backspace"],
            // Row 2: QWERTY
            [{ y: 0.25, w: 1.5 }, "Tab", { x: 0.25 }, "Q", { x: 0.25 }, "W", { x: 0.25 }, "E", { x: 0.25 }, "R", { x: 0.25 }, "T", { x: 0.25 }, "Y", { x: 0.25 }, "U", { x: 0.25 }, "I", { x: 0.25 }, "O", { x: 0.25 }, "P", { x: 0.25 }, "{\n[", { x: 0.25 }, "}\n]", { x: 0.25, w: 1.5 }, "|\n\\"],
            // Row 3: Home Row
            [{ y: 0.25, w: 1.75 }, "Caps Lock", { x: 0.25 }, "A", { x: 0.25 }, "S", { x: 0.25 }, "D", { x: 0.25 }, "F", { x: 0.25 }, "G", { x: 0.25 }, "H", { x: 0.25 }, "J", { x: 0.25 }, "K", { x: 0.25 }, "L", { x: 0.25 }, ":\n;", { x: 0.25 }, "\"\n'", { x: 0.25, w: 2.5 }, "Enter"],
            // Row 4: Shift Row
            [{ y: 0.25, w: 2.5 }, "Shift", { x: 0.25 }, "Z", { x: 0.25 }, "X", { x: 0.25 }, "C", { x: 0.25 }, "V", { x: 0.25 }, "B", { x: 0.25 }, "N", { x: 0.25 }, "M", { x: 0.25 }, "<\n,", { x: 0.25 }, ">\n.", { x: 0.25 }, "?\n/", { x: 0.25, w: 3 }, "Shift"],
            // Row 5: Bottom Row (inverted-T arrow cluster)
            [{ y: 0.25, w: 1.25 }, "Ctrl", { x: 0.25 }, "Fn", { x: 0.25 }, "Win", { x: 0.25 }, "Alt", { x: 0.25, w: 6 }, "Space", { x: 0.25 }, "Alt", { x: 0.25 }, "Ctrl", { x: 0.25, w: 1.25 }, "←", { x: 0.25, w: 1.25, h: 0.5 }, "↑", { x: -1.25, y: 0.5, w: 1.25, h: 0.5 }, "↓", { y: -0.5, x: 0.25, w: 1.25 }, "→"],
        ]
    }
};

// RGB Matrix effect names for the Framework 16 ANSI keyboard
// Only includes effects confirmed to work on stock Framework QMK firmware
export const FRAMEWORK_RGB_EFFECTS: { id: number; name: string }[] = [
    { id: 0, name: "Off" },
    { id: 1, name: "Solid Color" },
    { id: 5, name: "Breathing" },
];
