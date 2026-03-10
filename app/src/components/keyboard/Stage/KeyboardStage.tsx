import { useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Crosshair, Plus, X, XCircle } from 'lucide-react';
import { VirtualKeyboard } from './VirtualKeyboard';

import type { VIAKeyboardDefinition } from '../../../types/via';
import type { KeyPreset } from '../../../data/key-presets';

interface KeyboardStageProps {
    definition: VIAKeyboardDefinition;
    pressedKeys: string[];
    selectedKeyIndices: number[];
    onKeySelect: (index: number, modifiers: { ctrl: boolean; shift: boolean }) => void;
    onDeselectAll?: () => void;
    deviceKeymap?: number[];
    keyColors?: Record<number, string>;
    shiftHoverPreviewIndices?: number[];
    onKeyHover?: (index: number | null) => void;
    activeMode?: string;
    presets?: KeyPreset[];
    customPresetIds?: Set<string>;
    onPresetSelect?: (indices: number[], ctrl: boolean) => void;
    onSavePreset?: (label: string, indices: number[]) => void;
    onDeletePreset?: (presetId: string) => void;
    selectedCount?: number;
    layerMappingLabel?: string;
    onCancelLayerMapping?: () => void;
}

export function KeyboardStage({ definition, pressedKeys, selectedKeyIndices, onKeySelect, onDeselectAll, deviceKeymap, keyColors, shiftHoverPreviewIndices, onKeyHover, activeMode, presets, customPresetIds, onPresetSelect, onSavePreset, onDeletePreset, selectedCount = 0, layerMappingLabel, onCancelLayerMapping }: KeyboardStageProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [naming, setNaming] = useState(false);
    const [presetName, setPresetName] = useState('');
    const nameInputRef = useRef<HTMLInputElement>(null);

    const isPresetActive = (preset: KeyPreset) =>
        preset.indices.length > 0 && preset.indices.every(i => selectedKeyIndices.includes(i));

    const handleStartNaming = () => {
        setNaming(true);
        setPresetName('');
        setTimeout(() => nameInputRef.current?.focus(), 50);
    };

    const handleSavePreset = () => {
        const label = presetName.trim();
        if (label && selectedKeyIndices.length > 0 && onSavePreset) {
            onSavePreset(label, [...selectedKeyIndices]);
        }
        setNaming(false);
        setPresetName('');
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-full flex flex-col overflow-hidden bg-background"
        >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-center py-3">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-text-primary tracking-tight">{definition.name}</h2>
                    <p className="text-xs text-text-muted uppercase tracking-widest">VIA Device</p>
                </div>
            </div>

            {/* Layer mapping banner */}
            {layerMappingLabel && (
                <div className="flex-shrink-0 mx-4 py-2 px-4 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Crosshair size={14} className="text-primary animate-pulse" />
                        <span className="text-xs font-semibold text-primary">
                            Click a key to assign <span className="font-bold">{layerMappingLabel}</span>
                        </span>
                    </div>
                    <button
                        onClick={() => onCancelLayerMapping?.()}
                        className="text-[10px] text-text-muted hover:text-red-400 transition-colors px-2 py-0.5 rounded"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Keyboard — fills remaining space */}
            <div className="flex-1 min-h-0 flex items-center justify-center p-4">
                <VirtualKeyboard
                    definition={definition}
                    pressedKeys={pressedKeys}
                    selectedKeyIndices={selectedKeyIndices}
                    onKeySelect={onKeySelect}
                    deviceKeymap={deviceKeymap}
                    keyColors={keyColors}
                    shiftHoverPreviewIndices={shiftHoverPreviewIndices}
                    onKeyHover={onKeyHover}
                />
            </div>

            {/* Bottom action bar: Clear + Presets */}
            {(selectedCount > 0 || (activeMode === 'lighting' && presets && presets.length > 0 && onPresetSelect)) && (
                <div
                    className="flex-shrink-0 py-2 flex flex-wrap items-center justify-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Clear selection */}
                    {selectedCount > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDeselectAll?.(); }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                        >
                            <XCircle size={10} />
                            Clear ({selectedCount})
                        </button>
                    )}

                    {/* Separator */}
                    {selectedCount > 0 && activeMode === 'lighting' && presets && presets.length > 0 && (
                        <div className="w-px h-4 bg-border mx-1" />
                    )}

                    {/* Preset pills (lighting mode only) */}
                    {activeMode === 'lighting' && presets && presets.length > 0 && onPresetSelect && (
                        <>
                            {presets.map(preset => {
                                const active = isPresetActive(preset);
                                const isCustom = customPresetIds?.has(preset.id);
                                return (
                                    <div key={preset.id} className="relative group">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onPresetSelect(preset.indices, e.ctrlKey || e.metaKey);
                                            }}
                                            className={clsx(
                                                "px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all duration-150 border",
                                                active
                                                    ? "bg-primary text-white border-primary shadow-sm shadow-primary/30"
                                                    : isCustom
                                                        ? "bg-surface text-text-muted border-dashed border-border hover:border-primary/50 hover:text-text-primary"
                                                        : "bg-surface text-text-muted border-border hover:border-primary/50 hover:text-text-primary",
                                                isCustom && "pr-5"
                                            )}
                                        >
                                            {preset.label}
                                        </button>
                                        {isCustom && onDeletePreset && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeletePreset(preset.id);
                                                }}
                                                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-red-500/20 hover:text-red-400 text-text-muted"
                                            >
                                                <X size={8} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Save current selection as preset */}
                            {selectedKeyIndices.length > 0 && onSavePreset && (
                                naming ? (
                                    <div className="flex items-center gap-1">
                                        <input
                                            ref={nameInputRef}
                                            type="text"
                                            value={presetName}
                                            onChange={(e) => setPresetName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSavePreset();
                                                if (e.key === 'Escape') { setNaming(false); setPresetName(''); }
                                            }}
                                            onBlur={() => { if (!presetName.trim()) setNaming(false); }}
                                            placeholder="Preset name..."
                                            maxLength={20}
                                            className="px-2 py-1 rounded-full text-[10px] bg-surface border border-primary/50 text-text-primary outline-none w-28 placeholder:text-text-muted/50"
                                        />
                                        <button
                                            onClick={handleSavePreset}
                                            disabled={!presetName.trim()}
                                            className={clsx(
                                                "px-2 py-1 rounded-full text-[10px] font-semibold border transition-all",
                                                presetName.trim()
                                                    ? "bg-primary text-white border-primary"
                                                    : "bg-surface text-text-muted border-border opacity-50"
                                            )}
                                        >
                                            Save
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleStartNaming(); }}
                                        className="px-2 py-1 rounded-full text-[10px] font-semibold border border-dashed border-primary/30 text-primary/60 hover:border-primary hover:text-primary transition-all flex items-center gap-1"
                                    >
                                        <Plus size={10} /> Save Selection
                                    </button>
                                )
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
