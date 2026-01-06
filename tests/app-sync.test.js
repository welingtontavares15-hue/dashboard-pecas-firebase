const fs = require('fs');
const path = require('path');

describe('App.syncData', () => {
    let App;
    let syncButton;

    const loadApp = () => {
        const appCode = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
        const factory = new Function(`
            ${appCode}
            return App;
        `);
        return factory();
    };

    beforeEach(() => {
        document.body.innerHTML = '<button id="sync-btn"></button>';
        syncButton = document.getElementById('sync-btn');

        global.Utils = {
            showToast: jest.fn()
        };

        global.Auth = {
            renderMenu: jest.fn()
        };

        global.DataManager = {
            KEYS: {
                USERS: 'users',
                SOLICITATIONS: 'solicitacoes'
            },
            syncAll: jest.fn().mockResolvedValue(true)
        };

        global.Dashboard = { render: jest.fn() };
        global.Solicitacoes = { render: jest.fn() };
        global.Aprovacoes = { render: jest.fn() };
        global.Pecas = { render: jest.fn() };
        global.Relatorios = { render: jest.fn(), initCharts: jest.fn() };
        global.Tecnicos = { render: jest.fn() };
        global.Fornecedores = { render: jest.fn() };

        App = loadApp();
        App.renderConfiguracoes = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
        document.body.innerHTML = '';
    });

    it('emits sync events and keeps the active view when sync succeeds', async () => {
        App.currentPage = 'configuracoes';

        const syncStatuses = [];
        const syncStatusListener = (event) => syncStatuses.push(event.detail.state);
        const dataUpdates = [];
        const dataUpdateListener = (event) => dataUpdates.push(event.detail.keys);

        window.addEventListener('sync:status', syncStatusListener);
        window.addEventListener('data:updated', dataUpdateListener);

        await App.syncData();

        window.removeEventListener('sync:status', syncStatusListener);
        window.removeEventListener('data:updated', dataUpdateListener);

        expect(DataManager.syncAll).toHaveBeenCalledWith('manual');
        expect(syncStatuses).toEqual(expect.arrayContaining(['start', 'done']));
        expect(dataUpdates).toHaveLength(1);
        expect(dataUpdates[0]).toEqual(expect.arrayContaining(['users', 'solicitacoes']));
        expect(App.currentPage).toBe('configuracoes');
        expect(App.renderConfiguracoes).toHaveBeenCalled();
        expect(Auth.renderMenu).toHaveBeenCalledWith('configuracoes');
        expect(Utils.showToast).toHaveBeenCalledWith('Sincronizando...', 'info');
        expect(Utils.showToast).toHaveBeenCalledWith('Sincronizado', 'success');
        expect(syncButton.classList.contains('rotating')).toBe(false);
    });

    it('does not navigate when sync is unavailable', async () => {
        DataManager.syncAll.mockResolvedValue(false);
        App.currentPage = 'pecas';
        App.refreshActiveView = jest.fn();

        const syncStatuses = [];
        const syncStatusListener = (event) => syncStatuses.push(event.detail.state);
        window.addEventListener('sync:status', syncStatusListener);

        await App.syncData();

        window.removeEventListener('sync:status', syncStatusListener);

        expect(syncStatuses[0]).toBe('start');
        expect(syncStatuses).toContain('error');
        expect(App.currentPage).toBe('pecas');
        expect(App.refreshActiveView).not.toHaveBeenCalled();
        expect(Utils.showToast).toHaveBeenCalledWith('Sincronização em nuvem não disponível', 'warning');
        expect(syncButton.classList.contains('rotating')).toBe(false);
    });
});
