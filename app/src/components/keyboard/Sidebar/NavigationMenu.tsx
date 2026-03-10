import { clsx } from 'clsx';
import { Keyboard, Lightbulb, Settings2, HardDriveDownload, HelpCircle } from 'lucide-react';

export type AppMode = 'mapping' | 'lighting' | 'settings' | 'firmware' | 'help';

interface NavigationMenuProps {
    activeMode: AppMode;
    onModeSelect: (mode: AppMode) => void;
}

export function NavigationMenu({ activeMode, onModeSelect }: NavigationMenuProps) {
    const items = [
        { id: 'mapping', label: 'Key Mapping', icon: Keyboard },
        { id: 'lighting', label: 'Lighting', icon: Lightbulb },
        { id: 'settings', label: 'Settings', icon: Settings2 },
        { id: 'firmware', label: 'Firmware', icon: HardDriveDownload },
    ] as const;

    return (
        <nav className="flex flex-col gap-2 p-2">
            {items.map((item) => {
                const isActive = activeMode === item.id;
                const Icon = item.icon;

                return (
                    <button
                        key={item.id}
                        onClick={() => onModeSelect(item.id)}
                        className={clsx(
                            "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group text-sm font-medium",
                            isActive
                                ? "bg-primary text-white shadow-lg shadow-primary/20"
                                : "text-text-muted hover:text-text-primary hover:bg-surface-highlight"
                        )}
                    >
                        <Icon size={18} className={clsx(isActive ? "text-white" : "group-hover:text-primary transition-colors")} />
                        <span>{item.label}</span>

                        {isActive && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        )}
                    </button>
                );
            })}

            <div className="border-t border-border my-1" />

            <button
                onClick={() => onModeSelect('help')}
                className={clsx(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group text-sm font-medium",
                    activeMode === 'help'
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : "text-text-muted hover:text-text-primary hover:bg-surface-highlight"
                )}
            >
                <HelpCircle size={18} className={clsx(activeMode === 'help' ? "text-white" : "group-hover:text-primary transition-colors")} />
                <span>Help & Guides</span>
                {activeMode === 'help' && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
            </button>
        </nav>
    );
}
