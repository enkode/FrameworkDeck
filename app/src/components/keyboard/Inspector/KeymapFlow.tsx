import { useState } from 'react';
import { hid } from '../../../services/HIDService';
import { log } from '../../../services/Logger';
import type { VIAKeyboardDefinition } from '../../../types/via';
import { clsx } from 'clsx';
import { Save } from 'lucide-react';
import { KEYCODE_MAP, KEY_CATEGORIES, buildModKeycode, getKeyLabelCompact } from '../../../utils/keycodes';

interface KeymapFlowProps {
    definition?: VIAKeyboardDefinition;
    selectedKeyIndices: number[];
    selectedLayer: number;
    onKeymapChange?: () => void;
}

export function KeymapFlow({ definition, selectedKeyIndices, selectedLayer, onKeymapChange }: KeymapFlowProps) {
    const [pendingKeycode, setPendingKeycode] = useState<number | null>(null);
    const [pendingLabel, setPendingLabel] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState(0);
    const [mods, setMods] = useState({ ctrl: false, shift: false, alt: false, gui: false });

    const noMods = !mods.ctrl && !mods.shift && !mods.alt && !mods.gui;

    const handleSelectKey = (baseCode: number) => {
        // Apply modifier flags if any are toggled
        const code = noMods ? baseCode : buildModKeycode(baseCode, mods);
        const label = getKeyLabelCompact(code);
        setPendingKeycode(code);
        setPendingLabel(label);
    };

    const toggleMod = (mod: keyof typeof mods) => {
        const newMods = { ...mods, [mod]: !mods[mod] };
        setMods(newMods);
        // If a base key is already selected, update the pending keycode with new mods
        if (pendingKeycode !== null) {
            const base = pendingKeycode & 0xFF;
            const anyMod = newMods.ctrl || newMods.shift || newMods.alt || newMods.gui;
            const newCode = anyMod ? buildModKeycode(base, newMods) : base;
            setPendingKeycode(newCode);
            setPendingLabel(getKeyLabelCompact(newCode));
        }
    };

    const handleApply = async () => {
        if (pendingKeycode === null || !definition) return;
        if (selectedKeyIndices.length === 0) {
            log.warnHid('No keys selected for keycode assignment');
            return;
        }

        for (const idx of selectedKeyIndices) {
            const pos = definition.matrixPositions[idx];
            if (pos) {
                const [row, col] = pos;
                log.hid(`Setting Key: Layer ${selectedLayer}, Row ${row}, Col ${col} -> 0x${pendingKeycode.toString(16)}`);
                await hid.setKeycode(selectedLayer, row, col, pendingKeycode);
                const readBack = await hid.getKeycode(selectedLayer, row, col);
                if (readBack !== pendingKeycode) {
                    log.warnHid(`Keycode verify failed: wrote 0x${pendingKeycode.toString(16)}, read 0x${readBack?.toString(16)}`);
                }
            }
        }

        setPendingKeycode(null);
        setPendingLabel(null);
        setMods({ ctrl: false, shift: false, alt: false, gui: false });
        onKeymapChange?.();
    };

    const category = KEY_CATEGORIES[activeCategory];

    return (
        <div className="space-y-3">
            {/* Category tabs */}
            <div className="flex flex-wrap gap-1">
                {KEY_CATEGORIES.map((cat, i) => (
                    <button
                        key={cat.name}
                        onClick={() => setActiveCategory(i)}
                        className={clsx(
                            "px-2 py-1 rounded text-[10px] font-semibold transition-colors",
                            activeCategory === i
                                ? "bg-primary text-white"
                                : "bg-surface-highlight text-text-muted hover:text-text-secondary"
                        )}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Key grid */}
            <div className="bg-surface border border-border rounded-lg p-3">
                <div className="grid grid-cols-4 gap-1.5 max-h-72 overflow-y-auto">
                    {category.codes.map((code) => {
                        const label = (KEYCODE_MAP[code] || `0x${code.toString(16)}`).replace('\n', ' ');
                        const effectiveCode = noMods ? code : buildModKeycode(code, mods);
                        const isSelected = pendingKeycode === effectiveCode;
                        return (
                            <button
                                key={code}
                                onClick={() => handleSelectKey(code)}
                                className={clsx(
                                    "py-1.5 px-1 rounded text-xs border transition-all truncate",
                                    isSelected
                                        ? "bg-primary text-white border-primary"
                                        : "bg-surface-highlight border-transparent hover:border-text-muted text-text-secondary"
                                )}
                                title={label}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Modifier toggles for combos */}
            <div className="bg-surface border border-border rounded-lg p-3">
                <div className="text-[10px] text-text-muted mb-2 font-semibold">Modifier Combo</div>
                <div className="grid grid-cols-4 gap-1.5">
                    {([
                        ['ctrl', 'Ctrl'],
                        ['shift', 'Shift'],
                        ['alt', 'Alt'],
                        ['gui', 'Gui'],
                    ] as const).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => toggleMod(key)}
                            className={clsx(
                                "py-1.5 rounded text-[10px] font-bold border transition-all",
                                mods[key]
                                    ? "bg-primary/20 text-primary border-primary/40"
                                    : "bg-surface-highlight border-transparent text-text-muted hover:border-text-muted"
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                {!noMods && (
                    <div className="text-[10px] text-primary/70 mt-1.5">
                        Combo: {[mods.ctrl && 'Ctrl', mods.shift && 'Shift', mods.alt && 'Alt', mods.gui && 'Gui'].filter(Boolean).join('+')}+Key
                    </div>
                )}
            </div>

            {/* Apply button */}
            <button
                disabled={!pendingKeycode || selectedKeyIndices.length === 0}
                onClick={handleApply}
                className={clsx(
                    "w-full py-2 rounded-lg font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all",
                    (!pendingKeycode || selectedKeyIndices.length === 0)
                        ? "bg-surface-highlight text-text-muted cursor-not-allowed opacity-50"
                        : "bg-primary text-white shadow-lg hover:shadow-primary/30 active:scale-95"
                )}
            >
                <Save size={16} />
                APPLY
            </button>

            {pendingLabel && (
                <div className="text-center text-[10px] text-text-muted animate-pulse">
                    Ready to assign <span className="text-primary font-bold">"{pendingLabel}"</span> to {selectedKeyIndices.length} key{selectedKeyIndices.length !== 1 ? 's' : ''}
                </div>
            )}
        </div>
    );
}
