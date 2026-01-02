/**
 * Data Management Module
 * Handles all data operations with cloud storage and localStorage fallback
 */

const OFFICIAL_TECHNICIANS_BASE = {
    "Antonio Ferreira De Santana Filho":{"endereco":"Av Curió - Campanário, Ap 510 Bloco B","bairro":"","cep":"09.925-000","municipio":"Diadema","uf":"SP"},
    "Antonio Rocker":{"endereco":"Rua Estoril 131","bairro":"Veleiros","cep":"47.730-900","municipio":"São Paulo","uf":"SP"},
    "Brunno Diniz Mendes":{"endereco":"Rua da Granja S/N, Condomínio Plaza Norte Residence, Bloco 06C AP 010","bairro":"Maiobinha","cep":"65120-176","municipio":"São José de Ribamar","uf":"MA"},
    "Carlos Alberto De Vasconcelos Junior":{"endereco":"Deputado João Ursulo Ribeiro Filho A 149","bairro":"Mangabeira I","cep":"58.055-360","municipio":"João Pessoa","uf":"PB"},
    "Dalvino Carlos Santos Junior":{"endereco":"Rua vivaldo sales 158, apartamento 41","bairro":"jardim são josé","cep":"11-430 140","municipio":"guarujá são paulo","uf":"SP"},
    "Davidson Alves Vitorino":{"endereco":"Jacarandá N° 157","bairro":"Sapucaias 3","cep":"32.071-236","municipio":"Contagem","uf":"MG"},
    "Diego Abner de Oliveira":{"endereco":"Rua Mário Campos 71 AP 401 Bloco 08","bairro":"","cep":"12.221-750","municipio":"São Jose do Campos","uf":"SP"},
    "Ednaldo Silva Costa":{"endereco":"Rua Olimpío Cassimiro Mendonça, 542","bairro":"Parque das Américas","cep":"38.045-360","municipio":"Uberaba","uf":"MG"},
    "Ediveton Pedro Da Silva":{"endereco":"Rua Mário Prieto 500","bairro":"Jardim Paulista","cep":"13.310-000","municipio":"Itu","uf":"SP"},
    "Eduardo Martins":{"endereco":"Rua Rafael da Silva e Souza N°510","bairro":"Cidade Líder","cep":"08280-090","municipio":"São Paulo","uf":"SP"},
    "Emerson Ribeiro":{"endereco":"Rua São Cristóvão, 471 Casa 03","bairro":"","cep":"88.080-320","municipio":"Florianópolis","uf":"SC"},
    "Fernando Silva":{"endereco":"Hermelindo Lazarini, 69","bairro":"Jardim das Nações","cep":"79.081-714","municipio":"Campo Grande","uf":"MS"},
    "Getulio Santos De Almeida":{"endereco":"Rua Nara Leão, N° 125. Apto Jarmim 1103","bairro":"Jardim Limoeiro","cep":"29.164-125","municipio":"Serra","uf":"ES"},
    "Humberto Elias Dos Santos Da Silva":{"endereco":"Av Jose Aloisio Filho N° 411 Apto 368 Bloco Q","bairro":"Humaita","cep":"90.250-180","municipio":"Porto Alegre","uf":"RS"},
    "Joao Celso Silva De Souza":{"endereco":"Leonardo da Vinci 96 Bloco C Ap 306","bairro":"Curado II","cep":"54.220-000","municipio":"Jaboatão dos Guararapes","uf":"PE"},
    "Leandro Rocha Cruz":{"endereco":"R. Dom Pedro II 537A Fundos","bairro":"Centro","cep":"14.820-290","municipio":"Cidade Américo Brasiliense - SP","uf":"SP"},
    "Maicon Cordeiro Chaves":{"endereco":"Rua Saxonia N°2013","bairro":"Vila Itoupava","cep":"89075-255","municipio":"Blumenau","uf":"SC"},
    "Marcio Andrade Dos Santos":{"endereco":"1° Travessa Renato Lima de Carvalho N° 33","bairro":"Jardim Alvorada","cep":"42.850-000","municipio":"Dias davila","uf":"BA"},
    "Marlon de Queiroz":{"endereco":"AV. Juscelino Kubitschek, 3700 Bloco-E, Apto -301","bairro":"Passare","cep":"60.861.634","municipio":"Fortaleza","uf":"CE"},
    "Ney Goncalves Cardoso":{"endereco":"Rua Juqueri,266","bairro":"Irajá","cep":"21.371-370","municipio":"Rio de Janeiro","uf":"RJ"},
    "Pedro Gabriel Reis Nunes":{"endereco":"Rua Cristo Rei, 230, casa 101.","bairro":"São José","cep":"97095-680","municipio":"Santa Maria","uf":"RS"},
    "Rodrigo Lazari De Carvalho":{"endereco":"Rua alonso Vasconcelos pacheco 1327","bairro":"","cep":"09310-695","municipio":"Maua","uf":"SP"},
    "Sebastião Gomes Ribeiro":{"endereco":"RUA THOME DE SOUZA, 335","bairro":"LAGOA GRANDE – SEDE","cep":"45.810-000","municipio":"PORTO SEGURO","uf":"BA"},
    "Welington Bastos Tavares":{"endereco":"AV Morumbi Qd 34 Lt 11","bairro":"Vila Mariana","cep":"75.134-550","municipio":"Anápolis","uf":"GO"},
    "Werverton Santos":{"endereco":"","bairro":"","cep":"","municipio":"","uf":"","username":"Werverton.Santos"}
};

