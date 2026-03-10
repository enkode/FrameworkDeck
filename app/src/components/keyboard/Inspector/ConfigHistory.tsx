import { useState, useEffect } from 'react';
import { storageService, type ConfigSnapshot } from '../../../services/StorageService';
import { hid } from '../../../services/HIDService';
import { log } from '../../../services/Logger';
import { useDeviceStore } from '../../../store/device';
import { FRAMEWORK_RGB_EFFECTS } from '../../../data/definitions/framework16';
import { hsvToRgb } from '../../../utils/color';
import { RotateCcw, Trash2, Download, Clock, ChevronDown, Save, Star, Pencil, Check, X } from 'lucide-react';
import { clsx } from 'clsx';

function formatTimestamp(ts: number): string {
    const date = new Date(ts);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (isToday) return `Today ${time}`;
    if (isYesterday) return `Yesterday ${time}`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` ${time}`;
}

function SnapshotSummary({ snapshot }: { snapshot: ConfigSnapshot }) {
    const effect = snapshot.rgbSettings
        ? FRAMEWORK_RGB_EFFECTS.find(e => e.id === snapshot.rgbSettings?.effectId)
        : null;
    const [cr, cg, cb] = snapshot.rgbSettings
        ? hsvToRgb(snapshot.rgbSettings.hue, snapshot.rgbSettings.saturation, 255)
        : [0, 0, 0];
    const brightnessPercent = snapshot.rgbSettings
        ? Math.max(1, Math.round((snapshot.rgbSettings.brightness / 255) * 100))
        : null;
    const hasPerKey = snapshot.perKeyColors && Object.keys(snapshot.perKeyColors).length > 0;

    if (!snapshot.rgbSettings && !hasPerKey) return null;

    return (
        <div className="flex items-center gap-2 text-[9px] text-text-muted font-mono">
            {snapshot.rgbSettings && (
                <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/10"
                    style={{ backgroundColor: `rgb(${cr},${cg},${cb})` }}
                />
            )}
            <span>
                {brightnessPercent !== null && `${brightnessPercent}%`}
                {effect ? ` ${effect.name}` : ''}
                {hasPerKey ? ' + per-key' : ''}
            </span>
        </div>
    );
}

interface ConfigHistoryProps {
    onPerKeyColorsRestore?: (colors: Record<number, string>) => Promise<void> | void;
    keyColors?: Record<number, string>;
    onSelectAll?: () => void;
}

