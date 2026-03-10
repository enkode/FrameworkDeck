import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

interface HelpArticle {
    title: string;
    content: string;
}

interface HelpCategory {
    name: string;
    articles: HelpArticle[];
}

const HELP_CATEGORIES: HelpCategory[] = [
    {
        name: 'Getting Started',
        articles: [
            {
                title: 'Connecting your device',
                content: 'Click "Connect Device" and select your Framework Laptop 16 keyboard or macropad from the browser\'s device picker. You\'ll need to grant permission for each device separately.\n\nOnce connected, the app will automatically detect whether it\'s an ANSI keyboard or RGB macropad and show the appropriate layout.',
            },
            {
                title: 'Switching between devices',
                content: 'If you\'ve previously granted access to multiple devices (keyboard + macropad), they\'ll appear in the sidebar. Click "Switch to..." to connect to a different device.\n\nYou can also click "Add Device" to grant access to additional input modules.',
            },
            {
                title: 'Auto-restore on reconnect',
                content: 'Your RGB settings and per-key colors are saved locally and automatically restored when you reconnect a device. This also handles sleep/wake cycles where the LED driver loses its state.',
            },
        ],
    },
    {
        name: 'Key Mapping',
        articles: [
            {
                title: 'Remapping keys',
                content: 'Switch to the Key Mapping tab. Click a key on the virtual keyboard to select it, then use the key picker panel on the right to assign a new keycode.\n\nChanges are sent to the keyboard immediately via the VIA protocol and stored in the keyboard\'s EEPROM.',
            },
            {
                title: 'Layers',
                content: 'The keyboard supports 6 layers (0-5). Layer 0 is the default. Higher layers override lower ones when activated.\n\nUse the layer selector at the bottom of the sidebar to switch between layers. Keys set to KC_TRNS (transparent) will fall through to the layer below.',
            },
        ],
    },
    {
        name: 'Lighting',
        articles: [
            {
                title: 'Global RGB controls',
                content: 'The Lighting tab lets you control brightness, color, effect, and speed for the entire keyboard. Changes take effect immediately.\n\nClick "Save to Device" to write settings to EEPROM so they persist across power cycles.',
            },
            {
                title: 'Per-key RGB colors',
                content: 'With custom firmware installed, you can set individual key colors. Click a key on the virtual keyboard to select it, then adjust the color picker.\n\nMulti-select: Ctrl+click to toggle individual keys. Shift+click to select a range of keys on the same row. Click an empty area to deselect all.',
            },
            {
                title: 'Config History',
                content: 'The Config History panel (in the Lighting tab) automatically saves snapshots when you save settings to the device. You can also manually save named snapshots.\n\nRestore any previous configuration with one click, or export snapshots as JSON files for backup.',
            },
            {
                title: 'LED Test & Troubleshooting',
                content: 'Click "Test LEDs" to flash all keys through white, red, green, and blue. This helps verify that all LEDs are working.\n\nIf some or no keys light up, the app will guide you through diagnostics and offer quick fixes like resetting brightness or enabling the solid color effect.',
            },
        ],
    },
    {
        name: 'Firmware',
        articles: [
            {
                title: 'Per-key RGB firmware',
                content: 'Per-key RGB requires custom QMK firmware with the rgb_remote feature. The standard Framework firmware only supports global RGB effects.\n\nUse the Firmware tab to download and flash the custom firmware. The process uses QMK\'s built-in bootloader and takes about 30 seconds.',
            },
        ],
    },
    {
        name: 'Troubleshooting',
        articles: [
            {
                title: 'LEDs not responding',
                content: 'Try these steps in order:\n\n1. Press Fn+Space or Fn+F10 on your keyboard — these shortcuts can toggle LEDs off\n2. Click "Reset Lights" to set known-good defaults\n3. Use "Test Connection" in the sidebar to verify HID communication\n4. Disconnect and reconnect the device\n5. Close and reopen the laptop lid to reset the LED driver',
            },
            {
                title: 'Connection issues',
                content: 'If the device disconnects unexpectedly:\n\n1. The app will show a "Connect" button — click it to reconnect\n2. If reconnection fails, try unplugging and re-plugging the device\n3. Make sure no other app (VIA, Vial) has the device open\n4. Check the Diagnostics log in the Lighting tab for error details',
            },
            {
                title: 'Settings lost after sleep',
                content: 'The Framework keyboard\'s LED driver (IS31FL3743A) loses its I2C state during certain sleep modes. The app automatically re-applies saved settings when the page becomes visible again.\n\nIf colors still look wrong after waking, click the refresh button in the Lighting tab to re-read and re-apply settings.',
            },
        ],
    },
];

export function HelpPanel() {
    const [expandedCategory, setExpandedCategory] = useState<string | null>('Getting Started');
    const [expandedArticle, setExpandedArticle] = useState<string | null>(null);

    return (
        <div className="p-4 space-y-3 overflow-auto h-full">
            <h2 className="text-sm font-bold text-text-primary">Help & Guides</h2>
            <p className="text-[10px] text-text-muted">
                Learn how to use Framework Input Architect to configure your keyboard and macropad.
            </p>

            <div className="space-y-2">
                {HELP_CATEGORIES.map(category => {
                    const isCatExpanded = expandedCategory === category.name;
                    return (
                        <div key={category.name} className="bg-surface border border-border rounded-lg overflow-hidden">
                            <button
                                onClick={() => setExpandedCategory(isCatExpanded ? null : category.name)}
                                className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-semibold text-text-primary hover:bg-surface-highlight transition-colors"
                            >
                                <span>{category.name}</span>
                                <ChevronDown size={14} className={clsx("text-text-muted transition-transform", isCatExpanded && "rotate-180")} />
                            </button>
                            {isCatExpanded && (
                                <div className="border-t border-border">
                                    {category.articles.map(article => {
                                        const isArticleExpanded = expandedArticle === `${category.name}:${article.title}`;
                                        return (
                                            <div key={article.title} className="border-b border-border/50 last:border-0">
                                                <button
                                                    onClick={() => setExpandedArticle(isArticleExpanded ? null : `${category.name}:${article.title}`)}
                                                    className="w-full px-4 py-2 flex items-center justify-between text-[11px] text-text-secondary hover:text-text-primary hover:bg-surface-highlight/50 transition-colors"
                                                >
                                                    <span>{article.title}</span>
                                                    <ChevronDown size={12} className={clsx("text-text-muted transition-transform flex-shrink-0 ml-2", isArticleExpanded && "rotate-180")} />
                                                </button>
                                                {isArticleExpanded && (
                                                    <div className="px-4 pb-3 text-[10px] text-text-muted leading-relaxed whitespace-pre-line">
                                                        {article.content}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
