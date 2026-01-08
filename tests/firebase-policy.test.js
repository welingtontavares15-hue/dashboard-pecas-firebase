const { allowAnonymousAuth, getRuntimeFirebaseConfig } = require('../js/firebase-policy.js');

describe('FirebasePolicy', () => {
    afterEach(() => {
        delete global.__ENV;
        delete global.FIREBASE_CONFIG;
        delete global.FIREBASE_RUNTIME_CONFIG;
        delete global.FIREBASE_ALLOW_ANONYMOUS;
        delete global.APP_CONFIG;
    });

    describe('allowAnonymousAuth', () => {
        it('blocks anonymous auth in production by default', () => {
            expect(allowAnonymousAuth({ environment: 'production' })).toBe(false);
        });

        it('allows anonymous auth in development by default', () => {
            expect(allowAnonymousAuth({ environment: 'development' })).toBe(true);
        });

        it('honors explicit override flags', () => {
            expect(allowAnonymousAuth({ environment: 'production', allowAnonymous: true })).toBe(true);
            expect(allowAnonymousAuth({ environment: 'development', allowAnonymous: false })).toBe(false);
        });

        it('derives environment from APP_CONFIG when present', () => {
            global.APP_CONFIG = { environment: 'production' };
            expect(allowAnonymousAuth()).toBe(false);
            global.APP_CONFIG.environment = 'development';
            expect(allowAnonymousAuth()).toBe(true);
        });
    });

    describe('getRuntimeFirebaseConfig', () => {
        it('prefers config from __ENV', () => {
            global.__ENV = { firebaseConfig: { projectId: 'env' } };
            expect(getRuntimeFirebaseConfig()).toEqual({ projectId: 'env' });
        });

        it('falls back to runtime globals', () => {
            global.FIREBASE_RUNTIME_CONFIG = { projectId: 'runtime' };
            expect(getRuntimeFirebaseConfig()).toEqual({ projectId: 'runtime' });
            global.FIREBASE_CONFIG = { projectId: 'legacy' };
            delete global.FIREBASE_RUNTIME_CONFIG;
            expect(getRuntimeFirebaseConfig()).toEqual({ projectId: 'legacy' });
        });

        it('returns explicit override when provided', () => {
            expect(getRuntimeFirebaseConfig({ config: { projectId: 'override' } })).toEqual({ projectId: 'override' });
        });
    });
});
