/**
 * Scaled font size for inline styles.
 *
 * Returns a CSS `calc()` string that multiplies the base pixel size by
 * the `--font-scale` CSS variable (set on :root by the app store).
 *
 * Usage:
 *   style={{ fontSize: fs(10) }}          // "calc(10px * var(--font-scale, 1))"
 *   style={{ fontSize: fs(10, 1.2) }}     // with custom line-height multiple
 *
 * This ensures every text element in the app responds to the global
 * font scale slider in Settings, without breaking layout proportions.
 */
export function fs(basePx: number): string {
  return `calc(${basePx}px * var(--font-scale, 1))`
}
