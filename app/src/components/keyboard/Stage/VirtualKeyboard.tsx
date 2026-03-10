import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import type { VIAKeyboardDefinition } from '../../../types/via';
import { parseKeyPositions } from '../../../utils/keyboardLayout';
import { getKeyLabel } from '../../../utils/keycodes';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

/** Returns true if a CSS rgb() color is light enough to need dark text */
function isLightColor(color: string): boolean {
    const m = color.match(/rgb\((\d+),(\d+),(\d+)\)/);
    if (!m) return false;
    // Relative luminance (sRGB)
    const luminance = (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114);
    return luminance > 140;
}

interface VirtualKeyboardProps {
    definition: VIAKeyboardDefinition;
    pressedKeys: string[];
    selectedKeyIndices: number[];
    onKeySelect: (index: number, modifiers: { ctrl: boolean; shift: boolean }) => void;
    deviceKeymap?: number[];
    keyColors?: Record<number, string>;
    shiftHoverPreviewIndices?: number[];
    onKeyHover?: (index: number | null) => void;
}

export function VirtualKeyboard({ definition, pressedKeys, selectedKeyIndices, onKeySelect, deviceKeymap, keyColors, shiftHoverPreviewIndices = [], onKeyHover }: VirtualKeyboardProps) {

    const renderableKeys = useMemo(() => parseKeyPositions(definition), [definition]);

    // Merge layout + live keymap labels
    const finalKeys = useMemo(() => {
        if (!deviceKeymap || deviceKeymap.length === 0) return renderableKeys;

        return renderableKeys.map((k, idx) => {
            if (deviceKeymap[idx] !== undefined && deviceKeymap[idx] !== 0) {
                return { ...k, label: getKeyLabel(deviceKeymap[idx]) };
            }
            return k;
        });
    }, [renderableKeys, deviceKeymap]);

    // Compute container size from actual key positions
    const containerSize = useMemo(() => {
        const UNIT = 50;
        const GAP = 4;
        let maxRight = 0;
        let maxBottom = 0;
        for (const key of renderableKeys) {
            maxRight = Math.max(maxRight, (key.x + key.w) * UNIT - GAP);
            maxBottom = Math.max(maxBottom, (key.y + key.h) * UNIT - GAP);
        }
        return { width: Math.ceil(maxRight) + GAP, height: Math.ceil(maxBottom) + GAP };
    }, [renderableKeys]);


    const measureRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    const updateScale = useCallback(() => {
        const el = measureRef.current;
        if (!el) return;
        // Measure the full available space, subtract only the keyboard's own padding (24px each side)
        const pad = 48;
        const availW = el.clientWidth - pad;
        const availH = el.clientHeight - pad;
        const sx = availW / containerSize.width;
        const sy = availH / containerSize.height;
        setScale(Math.min(1, sx, sy));
    }, [containerSize]);

    useEffect(() => {
        updateScale();
        const el = measureRef.current;
        if (!el) return;
        const observer = new ResizeObserver(updateScale);
        observer.observe(el);
        return () => observer.disconnect();
    }, [updateScale]);

    const scaledW = containerSize.width * scale;
    const scaledH = containerSize.height * scale;

    return (
        <div ref={measureRef} className="w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <div
                className="bg-surface/50 rounded-xl border border-border overflow-hidden"
                style={{ padding: '24px' }}
            >
                <div
                    className="relative"
                    style={{
                        width: `${scaledW}px`,
                        height: `${scaledH}px`,
                    }}
                >
                {/* Scale layer — transform doesn't affect layout, so we contain it */}
                <div
                    className="absolute top-0 left-0"
                    style={{
                        width: `${containerSize.width}px`,
                        height: `${containerSize.height}px`,
                        transform: `scale(${scale})`,
                        transformOrigin: '0 0',
                    }}
                >
                {finalKeys.map((key, idx) => {
                    const isSelected = selectedKeyIndices.includes(idx);
                    const isPreview = !isSelected && shiftHoverPreviewIndices.includes(idx);
                    const isPressed = key.code && pressedKeys.includes(key.code);
                    const keyColor = keyColors?.[idx];
                    const displayColor = keyColor ?? null;
                    // Boost glow for very dim colors so they're still visible
                    let glowColor = displayColor;
                    if (displayColor) {
                        const m = displayColor.match(/rgb\((\d+),(\d+),(\d+)\)/);
                        if (m) {
                            const mx = Math.max(+m[1], +m[2], +m[3]);
                            if (mx > 0 && mx < 60) {
                                const s = 60 / mx;
                                glowColor = `rgb(${Math.min(255, Math.round(+m[1]*s))},${Math.min(255, Math.round(+m[2]*s))},${Math.min(255, Math.round(+m[3]*s))})`;
                            }
                        }
                    }
                    const isMultiLine = key.label.includes('\n');
                    const labelParts = isMultiLine ? key.label.split('\n') : null;
                    // Auto-size text based on label length relative to key width
                    const plainLabel = key.label.replace('\n', '');
                    const textClass = plainLabel.length > 7 ? 'text-[7px]'
                        : plainLabel.length > 5 ? 'text-[9px]'
                        : 'text-xs';

                    return (
                        <motion.button
                            key={key.id}
                            className={clsx(
                                "absolute rounded-md flex flex-col items-center justify-center font-semibold select-none transition-all duration-75 overflow-hidden",
                                isSelected
                                    ? displayColor
                                        ? clsx("border-2 border-white/80 z-10", isLightColor(displayColor) ? "text-black" : "text-white")
                                        : "bg-primary text-white border-2 border-primary shadow-[0_0_15px_rgba(247,88,33,0.5)] z-10"
                                    : isPreview
                                        ? "bg-[#27272A] text-text-primary border border-primary/40 shadow-[0_0_8px_rgba(247,88,33,0.25)] z-10"
                                        : isPressed
                                            ? "bg-white text-black border border-white shadow-[0_0_10px_rgba(255,255,255,0.8)] z-20 scale-95"
                                            : displayColor
                                                ? "text-text-primary border-2"
                                                : "bg-[#27272A] text-text-muted border border-black/40 hover:border-text-secondary hover:text-text-primary"
                            )}
                            style={{
                                left: `${key.x * 50}px`,
                                top: `${key.y * 50}px`,
                                width: `${key.w * 50 - 4}px`,
                                height: `${key.h * 50 - 4}px`,
                                ...(displayColor && isSelected ? {
                                    backgroundColor: displayColor,
                                    boxShadow: `0 0 12px 3px ${glowColor}90, inset 0 0 20px rgba(255,255,255,0.15)`,
                                } : {}),
                                ...(displayColor && !isSelected && !isPreview && !isPressed ? {
                                    borderColor: displayColor,
                                    backgroundColor: `color-mix(in srgb, ${displayColor} 30%, #27272A)`,
                                    boxShadow: `inset 0 -3px 0 0 ${displayColor}, 0 0 10px 3px ${glowColor}80`,
                                } : {}),
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onKeySelect(idx, { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey });
                            }}
                            onMouseEnter={() => onKeyHover?.(idx)}
                            onMouseLeave={() => onKeyHover?.(null)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {isMultiLine && labelParts ? (
                                <>
                                    <span className="text-[9px] leading-none opacity-50">{labelParts[0]}</span>
                                    <span className="text-[11px] leading-none mt-0.5">{labelParts[1]}</span>
                                </>
                            ) : (
                                <span className={textClass}>{key.label}</span>
                            )}
                        </motion.button>
                    );
                })}
                </div>
            </div>
        </div>
        </div>
    );
}
