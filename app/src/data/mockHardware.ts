import type { ModuleData } from '../components/keyboard/Stage/ModuleRenderer';

export const MAIN_KEYBOARD_ANSI: ModuleData = {
    id: 'main-keyboard',
    type: 'keyboard',
    keys: [
        // Row 0 (Function)
        { label: 'Esc', x: 0, y: 0, row: 0, col: 0 },
        { label: 'F1', x: 2, y: 0, row: 0, col: 1 }, { label: 'F2', x: 3, y: 0, row: 0, col: 2 }, { label: 'F3', x: 4, y: 0, row: 0, col: 3 }, { label: 'F4', x: 5, y: 0, row: 0, col: 4 },
        { label: 'F5', x: 6.5, y: 0, row: 0, col: 5 }, { label: 'F6', x: 7.5, y: 0, row: 0, col: 6 }, { label: 'F7', x: 8.5, y: 0, row: 0, col: 7 }, { label: 'F8', x: 9.5, y: 0, row: 0, col: 8 },
        { label: 'F9', x: 11, y: 0, row: 0, col: 9 }, { label: 'F10', x: 12, y: 0, row: 0, col: 10 }, { label: 'F11', x: 13, y: 0, row: 0, col: 11 }, { label: 'F12', x: 14, y: 0, row: 0, col: 12 },
        { label: 'Del', x: 15.5, y: 0, row: 0, col: 13 },

        // Row 1 (Numbers)
        { label: '`', x: 0, y: 1 },
        { label: '1', x: 1, y: 1 }, { label: '2', x: 2, y: 1 }, { label: '3', x: 3, y: 1 }, { label: '4', x: 4, y: 1 },
        { label: '5', x: 5, y: 1 }, { label: '6', x: 6, y: 1 }, { label: '7', x: 7, y: 1 }, { label: '8', x: 8, y: 1 },
        { label: '9', x: 9, y: 1 }, { label: '0', x: 10, y: 1 }, { label: '-', x: 11, y: 1 }, { label: '=', x: 12, y: 1 },
        { label: 'Bm', w: 2, x: 13, y: 1 }, // Backspace

        // Row 2 (QWERTY)
        { label: 'Tab', w: 1.5, x: 0, y: 2 },
        { label: 'Q', x: 1.5, y: 2 }, { label: 'W', x: 2.5, y: 2 }, { label: 'E', x: 3.5, y: 2 }, { label: 'R', x: 4.5, y: 2 },
        { label: 'T', x: 5.5, y: 2 }, { label: 'Y', x: 6.5, y: 2 }, { label: 'U', x: 7.5, y: 2 }, { label: 'I', x: 8.5, y: 2 },
        { label: 'O', x: 9.5, y: 2 }, { label: 'P', x: 10.5, y: 2 }, { label: '[', x: 11.5, y: 2 }, { label: ']', x: 12.5, y: 2 },
        { label: '\\', w: 1.5, x: 13.5, y: 2 },

        // Row 3 (ASDF)
        { label: 'Caps', w: 1.75, x: 0, y: 3 },
        { label: 'A', x: 1.75, y: 3 }, { label: 'S', x: 2.75, y: 3 }, { label: 'D', x: 3.75, y: 3 }, { label: 'F', x: 4.75, y: 3 },
        { label: 'G', x: 5.75, y: 3 }, { label: 'H', x: 6.75, y: 3 }, { label: 'J', x: 7.75, y: 3 }, { label: 'K', x: 8.75, y: 3 },
        { label: 'L', x: 9.75, y: 3 }, { label: ';', x: 10.75, y: 3 }, { label: "'", x: 11.75, y: 3 },
        { label: 'Enter', w: 2.25, x: 12.75, y: 3 },

        // Row 4 (ZXCV)
        { label: 'Shift', w: 2.25, x: 0, y: 4 },
        { label: 'Z', x: 2.25, y: 4 }, { label: 'X', x: 3.25, y: 4 }, { label: 'C', x: 4.25, y: 4 }, { label: 'V', x: 5.25, y: 4 },
        { label: 'B', x: 6.25, y: 4 }, { label: 'N', x: 7.25, y: 4 }, { label: 'M', x: 8.25, y: 4 }, { label: ',', x: 9.25, y: 4 },
        { label: '.', x: 10.25, y: 4 }, { label: '/', x: 11.25, y: 4 },
        { label: 'Shift', w: 2.75, x: 12.25, y: 4 },

        // Row 5 (Mods)
        { label: 'Ctrl', w: 1.25, x: 0, y: 5 },
        { label: 'Fn', w: 1.25, x: 1.25, y: 5 },
        { label: 'Win', w: 1.25, x: 2.5, y: 5 },
        { label: 'Alt', w: 1.25, x: 3.75, y: 5 },
        { label: 'Space', w: 6.25, x: 5, y: 5 }, // Standard 6.25u
        { label: 'Alt', w: 1.25, x: 11.25, y: 5 },
        { label: 'Ctrl', w: 1.25, x: 12.5, y: 5 },
        { label: '←', x: 13.75, y: 5 },
        // Arrow cluster logic is simplified here; FW16 has half-height keys for Up/Down usually, but we'll do standard layout for now
        { label: '↑', x: 14.75, y: 5, h: 0.5 },
        { label: '↓', x: 14.75, y: 5.5, h: 0.5 },
        { label: '→', x: 15.75, y: 5 },
    ]
};