const OFFICIAL_PARTS_BASE = [
    {"codigo":"CS001","descricao":"Adaptador Braço Lavagem HD-80","valor":225.00},
    {"codigo":"CS002","descricao":"Adaptador Do Braço De Lavagem (Tarugo) HD-50","valor":175.70},
    {"codigo":"CS003","descricao":"Adaptador Do Braço De Lavagem (Tarugo) HD-80","valor":205.00},
    {"codigo":"CS004","descricao":"Adaptador Interno HD-80","valor":350.00},
    {"codigo":"CS005","descricao":"Arruela De Rotação HD-80","valor":40.00},
    {"codigo":"CS006","descricao":"Assento Do Braço De Lavagem (Bucha) HD-50","valor":101.00},
    {"codigo":"CS007","descricao":"Batente Lateral HD-80","valor":105.00},
    {"codigo":"CS008","descricao":"Bicos Injetores Do Braço HD-50/HD-80","valor":114.48},
    {"codigo":"CS009","descricao":"Boiler HD-50","valor":2033.00},
    {"codigo":"CS010","descricao":"Boiler HD-80","valor":2355.00},
    {"codigo":"CS011","descricao":"Boma De Enxague (Importada) HD-50","valor":2007.79},
    {"codigo":"CS012","descricao":"Boma De Enxague (Nacional) HD-80","valor":1550.00},
    {"codigo":"CS013","descricao":"Bomba De Lavagem HD-50","valor":7529.22},
    {"codigo":"CS014","descricao":"Bomba De Lavagem HD-80","valor":11293.85},
    {"codigo":"CS015","descricao":"Braço Capo HD-80","valor":1255.00},
    {"codigo":"CS016","descricao":"Braço De Lavagem HD-50","valor":1205.00},
    {"codigo":"CS017","descricao":"Braço De Lavagem Superior Completo HD-80","valor":1715.00},
    {"codigo":"CS018","descricao":"Caixa De Montagem Elétrica HD-80","valor":680.00},
    {"codigo":"CS019","descricao":"Caixa De Montagem HD-50","valor":225.88},
    {"codigo":"CS020","descricao":"Capa Do Filtro De Residuo HD-50","valor":150.60},
    {"codigo":"CS021","descricao":"Capo HD-80","valor":5020.00},
    {"codigo":"CS022","descricao":"Cesto De Resíduo HD-80","valor":150.60},
    {"codigo":"CS023","descricao":"Chicote NR12","valor":3210.00},
    {"codigo":"CS024","descricao":"Conexão Braço HD-80","valor":1507.00},
    {"codigo":"CS025","descricao":"Conj Termostato","valor":886.72},
    {"codigo":"CS026","descricao":"Conjunto de cesto de residuo NT-300","valor":1123.05},
    {"codigo":"CS027","descricao":"Contactora De Comando HD-80","valor":328.00},
    {"codigo":"CS028","descricao":"Contatora HD-50","valor":328.00},
    {"codigo":"CS029","descricao":"Curva Braço Superior HD-50","valor":115.00},
    {"codigo":"CS030","descricao":"Disjuntor 10A HD-80","valor":375.00},
    {"codigo":"CS031","descricao":"Disjuntor 125A","valor":1776.85},
    {"codigo":"CS032","descricao":"Disjuntor 80A","valor":313.20},
    {"codigo":"CS033","descricao":"Eixo De Suporte Do Braço HD-50","valor":301.50},
    {"codigo":"CS034","descricao":"Etiqueta Painel NT","valor":545.90},
    {"codigo":"CS035","descricao":"Filtro De Residuo HD-50","valor":742.00},
    {"codigo":"CS036","descricao":"Filtro De Residuo Hdw-80 HD-80","valor":401.56},
    {"codigo":"CS037","descricao":"Fim de curso HDW-200","valor":789.21},
    {"codigo":"CS038","descricao":"Fim de curso HDW-200 (Completo)","valor":2175.50},
    {"codigo":"CS039","descricao":"Flange Braço Inferior HD-50","valor":742.00},
    {"codigo":"CS040","descricao":"Flange Braço Superior HD-50","valor":742.00},
    {"codigo":"CS041","descricao":"Flauta De Enxague (S/ Bicos) HD-80","valor":125.50},
    {"codigo":"CS042","descricao":"Flauta Do Braço HD-50","valor":125.50},
    {"codigo":"CS043","descricao":"Flauta HD-80","valor":1204.75},
    {"codigo":"CS044","descricao":"Fonte 24V 10A HD-50/HD-80","valor":155.00},
    {"codigo":"CS045","descricao":"Kit Mangueiras (Agua + Dreno) HD-50/HD-80","valor":240.00},
    {"codigo":"CS046","descricao":"Luva Braço Superior HD-50","valor":90.00},
    {"codigo":"CS047","descricao":"Mangueira De Borracha HD-80","valor":95.00},
    {"codigo":"CS048","descricao":"Mola Da Porta HD-50","valor":75.00},
    {"codigo":"CS049","descricao":"Mola Do Capo HD-80","valor":830.00},
    {"codigo":"CS050","descricao":"Painel Elétrico Completo HD-50","valor":9550.00},
    {"codigo":"CS051","descricao":"Painel Ihm HD-50/HD-80","valor":1588.00},
    {"codigo":"CS052","descricao":"Parafuso Da Rondana HD-50","valor":75.29},
    {"codigo":"CS053","descricao":"Parafuso De Fixação Braço De Lavagem HD-80","valor":105.00},
    {"codigo":"CS054","descricao":"Parafuso De Fixação Da Polia HD-80","valor":145.00},
    {"codigo":"CS055","descricao":"Pino Batente Lateral Capo HD-80","valor":130.00},
    {"codigo":"CS056","descricao":"Placa Controladora HD-50/HD-80","valor":6307.00},
    {"codigo":"CS057","descricao":"Placa De Montagem HD-50","valor":280.00},
    {"codigo":"CS058","descricao":"Polia De Movimentação Do Capo HD-80","valor":135.00},
    {"codigo":"CS059","descricao":"Polia Inferior Do Capo HD-80","valor":150.00},
    {"codigo":"CS060","descricao":"Porta HD-50","valor":1760.00},
    {"codigo":"CS061","descricao":"Pressostato De Nível HD-50","valor":610.00},
    {"codigo":"CS062","descricao":"Pressostato HDW-200","valor":453.68},
    {"codigo":"CS063","descricao":"Pressotato De Nível HD-80","valor":572.40},
    {"codigo":"CS064","descricao":"Pulmão HD-80","valor":500.00},
    {"codigo":"CS065","descricao":"Relé De Proteção HD-50/HD-80","valor":414.11},
    {"codigo":"CS067","descricao":"Resistencia do booster HDW-200","valor":1696.00},
    {"codigo":"CS068","descricao":"Resistencia Do Tanque Com Flange Hd50","valor":1017.60},
    {"codigo":"CS069","descricao":"Resistencia Do Tanque Com Flange Hd80","valor":1023.00},
    {"codigo":"CS070","descricao":"Resistencia do TQ HDW-200","valor":1346.73},
    {"codigo":"CS071","descricao":"Resistencia NT-300","valor":1696.00},
    {"codigo":"CS072","descricao":"Resistências Boiler Com Flange Hd50","valor":1272.00},
    {"codigo":"CS073","descricao":"Resistências Boiler Com Flange Hd80","valor":1484.00},
    {"codigo":"CS074","descricao":"Roldana HD-80","valor":163.50},
    {"codigo":"CS075","descricao":"Rondana Da Porta HD-50","valor":75.00},
    {"codigo":"CS076","descricao":"Saida Do Dreno HD-50","valor":476.85},
    {"codigo":"CS077","descricao":"Sensor Capo HD-80","valor":108.45},
    {"codigo":"CS078","descricao":"Sensor De Nivel HD-50","valor":606.74},
    {"codigo":"CS079","descricao":"Sensor De Nível HD-80","valor":606.74},
    {"codigo":"CS080","descricao":"Sensor De Temperatura HD-50","valor":255.00},
    {"codigo":"CS081","descricao":"Solenoide De Agua HD-50","valor":175.00},
    {"codigo":"CS082","descricao":"Sonda Temperatura","valor":320.51},
    {"codigo":"CS083","descricao":"Suporte Bomba De Lavagem HD-80","valor":75.00},
    {"codigo":"CS084","descricao":"Suporte Braço Capo HD-80","valor":40.00},
    {"codigo":"CS085","descricao":"Suporte Capo HD-80","valor":150.00},
    {"codigo":"CS086","descricao":"Suporte Do Boiler HD-80","valor":225.00},
    {"codigo":"CS087","descricao":"Suporte Do Rack HD-80","valor":1255.00},
    {"codigo":"CS088","descricao":"Suporte Fixação HD-80","valor":155.00},
    {"codigo":"CS089","descricao":"Suporte Gancho Bomba De Lavagem HD-80","valor":350.00},
    {"codigo":"CS090","descricao":"Suporte Luva Para Mangeira Do Dreno HD-80","valor":276.00},
    {"codigo":"CS091","descricao":"Suporte Painel HD-80","valor":405.00},
    {"codigo":"CS092","descricao":"Suporte Regulável De Altura(Pé) HD-80","valor":335.00},
    {"codigo":"CS093","descricao":"Suporte Termostato Do Boiler HD-80","valor":51.00},
    {"codigo":"CS094","descricao":"Tampa Frontal HD-50","valor":602.34},
    {"codigo":"CS095","descricao":"Tampa Frontal HD-80","valor":230.00},
    {"codigo":"CS096","descricao":"Tampa Inferior HD-50","valor":502.00},
    {"codigo":"CS097","descricao":"Tampa Inferior Traseira HD-50","valor":955.00},
    {"codigo":"CS098","descricao":"Tampa Lateral Direita HD-50","valor":905.00},
    {"codigo":"CS099","descricao":"Tampa Lateral HD-80","valor":705.00},
    {"codigo":"CS100","descricao":"Tampa Superior HD-50","valor":1130.00},
    {"codigo":"CS101","descricao":"Tampa Superior HD-80","valor":205.00},
    {"codigo":"CS102","descricao":"Tampa Traseira HD-50","valor":1005.00},
    {"codigo":"CS103","descricao":"Tampa Traseira HD-80","valor":715.00},
    {"codigo":"CS104","descricao":"Tampao Do Dreno HD-50","valor":119.06},
    {"codigo":"CS105","descricao":"Tampão Do Dreno HD-80","valor":183.60},
    {"codigo":"CS106","descricao":"Tela De Filtro De Resíduo Direito HD-80","valor":337.61},
    {"codigo":"CS107","descricao":"Tela De Filtro De Resíduo Esquerdo HD-80","valor":337.61},
    {"codigo":"CS108","descricao":"Terminal De Aterramento HD-50","valor":55.50},
    {"codigo":"CS109","descricao":"Termostato Do Boiler HD-50/H80","valor":901.00},
    {"codigo":"CS110","descricao":"Termostato Do Tanque HD/HD-80","valor":254.40},
    {"codigo":"CS111","descricao":"Trilho Dim HD-50/HD-80","valor":40.00},
    {"codigo":"CS112","descricao":"Tubo Braço Lavagem Superior HD-80","valor":1635.00},
    {"codigo":"CS113","descricao":"Tubo Da Bomba De Lavagem (Mangote Curvo) HD-80","valor":350.00},
    {"codigo":"CS114","descricao":"Tubo De Drenagem Hdw-80 HD-80","valor":355.00},
    {"codigo":"CS115","descricao":"Tubo De Saida Da Bomba De Lavagem HD-50","valor":225.88},
    {"codigo":"CS116","descricao":"Tubo Saida Bomba De Lavagem HD-80","valor":263.55},
    {"codigo":"CS117","descricao":"Tupo Braço Superior HD-50","valor":52.00},
    {"codigo":"CS118","descricao":"Valvula De Agua HD-80","valor":159.00},
    {"codigo":"CS119","descricao":"Valvula Solenoide HDW-200 NT","valor":172.50},
    {"codigo":"CS120","descricao":"Etiqueta Painel","valor":69.00},
    {"codigo":"CS121","descricao":"Contator 9A AC3 220v 1NA","valor":393.92},
    {"codigo":"CS122","descricao":"Contator 38A AC3 220v 1NA/1NF","valor":712.23},
    {"codigo":"CS123","descricao":"Conj Botao L/D Duplo C/ Sinaliz 220v - BL Contat e Capa M","valor":515.27},
    {"codigo":"CS124","descricao":"Conj Botao Emergencia c/ Bloco Cont e Colar Prot","valor":464.06},
    {"codigo":"CS125","descricao":"Fita de Vedação da Porta","valor":10.00},
    {"codigo":"CS126","descricao":"Mont Flange Mancal Eixo Mtr C/B Bronze E Retentor-Nt 810-Vnd","valor":1225.25}
];

