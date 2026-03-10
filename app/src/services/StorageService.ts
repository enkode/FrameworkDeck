const STORAGE_PREFIX = 'fw-hid';

interface StoredDeviceState {
    perKeyColors: Record<number, string>;
    rgbSettings?: RGBSettings;
    updatedAt: number;
}

export interface RGBSettings {
    brightness: number;
    effectId: number;
    speed: number;
    hue: number;
    saturation: number;
}

export interface ConfigSnapshot {
    id: string;
    timestamp: number;
    label: string;
    rgbSettings?: RGBSettings;
    perKeyColors?: Record<number, string>;
}

// ── Tauri Store (persistent file-based storage) ──────────────────────
// The Tauri store plugin writes a JSON file to the OS app-data directory
// (e.g. %APPDATA%/com.enkode.input-architect/) that survives app updates
// and reinstalls.  We lazy-load it so the app still works in the browser.

let tauriStore: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<void>;
    save: () => Promise<void>;
} | null = null;

let storeReady = false;
let storeInitPromise: Promise<void> | null = null;

async function initStore(): Promise<void> {
    if (storeReady) return;
    if (storeInitPromise) { await storeInitPromise; return; }

    storeInitPromise = (async () => {
        if (!('__TAURI__' in window)) { storeReady = true; return; }
        try {
            const { load } = await import('@tauri-apps/plugin-store');
            tauriStore = await load('config.json', { autoSave: false, defaults: {} });
            storeReady = true;
            console.log('[StorageService] Tauri store loaded (config.json)');
        } catch (err) {
            console.warn('[StorageService] Tauri store unavailable, using localStorage only:', err);
            storeReady = true;
        }
    })();
    await storeInitPromise;
}

/** Write a key to the Tauri store (fire-and-forget). */
function persistToStore(key: string, value: unknown): void {
    if (!tauriStore) return;
    tauriStore.set(key, value)
        .then(() => tauriStore!.save())
        .catch(err => console.warn('[StorageService] Store persist failed:', err));
}

/** Read a key from the Tauri store. */
async function readFromStore<T>(key: string): Promise<T | null> {
    if (!tauriStore) return null;
    try {
        const val = await tauriStore.get(key);
        return val as T ?? null;
    } catch {
        return null;
    }
}

class StorageService {
    private deviceKey(productId: number): string {
        return `${STORAGE_PREFIX}:device:${productId.toString(16)}`;
    }

    /**
     * Initialize persistent storage.  Must be called once at startup.
     * On first launch after reinstall, hydrates localStorage from the
     * Tauri store so saved configs survive app updates.
     */
    async init(): Promise<void> {
        await initStore();
        if (!tauriStore) return; // browser mode — nothing to hydrate

        // Hydrate localStorage from store for every key the store knows about
        try {
            const keys = await readFromStore<string[]>('_keys');
            if (!keys || keys.length === 0) return;

            let hydrated = 0;
            for (const key of keys) {
                const localVal = localStorage.getItem(key);
                if (!localVal) {
                    // localStorage is empty for this key — restore from store
                    const storeVal = await readFromStore<unknown>(key);
                    if (storeVal !== null) {
                        localStorage.setItem(key, JSON.stringify(storeVal));
                        hydrated++;
                    }
                }
            }
            if (hydrated > 0) {
                console.log(`[StorageService] Hydrated ${hydrated} keys from persistent store`);
            }
        } catch (err) {
            console.warn('[StorageService] Hydration failed:', err);
        }
    }

    /** Track a key in the store's key registry so we can hydrate later. */
    private trackKey(key: string): void {
        if (!tauriStore) return;
        readFromStore<string[]>('_keys').then(keys => {
            const set = new Set(keys ?? []);
            if (!set.has(key)) {
                set.add(key);
                persistToStore('_keys', Array.from(set));
            }
        });
    }

    saveDeviceState(productId: number, state: Partial<StoredDeviceState>): void {
        const key = this.deviceKey(productId);
        const existing = this.loadDeviceState(productId);
        const merged: StoredDeviceState = {
            perKeyColors: state.perKeyColors ?? existing?.perKeyColors ?? {},
            rgbSettings: state.rgbSettings ?? existing?.rgbSettings,
            updatedAt: Date.now(),
        };
        try {
            localStorage.setItem(key, JSON.stringify(merged));
            this.trackKey(key);
            persistToStore(key, merged);
        } catch (e) {
            console.warn('localStorage save failed:', e);
        }
    }

