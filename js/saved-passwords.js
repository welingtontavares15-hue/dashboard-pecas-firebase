/** Native password manager integration. The device controls biometric prompts. */
const SavedPasswords = {
    supported() {
        return !!(window.isSecureContext && typeof window.PasswordCredential === 'function'
            && typeof navigator.credentials?.get === 'function');
    },

    async choose() {
        if (!this.supported()) return { status: 'unsupported' };
        try {
            // Always let the user choose; never request silent sign-in.
            const credential = await navigator.credentials.get({ password: true, mediation: 'required' });
            if (!credential) return { status: 'empty' };
            if (credential.type !== 'password' || typeof credential.id !== 'string'
                || !credential.id || typeof credential.password !== 'string' || !credential.password) {
                return { status: 'empty' };
            }
            return { status: 'selected', username: credential.id, password: credential.password };
        } catch (_error) {
            // A declined or unavailable chooser never blocks ordinary form autofill.
            return { status: 'unavailable' };
        }
    },

    async rememberVerified(username, password) {
        if (!this.supported() || typeof navigator.credentials?.store !== 'function') return;
        try {
            // Called only after the existing authentication flow accepts the password.
            // Credentials go to the native manager, never to application storage.
            const credential = new window.PasswordCredential({ id: username, password });
            await navigator.credentials.store(credential);
        } catch (_error) {
            // Saving is optional and must not affect a successful login.
        }
    },

    async signedOut() {
        try {
            await navigator.credentials?.preventSilentAccess?.();
        } catch (_error) {
            // Logout must work even when the password manager is unavailable.
        }
    }
};
window.SavedPasswords = SavedPasswords;
