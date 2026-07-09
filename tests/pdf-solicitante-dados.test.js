/**
 * Regression tests — PDF do solicitante (endereço/CPF).
 *
 * Incidente: PDFs gerados sem endereço e CPF do solicitante quando
 * (a) o perfil logado não pode ler o cadastro de técnicos (fornecedor),
 * (b) o id do técnico foi gravado com tipo divergente (número vs string),
 * (c) a solicitação é antiga e não tinha snapshot do técnico.
 */
const fs = require('fs');
const path = require('path');

const utilsCode = fs.readFileSync(path.join(__dirname, '../js/utils.js'), 'utf8');
const dataCode = fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8');

const buildLocalStorage = () => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = String(value); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; }
    };
};

const loadUtils = () => {
    const factory = new Function(`${utilsCode}; return Utils;`);
    return factory();
};

const loadDataManager = () => {
    const Utils = loadUtils();
    Utils.hashSHA256 = jest.fn(async (value, salt = '') => `${value}|${salt}`);

    const CloudStorage = { getLastOperationError: jest.fn(() => null) };
    const Auth = {
        currentUser: null,
        getCurrentUser: jest.fn(() => ({ id: 'admin-1', role: 'administrador' })),
        buildSessionUser: jest.fn((user) => user),
        persistSession: jest.fn(),
        hashPassword: jest.fn(async (password, username) => `${password}:${username}`)
    };
    const Logger = {
        CATEGORY: { AUTH: 'auth', REQUEST: 'request' },
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    };

    const sanitizedCode = dataCode.replace('DataManager.init();', '// DataManager.init();');
    const factory = new Function('Utils', 'CloudStorage', 'Auth', 'Logger', `${sanitizedCode}; return DataManager;`);
    const DataManager = factory(Utils, CloudStorage, Auth, Logger);
    return { DataManager, Utils };
};

/**
 * Minimal jsPDF stub that records every string drawn on the document,
 * so tests can assert on the rendered PDF content.
 */
const buildJsPdfStub = () => {
    const drawnTexts = [];
    class JsPdfStub {
        constructor() {
            this.internal = {
                pageSize: {
                    getWidth: () => 210,
                    getHeight: () => 297
                }
            };
            this.pages = 1;
            this.savedAs = null;
        }
        setFillColor() {}
        setDrawColor() {}
        setTextColor() {}
        setLineWidth() {}
        setFont() {}
        setFontSize() {}
        rect() {}
        roundedRect() {}
        line() {}
        addPage() { this.pages += 1; }
        setPage() {}
        getNumberOfPages() { return this.pages; }
        getTextWidth(text) { return String(text || '').length * 1.8; }
        splitTextToSize(text, width) {
            const value = String(text ?? '');
            if (!value) {
                return [''];
            }
            const maxChars = Math.max(8, Math.floor(width / 1.8));
            const words = value.split(/\s+/);
            const lines = [];
            let current = '';
            words.forEach((word) => {
                const candidate = current ? `${current} ${word}` : word;
                if (candidate.length > maxChars && current) {
                    lines.push(current);
                    current = word;
                } else {
                    current = candidate;
                }
            });
            if (current) {
                lines.push(current);
            }
            return lines.length ? lines : [''];
        }
        text(content, _x, _y, _opts) {
            if (Array.isArray(content)) {
                content.forEach((line) => drawnTexts.push(String(line)));
            } else {
                drawnTexts.push(String(content));
            }
        }
        save(filename) { this.savedAs = filename; }
        output() { return 'data:application/pdf;base64,QUFB'; }
    }
    return { JsPdfStub, drawnTexts };
};

