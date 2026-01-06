import { ref, onValue, set, get } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';

const PATH = 'apps/diversey-solicitacoes-pwa/state';
const LOCAL_STATE_KEY = 'diversey_state_sync';
const LEGACY_STATE_KEYS = ['APP_STATE', 'diversey_state'];
let applyingRemote = false;
let lastRemoteUpdatedAt = 0;

function now() {
    return Date.now();
}

function clone(obj) {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch (_e) {
        return null;
    }
}

function updateStatus(status) {
    if (typeof window === 'undefined') {
        return;
    }
    window.__firebaseSyncStarted = true;
    window.__cloudSyncStatus = status;
    window.dispatchEvent(new CustomEvent('cloud-sync-status', { detail: { status } }));
}

function snapshotFromDataManager() {
    if (typeof DataManager === 'undefined' || !DataManager._sessionCache) {
        return null;
    }
    const cache = DataManager._sessionCache;
    if (!cache || !Object.keys(cache).length) {
        return null;
    }
    const snap = {
        data: clone(cache) || {},
        __meta: cache.__meta ? { ...cache.__meta } : {}
    };
    const partsKey = DataManager.KEYS && DataManager.KEYS.PARTS_VERSION;
    if (partsKey) {
        const pv = localStorage.getItem(partsKey);
        if (pv) {
            snap.partsVersion = pv;
        }
    }
    return snap;
}

function readLocalSnapshot() {
    let raw = localStorage.getItem(LOCAL_STATE_KEY);
    if (!raw) {
        for (const key of LEGACY_STATE_KEYS) {
            const candidate = localStorage.getItem(key);
            if (candidate) {
                raw = candidate;
                break;
            }
        }
    }
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed) {
                return parsed;
            }
        } catch (_e) {
            // ignore
        }
    }
    return snapshotFromDataManager();
}

function writeLocalSnapshot(obj) {
    if (!obj) {
        return;
    }
    try {
        localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(obj));
        LEGACY_STATE_KEYS.forEach((key) => {
            localStorage.setItem(key, JSON.stringify(obj));
        });
    } catch (_e) {
        // ignore
    }

    if (typeof DataManager !== 'undefined' && obj.data) {
        DataManager._sessionCache = obj.data;
        if (obj.partsVersion && DataManager.KEYS && DataManager.KEYS.PARTS_VERSION) {
            localStorage.setItem(DataManager.KEYS.PARTS_VERSION, obj.partsVersion);
        }
        window.dispatchEvent(new CustomEvent('data:updated', { detail: { keys: Object.keys(obj.data || {}) } }));
    }
}

function mergeStrategy(localObj, remoteObj) {
    const lts = localObj?.__meta?.updatedAt || 0;
    const rts = remoteObj?.__meta?.updatedAt || 0;
    return (rts > lts) ? remoteObj : localObj;
}

export function captureLocalSnapshot() {
    const snap = snapshotFromDataManager() || readLocalSnapshot();
    if (snap && !snap.__meta) {
        snap.__meta = {};
    }
    return snap;
}

export async function startFirebaseSync() {
    const db = window.firebaseDB;
    if (!db) {
        console.warn('Firebase DB not initialized yet.');
        return;
    }

    updateStatus('iniciando');

    const stateRef = ref(db, PATH);

    // 1) carregar remoto uma vez
    try {
        const snap = await get(stateRef);
        if (snap.exists()) {
            const remote = snap.val();
            lastRemoteUpdatedAt = remote?.__meta?.updatedAt || 0;
            const local = readLocalSnapshot();
            const chosen = mergeStrategy(local, remote);

            if (chosen === remote) {
                applyingRemote = true;
                writeLocalSnapshot(remote);
                applyingRemote = false;
                updateStatus('sincronizado');
                window.dispatchEvent(new CustomEvent('cloud-sync-applied'));
            } else if (chosen) {
                await pushToCloud(chosen);
            }
        } else {
            const local = readLocalSnapshot();
            if (local) {
                await pushToCloud(local);
            }
        }
    } catch (e) {
        console.error('Falha ao carregar estado remoto:', e);
    }

    // 2) escutar atualizações remotas
    onValue(stateRef, (snap) => {
        if (!snap.exists()) {
            return;
        }
        const remote = snap.val();
        const rts = remote?.__meta?.updatedAt || 0;

        if (rts <= lastRemoteUpdatedAt) {
            return;
        }
        lastRemoteUpdatedAt = rts;

        applyingRemote = true;
        writeLocalSnapshot(remote);
        applyingRemote = false;
        updateStatus('sincronizado');
        window.dispatchEvent(new CustomEvent('cloud-sync-applied'));
    });
}

export async function pushToCloud(stateObj) {
    const db = window.firebaseDB;
    if (!db || shouldSkipCloudWrite()) {
        return;
    }

    const state = clone(stateObj) || captureLocalSnapshot();
    if (!state) {
        return;
    }
    if (!state.__meta) {
        state.__meta = {};
    }
    state.__meta.updatedAt = now();
    state.__meta.updatedBy = window.firebaseUser?.uid || 'anonymous-user';
    lastRemoteUpdatedAt = state.__meta.updatedAt;

    const stateRef = ref(db, PATH);
    try {
        await set(stateRef, state);
        writeLocalSnapshot(state);
        updateStatus('sincronizado');
        window.dispatchEvent(new CustomEvent('cloud-sync-pushed'));
    } catch (e) {
        console.error('Falha ao salvar no cloud:', e);
    }
}

export function shouldSkipCloudWrite() {
    return applyingRemote;
}
