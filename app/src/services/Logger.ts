type LogLevel = 'INFO' | 'WARN' | 'ERROR';

// Lazy-loaded Tauri log functions (only available in Tauri runtime)
let tauriInfo: ((msg: string) => Promise<void>) | null = null;
let tauriWarn: ((msg: string) => Promise<void>) | null = null;
let tauriError: ((msg: string) => Promise<void>) | null = null;
let tauriLoaded = false;

async function loadTauriLog() {
    if (tauriLoaded) return;
    tauriLoaded = true;
    try {
        if ('__TAURI__' in window) {
            const mod = await import('@tauri-apps/plugin-log');
            tauriInfo = mod.info;
            tauriWarn = mod.warn;
            tauriError = mod.error;
        }
    } catch {
        // Not in Tauri environment — fall back to console
    }
}

class Logger {
    private buffer: string[] = [];
    private maxBuffer = 500;
    private listeners: Set<(entry: string) => void> = new Set();

    constructor() {
        loadTauriLog();
    }

    private emit(level: LogLevel, category: string, msg: string) {
        const ts = new Date().toISOString().slice(11, 23);
        const entry = `[${ts}] [${level}] [${category}] ${msg}`;
        this.buffer.push(entry);
        if (this.buffer.length > this.maxBuffer) {
            this.buffer = this.buffer.slice(-this.maxBuffer);
        }
        this.listeners.forEach(cb => cb(entry));

        const fullMsg = `[${category}] ${msg}`;

        // Route to Tauri log file if available
        if (tauriInfo) {
            if (level === 'ERROR') tauriError!(fullMsg).catch(() => {});
            else if (level === 'WARN') tauriWarn!(fullMsg).catch(() => {});
            else tauriInfo(fullMsg).catch(() => {});
        }

        // Always also log to browser console for dev tools
        if (level === 'ERROR') console.error(fullMsg);
        else if (level === 'WARN') console.warn(fullMsg);
        else console.log(fullMsg);
    }

    // Category methods (INFO level)
    hid(msg: string) { this.emit('INFO', 'HID', msg); }
    rgb(msg: string) { this.emit('INFO', 'RGB', msg); }
    config(msg: string) { this.emit('INFO', 'CONFIG', msg); }
    device(msg: string) { this.emit('INFO', 'DEVICE', msg); }
    ui(msg: string) { this.emit('INFO', 'UI', msg); }

    // Warning variants
    warnHid(msg: string) { this.emit('WARN', 'HID', msg); }
    warnRgb(msg: string) { this.emit('WARN', 'RGB', msg); }
    warnConfig(msg: string) { this.emit('WARN', 'CONFIG', msg); }
    warnDevice(msg: string) { this.emit('WARN', 'DEVICE', msg); }

    // Error variants
    errorHid(msg: string) { this.emit('ERROR', 'HID', msg); }
    errorRgb(msg: string) { this.emit('ERROR', 'RGB', msg); }
    errorConfig(msg: string) { this.emit('ERROR', 'CONFIG', msg); }
    errorDevice(msg: string) { this.emit('ERROR', 'DEVICE', msg); }

    /** Subscribe to new log entries */
    onLog(cb: (entry: string) => void): () => void {
        this.listeners.add(cb);
        return () => this.listeners.delete(cb);
    }

    /** Get the current log buffer */
    getBuffer(): string[] {
        return [...this.buffer];
    }

    /** Clear the log buffer */
    clear() {
        this.buffer = [];
    }

    /** Export log as a plain text string */
    export(): string {
        return this.buffer.join('\n');
    }
}

export const log = new Logger();