describe('PDF do solicitante — endereço e CPF', () => {
    beforeEach(() => {
        Object.defineProperty(global, 'localStorage', { value: buildLocalStorage(), configurable: true });
        delete global.DataManager;
    });

    afterEach(() => {
        delete global.DataManager;
        if (typeof window !== 'undefined') {
            delete window.jspdf;
        }
    });

    describe('DataManager.getTechnicianById', () => {
        it('encontra técnico mesmo com id numérico legado vs string', () => {
            const { DataManager } = loadDataManager();
            jest.spyOn(DataManager, 'getTechnicians').mockReturnValue([
                { id: 1024, nome: 'Legado Numérico', cpf: '52998224725' },
                { id: 'abc123', nome: 'Atual String' }
            ]);

            expect(DataManager.getTechnicianById('1024')?.nome).toBe('Legado Numérico');
            expect(DataManager.getTechnicianById(1024)?.nome).toBe('Legado Numérico');
            expect(DataManager.getTechnicianById('abc123')?.nome).toBe('Atual String');
            expect(DataManager.getTechnicianById('')).toBeUndefined();
            expect(DataManager.getTechnicianById(null)).toBeUndefined();
        });

        it('filtra solicitações do técnico com id string ou numérico', () => {
            const { DataManager } = loadDataManager();
            jest.spyOn(DataManager, 'getSolicitations').mockReturnValue([
                { id: 'sol-num', tecnicoId: 1024 },
                { id: 'sol-str', requesterTecnicoId: '1024' },
                { id: 'sol-other', tecnicoId: '9999' }
            ]);

            expect(DataManager.getSolicitationsByTechnician('1024').map((item) => item.id)).toEqual(['sol-num', 'sol-str']);
        });
    });

    describe('DataManager.applyTechnicianSnapshotBackfill', () => {
        it('preenche CPF e endereço ausentes a partir do cadastro sem sobrescrever dados existentes', () => {
            const { DataManager } = loadDataManager();
            jest.spyOn(DataManager, 'getTechnicians').mockReturnValue([{
                id: 'tec-1',
                nome: 'Tecnico Cadastro',
                email: 'tec@empresa.com',
                cpf: '52998224725',
                endereco: 'Rua do Cadastro',
                numero: '100',
                bairro: 'Centro',
                cidade: 'Goiânia',
                estado: 'GO',
                cep: '74000-000',
                telefone: '(62) 99999-0000'
            }]);

            const legacy = { id: 'sol-1', tecnicoId: 'tec-1', cidade: 'Anápolis' };
            const changed = DataManager.applyTechnicianSnapshotBackfill(legacy);

            expect(changed).toBe(true);
            expect(legacy.tecnicoCpf).toBe('52998224725');
            expect(legacy.enderecoEntrega).toBe('Rua do Cadastro');
            expect(legacy.enderecoNumero).toBe('100');
            expect(legacy.cep).toBe('74000-000');
            expect(legacy.tecnicoNome).toBe('Tecnico Cadastro');
            expect(legacy.tecnicoEmail).toBe('tec@empresa.com');
            // valor já existente no registro não é sobrescrito
            expect(legacy.cidade).toBe('Anápolis');
        });

        it('retorna false sem técnico correspondente e não altera o registro', () => {
            const { DataManager } = loadDataManager();
            jest.spyOn(DataManager, 'getTechnicians').mockReturnValue([]);

            const record = { id: 'sol-2', tecnicoId: 'fantasma' };
            expect(DataManager.applyTechnicianSnapshotBackfill(record)).toBe(false);
            expect(record.tecnicoCpf).toBeUndefined();
        });

        it('preenche cidade e estado a partir de campos legados municipio/uf', () => {
            const { DataManager } = loadDataManager();
            jest.spyOn(DataManager, 'getTechnicians').mockReturnValue([{
                id: 'tec-legado',
                nome: 'Tecnico Legado',
                municipio: 'Anápolis',
                uf: 'GO'
            }]);

            const record = { id: 'sol-3', tecnicoId: 'tec-legado' };
            expect(DataManager.applyTechnicianSnapshotBackfill(record)).toBe(true);
            expect(record.cidade).toBe('Anápolis');
            expect(record.estado).toBe('GO');
        });
    });

    describe('Utils.resolveSolicitationTechnicianDetails', () => {
        it('usa requesterTecnicoId como fallback de lookup e expõe e-mail/telefone', () => {
            const Utils = loadUtils();
            global.DataManager = {
                getTechnicianById: jest.fn((id) => (String(id) === 'req-9' ? {
                    nome: 'Via Requester',
                    cpf: '52998224725',
                    email: 'req@empresa.com',
                    telefone: '(62) 98888-7777',
                    endereco: 'Av. Requester',
                    numero: '9'
                } : undefined)),
                getTechnicians: jest.fn(() => [])
            };

            const details = Utils.resolveSolicitationTechnicianDetails({
                requesterTecnicoId: 'req-9'
            });

            expect(details.name).toBe('Via Requester');
            expect(details.cpf).toBe('529.982.247-25');
            expect(details.email).toBe('req@empresa.com');
            expect(details.phone).toBe('(62) 98888-7777');
            expect(details.address.endereco).toBe('Av. Requester');
        });
    });

    describe('Utils.generatePDF — cenário do portal do fornecedor', () => {
        const solicitationSnapshot = {
            id: 'sol-pdf-1',
            numero: 'REQ-2026-0001',
            status: 'aprovada',
            data: '2026-07-08',
            tecnicoId: 'tec-1',
            tecnicoNome: 'Welington Bastos',
            tecnicoCpf: '52998224725',
            enderecoEntrega: 'Av. Morumbi Qd 34 Lt 11',
            enderecoNumero: '11',
            bairro: 'Jardim Alexandrina',
            cidade: 'Anápolis',
            estado: 'GO',
            cep: '75134-550',
            telefone: '(62) 99999-1111',
            itens: [{ codigo: 'CS008', descricao: 'Bico Injetor HD-50', quantidade: 2, valorUnit: 114.48 }],
            subtotal: 228.96,
            desconto: 0,
            frete: 0,
            total: 228.96,
            createdBy: 'Welington Bastos'
        };

        it('renderiza CPF e endereço a partir do snapshot quando o cadastro de técnicos é inacessível', () => {
            const Utils = loadUtils();
            const { JsPdfStub, drawnTexts } = buildJsPdfStub();
            window.jspdf = { jsPDF: JsPdfStub };
            // Fornecedor: regras do Firebase bloqueiam diversey_tecnicos
            global.DataManager = {
                getTechnicianById: jest.fn(() => undefined),
                getTechnicians: jest.fn(() => []),
                getSupplierById: jest.fn(() => ({ nome: 'Hobart' }))
            };

            const filename = Utils.generatePDF(solicitationSnapshot, { source: 'fornecedor' });

            const allText = drawnTexts.join('\n');
            expect(allText).toContain('529.982.247-25');
            expect(allText).toContain('Av. Morumbi Qd 34 Lt 11');
            expect(allText).toContain('75134-550');
            expect(allText).not.toContain('Endereço não informado');
            expect(filename).toContain('REQ-2026-0001');
        });

        it('sinaliza dados ausentes em vez de omitir silenciosamente', () => {
            const Utils = loadUtils();
            const { JsPdfStub, drawnTexts } = buildJsPdfStub();
            window.jspdf = { jsPDF: JsPdfStub };
            global.DataManager = {
                getTechnicianById: jest.fn(() => undefined),
                getTechnicians: jest.fn(() => []),
                getSupplierById: jest.fn(() => null)
            };

            Utils.generatePDF({
                id: 'sol-pdf-2',
                numero: 'REQ-2026-0002',
                status: 'pendente',
                data: '2026-07-08',
                tecnicoNome: 'Sem Cadastro',
                itens: [],
                subtotal: 0,
                desconto: 0,
                frete: 0,
                total: 0
            });

            const allText = drawnTexts.join('\n');
            expect(allText).toContain('Não informado');
            expect(allText).toContain('Endereço não informado');
        });
    });
});
