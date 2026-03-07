export function notifyToast(message, type = 'info') {
    if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
        Utils.showToast(message, type);
    }
}
