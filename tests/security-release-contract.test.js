const fs = require('fs');
const path = require('path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

describe('v68 release security contract', () => {
  test('client loads the secure auth bridge before the hardening runtime and app', () => {
    const html = read('index.html');
    const bridge = html.indexOf('js/secure-auth-bridge.js');
    const hardening = html.indexOf('js/security-hardening-runtime.js');
    const app = html.indexOf('js/app.js');
    expect(bridge).toBeGreaterThan(-1);
    expect(hardening).toBeGreaterThan(bridge);
    expect(app).toBeGreaterThan(hardening);
  });

  test('app and service worker share one release identifier', () => {
    const config = read('js/config.js');
    const sw = read('service-worker.js');
    expect(config).toContain("version: 'v68-security-hardening'");
    expect(sw).toContain("CACHE_VERSION = 'v68-security-hardening'");
  });

  test('secure runtime reduces application session lifetime to eight hours', () => {
    const runtime = read('js/security-hardening-runtime.js');
    expect(runtime).toContain('const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;');
    expect(runtime).toContain('Auth.SESSION_DURATION_MS = SESSION_DURATION_MS;');
  });

  test('secure runtime never persists client-authored authorization sessions to RTDB', () => {
    const runtime = read('js/security-hardening-runtime.js');
    expect(runtime).toContain('DataManager.persistCloudAccessSession = async function secureSessionNoop()');
    expect(runtime).toContain('DataManager.ensureCloudAccessSession = async function secureSessionEnsureNoop()');
  });

  test('PWA precaches every hardening asset', () => {
    const sw = read('service-worker.js');
    expect(sw).toContain("'./js/secure-auth-bridge.js'");
    expect(sw).toContain("'./js/security-hardening-runtime.js'");
  });

  test('server authentication function returns only a sanitized profile and custom token', () => {
    const functions = read('functions/index.js');
    expect(functions).toContain('createCustomToken');
    expect(functions).toContain('sanitizeProfile');
    expect(functions).not.toMatch(/return\s*\{[^}]*passwordHash/s);
  });
});
