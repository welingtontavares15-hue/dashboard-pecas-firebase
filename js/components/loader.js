export function showLoader() {
    if (typeof Utils !== 'undefined' && typeof Utils.showLoading === 'function') {
        Utils.showLoading();
    }
}

export function hideLoader() {
    if (typeof Utils !== 'undefined' && typeof Utils.hideLoading === 'function') {
        Utils.hideLoading();
    }
}
