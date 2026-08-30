const fs = require('fs');
const path = require('path');
const WorkflowPolicy = require('../js/workflow-policy');
const {
    buildClaims,
    legacyPasswordHash,
    verifyPassword
} = require('../functions/lib/auth-core');

const read = (relativePath) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('Critical Flows', () => {
    describe('1. Authentication and authorization', () => {
        test.each([
            ['administrador', {}],
            ['gestor', {}],
            ['tecnico', { tecnicoId: 'tec-01' }],
            ['fornecedor', { fornecedorId: 'sup-01' }]
        ])('legacy credential migration preserves login for %s and emits signed scope', (role, scope) => {
            const user = {
                id: `user-${role}`,
                username: `user.${role}`,
                role,
                ...scope,
                passwordHash: legacyPasswordHash('SenhaSegura123', `user.${role}`)
            };
            expect(verifyPassword(user, 'SenhaSegura123').valid).toBe(true);
            expect(buildClaims(user)).toMatchObject({ role, appUserId: `user-${role}`, ...scope });
        });

        test('wrong password is rejected', () => {
            const user = {
                id: 'admin',
                username: 'admin',
                role: 'administrador',
                passwordHash: legacyPasswordHash('Correta123', 'admin')
            };
            expect(verifyPassword(user, 'Errada123').valid).toBe(false);
        });
    });

    describe('2. Request workflow', () => {
        test('draft can be submitted but cannot skip approval', () => {
            expect(WorkflowPolicy.canTransition('rascunho', 'pendente')).toBe(true);
            expect(WorkflowPolicy.canTransition('rascunho', 'aprovada')).toBe(false);
        });

        test('pending request accepts approval or rejection only', () => {
            expect(WorkflowPolicy.canTransition('pendente', 'aprovada')).toBe(true);
            expect(WorkflowPolicy.canTransition('pendente', 'rejeitada')).toBe(true);
            expect(WorkflowPolicy.canTransition('pendente', 'finalizada')).toBe(false);
        });

        test('approved request moves to transit and transit moves to finalized', () => {
            expect(WorkflowPolicy.canTransition('aprovada', 'em-transito')).toBe(true);
            expect(WorkflowPolicy.canTransition('em-transito', 'finalizada')).toBe(true);
            expect(WorkflowPolicy.canTransition('aprovada', 'finalizada')).toBe(false);
        });

        test('rejected request can be corrected and resubmitted', () => {
            expect(WorkflowPolicy.canTransition('rejeitada', 'pendente')).toBe(true);
            expect(WorkflowPolicy.canTransition('rejeitada', 'aprovada')).toBe(false);
        });

        test('finalized request cannot return to operational states', () => {
            expect(WorkflowPolicy.canTransition('finalizada', 'pendente')).toBe(false);
            expect(WorkflowPolicy.canTransition('finalizada', 'em-transito')).toBe(false);
        });
    });

    describe('3. Online-only safety', () => {
        test('production explicitly blocks offline business writes', () => {
            const config = read('js/config.js');
            const data = read('js/data.js');
            expect(config).toContain('offlineDrafts: false');
            expect(config).toContain('onlineOnly: true');
            expect(data).toContain('isWriteBlocked()');
            expect(data).toContain('Sem conexão:');
        });
    });

    describe('4. Export capabilities', () => {
        test('PDF, Excel and CSV paths are implemented rather than placeholders', () => {
            const utils = read('js/utils.js');
            expect(utils).toMatch(/jsPDF|jspdf/);
            expect(utils).toMatch(/XLSX/);
            expect(utils).toMatch(/CSV|csv/);
        });

        test('export audit collections remain protected by role rules', () => {
            const rules = JSON.parse(read('firebase/database.rules.v68.json')).rules.data;
            expect(rules.diversey_export_log['.read']).toContain("auth.token.role == 'gestor'");
            expect(rules.diversey_export_files['.write']).not.toContain("auth.token.role == 'tecnico'");
        });
    });

    describe('5. Release integration', () => {
        test('security bridge, hardening runtime and workflow policy are real runtime inputs', () => {
            const html = read('index.html');
            expect(html).toContain('secure-auth-bridge.js');
            expect(html).toContain('security-hardening-runtime.js');
            expect(read('service-worker.js')).toContain('v68-security-hardening');
        });
    });
});
