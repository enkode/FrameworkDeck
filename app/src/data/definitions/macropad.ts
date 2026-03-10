import type { VIAKeyboardDefinition } from '../../types/via';

// Matrix positions from VIA JSON: FrameworkComputer/the-via-keyboards
// QMK firmware: FrameworkComputer/qmk_firmware keyboards/framework/macropad/

export const FRAMEWORK_MACROPAD: VIAKeyboardDefinition = {
    name: "Framework Laptop 16 RGB Macropad",
    vendorId: 0x32AC,
    productId: 0x0013,
    lighting: 'qmk_rgb_matrix',
    matrix: { rows: 4, cols: 8 },
    ledCount: 24,

    // Matrix [row, col] from VIA JSON key strings (24 keys)
    matrixPositions: [
        // Visual Row 0 (4 keys)
        [2,1], [2,2], [3,4], [2,4],
        // Visual Row 1 (4 keys)
        [0,0], [0,4], [1,1], [1,6],
        // Visual Row 2 (4 keys)
        [0,1], [0,5], [1,2], [2,5],
        // Visual Row 3 (4 keys)
        [0,2], [0,6], [1,3], [1,7],
        // Visual Row 4 (4 keys)
        [0,3], [0,7], [1,4], [2,6],
        // Visual Row 5 (4 keys)
        [1,0], [2,7], [1,5], [2,0],
    ],

    // LED indices looked up from g_led_config[row][col] in macropad.c
    // g_led_config matrix (row x col):
    //   {  4,  7,  6,  9,  0,  1,  3, 11 }  row 0
    //   {  8, 20, 21, 23, 15, 14, 18, 19 }  row 1
    //   { 12,  5,  2, --, 17, 16, 13, 10 }  row 2
    //   { --, --, --, --, 22, --, --, -- }  row 3
    ledIndices: [
        // Visual Row 0: [2,1]=5, [2,2]=2, [3,4]=22, [2,4]=17
        [5], [2], [22], [17],
        // Visual Row 1: [0,0]=4, [0,4]=0, [1,1]=20, [1,6]=18
        [4], [0], [20], [18],
        // Visual Row 2: [0,1]=7, [0,5]=1, [1,2]=21, [2,5]=16
        [7], [1], [21], [16],
        // Visual Row 3: [0,2]=6, [0,6]=3, [1,3]=23, [1,7]=19
        [6], [3], [23], [19],
        // Visual Row 4: [0,3]=9, [0,7]=11, [1,4]=15, [2,6]=13
        [9], [11], [15], [13],
        // Visual Row 5: [1,0]=8, [2,7]=10, [1,5]=14, [2,0]=12
        [8], [10], [14], [12],
    ],

    layouts: {
        keymap: [
            // Row 0
            ["M1", { x: 0.25 }, "M2", { x: 0.25 }, "M3", { x: 0.25 }, "M4"],
            // Row 1
            [{ y: 0.5 }, "M5", { x: 0.25 }, "M6", { x: 0.25 }, "M7", { x: 0.25 }, "M8"],
            // Row 2
            [{ y: 0.5 }, "M9", { x: 0.25 }, "M10", { x: 0.25 }, "M11", { x: 0.25 }, "M12"],
            // Row 3
            [{ y: 0.5 }, "M13", { x: 0.25 }, "M14", { x: 0.25 }, "M15", { x: 0.25 }, "M16"],
            // Row 4
            [{ y: 0.5 }, "M17", { x: 0.25 }, "M18", { x: 0.25 }, "M19", { x: 0.25 }, "M20"],
            // Row 5
            [{ y: 0.5 }, "M21", { x: 0.25 }, "M22", { x: 0.25 }, "M23", { x: 0.25 }, "M24"],
        ]
    }
};