const DataManager = {
    // Storage keys
    KEYS: {
        USERS: 'diversey_users',
        TECHNICIANS: 'diversey_tecnicos',
        SUPPLIERS: 'diversey_fornecedores',
        PARTS: 'diversey_pecas',
        SOLICITATIONS: 'diversey_solicitacoes',
        SETTINGS: 'diversey_settings',
        RECENT_PARTS: 'diversey_recent_parts'
    },

    // Status definitions (shared across the application)
    STATUS: {
        RASCUNHO: 'rascunho',
        ENVIADA: 'enviada',
        PENDENTE: 'pendente',
        APROVADA: 'aprovada',
        REJEITADA: 'rejeitada',
        EM_TRANSITO: 'em-transito',
        ENTREGUE: 'entregue',
        FINALIZADA: 'finalizada'
    },

    // Cloud storage initialized flag
    cloudInitialized: false,

    /**
     * Initialize default data and cloud storage
     */
    async init() {
        // Initialize cloud storage if available
        if (typeof CloudStorage !== 'undefined') {
            try {
                this.cloudInitialized = await CloudStorage.init();
                
                if (this.cloudInitialized) {
                    // Subscribe to real-time updates for solicitations
                    CloudStorage.subscribe(this.KEYS.SOLICITATIONS, (data) => {
                        console.log('Solicitations updated from cloud');
                        // Refresh UI if on relevant page
                        if (typeof App !== 'undefined' && 
                            (App.currentPage === 'aprovacoes' || 
                             App.currentPage === 'solicitacoes' ||
                             App.currentPage === 'minhas-solicitacoes' ||
                             App.currentPage === 'dashboard')) {
                            App.renderPage(App.currentPage);
                            if (typeof Auth !== 'undefined') {
                                Auth.renderMenu(App.currentPage);
                            }
                        }
                    });
                }
            } catch (e) {
                console.warn('Cloud storage initialization failed:', e);
            }
        }

        // Initialize users if not exists
        if (!localStorage.getItem(this.KEYS.USERS)) {
            const defaultUsers = await this.getDefaultUsers();
            this.saveData(this.KEYS.USERS, defaultUsers);
        }
        
        // Initialize technicians
        if (!localStorage.getItem(this.KEYS.TECHNICIANS)) {
            this.saveData(this.KEYS.TECHNICIANS, this.getDefaultTechnicians());
        }
        
        // Initialize suppliers
        if (!localStorage.getItem(this.KEYS.SUPPLIERS)) {
            this.saveData(this.KEYS.SUPPLIERS, this.getDefaultSuppliers());
        }
        
        // Initialize parts catalog
        if (!localStorage.getItem(this.KEYS.PARTS)) {
            this.saveData(this.KEYS.PARTS, this.getDefaultParts());
        }
        
        // Initialize solicitations
        if (!localStorage.getItem(this.KEYS.SOLICITATIONS)) {
            this.saveData(this.KEYS.SOLICITATIONS, this.getDefaultSolicitations());
        }
        
        // Initialize settings
        if (!localStorage.getItem(this.KEYS.SETTINGS)) {
            this.saveData(this.KEYS.SETTINGS, {
                theme: 'light',
                slaHours: 24,
                itemsPerPage: 10
            });
        }

        // Migrate plaintext passwords to hashed form
        try {
            await this.migrateUserPasswords();
        } catch (e) {
            console.warn('Failed to migrate passwords to secure hash; affected users may need to reset credentials', e);
        }
    },

    /**
     * Save data to storage (cloud + localStorage)
     */
    saveData(key, data) {
        try {
            // Always save to localStorage first
            localStorage.setItem(key, JSON.stringify(data));
            
            // Also save to cloud storage if available
            if (this.cloudInitialized && typeof CloudStorage !== 'undefined') {
                CloudStorage.saveData(key, data).catch(e => {
                    console.warn('Cloud save failed:', e);
                });
            }
            
            return true;
        } catch (e) {
            console.error('Error saving data:', e);
            return false;
        }
    },

    /**
     * Load data from storage (localStorage with cloud sync)
     */
    loadData(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error loading data:', e);
            return null;
        }
    },

    /**
     * Force sync data from cloud
     */
    async syncFromCloud() {
        if (this.cloudInitialized && typeof CloudStorage !== 'undefined') {
            await CloudStorage.syncFromCloud();
        }
    },

    /**
     * Check if cloud storage is available
     */
    isCloudAvailable() {
        return this.cloudInitialized && typeof CloudStorage !== 'undefined' && CloudStorage.isCloudAvailable();
    },

    // ===== USERS =====
    async getDefaultUsers() {
        const technicians = this.getDefaultTechnicians();
        const baseUsersRaw = [
            { id: 'admin', username: 'admin', password: 'admin', name: 'Administrador', role: 'administrador', email: 'admin@diversey.com' },
            { id: 'gestor', username: 'gestor', password: 'gestor', name: 'Welington Tavares', role: 'gestor', email: 'gestor@diversey.com' },
            { id: 'gestor_wt', username: 'welington.tavares', password: 'tavares123', name: 'Welington Tavares', role: 'gestor', email: 'welington.tavares@diversey.com' }
        ];
        const baseUsers = [];
        for (const user of baseUsersRaw) {
            try {
                const passwordHash = await Utils.hashSHA256(user.password, `${Utils.PASSWORD_SALT}:${user.username}`);
                const { password, ...userData } = user;
                baseUsers.push({ ...userData, passwordHash });
            } catch (e) {
                console.error('Erro ao gerar hash de usuário padrão', e);
            }
        }

        const credentialOverrides = {
            'welington.bastos.tavares': { password: 'welington123' },
            'pedro.gabriel.reis.nunes': { password: 'pedro123' },
            'rodrigo.lazari.de.carvalho': { password: 'rodrigo123' },
            'Werverton.Santos': { password: 'werverton123' }
        };
        const technicianUsers = [];
        for (const [idx, tech] of technicians.entries()) {
            const plainPassword = credentialOverrides[tech.username]?.password || 'Altere@123';
            try {
                const passwordHash = await Utils.hashSHA256(plainPassword, `${Utils.PASSWORD_SALT}:${tech.username}`);
                technicianUsers.push({
                    id: `user_${tech.id || idx + 1}`,
                    username: tech.username,
                    passwordHash,
                    name: tech.nome,
                    role: 'tecnico',
                    email: tech.email,
                    tecnicoId: tech.id,
                    disabled: tech.ativo === false
                });
            } catch (e) {
                console.error('Erro ao gerar hash de técnico padrão', e);
            }
        }
        return [...baseUsers, ...technicianUsers];
    },

    getUsers() {
        return this.loadData(this.KEYS.USERS) || [];
    },

    getUserByUsername(username) {
        const users = this.getUsers();
        return users.find(u => u.username === username);
    },

    /**
     * Create or update user (used for adding gestores)
     */
    async migrateUserPasswords() {
        const users = this.getUsers();
        let updated = false;
        for (const u of users) {
            if (u && u.password && !u.passwordHash) {
                const saltKey = u.username || u.id || 'missing-username';
                if (!u.username) {
                    console.warn(`User ${u.id} missing username during password migration`);
                }
                u.passwordHash = await Utils.hashSHA256(u.password, `${Utils.PASSWORD_SALT}:${saltKey}`);
                delete u.password;
                updated = true;
            }
        }
        if (updated) {
            this.saveData(this.KEYS.USERS, users);
        }
    },

    async saveUser(user) {
        if (!user || !user.username) {
            return { success: false, error: 'Usuário inválido' };
        }

        const users = this.getUsers();
        const duplicate = users.find(u => u.username === user.username && u.id !== user.id);
        if (duplicate) {
            return { success: false, error: 'Nome de usuário já cadastrado' };
        }

        const normalizedUser = {
            id: user.id || Utils.generateId(),
            username: String(user.username).trim(),
            name: user.name || user.username,
            role: user.role || 'gestor',
            email: user.email || '',
            tecnicoId: user.tecnicoId || null,
            disabled: user.disabled === true ? true : (user.disabled === false ? false : undefined)
        };

        try {
            if (user.passwordHash) {
                normalizedUser.passwordHash = user.passwordHash;
            } else if (user.password) {
                normalizedUser.passwordHash = await Utils.hashSHA256(user.password, `${Utils.PASSWORD_SALT}:${normalizedUser.username}`);
            }
        } catch (e) {
            console.error('Erro ao gerar hash de senha', e);
            return { success: false, error: 'Não foi possível salvar a senha com segurança' };
        }

        if (!normalizedUser.passwordHash) {
            return { success: false, error: 'Senha é obrigatória' };
        }

        const index = users.findIndex(u => u.id === normalizedUser.id);
        if (normalizedUser.disabled === undefined && index >= 0) {
            normalizedUser.disabled = users[index].disabled;
        }
        if (index >= 0) {
            users[index] = { ...users[index], ...normalizedUser };
        } else {
            users.push(normalizedUser);
        }

        const saved = this.saveData(this.KEYS.USERS, users);
        return { success: saved, user: normalizedUser };
    },

    getGestorUsers() {
        return this.getUsers().filter(u => u.role === 'gestor');
    },

    // ===== TECHNICIANS =====
    getDefaultTechnicians() {
        const buildUsername = (name) => {
            const normalized = Utils.normalizeText(name)
                .replace(/[^a-z0-9]+/g, '.')
                .replace(/\.+/g, '.')
                .replace(/^\.|\.$/g, '');
            return normalized || 'tecnico';
        };

        return Object.entries(OFFICIAL_TECHNICIANS_BASE).map(([nome, info], index) => {
            const username = info.username || buildUsername(nome) || `tecnico${index + 1}`;
            const cepDigits = (info.cep || '').replace(/[^\d]/g, '');
            const formattedCep = cepDigits.length === 8 ? cepDigits.replace(/^(\d{5})(\d{3})$/, '$1-$2') : (info.cep || '');
            return { 
                id: `tech_${index + 1}`, 
                nome, 
                email: `${username}@diversey.com`, 
                telefone: '', 
                regiao: info.uf || '', 
                ativo: true,
                endereco: info.endereco || '',
                numero: '',
                complemento: '',
                bairro: info.bairro || '',
                cidade: info.municipio || '',
                estado: info.uf || '',
                cep: formattedCep,
                username
            };
        });
    },

    getTechnicians() {
        return this.loadData(this.KEYS.TECHNICIANS) || [];
    },

    getTechnicianById(id) {
        const technicians = this.getTechnicians();
        return technicians.find(t => t.id === id);
    },

    saveTechnician(technician) {
        const technicians = this.getTechnicians();
        const index = technicians.findIndex(t => t.id === technician.id);
        
        if (index >= 0) {
            technicians[index] = technician;
        } else {
            technician.id = Utils.generateId();
            technicians.push(technician);
        }
        
        return this.saveData(this.KEYS.TECHNICIANS, technicians);
    },

    deleteTechnician(id) {
        const technicians = this.getTechnicians().filter(t => t.id !== id);
        return this.saveData(this.KEYS.TECHNICIANS, technicians);
    },

    // ===== SUPPLIERS =====
    getDefaultSuppliers() {
        return [
            { id: 'sup-ebst', nome: 'EBST', email: 'pedidos@ebstecnologica.com.br', telefone: '', cnpj: '03.424.364/0001-97', ativo: true }
        ];
    },

    getSuppliers() {
        return this.loadData(this.KEYS.SUPPLIERS) || [];
    },

    getSupplierById(id) {
        const suppliers = this.getSuppliers();
        return suppliers.find(s => s.id === id);
    },

    saveSupplier(supplier) {
        const suppliers = this.getSuppliers();
        const index = suppliers.findIndex(s => s.id === supplier.id);
        
        if (index >= 0) {
            suppliers[index] = supplier;
        } else {
            supplier.id = Utils.generateId();
            suppliers.push(supplier);
        }
        
        return this.saveData(this.KEYS.SUPPLIERS, suppliers);
    },

    deleteSupplier(id) {
        const suppliers = this.getSuppliers().filter(s => s.id !== id);
        return this.saveData(this.KEYS.SUPPLIERS, suppliers);
    },

    // ===== PARTS =====
    getDefaultParts() {
        return OFFICIAL_PARTS_BASE.map((item) => ({
            id: item.codigo,
            codigo: item.codigo,
            descricao: item.descricao,
            categoria: 'Catálogo Oficial',
            valor: item.valor,
            unidade: 'UN',
            ativo: true
        }));
    },

    generatePartDescription(prefix, num) {
        const descriptions = {
            CS: ['Componente de Sistema', 'Conjunto de Suporte', 'Conector Simples', 'Cabo de Sinal'],
            EL: ['Motor Elétrico', 'Resistência', 'Fusível', 'Disjuntor', 'Contator', 'Relé Térmico'],
            MC: ['Rolamento', 'Eixo', 'Engrenagem', 'Correia', 'Polia', 'Acoplamento'],
            HD: ['Válvula', 'Mangueira', 'Conexão', 'Bomba', 'Cilindro', 'Filtro'],
            ET: ['Placa Controladora', 'Sensor', 'Display', 'Módulo', 'Inversor'],
            PN: ['Válvula Pneumática', 'Cilindro Pneumático', 'Regulador de Pressão'],
            SG: ['EPI', 'Proteção', 'Sinalização', 'Extintor'],
            QM: ['Detergente', 'Sanitizante', 'Lubrificante', 'Solvente'],
            FT: ['Chave', 'Ferramenta', 'Instrumento', 'Equipamento']
        };
        
        const options = descriptions[prefix] || ['Peça'];
        const base = options[num % options.length];
        return `${base} ${prefix}-${num} - Modelo Industrial`;
    },

    getParts() {
        return this.loadData(this.KEYS.PARTS) || [];
    },

    getPartById(id) {
        const parts = this.getParts();
        return parts.find(p => p.id === id);
    },

    getPartByCode(code) {
        const parts = this.getParts();
        return parts.find(p => p.codigo === code);
    },

    /**
     * Search parts with prefix search and pagination (for scalability)
     * @param {string} query - Search query
     * @param {number} page - Page number (1-based)
     * @param {number} limit - Items per page
     * @returns {object} - { items: [], total: number, page: number, totalPages: number }
     */
    searchParts(query, page = 1, limit = 30) {
        const parts = this.getParts().filter(p => p.ativo !== false);
        let filtered;
        
        if (!query || query.length === 0) {
            filtered = parts;
        } else {
            const normalizedQuery = Utils.normalizeText(query);
            
            // Prefix search priority: starts with query first
            const startsWithCode = parts.filter(p => 
                Utils.normalizeText(p.codigo).startsWith(normalizedQuery)
            );
            
            const startsWithDesc = parts.filter(p => 
                !Utils.normalizeText(p.codigo).startsWith(normalizedQuery) &&
                Utils.normalizeText(p.descricao).startsWith(normalizedQuery)
            );
            
            // Then contains
            const containsMatch = parts.filter(p => 
                !Utils.normalizeText(p.codigo).startsWith(normalizedQuery) &&
                !Utils.normalizeText(p.descricao).startsWith(normalizedQuery) &&
                (Utils.normalizeText(p.codigo).includes(normalizedQuery) ||
                 Utils.normalizeText(p.descricao).includes(normalizedQuery))
            );
            
            filtered = [...startsWithCode, ...startsWithDesc, ...containsMatch];
        }
        
        const total = filtered.length;
        const totalPages = Math.ceil(total / limit);
        const start = (page - 1) * limit;
        const items = filtered.slice(start, start + limit);
        
        return { items, total, page, totalPages };
    },

    savePart(part) {
        const parts = this.getParts();
        const index = parts.findIndex(p => p.id === part.id);
        
        // Check for duplicate code
        const existingCode = parts.find(p => p.codigo === part.codigo && p.id !== part.id);
        if (existingCode) {
            return { success: false, error: 'Código já existe' };
        }
        
        if (index >= 0) {
            parts[index] = part;
        } else {
            part.id = Utils.generateId();
            parts.push(part);
        }
        
        const saved = this.saveData(this.KEYS.PARTS, parts);
        return { success: saved };
    },

    deletePart(id) {
        const parts = this.getParts().filter(p => p.id !== id);
        return this.saveData(this.KEYS.PARTS, parts);
    },

    importParts(data) {
        const parts = this.getParts();
        let imported = 0;
        let updated = 0;
        let errors = [];
        
        data.forEach((row, idx) => {
            try {
                const codigo = row.codigo || row.Código || row.CODIGO;
                const descricao = row.descricao || row.Descrição || row.DESCRICAO;
                
                if (!codigo || !descricao) {
                    errors.push(`Linha ${idx + 2}: Código ou descrição ausente`);
                    return;
                }
                
                const existing = parts.find(p => p.codigo === codigo);
                
                const part = {
                    id: existing?.id || Utils.generateId(),
                    codigo: String(codigo).trim(),
                    descricao: String(descricao).trim(),
                    categoria: row.categoria || row.Categoria || 'Geral',
                    valor: parseFloat(row.valor || row.Valor || 0),
                    unidade: row.unidade || row.Unidade || 'UN',
                    ativo: true
                };
                
                if (existing) {
                    const index = parts.findIndex(p => p.id === existing.id);
                    parts[index] = part;
                    updated++;
                } else {
                    parts.push(part);
                    imported++;
                }
            } catch (e) {
                errors.push(`Linha ${idx + 2}: ${e.message}`);
            }
        });
        
        this.saveData(this.KEYS.PARTS, parts);
        return { imported, updated, errors };
    },

    // ===== RECENT PARTS (per technician) =====
    getRecentParts(tecnicoId) {
        const recent = this.loadData(this.KEYS.RECENT_PARTS) || {};
        return recent[tecnicoId] || [];
    },

    addRecentPart(tecnicoId, partCode) {
        const recent = this.loadData(this.KEYS.RECENT_PARTS) || {};
        if (!recent[tecnicoId]) {
            recent[tecnicoId] = [];
        }
        
        // Remove if already exists
        recent[tecnicoId] = recent[tecnicoId].filter(c => c !== partCode);
        
        // Add to beginning
        recent[tecnicoId].unshift(partCode);
        
        // Keep only last 10
        recent[tecnicoId] = recent[tecnicoId].slice(0, 10);
        
        this.saveData(this.KEYS.RECENT_PARTS, recent);
    },

    // ===== SOLICITATIONS =====
    getDefaultSolicitations() {
        return [];
    },

    getSolicitations() {
        return this.loadData(this.KEYS.SOLICITATIONS) || [];
    },

    getSolicitationById(id) {
        const solicitations = this.getSolicitations();
        return solicitations.find(s => s.id === id);
    },

    getSolicitationsByTechnician(tecnicoId) {
        const solicitations = this.getSolicitations();
        return solicitations.filter(s => s.tecnicoId === tecnicoId);
    },

    getPendingSolicitations() {
        const solicitations = this.getSolicitations();
        return solicitations.filter(s => s.status === 'pendente');
    },

    saveSolicitation(solicitation) {
        const solicitations = this.getSolicitations();
        const index = solicitations.findIndex(s => s.id === solicitation.id);
        let persistedSolicitation;
        
        if (index >= 0) {
            solicitations[index] = solicitation;
            persistedSolicitation = solicitations[index];
        } else {
            solicitation.id = Utils.generateId();
            solicitation.numero = Utils.generateNumber(
                solicitations.map(s => s.numero),
                solicitation.data
            );
            solicitation.createdAt = Date.now();
            solicitations.push(solicitation);
            persistedSolicitation = solicitation;
        }

        const saved = this.saveData(this.KEYS.SOLICITATIONS, solicitations);
        if (saved && persistedSolicitation) {
            this.queueOneDriveBackup(persistedSolicitation);
        }
        
        return saved;
    },
    
    updateSolicitationStatus(id, status, extra = {}) {
        const solicitations = this.getSolicitations();
        const index = solicitations.findIndex(s => s.id === id);
        
        if (index >= 0) {
            solicitations[index].status = status;
            
            if (!solicitations[index].statusHistory) {
                solicitations[index].statusHistory = [];
            }
            
            solicitations[index].statusHistory.push({
                status,
                at: Date.now(),
                by: extra.by || 'Sistema'
            });
            
            // Merge extra data
            Object.assign(solicitations[index], extra);
            
            const saved = this.saveData(this.KEYS.SOLICITATIONS, solicitations);
            if (saved) {
                this.queueOneDriveBackup(solicitations[index]);
            }
            return saved;
        }
        return false;
    },

    deleteSolicitation(id) {
        const solicitations = this.getSolicitations().filter(s => s.id !== id);
        return this.saveData(this.KEYS.SOLICITATIONS, solicitations);
    },

    /**
     * Send solicitation snapshot to OneDrive integration when available.
     */
    queueOneDriveBackup(solicitation) {
        try {
            if (typeof OneDriveIntegration !== 'undefined' && OneDriveIntegration.enqueueSync) {
                OneDriveIntegration.enqueueSync(solicitation);
            }
        } catch (e) {
            console.warn('OneDrive backup enqueue failed', e);
        }
    },

    // ===== SETTINGS =====
    getSettings() {
        return this.loadData(this.KEYS.SETTINGS) || {};
    },

    saveSetting(key, value) {
        const settings = this.getSettings();
        settings[key] = value;
        return this.saveData(this.KEYS.SETTINGS, settings);
    },

    // ===== STATISTICS =====
    getStatistics() {
        const solicitations = this.getSolicitations();
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const normalizeTime = (value) => {
            if (!value) return null;
            if (typeof value === 'number') return value;
            const parsed = new Date(value).getTime();
            return isNaN(parsed) ? null : parsed;
        };
        const getReferenceDate = (solicitation) => {
            const fromData = normalizeTime(solicitation.data);
            if (fromData) return fromData;
            const fromCreated = normalizeTime(solicitation.createdAt);
            return fromCreated || null;
        };
        
        // Count by status
        const byStatus = {};
        solicitations.forEach(s => {
            byStatus[s.status] = (byStatus[s.status] || 0) + 1;
        });
        
        // Calculate SLA
        const approved = solicitations.filter(s => s.approvedAt && (s.createdAt || s.data));
        const approvalTimes = approved.map(s => {
            const created = getReferenceDate(s);
            const approvedAt = normalizeTime(s.approvedAt);
            if (created && approvedAt) {
                return approvedAt - created;
            }
            return null;
        }).filter(t => t !== null);
        const avgApprovalTime = approvalTimes.length > 0 
            ? approvalTimes.reduce((sum, t) => sum + t, 0) / approvalTimes.length / (1000 * 60 * 60)
            : 0;
        
        // Volume by period
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(now - i * dayMs);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart.getTime() + dayMs);
            
            const count = solicitations.filter(s => {
                const refDate = getReferenceDate(s);
                return refDate !== null && refDate >= dayStart.getTime() && refDate < dayEnd.getTime();
            }).length;
            
            last7Days.push({
                date: Utils.formatDate(dayStart),
                day: dayStart.toLocaleDateString('pt-BR', { weekday: 'short' }),
                count
            });
        }
        
        // Volume by month (last 6 months)
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
            const monthDate = new Date(now);
            monthDate.setMonth(monthDate.getMonth() - i);
            const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
            const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);
            
            const count = solicitations.filter(s => {
                const refDate = getReferenceDate(s);
                return refDate !== null && refDate >= monthStart.getTime() && refDate <= monthEnd.getTime();
            }).length;
            
            last6Months.push({
                month: monthDate.toLocaleDateString('pt-BR', { month: 'short' }),
                count
            });
        }
        
        // Top parts
        const partsCount = {};
        solicitations.forEach(s => {
            (s.itens || []).forEach(item => {
                if (!item || !item.codigo) return;
                const quantity = Number(item.quantidade) || 0;
                partsCount[item.codigo] = (partsCount[item.codigo] || 0) + quantity;
            });
        });
        
        const topParts = Object.entries(partsCount)
            .map(([codigo, total]) => ({ codigo, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);
        
        // By technician
        const byTechnician = {};
        const technicianAmounts = {};
        solicitations.forEach(s => {
            if (!byTechnician[s.tecnicoNome]) {
                byTechnician[s.tecnicoNome] = { total: 0, approved: 0, rejected: 0, pending: 0 };
            }
            byTechnician[s.tecnicoNome].total++;
            if (s.status === 'aprovada' || s.status === 'em-transito' || s.status === 'entregue' || s.status === 'finalizada') {
                byTechnician[s.tecnicoNome].approved++;
            } else if (s.status === 'rejeitada') {
                byTechnician[s.tecnicoNome].rejected++;
            } else if (s.status === 'pendente') {
                byTechnician[s.tecnicoNome].pending++;
            }

            if (!technicianAmounts[s.tecnicoNome || 'Não identificado']) {
                technicianAmounts[s.tecnicoNome || 'Não identificado'] = { total: 0, count: 0, pending: 0 };
            }
            technicianAmounts[s.tecnicoNome || 'Não identificado'].total += Number(s.total) || 0;
            technicianAmounts[s.tecnicoNome || 'Não identificado'].count += 1;
            if (s.status === 'pendente') {
                technicianAmounts[s.tecnicoNome || 'Não identificado'].pending += Number(s.total) || 0;
            }
        });
        
        const totalPendingValue = solicitations
            .filter(s => s.status === 'pendente')
            .reduce((sum, s) => sum + (Number(s.total) || 0), 0);

        const topTechniciansByValue = Object.entries(technicianAmounts)
            .map(([name, info]) => ({ name, total: info.total, pending: info.pending, count: info.count }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
        
        return {
            total: solicitations.length,
            pending: byStatus.pendente || 0,
            approved: (byStatus.aprovada || 0) + (byStatus['em-transito'] || 0) + (byStatus.entregue || 0) + (byStatus.finalizada || 0),
            rejected: byStatus.rejeitada || 0,
            avgApprovalTimeHours: parseFloat(avgApprovalTime.toFixed(1)),
            byStatus,
            last7Days,
            last6Months,
            topParts,
            byTechnician,
            totalPendingValue,
            topTechniciansByValue
        };
    }
};

// Initialize data on load
DataManager.init();
