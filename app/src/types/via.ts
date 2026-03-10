export interface VIAKeyboardDefinition {
    name: string;
    vendorId: number;
    productId: number;
    lighting: 'qmk_rgb_matrix' | 'qmk_backlight' | 'none';
    matrix: {
        rows: number;
        cols: number;
    };
    ledCount: number;
    // Maps each key index to its matrix [row, col] for HID commands
    matrixPositions: [number, number][];
    // Maps each key index to its LED indices for per-key RGB ([] = no LED)
    // Large keys (space, shift, etc.) have multiple LEDs
    ledIndices: number[][];
    layouts: {
        keymap: (string | number | { w?: number, h?: number, x?: number, y?: number, code?: string })[][];
        labels?: string[][];
    };
}

// Represent a physical key's position in the matrix
export interface KeyPosition {
    index: number;       // Sequential key index
    matrixRow: number;   // Matrix row for HID commands
    matrixCol: number;   // Matrix col for HID commands
    ledIndices: number[];  // LED indices for per-key RGB ([] = no LED, multi-LED for large keys)
    id: string;
    x: number;           // Visual X
    y: number;           // Visual Y
    w: number;           // Width (default 1u)
    h: number;           // Height (default 1u)
    label: string;
    code?: string;       // DOM Key Code (e.g., "KeyA") for visualization
}
