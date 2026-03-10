import { useState } from 'react';
import { useDeviceStore } from '../../../store/device';
import { getFirmwareForDevice } from '../../../data/firmware-catalog';
import { Cpu, ExternalLink, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

const COMPAT_BADGE = {
    full: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Compatible' },
    partial: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Partial' },
    none: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Incompatible' },
};

export function FirmwarePanel() {
    const { isConnected, connectedProductId, connectedProductName, hasPerKeyRGB, protocolVersion } = useDeviceStore();
    const [showIncompat, setShowIncompat] = useState(false);

    const availableFirmware = getFirmwareForDevice(connectedProductId);
    const compatible = availableFirmware.filter(fw => fw.compatibility === 'full');
    const other = availableFirmware.filter(fw => fw.compatibility !== 'full');

    return (
        <div className="p-4 space-y-4 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold text-primary uppercase tracking-widest border-b border-primary/30 pb-1">
                    Firmware
                </h2>
                <Cpu size={14} className="text-text-muted" />
            </div>

            {/* Device Info */}
            <div className="bg-surface border border-border rounded-lg p-3 space-y-2">
                <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Current Device</div>
                {isConnected ? (
                    <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-text-primary">{connectedProductName}</div>
                        <div className="text-[10px] text-text-muted font-mono">
                            PID: 0x{connectedProductId?.toString(16).padStart(4, '0')}
                        </div>
                        {protocolVersion > 0 && (
                            <div className="text-[10px] text-text-muted font-mono">
                                VIA Protocol: {protocolVersion}
                            </div>
                        )}
                        <div className={clsx(
                            "text-[10px] font-semibold",
                            hasPerKeyRGB ? "text-green-400" : "text-text-muted"
                        )}>
                            Per-Key RGB: {hasPerKeyRGB ? 'Active' : 'Not detected'}
                        </div>
                    </div>
                ) : (
                    <div className="text-xs text-text-muted">No device connected</div>
                )}
            </div>

            {/* Compatible Firmware */}
            <div className="bg-surface border border-border rounded-lg p-3 space-y-3">
                <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Compatible Firmware</div>
                {compatible.map(fw => {
                    const badge = COMPAT_BADGE[fw.compatibility];
                    return (
                        <div key={fw.id} className="space-y-1.5 pb-3 border-b border-border last:border-0 last:pb-0">
                            <div className="flex items-center justify-between gap-1">
                                <div className="text-xs font-semibold text-text-primary">{fw.name}</div>
                                <span className={clsx("px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0", badge.bg, badge.text)}>
                                    {badge.label}
                                </span>
                            </div>
                            <div className="text-[10px] text-text-muted">{fw.compatibilityNote}</div>
                            <div className="flex gap-2 pt-0.5">
                                <a href={fw.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                                    Source <ExternalLink size={9} />
                                </a>
                                <a href={fw.downloadUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                                    Download <ExternalLink size={9} />
                                </a>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Incompatible Firmware — collapsible */}
            {other.length > 0 && (
                <div className="bg-surface border border-border rounded-lg overflow-hidden">
                    <button
                        onClick={() => setShowIncompat(!showIncompat)}
                        className="w-full p-3 flex items-center justify-between text-[10px] font-semibold text-text-muted uppercase tracking-wider hover:text-text-primary transition-colors"
                    >
                        <span>Other Firmware ({other.length})</span>
                        <ChevronDown size={12} className={clsx("transition-transform", showIncompat && "rotate-180")} />
                    </button>
                    {showIncompat && (
                        <div className="p-3 pt-0 space-y-3">
                            {other.map(fw => {
                                const badge = COMPAT_BADGE[fw.compatibility];
                                return (
                                    <div key={fw.id} className="space-y-1.5 pb-3 border-b border-border last:border-0 last:pb-0 opacity-70">
                                        <div className="flex items-center justify-between gap-1">
                                            <div className="text-xs font-semibold text-text-primary">{fw.name}</div>
                                            <span className={clsx("px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0", badge.bg, badge.text)}>
                                                {badge.label}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-text-muted">{fw.compatibilityNote}</div>
                                        <div className="flex gap-2 pt-0.5">
                                            <a href={fw.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                                                Source <ExternalLink size={9} />
                                            </a>
                                            <a href={fw.downloadUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                                                Download <ExternalLink size={9} />
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Quick guide */}
            <div className="bg-surface border border-border rounded-lg p-3 space-y-2">
                <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">How It Works</div>
                <div className="space-y-1.5 text-[10px] text-text-muted">
                    <div className="flex gap-2"><span className="text-primary font-bold">1.</span> Download the .uf2 firmware</div>
                    <div className="flex gap-2"><span className="text-primary font-bold">2.</span> Enter bootloader mode (device becomes USB drive)</div>
                    <div className="flex gap-2"><span className="text-primary font-bold">3.</span> Copy .uf2 to the RPI-RP2 drive</div>
                    <div className="flex gap-2"><span className="text-primary font-bold">4.</span> Device reboots with new firmware</div>
                </div>
            </div>

            <div className="text-[10px] text-text-muted text-center">
                RP2040 ARM Cortex-M0+ &bull; UF2 bootloader
            </div>
        </div>
    );
}