    loadDeviceState(productId: number): StoredDeviceState | null {
        try {
            const raw = localStorage.getItem(this.deviceKey(productId));
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    clearDeviceState(productId: number): void {
        localStorage.removeItem(this.deviceKey(productId));
    }

    // --- Config Snapshots ---

    private readonly SNAPSHOT_MAX = 20;

    private snapshotKey(productId: number): string {
        return `${STORAGE_PREFIX}:snapshots:${productId.toString(16)}`;
    }

    saveSnapshot(productId: number, data: Omit<ConfigSnapshot, 'id' | 'timestamp'>): ConfigSnapshot {
        const snapshot: ConfigSnapshot = {
            ...data,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
        };
        const key = this.snapshotKey(productId);
        const existing = this.loadSnapshots(productId);
        existing.push(snapshot);
        // Trim: remove oldest auto-saves first when over limit
        while (existing.length > this.SNAPSHOT_MAX) {
            const oldestAutoIdx = existing.findIndex(s => !s.label.startsWith('Manual'));
            if (oldestAutoIdx >= 0) {
                existing.splice(oldestAutoIdx, 1);
            } else {
                existing.shift();
            }
        }
        try {
            localStorage.setItem(key, JSON.stringify(existing));
            this.trackKey(key);
            persistToStore(key, existing);
        } catch (e) {
            console.warn('Snapshot save failed:', e);
        }
        return snapshot;
    }

    loadSnapshots(productId: number): ConfigSnapshot[] {
        try {
            const raw = localStorage.getItem(this.snapshotKey(productId));
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    deleteSnapshot(productId: number, snapshotId: string): void {
        const key = this.snapshotKey(productId);
        const snapshots = this.loadSnapshots(productId).filter(s => s.id !== snapshotId);
        try {
            localStorage.setItem(key, JSON.stringify(snapshots));
            persistToStore(key, snapshots);
        } catch (e) {
            console.warn('Snapshot delete failed:', e);
        }
    }

    renameSnapshot(productId: number, snapshotId: string, newLabel: string): void {
        const key = this.snapshotKey(productId);
        const snapshots = this.loadSnapshots(productId);
        const idx = snapshots.findIndex(s => s.id === snapshotId);
        if (idx >= 0) {
            snapshots[idx].label = newLabel;
            try {
                localStorage.setItem(key, JSON.stringify(snapshots));
                persistToStore(key, snapshots);
            } catch (e) {
                console.warn('Snapshot rename failed:', e);
            }
        }
    }

    // --- Custom Key Presets ---

    private readonly PRESET_MAX = 20;

    private presetKey(productId: number): string {
        return `${STORAGE_PREFIX}:custom-presets:${productId.toString(16)}`;
    }

    saveCustomPreset(productId: number, label: string, indices: number[]): { id: string; label: string; indices: number[] } {
        const preset = {
            id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            label,
            indices,
        };
        const key = this.presetKey(productId);
        const existing = this.loadCustomPresets(productId);
        existing.push(preset);
        while (existing.length > this.PRESET_MAX) {
            existing.shift();
        }
        try {
            localStorage.setItem(key, JSON.stringify(existing));
            this.trackKey(key);
            persistToStore(key, existing);
        } catch (e) {
            console.warn('Custom preset save failed:', e);
        }
        return preset;
    }

    loadCustomPresets(productId: number): { id: string; label: string; indices: number[] }[] {
        try {
            const raw = localStorage.getItem(this.presetKey(productId));
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    deleteCustomPreset(productId: number, presetId: string): void {
        const key = this.presetKey(productId);
        const presets = this.loadCustomPresets(productId).filter(p => p.id !== presetId);
        try {
            localStorage.setItem(key, JSON.stringify(presets));
            persistToStore(key, presets);
        } catch (e) {
            console.warn('Custom preset delete failed:', e);
        }
    }
}

export const storageService = new StorageService();
