(function () {
    'use strict';

    if (typeof Auth === 'undefined' || typeof DataManager === 'undefined') {
        return;
    }

    const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
    const originalDataInit = DataManager.init.bind(DataManager);
    const originalRegisterSubscriptions = DataManager._registerRealtimeSubscriptions?.bind(DataManager);

    function readStoredProfile() {
        let raw = null;
        try {
            raw = sessionStorage.getItem(Auth.SESSION_KEY) || localStorage.getItem(Auth.SESSION_KEY);
        } catch (_error) {
            raw = null;
        }
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw);
            if (!parsed || !parsed.id || !parsed.username || !parsed.role) return null;
            return parsed;
        } catch (_error) {
            return null;
        }
    }

    function getEffectiveRole() {
        return String(Auth.currentUser?.role || readStoredProfile()?.role || '').trim().toLowerCase();
    }

    function allowedCloudKeys(role = getEffectiveRole()) {
        const keys = DataManager.KEYS;
        const base = [keys.SETTINGS];
        if (role === 'administrador' || role === 'admin') {
            return Object.values(keys);
        }
        if (role === 'gestor') {
            return [
                keys.TECHNICIANS,
                keys.SUPPLIERS,
                keys.PARTS,
                keys.SOLICITATIONS,
                keys.SETTINGS,
                keys.NOTIFICATION_LOG,
                keys.RECENT_PARTS,
                keys.EXPORT_LOG,
                keys.EXPORT_FILES
            ];
        }
        if (role === 'tecnico') {
            return [keys.TECHNICIANS, keys.PARTS, keys.SOLICITATIONS, keys.SETTINGS, keys.RECENT_PARTS];
        }
        if (role === 'fornecedor') {
            return [keys.SUPPLIERS, keys.SOLICITATIONS, keys.SETTINGS];
        }
        return base;
    }

    function clearBusinessState() {
        DataManager._sessionCache = {};
        DataManager.initialized = false;
        DataManager.initializing = false;
        DataManager.initPromise = null;
        DataManager.realtimeSubscribed = false;
        if (typeof CloudStorage !== 'undefined') {
            Object.values(DataManager.KEYS).forEach((key) => {
                try { CloudStorage.unsubscribe?.(key); } catch (_error) {}
            });
            CloudStorage.accessSession = null;
        }
    }

    DataManager.migrateUserPasswords = async function securePasswordMigrationNoop() {
        return false;
    };
    DataManager.ensureDefaultGestor = async function secureDefaultGestorNoop() {
        return false;
    };
    DataManager.ensureRecoveryUsers = async function secureRecoveryUsersNoop() {
        return false;
    };
    DataManager.persistCloudAccessSession = async function secureSessionNoop() {
        return true;
    };
    DataManager.ensureCloudAccessSession = async function secureSessionEnsureNoop() {
        return true;
    };
    DataManager.clearCloudAccessSession = async function secureSessionClearNoop() {
        return true;
    };

    const originalGetDefaultUsers = DataManager.getDefaultUsers?.bind(DataManager);
    const originalGetDefaultTechnicians = DataManager.getDefaultTechnicians?.bind(DataManager);
    DataManager.getDefaultUsers = async function secureDefaultUsers() {
        if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.isProduction?.()) return [];
        return originalGetDefaultUsers ? originalGetDefaultUsers() : [];
    };
    DataManager.getDefaultTechnicians = function secureDefaultTechnicians() {
        if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.isProduction?.()) return [];
        return originalGetDefaultTechnicians ? originalGetDefaultTechnicians() : [];
    };

    DataManager._loadInitialDataFromCloud = async function secureLoadInitialData() {
        if (typeof CloudStorage === 'undefined' || typeof CloudStorage.loadData !== 'function') return false;
        const keys = allowedCloudKeys();
        let loadedAny = false;
        for (const key of keys) {
            try {
                const data = await CloudStorage.loadData(key);
                if (data !== null && data !== undefined) {
                    this._sessionCache[key] = data;
                    loadedAny = true;
                }
            } catch (error) {
                this.logOperationalEvent?.('warn', 'sync', 'secure_initial_load_failed', {
                    key,
                    code: error?.code || null
                });
            }
        }
        return loadedAny;
    };

    DataManager._registerRealtimeSubscriptions = function secureRegisterRealtimeSubscriptions() {
        if (!this.cloudInitialized || typeof CloudStorage === 'undefined' || typeof CloudStorage.subscribe !== 'function') {
            return;
        }
        Object.values(this.KEYS).forEach((key) => {
            try { CloudStorage.unsubscribe?.(key); } catch (_error) {}
        });
        const keys = allowedCloudKeys();
        keys.forEach((key) => {
            CloudStorage.subscribe(key, (payload) => {
                this._sessionCache[key] = payload;
                if (key === this.KEYS.USERS && Array.isArray(payload)) {
                    this.refreshAuthenticatedSession?.(payload);
                }
                this.emitDataUpdated?.([key], 'realtime');
            });
        });
        this.realtimeSubscribed = true;
    };

    DataManager.initializeAuthenticatedData = async function initializeAuthenticatedData() {
        if (!window.SecureAuthBridge?.isCorporateAuthenticated?.()) return false;
        this.initialized = false;
        this.initializing = false;
        this.initPromise = null;
        this.realtimeSubscribed = false;
        return originalDataInit();
    };

    DataManager.init = async function secureBootstrapInit() {
        if (window.FirebaseInit && typeof window.FirebaseInit.init === 'function') {
            const firebaseReady = await window.FirebaseInit.init();
            if (!firebaseReady) return false;
        }
        if (window.SecureAuthBridge?.isCorporateAuthenticated?.()) {
            return this.initializeAuthenticatedData();
        }
        this.initialized = false;
        return true;
    };

    Auth.SESSION_DURATION_MS = SESSION_DURATION_MS;
    Auth.buildSessionUser = function secureBuildSessionUser(user) {
        if (!user) return null;
        return {
            id: String(user.id || ''),
            username: String(user.username || ''),
            name: String(user.name || user.username || ''),
            role: String(user.role || '').toLowerCase(),
            email: String(user.email || ''),
            tecnicoId: user.tecnicoId || null,
            fornecedorId: user.fornecedorId || null,
            expiresAt: Date.now() + SESSION_DURATION_MS,
            authVersion: 2
        };
    };

    Auth.init = function secureAuthInit() {
        const sessionUser = readStoredProfile();
        if (!sessionUser) return false;
        if (Number(sessionUser.expiresAt) <= Date.now()) {
            this.clearSession();
            window.SecureAuthBridge?.logoutToAnonymous?.().catch(() => {});
            return false;
        }
        if (!window.SecureAuthBridge?.isCorporateAuthenticated?.()) {
            this.clearSession();
            return false;
        }
        if (!this.permissions[String(sessionUser.role || '').toLowerCase()]) {
            this.clearSession();
            return false;
        }

        this.currentUser = this.buildSessionUser(sessionUser);
        this.persistSession(this.currentUser);

        window.SecureAuthBridge.refreshProfile().then((profile) => {
            if (!profile || profile.disabled === true) {
                this.logout();
                return;
            }
            const previousRole = this.currentUser?.role;
            this.currentUser = this.buildSessionUser(profile);
            this.persistSession(this.currentUser);
            if (previousRole !== this.currentUser.role) {
                clearBusinessState();
                DataManager.initializeAuthenticatedData().catch(() => {});
            }
        }).catch(() => {
            // RTDB rules remain the authority even when profile refresh is temporarily unavailable.
        });
        return true;
    };

    Auth.login = async function secureLogin(username, password) {
        const normalizedUsername = Utils.normalizeText(String(username || '').trim());
        if (!normalizedUsername || typeof password !== 'string' || password.length < 4) {
            return { success: false, error: 'Usuário ou senha inválidos.' };
        }
        if (!window.SecureAuthBridge) {
            return { success: false, error: 'Serviço de autenticação indisponível. Atualize a página e tente novamente.' };
        }

        try {
            const result = await window.SecureAuthBridge.login(username, password);
            if (!result?.profile || !this.permissions[String(result.profile.role || '').toLowerCase()]) {
                await window.SecureAuthBridge.logoutToAnonymous().catch(() => {});
                return { success: false, error: 'Perfil não autorizado.' };
            }

            this.currentUser = this.buildSessionUser(result.profile);
            this.persistSession(this.currentUser);
            clearBusinessState();
            const dataReady = await DataManager.initializeAuthenticatedData();
            if (!dataReady) {
                this.currentUser = null;
                this.clearSession();
                await window.SecureAuthBridge.logoutToAnonymous().catch(() => {});
                return { success: false, error: 'Não foi possível carregar os dados autorizados do sistema.' };
            }
            return { success: true, user: this.currentUser };
        } catch (error) {
            const code = String(error?.code || '');
            if (code.includes('resource-exhausted')) {
                return { success: false, error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' };
            }
            return { success: false, error: 'Usuário ou senha inválidos.' };
        }
    };

    Auth.logout = function secureLogout() {
        this.currentUser = null;
        this.clearSession();
        clearBusinessState();
        window.SecureAuthBridge?.logoutToAnonymous?.().catch(() => {});
    };

    Auth.__securityHardeningV68 = {
        sessionDurationMs: SESSION_DURATION_MS,
        allowedCloudKeys,
        originalRegisterSubscriptions: !!originalRegisterSubscriptions
    };
})();
