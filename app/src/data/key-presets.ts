export interface KeyPreset {
    id: string;
    label: string;
    indices: number[];
}

/** Generate an array of integers from start (inclusive) to end (exclusive) */
function range(start: number, end: number): number[] {
    return Array.from({ length: end - start }, (_, i) => start + i);
}

/**
 * ANSI keyboard key group presets (78 keys, indices 0-77).
 * Index mapping based on VIA JSON layout order.
 */
export const ANSI_KEY_PRESETS: KeyPreset[] = [
    { id: 'all', label: 'All Keys', indices: range(0, 78) },
    {
        id: 'letters', label: 'Letters',
        indices: [
            29, 30, 31, 32, 33, 34, 35, 36, 37, 38, // Q W E R T Y U I O P
            43, 44, 45, 46, 47, 48, 49, 50, 51,       // A S D F G H J K L
            56, 57, 58, 59, 60, 61, 62,                // Z X C V B N M
        ],
    },
    {
        id: 'numbers', label: 'Numbers',
        indices: [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26], // 1-0, -, =
    },
    {
        id: 'fkeys', label: 'F-Keys',
        indices: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // F1-F12
    },
    {
        id: 'wasd', label: 'WASD',
        indices: [30, 43, 44, 45], // W A S D
    },
    {
        id: 'fps', label: 'FPS Kit',
        indices: [
            30, 43, 44, 45,       // WASD
            29, 31, 32, 46, 47,   // Q E R F G
            55, 67, 71, 28,       // LShift LCtrl Space Tab
            15, 16, 17, 18, 19,   // 1-5
        ],
    },
    {
        id: 'moba', label: 'MOBA',
        indices: [
            29, 30, 31, 32, 45, 46,       // Q W E R D F
            15, 16, 17, 18, 19, 20,        // 1-6
            71, 28, 67, 55, 70,            // Space Tab LCtrl LShift LAlt
        ],
    },
    {
        id: 'arrows', label: 'Arrows',
        indices: [74, 75, 76, 77], // Left Up Down Right
    },
    {
        id: 'mods', label: 'Modifiers',
        indices: [55, 66, 67, 70, 72, 73], // LShift RShift LCtrl LAlt RAlt RCtrl
    },
];

/**
 * RGB Macropad key group presets (24 keys, indices 0-23).
 */
export const MACROPAD_KEY_PRESETS: KeyPreset[] = [
    { id: 'all', label: 'All Keys', indices: range(0, 24) },
    { id: 'top-half', label: 'Top Half', indices: range(0, 12) },
    { id: 'bottom-half', label: 'Bottom Half', indices: range(12, 24) },
];
