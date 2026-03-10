import { useState } from 'react';
import { ColorPicker } from './ColorPicker';
import { KeymapFlow } from './KeymapFlow';
import { RapidTriggerControl } from './RapidTriggerControl';
import { ConfigHistory } from './ConfigHistory';
import { Settings2, Download, Upload, CheckCircle2 } from 'lucide-react';
import { configService } from '../../../services/ConfigService';
import { log } from '../../../services/Logger';
import { clsx } from 'clsx';
import type { VIAKeyboardDefinition } from '../../../types/via';

interface PropertyPanelProps {
    activeMode: 'mapping' | 'lighting' | 'settings';
    activeDefinition?: VIAKeyboardDefinition;
    selectedModuleId: string | null;
    selectedKeyIndices?: number[];
    selectedLayer?: number;
    onConfigRestore?: () => void;
    onKeymapChange?: () => void;
    onKeyColorChange?: (indices: number[], color: string | null) => void;
    keyColors?: Record<number, string>;
    onPerKeyColorsRestore?: (colors: Record<number, string>) => Promise<void> | void;
    onSelectAll?: () => void;
}

export function PropertyPanel({ activeMode, activeDefinition, selectedModuleId, selectedKeyIndices = [], selectedLayer = 0, onConfigRestore, onKeymapChange, onKeyColorChange, keyColors, onPerKeyColorsRestore, onSelectAll }: PropertyPanelProps) {
    const [backupState, setBackupState] = useState<'idle' | 'backing-up' | 'done' | 'error'>('idle');
    const [backupProgress, setBackupProgress] = useState(0);

    // If no module selected, we might still show generic global settings in some modes
    if (!selectedModuleId) {
        return (
            <div className="p-4 h-full flex items-center justify-center text-text-muted text-xs">
                Select a module to edit properties
            </div>
        );
    }

    const handleBackup = async () => {
        if (!activeDefinition || backupState === 'backing-up') return;
        setBackupState('backing-up');
        setBackupProgress(0);
        try {
            const cfg = await configService.backupConfig(
                activeDefinition,
                keyColors,
                (layer, total) => setBackupProgress(Math.round(((layer + 1) / total) * 100)),
            );
            if (cfg) {
                const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `framework-config-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                setBackupState('done');
                setTimeout(() => setBackupState('idle'), 2000);
            } else {
                log.warnConfig('Backup failed — no device connected or read error');
                setBackupState('error');
                setTimeout(() => setBackupState('idle'), 2000);
            }
        } catch (err) {
            log.errorConfig(`Backup failed: ${err}`);
            setBackupState('error');
            setTimeout(() => setBackupState('idle'), 2000);
        }
    };

    const handleRestore = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const text = await file.text();
            try {
                const json = JSON.parse(text);
                if (!activeDefinition) return;
                const result = await configService.restoreConfig(json, activeDefinition);
                if (result.success) {
                    if (result.perKeyColors && onPerKeyColorsRestore) {
                        onPerKeyColorsRestore(result.perKeyColors);
                    }
                    onConfigRestore?.();
                }
            } catch {
                log.warnConfig('Invalid config file — could not parse JSON');
            }
        };
        input.click();
    };

    // Keyboard Logic (Default)
    return (
        <div className="p-4 space-y-4 h-full">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold text-primary uppercase tracking-widest border-b border-primary/30 pb-1">
                    {activeMode === 'mapping' ? 'Key Mapping' : activeMode === 'settings' ? 'Settings' : 'Lighting'}
                </h2>
                <span className="text-[10px] font-mono text-text-muted">
                    {selectedModuleId.toUpperCase()}
                    {selectedKeyIndices.length > 0 && ` // ${selectedKeyIndices.length} KEYS`}
                </span>
            </div>

            {activeMode === 'mapping' && (
                <>
                    <KeymapFlow
                        definition={activeDefinition}
                        selectedKeyIndices={selectedKeyIndices}
                        selectedLayer={selectedLayer}
                        onKeymapChange={onKeymapChange}
                    />
                    <RapidTriggerControl />
                </>
            )}

            {activeMode === 'lighting' && (
                <>
                    <ColorPicker
                        definition={activeDefinition}
                        selectedKeyIndices={selectedKeyIndices}
                        onKeyColorChange={onKeyColorChange}
                        keyColors={keyColors}
                        onSelectAll={onSelectAll}
                    />
                    <ConfigHistory onPerKeyColorsRestore={onPerKeyColorsRestore} keyColors={keyColors} onSelectAll={onSelectAll} />
                </>
            )}

            {activeMode === 'settings' && (
                <div className="space-y-4">
                    <div className="bg-surface border border-border p-4 rounded-lg space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <Settings2 size={16} />
                            Full Backup & Restore
                        </h3>
                        <p className="text-[10px] text-text-muted">
                            Export or import a complete device backup as a JSON file.
                        </p>
                        <div className="text-[9px] text-text-muted/70 space-y-0.5 bg-surface-highlight/50 rounded px-2 py-1.5">
                            <div>Includes:</div>
                            <div className="pl-2">- All 6 keymap layers (every key binding)</div>
                            <div className="pl-2">- Global RGB settings (effect, color, brightness, speed)</div>
                            <div className="pl-2">- Per-key RGB colors (if any are set)</div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleBackup}
                                disabled={backupState === 'backing-up'}
                                className={clsx(
                                    "flex-1 py-2 rounded text-xs flex items-center justify-center gap-2 transition-colors",
                                    backupState === 'done'
                                        ? "bg-green-600 text-white"
                                        : backupState === 'error'
                                            ? "bg-red-500/20 text-red-400"
                                            : backupState === 'backing-up'
                                                ? "bg-surface-highlight text-text-muted cursor-wait"
                                                : "bg-surface-highlight hover:bg-primary hover:text-white"
                                )}
                            >
                                {backupState === 'backing-up' ? (
                                    <>
                                        <Download size={14} className="animate-pulse" />
                                        Reading... {backupProgress}%
                                    </>
                                ) : backupState === 'done' ? (
                                    <>
                                        <CheckCircle2 size={14} />
                                        Downloaded!
                                    </>
                                ) : backupState === 'error' ? (
                                    'Backup failed'
                                ) : (
                                    <>
                                        <Download size={14} /> Backup
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleRestore}
                                className="flex-1 bg-surface-highlight hover:bg-primary hover:text-white transition-colors py-2 rounded text-xs flex items-center justify-center gap-2"
                            >
                                <Upload size={14} /> Restore
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
