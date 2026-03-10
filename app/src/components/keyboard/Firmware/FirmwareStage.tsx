import { useState, useCallback } from 'react';
import { useDeviceStore } from '../../../store/device';
import { FIRMWARE_CATALOG, getTargetForDevice, type FirmwareEntry } from '../../../data/firmware-catalog';
import { validateUF2, type UF2ValidationResult } from '../../../utils/uf2';
import { downloadBuildScript, BUILD_TARGETS, type BuildTarget } from '../../../utils/build-script';
import { Shield, Download, HardDrive, Copy, RefreshCw, ChevronRight, CheckCircle2, FileUp, AlertTriangle, ExternalLink, Terminal, Check, Play } from 'lucide-react';
import { clsx } from 'clsx';

type FlashStep = 'select' | 'download' | 'bootloader' | 'flash' | 'reconnect';

const STEPS: { id: FlashStep; label: string }[] = [
    { id: 'select', label: 'Select' },
    { id: 'download', label: 'Download' },
    { id: 'bootloader', label: 'Bootloader' },
    { id: 'flash', label: 'Flash' },
    { id: 'reconnect', label: 'Reconnect' },
];

const COMPAT_STYLES = {
    full: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', label: 'Compatible' },
    partial: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', label: 'Partial' },
    none: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', label: 'Incompatible' },
};

