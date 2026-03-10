import { Key, type KeyProps } from './Key';

export interface ModuleData {
    id: string;
    type: 'keyboard' | 'numpad' | 'macropad';
    keys: Omit<KeyProps, 'onClick' | 'isSelected'>[];
}

interface ModuleRendererProps {
    module: ModuleData;
    offsetx?: number;
    offsety?: number;
    selectedKeyIndices: number[];
    onKeySelect: (index: number, isMulti: boolean) => void;
}

export function ModuleRenderer({ module, offsetx = 0, offsety = 0, selectedKeyIndices, onKeySelect }: ModuleRendererProps) {
    return (
        <div
            className="absolute transition-transform duration-500 ease-out"
            style={{
                transform: `translate(${offsetx}px, ${offsety}px)`
            }}
        >
            {/* Module PCB/Plate Background Outline could go here */}
            <div className="absolute -inset-2 border border-border/50 rounded-lg bg-surface/5 backdrop-blur-sm -z-10" />

            {module.keys.map((k, i) => (
                <Key
                    key={`${module.id}-${i}`}
                    {...k}
                    isSelected={selectedKeyIndices.includes(i)}
                    onClick={(e) => {
                        const isMulti = e ? (e.ctrlKey || e.metaKey) : false;
                        onKeySelect(i, isMulti);
                    }}
                />
            ))}
        </div>
    );
}
