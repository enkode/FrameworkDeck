// Shared color conversion utilities
// VIA uses 0-255 range for H and S

/** Convert RGB (0-255 each) to HSV (H: 0-255, S: 0-255, V: 0-255) */
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
    r = Math.max(0, Math.min(255, r)) / 255;
    g = Math.max(0, Math.min(255, g)) / 255;
    b = Math.max(0, Math.min(255, b)) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;

    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [Math.round(h * 255), Math.round(s * 255), Math.round(v * 255)];
}

/** Convert HSV (H: 0-255, S: 0-255, V: 0-255) to RGB (0-255 each) */
export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
    h = Math.max(0, Math.min(255, h)) / 255;
    s = Math.max(0, Math.min(255, s)) / 255;
    v = Math.max(0, Math.min(255, v)) / 255;
    let r = 0, g = 0, b = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
