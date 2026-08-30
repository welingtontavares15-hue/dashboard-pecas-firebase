import { getAuth, signInAnonymously, signInWithCustomToken, signOut } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js';

const REGION = 'us-central1';

async function waitForFirebaseApp(timeoutMs = 15000) {
    const startedAt = Date.now();
    while (!window.firebaseApp) {
        if (window.FirebaseInit && !window.FirebaseInit.isInitialized) {
            await window.FirebaseInit.init();
        }
        if (window.firebaseApp) {
            return window.firebaseApp;
        }
        if ((Date.now() - startedAt) >= timeoutMs) {
            throw new Error('firebase_app_timeout');
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return window.firebaseApp;
}

function markFirebaseUser(user) {
    window.firebaseUser = user || null;
    if (window.FirebaseInit) {
        window.FirebaseInit.isAuthenticated = !!user;
        window.FirebaseInit.authPromise = user ? Promise.resolve(true) : null;
    }
}

const SecureAuthBridge = {
    REGION,

    async getContext() {
        const app = await waitForFirebaseApp();
        const auth = window.firebaseAuth || getAuth(app);
        const functions = getFunctions(app, REGION);
        window.firebaseAuth = auth;
        return { app, auth, functions };
    },

    isCorporateAuthenticated() {
        const user = window.firebaseAuth?.currentUser || window.firebaseUser || null;
        return !!(user && user.isAnonymous !== true);
    },

    async login(username, password) {
        const { auth, functions } = await this.getContext();
        const loginCallable = httpsCallable(functions, 'loginWithLegacyCredentials');
        const response = await loginCallable({ username, password });
        const payload = response?.data || {};
        if (!payload.customToken || !payload.profile) {
            throw new Error('invalid_auth_bridge_response');
        }

        const credential = await signInWithCustomToken(auth, payload.customToken);
        markFirebaseUser(credential.user);
        await credential.user.getIdToken(true);
        return {
            profile: payload.profile,
            authVersion: Number(payload.authVersion) || 2
        };
    },

    async refreshProfile() {
        if (!this.isCorporateAuthenticated()) {
            return null;
        }
        const { functions } = await this.getContext();
        const callable = httpsCallable(functions, 'getCurrentProfile');
        const response = await callable({});
        return response?.data?.profile || null;
    },

    async logoutToAnonymous() {
        const { auth } = await this.getContext();
        await signOut(auth);
        markFirebaseUser(null);
        const credential = await signInAnonymously(auth);
        markFirebaseUser(credential.user);
        return true;
    }
};

window.SecureAuthBridge = SecureAuthBridge;
window.dispatchEvent(new CustomEvent('secure-auth-bridge-ready'));