export function ConfigHistory({ onPerKeyColorsRestore, keyColors, onSelectAll }: ConfigHistoryProps) {
    const { connectedProductId } = useDeviceStore();
    const [snapshots, setSnapshots] = useState<ConfigSnapshot[]>([]);
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const [historyExpanded, setHistoryExpanded] = useState(false);
    const [savingName, setSavingName] = useState('');
    const [showSaveInput, setShowSaveInput] = useState(false);
    const [saving, setSaving] = useState(false);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');

    useEffect(() => {
        if (connectedProductId === null) return;
        setSnapshots(storageService.loadSnapshots(connectedProductId));
    }, [connectedProductId]);

    const handleRestore = async (snapshot: ConfigSnapshot) => {
        if (restoringId || connectedProductId === null) return;
        setRestoringId(snapshot.id);
        log.config(`Restoring snapshot: ${snapshot.label}`);
        try {
            const currentBrightness = await hid.getRGBBrightness();
            const currentEffect = await hid.getRGBEffect();
            const currentSpeed = await hid.getRGBEffectSpeed();
            const currentColor = await hid.getRGBColor();
            const currentRgb = currentBrightness !== null && currentEffect !== null && currentSpeed !== null && currentColor !== null
                ? { brightness: currentBrightness, effectId: currentEffect, speed: currentSpeed, hue: currentColor[0], saturation: currentColor[1] }
                : undefined;
            storageService.saveSnapshot(connectedProductId, {
                label: `Before restore: ${snapshot.label}`,
                rgbSettings: currentRgb,
                perKeyColors: keyColors && Object.keys(keyColors).length > 0 ? keyColors : undefined,
            });

            const hasPerKey = snapshot.perKeyColors && Object.keys(snapshot.perKeyColors).length > 0;

            // VIA settings FIRST — so setRGBEffect/brightness don't reset per-key mode
            if (snapshot.rgbSettings) {
                const { brightness, effectId, speed, hue, saturation } = snapshot.rgbSettings;
                log.config(`Restoring VIA settings: brightness=${brightness}, effect=${effectId}, speed=${speed}, H=${hue}, S=${saturation}`);
                await hid.setRGBBrightness(brightness);
                await hid.setRGBEffect(effectId);
                await hid.setRGBEffectSpeed(speed);
                await hid.setRGBColor(hue, saturation);
                await hid.saveRGBSettings(snapshot.rgbSettings);
                storageService.saveDeviceState(connectedProductId, {
                    rgbSettings: snapshot.rgbSettings,
                });
                log.config('VIA settings restored and saved');
            }

            // Per-key colors LAST — so they aren't overridden by VIA commands above
            if (hasPerKey && onPerKeyColorsRestore) {
                log.config(`Restoring ${Object.keys(snapshot.perKeyColors!).length} per-key colors...`);
                await onPerKeyColorsRestore(snapshot.perKeyColors!);
                // Auto-select all keys so the per-key brightness slider is visible
                onSelectAll?.();
            } else if (onPerKeyColorsRestore) {
                log.config('No per-key colors in snapshot — clearing per-key mode');
                await onPerKeyColorsRestore({});
            }

            setSnapshots(storageService.loadSnapshots(connectedProductId));
        } catch (err) {
            log.errorConfig(`Restore failed: ${err}`);
        } finally {
            setRestoringId(null);
        }
    };

    const handleDelete = (snapshotId: string) => {
        if (connectedProductId === null) return;
        storageService.deleteSnapshot(connectedProductId, snapshotId);
        setSnapshots(prev => prev.filter(s => s.id !== snapshotId));
    };

    const handleExport = (snapshot: ConfigSnapshot) => {
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fw-config-${snapshot.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleManualSave = async () => {
        if (connectedProductId === null || saving) return;
        setSaving(true);
        try {
            const brightness = await hid.getRGBBrightness();
            const effectId = await hid.getRGBEffect();
            const speed = await hid.getRGBEffectSpeed();
            const color = await hid.getRGBColor();
            const rgbSettings = brightness !== null && effectId !== null && speed !== null && color !== null
                ? { brightness, effectId, speed, hue: color[0], saturation: color[1] }
                : undefined;
            const perKeyColors = keyColors && Object.keys(keyColors).length > 0 ? keyColors : undefined;
            const label = savingName.trim() || 'Untitled';

            // Persist to EEPROM so settings survive power cycles
            if (rgbSettings) {
                await hid.saveRGBSettings(rgbSettings);
                log.config('Settings saved to device EEPROM');
            }

            // Update localStorage device state for auto-restore on reconnect
            storageService.saveDeviceState(connectedProductId, {
                rgbSettings,
                perKeyColors,
            });

            // Create named snapshot for history
            storageService.saveSnapshot(connectedProductId, {
                label: `Manual: ${label}`,
                rgbSettings,
                perKeyColors,
            });
            setSnapshots(storageService.loadSnapshots(connectedProductId));
            setSavingName('');
            setShowSaveInput(false);
        } catch (err) {
            log.errorConfig(`Save failed: ${err}`);
        } finally {
            setSaving(false);
        }
    };

    const handleRename = (snapshotId: string) => {
        const newLabel = renameValue.trim();
        if (!newLabel || connectedProductId === null) {
            setRenamingId(null);
            return;
        }
        storageService.renameSnapshot(connectedProductId, snapshotId, `Manual: ${newLabel}`);
        setSnapshots(storageService.loadSnapshots(connectedProductId));
        setRenamingId(null);
        setRenameValue('');
    };

    // Split into manual saves vs auto-history
    const manualSaves = [...snapshots].filter(s => s.label.startsWith('Manual:')).reverse();
    const autoHistory = [...snapshots].filter(s => !s.label.startsWith('Manual:')).reverse();

    const displayLabel = (label: string) => label.startsWith('Manual: ') ? label.slice(8) : label;

    return (
        <div className="space-y-3">
            {/* === SAVED CONFIGS — prominent box === */}
            <div className="bg-surface border-2 border-primary/20 p-4 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                        <Star size={16} />
                        Saved Configs
                    </h3>
                    <span className="text-[9px] text-text-muted">{manualSaves.length} saved</span>
                </div>

                <p className="text-[10px] text-text-muted">
                    Save and restore your favorite lighting configurations.
                </p>

                {/* Save button / input */}
                {showSaveInput ? (
                    <div className="flex gap-1.5">
                        <input
                            type="text"
                            placeholder="Config name..."
                            value={savingName}
                            onChange={(e) => setSavingName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleManualSave()}
                            className="flex-1 px-2 py-1.5 rounded-md text-[10px] bg-surface-highlight border border-border text-text-primary placeholder:text-text-muted/50 outline-none focus:border-primary"
                            autoFocus
                        />
                        <button
                            onClick={handleManualSave}
                            disabled={saving}
                            className={clsx(
                                "px-3 py-1.5 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-colors",
                                saving ? "bg-primary/20 text-primary cursor-wait" : "bg-primary text-white hover:bg-primary/90"
                            )}
                        >
                            <Save size={10} />
                            {saving ? '...' : 'Save'}
                        </button>
                        <button
                            onClick={() => { setShowSaveInput(false); setSavingName(''); }}
                            className="px-2 py-1.5 rounded-md text-[10px] text-text-muted hover:text-text-primary transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowSaveInput(true)}
                        className="w-full py-2 rounded-md text-[10px] font-semibold flex items-center justify-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                    >
                        <Save size={12} />
                        Save Current Config
                    </button>
                )}

                {/* Saved configs list */}
                {manualSaves.length === 0 ? (
                    <div className="text-[10px] text-text-muted/50 italic py-3 text-center">
                        No saved configs yet. Save your current settings above.
                    </div>
                ) : (
                    <div className="space-y-1.5 max-h-48 overflow-auto">
                        {manualSaves.map(snapshot => {
                            const isRestoring = restoringId === snapshot.id;
                            const isRenaming = renamingId === snapshot.id;

                            return (
                                <div
                                    key={snapshot.id}
                                    className="bg-surface-highlight/50 border border-primary/10 rounded-md p-2.5 space-y-1.5"
                                >
                                    <div className="flex items-center justify-between">
                                        {isRenaming ? (
                                            <div className="flex items-center gap-1 flex-1 min-w-0">
                                                <input
                                                    type="text"
                                                    value={renameValue}
                                                    onChange={(e) => setRenameValue(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleRename(snapshot.id);
                                                        if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
                                                    }}
                                                    className="flex-1 px-1.5 py-0.5 rounded text-[10px] bg-surface border border-primary/50 text-text-primary outline-none"
                                                    autoFocus
                                                />
                                                <button onClick={() => handleRename(snapshot.id)} className="p-0.5 text-green-400 hover:text-green-300"><Check size={10} /></button>
                                                <button onClick={() => { setRenamingId(null); setRenameValue(''); }} className="p-0.5 text-text-muted hover:text-text-primary"><X size={10} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <span className="text-[10px] text-text-primary font-semibold truncate">
                                                    {displayLabel(snapshot.label)}
                                                </span>
                                                <button
                                                    onClick={() => { setRenamingId(snapshot.id); setRenameValue(displayLabel(snapshot.label)); }}
                                                    className="p-0.5 text-text-muted/40 hover:text-text-primary transition-colors flex-shrink-0"
                                                    title="Rename"
                                                >
                                                    <Pencil size={9} />
                                                </button>
                                            </div>
                                        )}
                                        <span className="text-[9px] text-text-muted/60 flex-shrink-0 ml-2">
                                            {formatTimestamp(snapshot.timestamp)}
                                        </span>
                                    </div>

                                    <SnapshotSummary snapshot={snapshot} />

                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleRestore(snapshot)}
                                            disabled={isRestoring || restoringId !== null}
                                            className={clsx(
                                                "flex-1 py-1.5 rounded text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors",
                                                isRestoring
                                                    ? "bg-primary/20 text-primary cursor-wait"
                                                    : "bg-primary/10 text-primary hover:bg-primary/20"
                                            )}
                                        >
                                            <RotateCcw size={10} className={clsx(isRestoring && "animate-spin")} />
                                            {isRestoring ? 'Restoring...' : 'Restore'}
                                        </button>
                                        <button
                                            onClick={() => handleExport(snapshot)}
                                            title="Export as JSON"
                                            className="px-2 py-1 rounded text-[10px] text-text-muted hover:text-primary transition-colors bg-surface-highlight/50"
                                        >
                                            <Download size={10} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(snapshot.id)}
                                            title="Delete"
                                            className="px-2 py-1 rounded text-[10px] text-text-muted hover:text-red-400 transition-colors bg-surface-highlight/50"
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* === AUTO HISTORY — collapsible === */}
            {autoHistory.length > 0 && (
                <div className="bg-surface border border-border rounded-lg overflow-hidden">
                    <button
                        onClick={() => setHistoryExpanded(!historyExpanded)}
                        className="w-full p-3 flex items-center justify-between"
                    >
                        <h3 className="text-[10px] font-semibold flex items-center gap-2 text-text-muted uppercase tracking-wider">
                            <Clock size={12} />
                            Auto History ({autoHistory.length})
                        </h3>
                        <ChevronDown size={12} className={clsx("text-text-muted transition-transform", historyExpanded && "rotate-180")} />
                    </button>

                    {historyExpanded && (
                        <div className="px-3 pb-3 space-y-1.5 max-h-48 overflow-auto">
                            {autoHistory.map(snapshot => {
                                const isRestoring = restoringId === snapshot.id;
                                return (
                                    <div
                                        key={snapshot.id}
                                        className="bg-surface-highlight/30 border border-border/30 rounded-md p-2 space-y-1"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-text-muted truncate">{snapshot.label}</span>
                                            <span className="text-[9px] text-text-muted/40 flex-shrink-0 ml-2">
                                                {formatTimestamp(snapshot.timestamp)}
                                            </span>
                                        </div>
                                        <SnapshotSummary snapshot={snapshot} />
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleRestore(snapshot)}
                                                disabled={isRestoring || restoringId !== null}
                                                className={clsx(
                                                    "flex-1 py-1 rounded text-[9px] font-semibold flex items-center justify-center gap-1 transition-colors",
                                                    isRestoring
                                                        ? "bg-primary/20 text-primary cursor-wait"
                                                        : "bg-surface-highlight text-text-muted hover:text-primary hover:bg-primary/10"
                                                )}
                                            >
                                                <RotateCcw size={8} className={clsx(isRestoring && "animate-spin")} />
                                                {isRestoring ? 'Restoring...' : 'Restore'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(snapshot.id)}
                                                title="Delete"
                                                className="px-1.5 py-1 rounded text-[9px] text-text-muted/40 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 size={8} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
