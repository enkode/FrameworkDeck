import { clsx } from 'clsx';
import { useState } from 'react';
import { ChevronDown, Layers, MapPin } from 'lucide-react';

export type LayerSwitchType = 'MO' | 'TG' | 'TO';

interface LayerSelectorProps {
    selectedLayer: number;
    onLayerSelect: (layer: number) => void;
    onMapLayer?: (targetLayer: number, type: LayerSwitchType) => void;
    isMappingActive?: boolean;
}

const LAYER_TYPES: { type: LayerSwitchType; label: string; desc: string }[] = [
    { type: 'MO', label: 'MO', desc: 'Hold' },
    { type: 'TG', label: 'TG', desc: 'Toggle' },
    { type: 'TO', label: 'TO', desc: 'Switch' },
];

export function LayerSelector({ selectedLayer, onLayerSelect, onMapLayer, isMappingActive }: LayerSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [pickingLayer, setPickingLayer] = useState<number | null>(null);
    const layers = [0, 1, 2, 3, 4, 5];

    const handleMapClick = (e: React.MouseEvent, layer: number) => {
        e.stopPropagation();
        setPickingLayer(pickingLayer === layer ? null : layer);
    };

    const handleTypeSelect = (layer: number, type: LayerSwitchType) => {
        onMapLayer?.(layer, type);
        setPickingLayer(null);
        setIsOpen(false);
    };

    return (
        <div className="border-t border-border p-4">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">
                Active Layer
            </label>
            <div className="relative">
                <button
                    onClick={() => { setIsOpen(!isOpen); setPickingLayer(null); }}
                    className={clsx(
                        "w-full h-12 bg-surface-highlight border rounded-lg flex items-center justify-between px-4 transition-colors",
                        isMappingActive ? "border-primary animate-pulse" : "border-border hover:border-primary"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <Layers size={18} className="text-primary" />
                        <div className="flex flex-col items-start leading-none">
                            <span className="font-bold text-sm">Layer {selectedLayer}</span>
                            <span className="text-[10px] text-text-muted">{selectedLayer === 0 ? 'Base Layer' : `Custom Layer ${selectedLayer}`}</span>
                        </div>
                    </div>
                    <ChevronDown size={16} className={clsx("text-text-muted transition-transform", isOpen && "rotate-180")} />
                </button>

                {isOpen && (
                    <div className="absolute bottom-full mb-2 left-0 w-full bg-surface border border-border rounded-lg shadow-xl overflow-hidden z-20">
                        {layers.map((layer) => (
                            <div key={layer} className="relative">
                                <div
                                    className={clsx(
                                        "w-full px-4 py-3 flex items-center gap-3 transition-colors hover:bg-surface-highlight",
                                        selectedLayer === layer ? "text-primary bg-surface-highlight/50" : "text-text-muted"
                                    )}
                                >
                                    <button
                                        onClick={() => {
                                            onLayerSelect(layer);
                                            setIsOpen(false);
                                            setPickingLayer(null);
                                        }}
                                        className="flex items-center gap-3 flex-1 text-left"
                                    >
                                        <span className={clsx(
                                            "w-2 h-2 rounded-full",
                                            selectedLayer === layer ? "bg-primary" : "bg-transparent border border-text-muted"
                                        )} />
                                        <span className="text-sm font-medium">Layer {layer}</span>
                                    </button>
                                    {onMapLayer && (
                                        <button
                                            onClick={(e) => handleMapClick(e, layer)}
                                            className={clsx(
                                                "px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors",
                                                pickingLayer === layer
                                                    ? "bg-primary text-white"
                                                    : "bg-surface-highlight text-text-muted hover:text-primary hover:bg-primary/10"
                                            )}
                                            title={`Map a key to switch to Layer ${layer}`}
                                        >
                                            <MapPin size={10} />
                                            Map
                                        </button>
                                    )}
                                </div>

                                {/* Type picker */}
                                {pickingLayer === layer && (
                                    <div className="px-4 pb-3 pt-1 flex gap-1.5 bg-surface-highlight/30">
                                        {LAYER_TYPES.map(({ type, label, desc }) => (
                                            <button
                                                key={type}
                                                onClick={() => handleTypeSelect(layer, type)}
                                                className="flex-1 py-1.5 rounded text-[10px] font-bold bg-surface border border-border hover:border-primary hover:text-primary transition-colors text-center"
                                                title={`${label}(${layer}) — ${desc}`}
                                            >
                                                <div>{label}</div>
                                                <div className="text-[8px] font-normal text-text-muted">{desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
