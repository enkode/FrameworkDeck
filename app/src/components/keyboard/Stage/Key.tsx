import { clsx } from 'clsx';
import { motion } from 'framer-motion';

export interface KeyProps {
    label: string;
    subLabel?: string;
    w?: number; // width in units (1u = 60px approx)
    h?: number; // height in units
    x: number; // grid x position
    y: number; // grid y position
    selectable?: boolean;
    // Logical Matrix Position for QMK
    row?: number;
    col?: number;
    isSelected?: boolean;
    isActive?: boolean;
    onClick?: (e?: React.MouseEvent) => void;
}

export function Key({ label, subLabel, w = 1, h = 1, x, y, isSelected, isActive, onClick }: KeyProps) {
    // Base unit size in pixels
    const U = 54;
    const GAP = 4;

    const width = w * U + (w - 1) * GAP;
    const height = h * U + (h - 1) * GAP;
    const top = y * (U + GAP);
    const left = x * (U + GAP);

    return (
        <motion.div
            layoutId={`key-${x}-${y}`}
            onClick={onClick}
            className={clsx(
                "absolute rounded-md flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 select-none border",
                // Base State
                "bg-surface border-border text-text-secondary shadow-sm",
                // Active State (Being Pressed / Logic Active)
                isActive && "border-primary text-primary shadow-[0_0_15px_rgba(247,88,33,0.3)] bg-primary/10",
                // Selected State (For editing)
                isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background z-10 bg-surface-highlight text-text-primary",
                // Hover State
                !isSelected && "hover:bg-surface-highlight hover:border-text-muted"
            )}
            style={{
                width,
                height,
                top,
                left,
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
        >
            <span className={clsx("font-semibold text-xs", isActive || isSelected ? "text-primary-400" : "text-text-primary")}>
                {label}
            </span>
            {subLabel && (
                <span className="text-[10px] text-text-muted absolute bottom-1 right-1">
                    {subLabel}
                </span>
            )}
        </motion.div>
    );
}
