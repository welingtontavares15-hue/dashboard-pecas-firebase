/* ========================================================================== 
   Browser security hardening
   This module reduces client-side exposure and session risk. Authorization
   must still be enforced by Firebase Auth claims and database rules.
   ========================================================================== */

(function () {
    'use strict';

    const CONFIG = Object.freeze({
        SESSION_DURATION_MS: 8 * 60 * 60 * 1000,
        IDLE_TIMEOUT_MS: 30 * 60 * 1000,
        ACTIVITY_WRITE_INTERVAL_MS: 15 * 1000,
        SESSION_CHECK_INTERVAL_MS: 30 * 1000,
        MAX_USERNAME_LENGTH: 80,
        MAX_PASSWORD_LENGTH: 128,
        LAST_ACTIVITY_KEY: 'diversey_security_last_activity',
        LOGOUT_SIGNAL_KEY: 'diversey_security_logout_signal',
        LEGACY_SESSION_KEY: 'diversey_current_user'
    });

    let lastActivityWrite = 0;
    let sessionTimer = null;
    let logoutInProgress = false;

    function now() {
        return Date.now();
    }

    function safeGet(storage, key) {
        try {
            return storage.getItem(key);
        } catch (_error) {
            return null;
        }
    }

    function safeSet(storage, key, value) {
        try {
            storage.setItem(key, value);
            return true;
        } catch (_error) {
            return false;
        }
    }

    function safeRemove(storage, key) {
        try {
            storage.removeItem(key);
        } catch (_error) {
            // Storage can be unavailable in privacy mode. Failing closed is
            // handled by the session validation path.
        }
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function clampSession(user) {
        if (!user || typeof user !== 'object') {
            return null;
        }

        const issuedAt = Number(user.issuedAt) || now();
        const absoluteLimit = issuedAt + CONFIG.SESSION_DURATION_MS;
        const requestedExpiry = Number(user.expiresAt) || absoluteLimit;

        return {
            ...user,
            issuedAt,
            expiresAt: Math.min(requestedExpiry, absoluteLimit)
        };
    }

    function clearBrowserSession() {
        safeRemove(localStorage, CONFIG.LEGACY_SESSION_KEY);
        safeRemove(sessionStorage, CONFIG.LEGACY_SESSION_KEY);
        safeRemove(sessionStorage, CONFIG.LAST_ACTIVITY_KEY);
    }

    function getLastActivity() {
        const stored = Number(safeGet(sessionStorage, CONFIG.LAST_ACTIVITY_KEY));
        return Number.isFinite(stored) && stored > 0 ? stored : now();
    }

    function markActivity(force = false) {
        const timestamp = now();
        if (!force && timestamp - lastActivityWrite < CONFIG.ACTIVITY_WRITE_INTERVAL_MS) {
            return;
        }

        lastActivityWrite = timestamp;
        safeSet(sessionStorage, CONFIG.LAST_ACTIVITY_KEY, String(timestamp));
    }

    function normalizeLoginError(result) {
        if (!result || result.success !== false) {
            return result;
        }

        const message = String(result.error || '').toLowerCase();
        const preserveMessage = message.includes('temporariamente bloquead')
            || message.includes('tente novamente em')
            || message.includes('usuário inativo')
            || message.includes('perfil não autorizado')
            || message.includes('conect')
            || message.includes('sincron');

        if (!preserveMessage) {
            return {
                ...result,
                error: 'Usuário ou senha inválidos.'
            };
        }

        return result;
    }

    function hardenAuth() {
        if (typeof Auth === 'undefined' || Auth.__securityHardened === true) {
            return false;
        }

        Auth.SESSION_DURATION_MS = CONFIG.SESSION_DURATION_MS;

        const originalLogin = Auth.login.bind(Auth);
        const originalInit = Auth.init.bind(Auth);
        const originalLogout = Auth.logout.bind(Auth);

        Auth.getStoredSession = function () {
            return safeGet(sessionStorage, this.SESSION_KEY || CONFIG.LEGACY_SESSION_KEY);
        };

        Auth.persistSession = function (sessionUser = this.currentUser) {
            const securedUser = clampSession(sessionUser);
            if (!securedUser) {
                return false;
            }

            this.currentUser = securedUser;
            safeRemove(localStorage, this.SESSION_KEY || CONFIG.LEGACY_SESSION_KEY);
            const persisted = safeSet(
                sessionStorage,
                this.SESSION_KEY || CONFIG.LEGACY_SESSION_KEY,
                JSON.stringify(securedUser)
            );
            markActivity(true);
            return persisted;
        };

        Auth.clearSession = function () {
            clearBrowserSession();
        };

        Auth.init = function () {
            const raw = this.getStoredSession();
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    const secured = clampSession(parsed);
                    const idleExpired = now() - getLastActivity() > CONFIG.IDLE_TIMEOUT_MS;
                    if (!secured || secured.expiresAt <= now() || idleExpired) {
                        this.clearSession();
                        return false;
                    }
                    safeSet(sessionStorage, this.SESSION_KEY, JSON.stringify(secured));
                } catch (_error) {
                    this.clearSession();
                    return false;
                }
            }

            const restored = originalInit();
            if (restored) {
                this.currentUser = clampSession(this.currentUser);
                this.persistSession(this.currentUser);
            }
            return restored;
        };

        Auth.login = async function (username, password) {
            const safeUsername = String(username || '').trim().slice(0, CONFIG.MAX_USERNAME_LENGTH);
            const safePassword = String(password || '').slice(0, CONFIG.MAX_PASSWORD_LENGTH);

            if (!safeUsername || !safePassword) {
                return { success: false, error: 'Informe usuário e senha.' };
            }

            const result = await originalLogin(safeUsername, safePassword);
            if (result?.success && this.currentUser) {
                this.currentUser = clampSession({
                    ...this.currentUser,
                    issuedAt: now(),
                    expiresAt: now() + CONFIG.SESSION_DURATION_MS
                });
                this.persistSession(this.currentUser);
                markActivity(true);
                return { ...result, user: this.currentUser };
            }

            return normalizeLoginError(result);
        };

        Auth.logout = function () {
            try {
                originalLogout();
            } finally {
                clearBrowserSession();
                safeSet(localStorage, CONFIG.LOGOUT_SIGNAL_KEY, String(now()));
            }
        };

        Auth.__securityHardened = true;
        return true;
    }

    function showLoginAfterTimeout(reason) {
        if (logoutInProgress) {
            return;
        }

        logoutInProgress = true;
        try {
            if (typeof Auth !== 'undefined') {
                Auth.logout();
            } else {
                clearBrowserSession();
            }

            if (typeof App !== 'undefined' && typeof App.showLogin === 'function') {
                App.showLogin();
            } else {
                document.getElementById('app-container')?.classList.add('hidden');
                document.getElementById('login-screen')?.classList.remove('hidden');
            }

            const message = reason === 'idle'
                ? 'Sua sessão foi encerrada após 30 minutos de inatividade.'
                : 'Sua sessão expirou. Entre novamente para continuar.';

            if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
                Utils.showToast(message, 'warning');
            }

            const status = document.getElementById('login-status');
            if (status) {
                status.textContent = message;
                status.classList.remove('hidden');
            }
        } finally {
            window.setTimeout(() => {
                logoutInProgress = false;
            }, 500);
        }
    }

    function validateActiveSession() {
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
            return;
        }

        const user = Auth.getCurrentUser();
        if (!user || (Number(user.expiresAt) > 0 && Number(user.expiresAt) <= now())) {
            showLoginAfterTimeout('expired');
            return;
        }

        if (now() - getLastActivity() > CONFIG.IDLE_TIMEOUT_MS) {
            showLoginAfterTimeout('idle');
        }
    }

    function bindActivityTracking() {
        const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
        events.forEach((eventName) => {
            window.addEventListener(eventName, () => {
                if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
                    markActivity(false);
                }
            }, { passive: true });
        });

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                validateActiveSession();
                markActivity(false);
            }
        });

        window.addEventListener('storage', (event) => {
            if (event.key === CONFIG.LOGOUT_SIGNAL_KEY && typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
                showLoginAfterTimeout('expired');
            }
        });
    }

    function hardenExternalLinks() {
        document.addEventListener('click', (event) => {
            const anchor = event.target.closest?.('a[target="_blank"]');
            if (!anchor) {
                return;
            }
            const rel = new Set(String(anchor.rel || '').split(/\s+/).filter(Boolean));
            rel.add('noopener');
            rel.add('noreferrer');
            anchor.rel = Array.from(rel).join(' ');
        }, true);
    }

    function configureLoginInputs() {
        const username = document.getElementById('login-username');
        const password = document.getElementById('login-password');
        const form = document.getElementById('login-form');

        if (username) {
            username.maxLength = CONFIG.MAX_USERNAME_LENGTH;
            username.autocorrect = 'off';
            username.setAttribute('aria-describedby', 'login-security-note');
        }

        if (password) {
            password.maxLength = CONFIG.MAX_PASSWORD_LENGTH;
            password.setAttribute('aria-describedby', 'login-security-note');
        }

        if (form) {
            form.setAttribute('novalidate', 'novalidate');
        }
    }

    function ensureSecurityIndicators() {
        const loginCard = document.querySelector('.login-card');
        if (loginCard && !document.getElementById('login-security-note')) {
            const note = document.createElement('div');
            note.id = 'login-security-note';
            note.className = 'security-login-note';
            note.innerHTML = '<i class="fas fa-shield-halved" aria-hidden="true"></i><span>Sessão protegida no navegador, expiração em 8 horas e bloqueio após inatividade.</span>';
            loginCard.appendChild(note);
        }

        const controls = document.querySelector('.header-controls');
        if (controls && !document.getElementById('security-session-chip')) {
            const chip = document.createElement('div');
            chip.id = 'security-session-chip';
            chip.className = 'security-session-chip';
            chip.title = 'Sessão limitada a 8 horas e encerrada após 30 minutos de inatividade';
            chip.innerHTML = '<i class="fas fa-shield-halved" aria-hidden="true"></i><span>Sessão protegida</span>';
            controls.insertBefore(chip, controls.firstChild);
        }
    }

    function observeApplicationShell() {
        const observer = new MutationObserver(() => {
            ensureSecurityIndicators();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function init() {
        clearLegacyPersistentSession();
        hardenAuth();
        configureLoginInputs();
        ensureSecurityIndicators();
        bindActivityTracking();
        hardenExternalLinks();
        observeApplicationShell();
        markActivity(true);

        if (!sessionTimer) {
            sessionTimer = window.setInterval(validateActiveSession, CONFIG.SESSION_CHECK_INTERVAL_MS);
        }

        document.documentElement.dataset.securityHardened = 'true';
    }

    function clearLegacyPersistentSession() {
        // The legacy application persisted authenticated profile data for 30
        // days in localStorage. Keep authenticated sessions tab-scoped instead.
        safeRemove(localStorage, CONFIG.LEGACY_SESSION_KEY);
    }

    window.SecurityHardening = Object.freeze({
        CONFIG,
        escapeHtml,
        validateActiveSession,
        clearBrowserSession
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