export const NUMPAD_MODULE: ModuleData = {
    id: 'numpad',
    type: 'numpad',
    keys: [
        { label: 'Num', x: 0, y: 1, row: 0, col: 0 }, { label: '/', x: 1, y: 1, row: 0, col: 1 }, { label: '*', x: 2, y: 1, row: 0, col: 2 }, { label: '-', x: 3, y: 1, row: 0, col: 3 },
        { label: '7', x: 0, y: 2, row: 1, col: 0 }, { label: '8', x: 1, y: 2, row: 1, col: 1 }, { label: '9', x: 2, y: 2, row: 1, col: 2 }, { label: '+', h: 2, x: 3, y: 2, row: 1, col: 3 },
        { label: '4', x: 0, y: 3, row: 2, col: 0 }, { label: '5', x: 1, y: 3, row: 2, col: 1 }, { label: '6', x: 2, y: 3, row: 2, col: 2 },
        { label: '1', x: 0, y: 4, row: 3, col: 0 }, { label: '2', x: 1, y: 4, row: 3, col: 1 }, { label: '3', x: 2, y: 4, row: 3, col: 2 }, { label: 'Ent', h: 2, x: 3, y: 4, row: 3, col: 3 },
        { label: '0', w: 2, x: 0, y: 5, row: 4, col: 0 }, { label: '.', x: 2, y: 5, row: 4, col: 1 }
    ]
}

export const MACROPAD_MODULE: ModuleData = {
    id: 'macropad',
    type: 'macropad',
    keys: [
        { label: 'M1', x: 0, y: 0, row: 0, col: 0 }, { label: 'M2', x: 1, y: 0, row: 0, col: 1 }, { label: 'M3', x: 2, y: 0, row: 0, col: 2 }, { label: 'M4', x: 3, y: 0, row: 0, col: 3 },
        { label: 'M5', x: 0, y: 1, row: 1, col: 0 }, { label: 'M6', x: 1, y: 1, row: 1, col: 1 }, { label: 'M7', x: 2, y: 1, row: 1, col: 2 }, { label: 'M8', x: 3, y: 1, row: 1, col: 3 },
        { label: 'M9', x: 0, y: 2, row: 2, col: 0 }, { label: 'M10', x: 1, y: 2, row: 2, col: 1 }, { label: 'M11', x: 2, y: 2, row: 2, col: 2 }, { label: 'M12', x: 3, y: 2, row: 2, col: 3 },
        { label: 'M13', x: 0, y: 3, row: 3, col: 0 }, { label: 'M14', x: 1, y: 3, row: 3, col: 1 }, { label: 'M15', x: 2, y: 3, row: 3, col: 2 }, { label: 'M16', x: 3, y: 3, row: 3, col: 3 },
        { label: 'M17', x: 0, y: 4, row: 4, col: 0 }, { label: 'M18', x: 1, y: 4, row: 4, col: 1 }, { label: 'M19', x: 2, y: 4, row: 4, col: 2 }, { label: 'M20', x: 3, y: 4, row: 4, col: 3 },
        { label: 'M21', x: 0, y: 5, row: 5, col: 0 }, { label: 'M22', x: 1, y: 5, row: 5, col: 1 }, { label: 'M23', x: 2, y: 5, row: 5, col: 2 }, { label: 'M24', x: 3, y: 5, row: 5, col: 3 },
    ]
}
