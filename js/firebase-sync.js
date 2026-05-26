/**
 * Compatibility layer for the legacy whole-state Firebase sync.
 *
 * The application now persists operational data by collection through
 * `CloudStorage`/`DataManager`. This module stays in place only to preserve
 * import contracts from older entry points while avoiding a second sync path
 * that could overwrite newer records with stale local snapshots.
 */

function buildSnapshot() {
    if (typeof DataManager === 'undefined' || !DataManager._sessionCache) {
        return null;
    }

    try {
        return JSON.parse(JSON.stringify({
            data: DataManager._sessionCache,
            __meta: {
                updatedAt: Date.now(),
                mode: 'delegated'
            }
        }));
    } catch (_error) {
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

export function captureLocalSnapshot() {
    return buildSnapshot();
}

export async function startFirebaseSync() {
    updateStatus('delegado');
    return true;
}

export async function pushToCloud(_stateObj) {
    updateStatus('delegado');
    return false;
}

export function shouldSkipCloudWrite() {
    return true;
}
