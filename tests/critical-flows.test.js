/**
 * Release coverage contract.
 *
 * This file intentionally does not duplicate the behavioral assertions that
 * already live in focused suites. Its job is to prevent the release gate from
 * silently losing coverage for the business-critical areas and to keep the
 * runtime mode aligned with the tests.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function expectRealSuite(relativePath, requiredFragments = []) {
    const source = read(relativePath);
    expect(source).toMatch(/\b(?:test|it)\s*\(/);
    expect(source).not.toContain('expect(true).toBe(true)');
    requiredFragments.forEach((fragment) => expect(source).toContain(fragment));
}

describe('Critical release coverage contract', () => {
    test('authentication has substantive login, role and rate-limit coverage', () => {
        expectRealSuite('tests/auth-login-alias.test.js', ['Auth login aliases']);
        expectRealSuite('tests/auth-rate-limit.test.js', ['Auth Rate Limiting']);
        expectRealSuite('tests/user-access.test.js', ['Authentication Role Permissions']);
        expectRealSuite('tests/production-security.test.js', ['Production Credential Seeding']);
    });

    test('solicitation creation and lifecycle have substantive regression coverage', () => {
        expectRealSuite('tests/incident-regressions.test.js', ['approval flow']);
        expectRealSuite('tests/solicitacoes-divisao.integration.test.js', ['salva F&B por atualização atômica']);
        expectRealSuite('tests/storage-division-atomic.test.js', ['CloudStorage.updateSolicitationDivision']);
        expectRealSuite('tests/solicitacoes-reset.test.js', ['limpeza de dados de teste']);
    });

    test('supplier scope, reporting and exports have dedicated suites', () => {
        expectRealSuite('tests/supplier-portal-scope.test.js', ['Fornecedor portal scope isolation']);
        expectRealSuite('tests/reports-filters.test.js', ['Report filters']);
        expectRealSuite('tests/report-export-approval-date.test.js', ['Report Excel approval date columns']);
        expectRealSuite('tests/solicitacao-pdf.test.js', ['generateSolicitacaoPdf']);
        expectRealSuite('tests/export-artifact.test.js', ['DataManager export artifacts']);
    });

    test('realtime synchronization and write idempotency have dedicated suites', () => {
        expectRealSuite('tests/data-realtime-subscriptions.test.js', ['re-attaches realtime listeners']);
        expectRealSuite('tests/idempotency.test.js', ['CloudStorage Online-Only Mode']);
        expectRealSuite('tests/gestores-sync.test.js', ['Gestores Sync Merge Logic']);
    });

    test('runtime and tests agree that writes are online-only', () => {
        const storage = read('js/storage.js');
        const idempotency = read('tests/idempotency.test.js');

        expect(storage).toContain('[ONLINE-ONLY] enqueueOperation disabled - writes require connection');
        expect(storage).toContain('[ONLINE-ONLY] Cannot save - cloud not connected');
        expect(idempotency).toContain('Offline Queue Disabled (Online-Only Mode)');
        expect(idempotency).toContain('does not persist data locally when cloud unavailable');
    });

    test('responsive and visual regressions remain release-gated', () => {
        expectRealSuite('tests/responsive-system.test.js', ['keeps dropdowns above following cards without clipping']);
        expectRealSuite('tests/wwm-smart-layout.test.js', ['preserva responsividade e scroll somente quando o viewport exige']);
        expectRealSuite('tests/visual-architecture-v72.test.js', ['WWM visual architecture v72']);
        expectRealSuite('tests/technician-request-layout.test.js', ['Minhas solicitações - layout do técnico']);
    });
});
