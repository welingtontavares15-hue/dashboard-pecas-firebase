/**
 * Passkeys / WebAuthn. A assinatura e o desafio são verificados exclusivamente
 * pela Cloud Function; o navegador nunca autentica alguém somente com biometria.
 */
const PasskeyAuth = {
    endpoint() {
        return String((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.passkeyEndpoint) || '').trim();
    },
    enabled() {
        // Password authentication must work even on devices without a biometric reader.
        return !!(this.endpoint() && window.isSecureContext
            && window.firebaseModules?.signInWithCustomToken);
    },
    supported() {
        return !!(this.enabled() && window.PublicKeyCredential
            && navigator.credentials && window.crypto?.subtle);
    },
    bytes(encoded) {
        const value = String(encoded).replace(/-/g, '+').replace(/_/g, '/');
        const decoded = atob(value.padEnd(Math.ceil(value.length / 4) * 4, '='));
        return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
    },
    encoded(bytes) {
        return btoa(String.fromCharCode(...new Uint8Array(bytes)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },
    registrationOptions(data) {
        return {
            ...data,
            challenge: this.bytes(data.challenge),
            user: { ...data.user, id: this.bytes(data.user.id) },
            excludeCredentials: (data.excludeCredentials || []).map((item) => ({ ...item, id: this.bytes(item.id) }))
        };
    },
    authenticationOptions(data) {
        return {
            ...data,
            challenge: this.bytes(data.challenge),
            allowCredentials: (data.allowCredentials || []).map((item) => ({ ...item, id: this.bytes(item.id) }))
        };
    },
    serialize(credential) {
        const response = credential.response;
        const data = {
            id: credential.id, rawId: this.encoded(credential.rawId), type: credential.type,
            response: {
                clientDataJSON: this.encoded(response.clientDataJSON)
            },
            clientExtensionResults: credential.getClientExtensionResults()
        };
        if (response.attestationObject) {
            data.response.attestationObject = this.encoded(response.attestationObject);
            data.response.transports = typeof response.getTransports === 'function' ? response.getTransports() : [];
        } else {
            data.response.authenticatorData = this.encoded(response.authenticatorData);
            data.response.signature = this.encoded(response.signature);
            data.response.userHandle = response.userHandle ? this.encoded(response.userHandle) : null;
        }
        return data;
    },
    async request(action, payload) {
        const endpoint = this.endpoint();
        if (!this.enabled()) throw new Error('Autenticação do servidor não está habilitada neste ambiente.');
        if ((action.startsWith('register/') || action === 'login/options' || action === 'login/verify')
            && !this.supported()) throw new Error('Este dispositivo não suporta chaves de acesso. Utilize sua senha.');
        const timeout = AbortSignal.timeout(20000);
        const headers = { 'Content-Type': 'application/json' };
        if (action.startsWith('register/') || action.startsWith('session/')) {
            const token = await window.firebaseAuth?.currentUser?.getIdToken();
            if (!token) throw new Error('Faça login para cadastrar sua digital.');
            headers.Authorization = 'Bearer ' + token;
        }
        const response = await fetch(endpoint, {
            method: 'POST', headers,
            body: JSON.stringify({ action, ...payload }), signal: timeout,
            credentials: 'omit', cache: 'no-store'
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Erro no serviço de autenticação.');
        return data;
    },
    async register(username, password) {
        if (!this.supported()) throw new Error('Este dispositivo não suporta chaves de acesso.');
        if (!username || !password) throw new Error('Informe usuário e senha para cadastrar a digital.');
        const { challengeId, options } = await this.request('register/options', { username, password });
        const credential = await navigator.credentials.create({ publicKey: this.registrationOptions(options) });
        if (!credential) throw new Error('Cadastro biométrico cancelado.');
        return this.request('register/verify', { challengeId, response: this.serialize(credential) });
    },
    async exchangeToken(verified) {
        if (!verified?.token || !verified.user) throw new Error('Resposta do servidor inválida.');
        const firebaseAuth = window.firebaseAuth || window.FirebaseInit?.auth;
        if (!firebaseAuth) throw new Error('Firebase ainda não está pronto.');
        await window.firebaseModules.signInWithCustomToken(firebaseAuth, verified.token);
        if (window.FirebaseInit) {
            window.FirebaseInit.isAuthenticated = true;
            window.firebaseUser = firebaseAuth.currentUser;
        }
        const user = await Auth.loginWithVerifiedPasskey(verified.user);
        return { success: true, user };
    },
    async passwordLogin(username, password) {
        if (!username || !password) throw new Error('Preencha usuário e senha.');
        return this.exchangeToken(await this.request('login/password', { username, password }));
    },
    async restore() {
        const user = (window.firebaseAuth || window.FirebaseInit?.auth)?.currentUser;
        if (!this.enabled() || !user || user.isAnonymous) return false;
        const response = await this.request('session/profile', {});
        if (!response?.user) return false;
        return !!(await Auth.loginWithVerifiedPasskey(response.user));
    },
    async login() {
        if (!this.supported()) throw new Error('Este dispositivo não suporta chaves de acesso.');
        const { challengeId, options } = await this.request('login/options', {});
        const credential = await navigator.credentials.get({ publicKey: this.authenticationOptions(options) });
        if (!credential) throw new Error('Acesso biométrico cancelado.');
        const verified = await this.request('login/verify', { challengeId, response: this.serialize(credential) });
        return this.exchangeToken(verified);
    },
    async logout() {
        const firebaseAuth = window.firebaseAuth || window.FirebaseInit?.auth;
        if (!firebaseAuth) return;
        try {
            if (firebaseAuth.currentUser && !firebaseAuth.currentUser.isAnonymous) {
                await this.request('session/logout', {});
            }
        } catch (_error) {
            // Client sign-out always runs, including when the server session has expired.
        } finally {
            if (window.firebaseModules?.signOut) await window.firebaseModules.signOut(firebaseAuth);
            if (window.FirebaseInit) window.FirebaseInit.isAuthenticated = false;
            window.firebaseUser = null;
        }
    }
};
if (typeof window !== 'undefined') window.PasskeyAuth = PasskeyAuth;