export function FirmwareStage() {
    const { isConnected, connectedProductId, connectedProductName, hasPerKeyRGB, connectDevice } = useDeviceStore();

    const [activeStep, setActiveStep] = useState<FlashStep>('select');
    const [selectedFirmware, setSelectedFirmware] = useState<FirmwareEntry | null>(null);
    const [activeMethodIndex, setActiveMethodIndex] = useState(0);
    const [uf2Result, setUf2Result] = useState<UF2ValidationResult | null>(null);
    const [showBuildGuide, setShowBuildGuide] = useState(false);
    const [buildTarget, setBuildTarget] = useState<BuildTarget>('ansi');
    const [copied, setCopied] = useState(false);

    const copyToClipboard = useCallback((text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, []);

    const stepIndex = STEPS.findIndex(s => s.id === activeStep);

    const target = selectedFirmware && connectedProductId
        ? getTargetForDevice(selectedFirmware, connectedProductId)
        : selectedFirmware?.targets[0] ?? null;

    const needsBuild = selectedFirmware?.features.includes('build-from-source') ?? false;

    const handleSelectFirmware = (fw: FirmwareEntry) => {
        setSelectedFirmware(fw);
        setActiveStep('download');
        setActiveMethodIndex(0);
        setUf2Result(null);
        setShowBuildGuide(false);
    };

    const handleFileValidate = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.uf2';
        input.onchange = async (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const buffer = await file.arrayBuffer();
            setUf2Result(validateUF2(buffer));
        };
        input.click();
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-start p-8 overflow-y-auto">
            <div className="w-full max-w-2xl space-y-6">

                {/* Safety Banner */}
                <div className="flex items-start gap-3 p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                    <Shield size={20} className="text-green-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-green-400/80">
                        <span className="font-semibold text-green-400">Safe to flash.</span> The RP2040 bootloader is burned into ROM and cannot be overwritten.
                        If a flash fails, the chip automatically falls back to USB boot mode. Have an external keyboard handy.
                    </div>
                </div>

                {/* Device Status */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-surface border border-border">
                    <div className={clsx("w-2 h-2 rounded-full", isConnected ? "bg-green-500" : "bg-text-muted")} />
                    <div className="text-xs">
                        {isConnected ? (
                            <span className="text-text-primary">
                                {connectedProductName}
                                {hasPerKeyRGB && <span className="text-green-400 ml-2">Per-Key RGB Active</span>}
                            </span>
                        ) : (
                            <span className="text-text-muted">No device connected — you can still browse firmware</span>
                        )}
                    </div>
                </div>

                {/* Step Progress */}
                <div className="flex items-center gap-1">
                    {STEPS.map((step, i) => {
                        const isCurrent = step.id === activeStep;
                        const isDone = i < stepIndex;
                        return (
                            <div key={step.id} className="flex items-center gap-1 flex-1">
                                <button
                                    onClick={() => i <= stepIndex && setActiveStep(step.id)}
                                    className={clsx(
                                        "flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold transition-colors flex-1 justify-center",
                                        isCurrent ? "bg-primary text-white" :
                                        isDone ? "bg-green-500/10 text-green-400" :
                                        "bg-surface-highlight text-text-muted"
                                    )}
                                >
                                    {isDone && <CheckCircle2 size={10} />}
                                    {step.label}
                                </button>
                                {i < STEPS.length - 1 && (
                                    <ChevronRight size={12} className="text-text-muted shrink-0" />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Step Content */}
                <div className="bg-surface border border-border rounded-xl p-6 space-y-5">

                    {/* STEP: Select Firmware */}
                    {activeStep === 'select' && (
                        <>
                            <h2 className="text-sm font-bold text-text-primary">Choose Firmware</h2>

                            {/* Current firmware detection */}
                            {isConnected && (
                                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                                    <div className="text-[10px] font-bold text-primary uppercase tracking-wider">Currently Installed</div>
                                    <div className="text-xs text-text-primary font-semibold">
                                        {hasPerKeyRGB ? 'Per-Key RGB firmware (rgb_remote)' : 'Official Framework QMK (or compatible)'}
                                    </div>
                                    <div className="text-[10px] text-text-muted">
                                        {hasPerKeyRGB
                                            ? 'Your device supports per-key RGB via the rgb_remote protocol. All features in this app are available.'
                                            : 'Your device uses standard VIA protocol. Flash the nucleardog firmware below to unlock per-key RGB control.'}
                                    </div>
                                </div>
                            )}

                            <p className="text-xs text-text-muted">
                                Select firmware to flash. To switch firmware, select one below, download it, enter bootloader mode, and copy the .uf2 file to the device.
                            </p>
                            <div className="space-y-3">
                                {FIRMWARE_CATALOG.map(fw => {
                                    const compat = COMPAT_STYLES[fw.compatibility];
                                    return (
                                        <button
                                            key={fw.id}
                                            onClick={() => handleSelectFirmware(fw)}
                                            className="w-full text-left p-4 rounded-lg bg-surface-highlight border border-border hover:border-primary transition-colors group"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
                                                    {fw.name}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={clsx("px-1.5 py-0.5 rounded text-[9px] font-bold", compat.bg, compat.border, compat.text, "border")}>
                                                        {compat.label}
                                                    </span>
                                                    <ChevronRight size={16} className="text-text-muted group-hover:text-primary transition-colors" />
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-text-muted mt-1">by {fw.author}</div>
                                            <div className="text-xs text-text-secondary mt-2">{fw.description}</div>
                                            <div className="flex gap-1.5 mt-3 flex-wrap">
                                                {fw.features.map(f => (
                                                    <span key={f} className="px-1.5 py-0.5 rounded text-[9px] bg-primary/10 text-primary font-mono">
                                                        {f}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className={clsx("text-[10px] mt-2", compat.text)}>
                                                {fw.compatibilityNote}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* STEP: Download */}
                    {activeStep === 'download' && selectedFirmware && (
                        <>
                            <h2 className="text-sm font-bold text-text-primary">
                                {needsBuild ? 'Get Firmware' : 'Download Firmware'}
                            </h2>

                            {/* Compatibility warning */}
                            {selectedFirmware.compatibility !== 'full' && (
                                <div className={clsx(
                                    "flex items-start gap-2 p-3 rounded-lg border",
                                    COMPAT_STYLES[selectedFirmware.compatibility].bg,
                                    COMPAT_STYLES[selectedFirmware.compatibility].border,
                                )}>
                                    <AlertTriangle size={14} className={COMPAT_STYLES[selectedFirmware.compatibility].text + " shrink-0 mt-0.5"} />
                                    <div className={clsx("text-[10px]", COMPAT_STYLES[selectedFirmware.compatibility].text)}>
                                        {selectedFirmware.compatibilityNote}
                                    </div>
                                </div>
                            )}

                            {!needsBuild ? (
                                <>
                                    <p className="text-xs text-text-muted">
                                        Download the <span className="font-semibold text-text-secondary">.uf2</span> firmware file
                                        for your {target?.deviceName ?? 'device'}.
                                    </p>
                                    <a
                                        href={selectedFirmware.downloadUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
                                    >
                                        <Download size={16} />
                                        Download from Releases
                                        <ExternalLink size={12} />
                                    </a>
                                </>
                            ) : (
                                <>
                                    <p className="text-xs text-text-muted">
                                        This firmware needs to be compiled from source. The script below
                                        handles everything automatically — cloning, installing tools, and compiling.
                                    </p>

                                    {/* One-click build script */}
                                    <div className="bg-surface-highlight border border-border rounded-lg p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Play size={16} className="text-primary" />
                                            <div className="text-xs font-semibold text-text-primary">Automatic Build Script</div>
                                        </div>
                                        <p className="text-[10px] text-text-muted">
                                            Downloads a PowerShell script that automatically:
                                        </p>
                                        <div className="space-y-1 text-[10px] text-text-muted">
                                            <div className="flex gap-2"><span className="text-primary font-bold">1.</span> Clones the firmware source code</div>
                                            <div className="flex gap-2"><span className="text-primary font-bold">2.</span> Downloads and installs QMK MSYS (build environment)</div>
                                            <div className="flex gap-2"><span className="text-primary font-bold">3.</span> Asks which device, then compiles the firmware</div>
                                            <div className="flex gap-2"><span className="text-primary font-bold">4.</span> Copies the .uf2 to your Desktop</div>
                                        </div>
                                        <button
                                            onClick={() => downloadBuildScript()}
                                            className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
                                        >
                                            <Download size={16} />
                                            Download Build Script
                                        </button>
                                        <div className="text-[10px] text-text-muted space-y-1">
                                            <div>Double-click the downloaded <span className="font-mono text-primary">build-firmware.cmd</span> to run it</div>
                                            <div>Prerequisite: <a href="https://git-scm.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Git</a> must be installed and in your PATH</div>
                                        </div>
                                    </div>

                                    {/* Info note */}
                                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                        <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                                        <div className="text-[10px] text-amber-400/80">
                                            <span className="font-semibold">First run:</span> The script will download QMK MSYS (~900 MB)
                                            and the firmware source (~230 MB). Subsequent runs reuse the existing install.
                                            Total build time: 5-15 minutes.
                                        </div>
                                    </div>

                                    {/* Manual instructions toggle */}
                                    <button
                                        onClick={() => setShowBuildGuide(!showBuildGuide)}
                                        className="flex items-center gap-2 w-full py-2 rounded-lg bg-surface-highlight/50 text-text-muted border border-border/50 hover:border-border transition-colors text-[10px] font-semibold justify-center"
                                    >
                                        <Terminal size={12} />
                                        {showBuildGuide ? 'Hide' : 'Show'} Manual Build Commands
                                    </button>

                                    {showBuildGuide && (() => {
                                        const repoUrl = selectedFirmware.sourceUrl;
                                        const cfg = BUILD_TARGETS[buildTarget];
                                        const targetSelector = (
                                            <div className="flex gap-1">
                                                {(Object.entries(BUILD_TARGETS) as [BuildTarget, typeof BUILD_TARGETS[BuildTarget]][]).map(([key, val]) => (
                                                    <button
                                                        key={key}
                                                        onClick={() => setBuildTarget(key)}
                                                        className={clsx(
                                                            "px-3 py-1.5 rounded text-[10px] font-semibold transition-colors flex-1",
                                                            buildTarget === key
                                                                ? "bg-primary text-white"
                                                                : "bg-surface-highlight text-text-muted hover:text-text-secondary"
                                                        )}
                                                    >
                                                        {val.label}
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                        const setupScript = [
                                            '# STEP 1 — Run in PowerShell (one time setup)',
                                            'pip install qmk',
                                            `git clone ${repoUrl} $HOME\\qmk_firmware_fw16`,
                                            'qmk setup -H $HOME\\qmk_firmware_fw16 -y',
                                        ].join('\n');
                                        const compileScript = [
                                            '# STEP 2 — Run in "QMK MSYS" (from Start Menu)',
                                            'cd ~/qmk_firmware_fw16',
                                            `qmk compile -kb ${cfg.keyboard} -km ${cfg.keymap}`,
                                            `echo "Output: ${cfg.outputFile}"`,
                                        ].join('\n');
                                        return (
                                            <div className="space-y-3">
                                                {targetSelector}
                                                <div className="relative rounded-lg bg-[#1a1a2e] border border-border overflow-hidden">
                                                    <div className="flex items-center justify-between px-3 py-1.5 bg-[#12122a] border-b border-border">
                                                        <span className="text-[10px] text-text-muted font-mono">PowerShell — Setup</span>
                                                        <button
                                                            onClick={() => copyToClipboard(setupScript)}
                                                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-text-muted hover:text-white transition-colors"
                                                        >
                                                            {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                                                            {copied ? 'Copied!' : 'Copy'}
                                                        </button>
                                                    </div>
                                                    <pre className="p-3 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap">
                                                        {setupScript.split('\n').map((line, i) => (
                                                            <div key={i} className={line.startsWith('#') ? 'text-text-muted' : 'text-green-400'}>{line}</div>
                                                        ))}
                                                    </pre>
                                                </div>
                                                <div className="relative rounded-lg bg-[#1a1a2e] border border-border overflow-hidden">
                                                    <div className="flex items-center justify-between px-3 py-1.5 bg-[#12122a] border-b border-border">
                                                        <span className="text-[10px] text-text-muted font-mono">QMK MSYS — Compile</span>
                                                        <button
                                                            onClick={() => copyToClipboard(compileScript)}
                                                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-text-muted hover:text-white transition-colors"
                                                        >
                                                            {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                                                            {copied ? 'Copied!' : 'Copy'}
                                                        </button>
                                                    </div>
                                                    <pre className="p-3 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap">
                                                        {compileScript.split('\n').map((line, i) => (
                                                            <div key={i} className={line.startsWith('#') ? 'text-text-muted' : line.startsWith('echo') ? 'text-cyan-400' : 'text-green-400'}>{line}</div>
                                                        ))}
                                                    </pre>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </>
                            )}

                            <a
                                href={selectedFirmware.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-center text-[10px] text-text-muted hover:text-primary transition-colors"
                            >
                                View source code &rarr;
                            </a>

                            {/* UF2 Validator */}
                            <div className="border-t border-border pt-4 space-y-3">
                                <div className="text-xs font-semibold text-text-secondary">Validate .uf2 File</div>
                                <p className="text-[10px] text-text-muted">
                                    Verify your .uf2 file is a valid RP2040 firmware before flashing.
                                </p>
                                <button
                                    onClick={handleFileValidate}
                                    className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-surface-highlight text-text-secondary border border-border hover:border-primary transition-colors text-xs font-semibold"
                                >
                                    <FileUp size={14} />
                                    Select .uf2 to Validate
                                </button>

                                {uf2Result && (
                                    <div className={clsx(
                                        "p-3 rounded-lg text-xs space-y-1",
                                        uf2Result.valid
                                            ? "bg-green-500/5 border border-green-500/20 text-green-400"
                                            : "bg-red-500/5 border border-red-500/20 text-red-400"
                                    )}>
                                        {uf2Result.valid ? (
                                            <>
                                                <div className="flex items-center gap-1.5 font-semibold">
                                                    <CheckCircle2 size={12} />
                                                    Valid UF2 Firmware
                                                </div>
                                                <div className="text-[10px] font-mono space-y-0.5 text-green-400/70">
                                                    <div>{uf2Result.totalBlocks} blocks, {(uf2Result.totalPayloadBytes / 1024).toFixed(1)} KB</div>
                                                    <div>{uf2Result.isRP2040 ? 'RP2040 target confirmed' : `Family: 0x${uf2Result.familyId.toString(16)}`}</div>
                                                    <div>Flash: 0x{uf2Result.startAddress.toString(16)} — 0x{uf2Result.endAddress.toString(16)}</div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-1.5">
                                                <AlertTriangle size={12} />
                                                {uf2Result.error}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setActiveStep('bootloader')}
                                className="w-full py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                            >
                                I have the .uf2 file
                                <ChevronRight size={16} />
                            </button>
                        </>
                    )}

                    {/* STEP: Enter Bootloader */}
                    {activeStep === 'bootloader' && target && (
                        <>
                            <h2 className="text-sm font-bold text-text-primary">Enter Bootloader Mode</h2>
                            <p className="text-xs text-text-muted">
                                Put your <span className="font-semibold text-text-secondary">{target.deviceName}</span> into
                                bootloader mode. The device will disconnect and appear as a USB drive named
                                <span className="font-mono font-semibold text-primary"> RPI-RP2</span>.
                            </p>

                            {/* Method tabs */}
                            <div className="flex gap-1">
                                {target.methods.map((m, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setActiveMethodIndex(i)}
                                        className={clsx(
                                            "px-3 py-1.5 rounded text-[10px] font-semibold transition-colors",
                                            activeMethodIndex === i
                                                ? "bg-primary text-white"
                                                : "bg-surface-highlight text-text-muted hover:text-text-secondary"
                                        )}
                                    >
                                        {m.title}
                                    </button>
                                ))}
                            </div>

                            {/* Steps */}
                            <div className="space-y-2.5">
                                {target.methods[activeMethodIndex]?.steps.map((step, i) => (
                                    <div key={i} className="flex gap-3 items-start">
                                        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                            {i + 1}
                                        </div>
                                        <div className="text-xs text-text-secondary leading-relaxed">{step}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                                <div className="text-[10px] text-amber-400/80">
                                    Your keyboard will stop working temporarily while in bootloader mode. This is normal.
                                    Have an external keyboard or mouse ready to continue.
                                </div>
                            </div>

                            <button
                                onClick={() => setActiveStep('flash')}
                                className="w-full py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                            >
                                <HardDrive size={16} />
                                I see the RPI-RP2 drive
                                <ChevronRight size={16} />
                            </button>
                        </>
                    )}

                    {/* Fallback if no target */}
                    {activeStep === 'bootloader' && !target && (
                        <>
                            <h2 className="text-sm font-bold text-text-primary">Enter Bootloader Mode</h2>
                            <p className="text-xs text-text-muted">
                                Connect a supported device first, or go back and select a firmware that targets your device.
                            </p>
                        </>
                    )}

                    {/* STEP: Flash */}
                    {activeStep === 'flash' && (
                        <>
                            <h2 className="text-sm font-bold text-text-primary">Flash the Firmware</h2>
                            <p className="text-xs text-text-muted">
                                Copy the <span className="font-mono font-semibold text-text-secondary">.uf2</span> file
                                to the <span className="font-mono font-semibold text-primary">RPI-RP2</span> drive.
                            </p>

                            <div className="space-y-3">
                                <div className="flex gap-3 items-start">
                                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</div>
                                    <div className="text-xs text-text-secondary">
                                        Open <span className="font-semibold">File Explorer</span> and find the
                                        <span className="font-mono text-primary"> RPI-RP2</span> drive
                                    </div>
                                </div>
                                <div className="flex gap-3 items-start">
                                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</div>
                                    <div className="text-xs text-text-secondary flex items-center gap-1.5">
                                        <Copy size={12} className="text-primary shrink-0" />
                                        Drag and drop (or copy-paste) the <span className="font-mono">.uf2</span> file onto the drive
                                    </div>
                                </div>
                                <div className="flex gap-3 items-start">
                                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</div>
                                    <div className="text-xs text-text-secondary">
                                        The device will automatically reboot with the new firmware.
                                        The <span className="font-mono text-primary">RPI-RP2</span> drive will disappear — this is expected.
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setActiveStep('reconnect')}
                                className="w-full py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                            >
                                Done — the drive disappeared
                                <ChevronRight size={16} />
                            </button>
                        </>
                    )}

                    {/* STEP: Reconnect */}
                    {activeStep === 'reconnect' && (
                        <>
                            <h2 className="text-sm font-bold text-text-primary">Reconnect Your Device</h2>
                            <p className="text-xs text-text-muted">
                                The device has rebooted with the new firmware. Reconnect it to verify.
                            </p>

                            {isConnected ? (
                                <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20 space-y-2">
                                    <div className="flex items-center gap-2 text-green-400 font-semibold text-sm">
                                        <CheckCircle2 size={16} />
                                        Device Connected!
                                    </div>
                                    <div className="text-xs text-green-400/70">
                                        {connectedProductName}
                                        {hasPerKeyRGB ? (
                                            <span className="block mt-1 text-green-400">
                                                Per-Key RGB firmware detected — head to the Lighting tab to try it!
                                            </span>
                                        ) : selectedFirmware?.compatibility === 'full' && selectedFirmware?.features.includes('per-key-rgb') ? (
                                            <span className="block mt-1 text-amber-400">
                                                Per-Key RGB not detected. The firmware may need a different build configuration.
                                            </span>
                                        ) : (
                                            <span className="block mt-1 text-text-muted">
                                                Firmware flashed successfully.
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <button
                                        onClick={connectDevice}
                                        className="w-full py-3 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw size={16} />
                                        Connect Device
                                    </button>
                                    <p className="text-[10px] text-text-muted text-center">
                                        If the device doesn't appear, wait a few seconds for it to finish booting.
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    setActiveStep('select');
                                    setSelectedFirmware(null);
                                    setUf2Result(null);
                                    setShowBuildGuide(false);
                                }}
                                className="w-full py-2 rounded-lg bg-surface-highlight text-text-secondary text-xs font-semibold hover:text-text-primary transition-colors"
                            >
                                Start Over
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
