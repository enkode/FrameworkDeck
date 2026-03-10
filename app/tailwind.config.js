/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg)',
        surface: 'var(--bg-panel)',
        'surface-2': 'var(--bg-panel-2)',
        'surface-highlight': 'var(--bg-panel-2)',
        primary: 'var(--tan)',
        'primary-dim': 'var(--tan-dim)',
        danger: 'var(--red)',
        'danger-dim': 'var(--red-dim)',
        info: 'var(--blue)',
        'info-dim': 'var(--blue-dim)',
        success: 'var(--green)',
        cream: 'var(--cream)',
        'cream-dim': 'var(--cream-dim)',
        'cream-faint': 'var(--cream-faint)',
        muted: 'var(--gray)',
        border: 'var(--border)',
        'border-2': 'var(--border-2)',
        // HID component compatibility aliases
        text: {
          primary: 'var(--cream)',
          secondary: 'var(--cream-dim)',
          muted: 'var(--gray)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'JetBrains Mono', 'monospace'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px -5px var(--tan-dim)',
        'glow-sm': '0 0 8px -2px var(--tan-dim)',
      },
    },
  },
  plugins: [],
}
