/**
 * Data Management Module
 * Handles all data operations with cloud storage and localStorage fallback
 */

const OFFICIAL_TECHNICIANS_BASE = {
    'Antonio Ferreira De Santana Filho':{'endereco':'Av Curió - Campanário, Ap 510 Bloco B','bairro':'','cep':'09.925-000','municipio':'Diadema','uf':'SP'},
    'Antonio Rocker':{'endereco':'Rua Estoril 131','bairro':'Veleiros','cep':'47.730-900','municipio':'São Paulo','uf':'SP'},
    'Brunno Diniz Mendes':{'endereco':'Rua da Granja S/N, Condomínio Plaza Norte Residence, Bloco 06C AP 010','bairro':'Maiobinha','cep':'65120-176','municipio':'São José de Ribamar','uf':'MA'},
    'Carlos Alberto De Vasconcelos Junior':{'endereco':'Deputado João Ursulo Ribeiro Filho A 149','bairro':'Mangabeira I','cep':'58.055-360','municipio':'João Pessoa','uf':'PB'},
    'Dalvino Carlos Santos Junior':{'endereco':'Rua vivaldo sales 158, apartamento 41','bairro':'jardim são josé','cep':'11-430 140','municipio':'guarujá são paulo','uf':'SP'},
    'Davidson Alves Vitorino':{'endereco':'Jacarandá N° 157','bairro':'Sapucaias 3','cep':'32.071-236','municipio':'Contagem','uf':'MG'},
    'Diego Abner de Oliveira':{'endereco':'Rua Mário Campos 71 AP 401 Bloco 08','bairro':'','cep':'12.221-750','municipio':'São Jose do Campos','uf':'SP'},
    'Ednaldo Silva Costa':{'endereco':'Rua Olimpío Cassimiro Mendonça, 542','bairro':'Parque das Américas','cep':'38.045-360','municipio':'Uberaba','uf':'MG'},
    'Ediveton Pedro Da Silva':{'endereco':'Rua Mário Prieto 500','bairro':'Jardim Paulista','cep':'13.310-000','municipio':'Itu','uf':'SP'},
    'Eduardo Martins':{'endereco':'Rua Rafael da Silva e Souza N°510','bairro':'Cidade Líder','cep':'08280-090','municipio':'São Paulo','uf':'SP'},
    'Emerson Ribeiro':{'endereco':'Rua São Cristóvão, 471 Casa 03','bairro':'','cep':'88.080-320','municipio':'Florianópolis','uf':'SC'},
    'Fernando Silva':{'endereco':'Hermelindo Lazarini, 69','bairro':'Jardim das Nações','cep':'79.081-714','municipio':'Campo Grande','uf':'MS'},
    'Getulio Santos De Almeida':{'endereco':'Rua Nara Leão, N° 125. Apto Jarmim 1103','bairro':'Jardim Limoeiro','cep':'29.164-125','municipio':'Serra','uf':'ES'},
    'Humberto Elias Dos Santos Da Silva':{'endereco':'Av Jose Aloisio Filho N° 411 Apto 368 Bloco Q','bairro':'Humaita','cep':'90.250-180','municipio':'Porto Alegre','uf':'RS'},
    'Joao Celso Silva De Souza':{'endereco':'Leonardo da Vinci 96 Bloco C Ap 306','bairro':'Curado II','cep':'54.220-000','municipio':'Jaboatão dos Guararapes','uf':'PE'},
    'Leandro Rocha Cruz':{'endereco':'R. Dom Pedro II 537A Fundos','bairro':'Centro','cep':'14.820-290','municipio':'Cidade Américo Brasiliense - SP','uf':'SP'},
    'Maicon Cordeiro Chaves':{'endereco':'Rua Saxonia N°2013','bairro':'Vila Itoupava','cep':'89075-255','municipio':'Blumenau','uf':'SC'},
    'Marcio Andrade Dos Santos':{'endereco':'1° Travessa Renato Lima de Carvalho N° 33','bairro':'Jardim Alvorada','cep':'42.850-000','municipio':'Dias davila','uf':'BA'},
    'Marlon de Queiroz':{'endereco':'AV. Juscelino Kubitschek, 3700 Bloco-E, Apto -301','bairro':'Passare','cep':'60.861.634','municipio':'Fortaleza','uf':'CE'},
    'Ney Goncalves Cardoso':{'endereco':'Rua Juqueri,266','bairro':'Irajá','cep':'21.371-370','municipio':'Rio de Janeiro','uf':'RJ'},
    'Pedro Gabriel Reis Nunes':{'endereco':'Rua Cristo Rei, 230, casa 101.','bairro':'São José','cep':'97095-680','municipio':'Santa Maria','uf':'RS'},
    'Rodrigo Lazari De Carvalho':{'endereco':'Rua alonso Vasconcelos pacheco 1327','bairro':'','cep':'09310-695','municipio':'Maua','uf':'SP'},
    'Sebastião Gomes Ribeiro':{'endereco':'RUA THOME DE SOUZA, 335','bairro':'LAGOA GRANDE – SEDE','cep':'45.810-000','municipio':'PORTO SEGURO','uf':'BA'},
    'Welington Bastos Tavares':{'endereco':'AV Morumbi Qd 34 Lt 11','bairro':'Vila Mariana','cep':'75.134-550','municipio':'Anápolis','uf':'GO'},
    'Werverton Santos':{'endereco':'','bairro':'','cep':'','municipio':'','uf':'','username':'Werverton.Santos'}
};

const OFFICIAL_PARTS_BASE = [
    {'codigo':'CS001','descricao':'Adaptador Braço Lavagem HD-80','categoria':'Hidráulica','valor':225.00,'unidade':'UN'},
    {'codigo':'CS002','descricao':'Adaptador Do Braço De Lavagem (Tarugo) HD-50','categoria':'Hidráulica','valor':175.70,'unidade':'UN'},
    {'codigo':'CS003','descricao':'Adaptador Do Braço De Lavagem (Tarugo) HD-80','categoria':'Hidráulica','valor':205.00,'unidade':'UN'},
    {'codigo':'CS004','descricao':'Adaptador Interno HD-80','categoria':'Hidráulica','valor':350.00,'unidade':'UN'},
    {'codigo':'CS005','descricao':'Arruela De Rotação HD-80','categoria':'Mecânica','valor':40.00,'unidade':'UN'},
    {'codigo':'CS006','descricao':'Assento Do Braço De Lavagem (Bucha) HD-50','categoria':'Mecânica','valor':101.00,'unidade':'UN'},
    {'codigo':'CS007','descricao':'Batente Lateral HD-80','categoria':'Mecânica','valor':105.00,'unidade':'UN'},
    {'codigo':'CS008','descricao':'Bicos Injetores Do Braço HD-50/HD-80','categoria':'Hidráulica','valor':114.48,'unidade':'UN'},
    {'codigo':'CS009','descricao':'Boiler HD-50','categoria':'Mecânica','valor':2033.00,'unidade':'UN'},
    {'codigo':'CS010','descricao':'Boiler HD-80','categoria':'Mecânica','valor':2355.00,'unidade':'UN'},
    {'codigo':'CS011','descricao':'Boma De Enxague (Importada) HD-50','categoria':'Hidráulica','valor':2007.79,'unidade':'UN'},
    {'codigo':'CS012','descricao':'Boma De Enxague (Nacional) HD-80','categoria':'Hidráulica','valor':1550.00,'unidade':'UN'},
    {'codigo':'CS013','descricao':'Bomba De Lavagem HD-50','categoria':'Hidráulica','valor':7529.22,'unidade':'UN'},
    {'codigo':'CS014','descricao':'Bomba De Lavagem HD-80','categoria':'Hidráulica','valor':11293.85,'unidade':'UN'},
    {'codigo':'CS015','descricao':'Braço Capo HD-80','categoria':'Mecânica','valor':1255.00,'unidade':'UN'},
    {'codigo':'CS016','descricao':'Braço De Lavagem HD-50','categoria':'Hidráulica','valor':1205.00,'unidade':'UN'},
    {'codigo':'CS017','descricao':'Braço De Lavagem Superior Completo HD-80','categoria':'Hidráulica','valor':1715.00,'unidade':'UN'},
    {'codigo':'CS018','descricao':'Caixa De Montagem Elétrica HD-80','categoria':'Elétrica','valor':680.00,'unidade':'UN'},
    {'codigo':'CS019','descricao':'Caixa De Montagem HD-50','categoria':'Mecânica','valor':225.88,'unidade':'UN'},
    {'codigo':'CS020','descricao':'Capa Do Filtro De Residuo HD-50','categoria':'Mecânica','valor':150.60,'unidade':'UN'},
    {'codigo':'CS021','descricao':'Capo HD-80','categoria':'Mecânica','valor':5020.00,'unidade':'UN'},
    {'codigo':'CS022','descricao':'Cesto De Resíduo HD-80','categoria':'Mecânica','valor':150.60,'unidade':'UN'},
    {'codigo':'CS023','descricao':'Chicote NR12','categoria':'Segurança','valor':3210.00,'unidade':'UN'},
    {'codigo':'CS024','descricao':'Conexão Braço HD-80','categoria':'Hidráulica','valor':1507.00,'unidade':'UN'},
    {'codigo':'CS025','descricao':'Conj Termostato','categoria':'Elétrica','valor':886.72,'unidade':'UN'},
    {'codigo':'CS026','descricao':'Conjunto de cesto de residuo NT-300','categoria':'Mecânica','valor':1123.05,'unidade':'UN'},
    {'codigo':'CS027','descricao':'Contactora De Comando HD-80','categoria':'Elétrica','valor':328.00,'unidade':'UN'},
    {'codigo':'CS028','descricao':'Contatora HD-50','categoria':'Elétrica','valor':328.00,'unidade':'UN'},
    {'codigo':'CS029','descricao':'Curva Braço Superior HD-50','categoria':'Hidráulica','valor':115.00,'unidade':'UN'},
    {'codigo':'CS030','descricao':'Disjuntor 10A HD-80','categoria':'Elétrica','valor':375.00,'unidade':'UN'},
    {'codigo':'CS031','descricao':'Disjuntor 125A','categoria':'Elétrica','valor':1776.85,'unidade':'UN'},
    {'codigo':'CS032','descricao':'Disjuntor 80A','categoria':'Elétrica','valor':313.20,'unidade':'UN'},
    {'codigo':'CS033','descricao':'Eixo De Suporte Do Braço HD-50','categoria':'Mecânica','valor':301.50,'unidade':'UN'},
    {'codigo':'CS034','descricao':'Etiqueta Painel NT','categoria':'Geral','valor':545.90,'unidade':'UN'},
    {'codigo':'CS035','descricao':'Filtro De Residuo HD-50','categoria':'Hidráulica','valor':742.00,'unidade':'UN'},
    {'codigo':'CS036','descricao':'Filtro De Residuo Hdw-80 HD-80','categoria':'Hidráulica','valor':401.56,'unidade':'UN'},
    {'codigo':'CS037','descricao':'Fim de curso HDW-200','categoria':'Eletrônica','valor':789.21,'unidade':'UN'},
    {'codigo':'CS038','descricao':'Fim de curso HDW-200 (Completo)','categoria':'Eletrônica','valor':2175.50,'unidade':'UN'},
    {'codigo':'CS039','descricao':'Flange Braço Inferior HD-50','categoria':'Mecânica','valor':742.00,'unidade':'UN'},
    {'codigo':'CS040','descricao':'Flange Braço Superior HD-50','categoria':'Mecânica','valor':742.00,'unidade':'UN'},
    {'codigo':'CS041','descricao':'Flauta De Enxague (S/ Bicos) HD-80','categoria':'Hidráulica','valor':125.50,'unidade':'UN'},
    {'codigo':'CS042','descricao':'Flauta Do Braço HD-50','categoria':'Hidráulica','valor':125.50,'unidade':'UN'},
    {'codigo':'CS043','descricao':'Flauta HD-80','categoria':'Hidráulica','valor':1204.75,'unidade':'UN'},
    {'codigo':'CS044','descricao':'Fonte 24V 10A HD-50/HD-80','categoria':'Elétrica','valor':155.00,'unidade':'UN'},
    {'codigo':'CS045','descricao':'Kit Mangueiras (Agua + Dreno) HD-50/HD-80','categoria':'Hidráulica','valor':240.00,'unidade':'UN'},
    {'codigo':'CS046','descricao':'Luva Braço Superior HD-50','categoria':'Mecânica','valor':90.00,'unidade':'UN'},
    {'codigo':'CS047','descricao':'Mangueira De Borracha HD-80','categoria':'Hidráulica','valor':95.00,'unidade':'UN'},
    {'codigo':'CS048','descricao':'Mola Da Porta HD-50','categoria':'Mecânica','valor':75.00,'unidade':'UN'},
    {'codigo':'CS049','descricao':'Mola Do Capo HD-80','categoria':'Mecânica','valor':830.00,'unidade':'UN'},
    {'codigo':'CS050','descricao':'Painel Elétrico Completo HD-50','categoria':'Elétrica','valor':9550.00,'unidade':'UN'},
    {'codigo':'CS051','descricao':'Painel Ihm HD-50/HD-80','categoria':'Eletrônica','valor':1588.00,'unidade':'UN'},
    {'codigo':'CS052','descricao':'Parafuso Da Rondana HD-50','categoria':'Mecânica','valor':75.29,'unidade':'UN'},
    {'codigo':'CS053','descricao':'Parafuso De Fixação Braço De Lavagem HD-80','categoria':'Mecânica','valor':105.00,'unidade':'UN'},
    {'codigo':'CS054','descricao':'Parafuso De Fixação Da Polia HD-80','categoria':'Mecânica','valor':145.00,'unidade':'UN'},
    {'codigo':'CS055','descricao':'Pino Batente Lateral Capo HD-80','categoria':'Mecânica','valor':130.00,'unidade':'UN'},
    {'codigo':'CS056','descricao':'Placa Controladora HD-50/HD-80','categoria':'Eletrônica','valor':6307.00,'unidade':'UN'},
    {'codigo':'CS057','descricao':'Placa De Montagem HD-50','categoria':'Mecânica','valor':280.00,'unidade':'UN'},
    {'codigo':'CS058','descricao':'Polia De Movimentação Do Capo HD-80','categoria':'Mecânica','valor':135.00,'unidade':'UN'},
    {'codigo':'CS059','descricao':'Polia Inferior Do Capo HD-80','categoria':'Mecânica','valor':150.00,'unidade':'UN'},
    {'codigo':'CS060','descricao':'Porta HD-50','categoria':'Mecânica','valor':1760.00,'unidade':'UN'},
    {'codigo':'CS061','descricao':'Pressostato De Nível HD-50','categoria':'Pneumática','valor':610.00,'unidade':'UN'},
    {'codigo':'CS062','descricao':'Pressostato HDW-200','categoria':'Pneumática','valor':453.68,'unidade':'UN'},
    {'codigo':'CS063','descricao':'Pressotato De Nível HD-80','categoria':'Pneumática','valor':572.40,'unidade':'UN'},
    {'codigo':'CS064','descricao':'Pulmão HD-80','categoria':'Pneumática','valor':500.00,'unidade':'UN'},
    {'codigo':'CS065','descricao':'Relé De Proteção HD-50/HD-80','categoria':'Elétrica','valor':414.11,'unidade':'UN'},
    {'codigo':'CS067','descricao':'Resistencia do booster HDW-200','categoria':'Elétrica','valor':1696.00,'unidade':'UN'},
    {'codigo':'CS068','descricao':'Resistencia Do Tanque Com Flange Hd50','categoria':'Elétrica','valor':1017.60,'unidade':'UN'},
    {'codigo':'CS069','descricao':'Resistencia Do Tanque Com Flange Hd80','categoria':'Elétrica','valor':1023.00,'unidade':'UN'},
    {'codigo':'CS070','descricao':'Resistencia do TQ HDW-200','categoria':'Elétrica','valor':1346.73,'unidade':'UN'},
    {'codigo':'CS071','descricao':'Resistencia NT-300','categoria':'Elétrica','valor':1696.00,'unidade':'UN'},
    {'codigo':'CS072','descricao':'Resistências Boiler Com Flange Hd50','categoria':'Elétrica','valor':1272.00,'unidade':'UN'},
    {'codigo':'CS073','descricao':'Resistências Boiler Com Flange Hd80','categoria':'Elétrica','valor':1484.00,'unidade':'UN'},
    {'codigo':'CS074','descricao':'Roldana HD-80','categoria':'Mecânica','valor':163.50,'unidade':'UN'},
    {'codigo':'CS075','descricao':'Rondana Da Porta HD-50','categoria':'Mecânica','valor':75.00,'unidade':'UN'},
    {'codigo':'CS076','descricao':'Saida Do Dreno HD-50','categoria':'Hidráulica','valor':476.85,'unidade':'UN'},
    {'codigo':'CS077','descricao':'Sensor Capo HD-80','categoria':'Eletrônica','valor':108.45,'unidade':'UN'},
    {'codigo':'CS078','descricao':'Sensor De Nivel HD-50','categoria':'Eletrônica','valor':606.74,'unidade':'UN'},
    {'codigo':'CS079','descricao':'Sensor De Nível HD-80','categoria':'Eletrônica','valor':606.74,'unidade':'UN'},
    {'codigo':'CS080','descricao':'Sensor De Temperatura HD-50','categoria':'Eletrônica','valor':255.00,'unidade':'UN'},
    {'codigo':'CS081','descricao':'Solenoide De Agua HD-50','categoria':'Hidráulica','valor':175.00,'unidade':'UN'},
    {'codigo':'CS082','descricao':'Sonda Temperatura','categoria':'Eletrônica','valor':320.51,'unidade':'UN'},
    {'codigo':'CS083','descricao':'Suporte Bomba De Lavagem HD-80','categoria':'Mecânica','valor':75.00,'unidade':'UN'},
    {'codigo':'CS084','descricao':'Suporte Braço Capo HD-80','categoria':'Mecânica','valor':40.00,'unidade':'UN'},
    {'codigo':'CS085','descricao':'Suporte Capo HD-80','categoria':'Mecânica','valor':150.00,'unidade':'UN'},
    {'codigo':'CS086','descricao':'Suporte Do Boiler HD-80','categoria':'Mecânica','valor':225.00,'unidade':'UN'},
    {'codigo':'CS087','descricao':'Suporte Do Rack HD-80','categoria':'Mecânica','valor':1255.00,'unidade':'UN'},
    {'codigo':'CS088','descricao':'Suporte Fixação HD-80','categoria':'Mecânica','valor':155.00,'unidade':'UN'},
    {'codigo':'CS089','descricao':'Suporte Gancho Bomba De Lavagem HD-80','categoria':'Mecânica','valor':350.00,'unidade':'UN'},
    {'codigo':'CS090','descricao':'Suporte Luva Para Mangeira Do Dreno HD-80','categoria':'Mecânica','valor':276.00,'unidade':'UN'},
    {'codigo':'CS091','descricao':'Suporte Painel HD-80','categoria':'Mecânica','valor':405.00,'unidade':'UN'},
    {'codigo':'CS092','descricao':'Suporte Regulável De Altura(Pé) HD-80','categoria':'Mecânica','valor':335.00,'unidade':'UN'},
    {'codigo':'CS093','descricao':'Suporte Termostato Do Boiler HD-80','categoria':'Mecânica','valor':51.00,'unidade':'UN'},
    {'codigo':'CS094','descricao':'Tampa Frontal HD-50','categoria':'Mecânica','valor':602.34,'unidade':'UN'},
    {'codigo':'CS095','descricao':'Tampa Frontal HD-80','categoria':'Mecânica','valor':230.00,'unidade':'UN'},
    {'codigo':'CS096','descricao':'Tampa Inferior HD-50','categoria':'Mecânica','valor':502.00,'unidade':'UN'},
    {'codigo':'CS097','descricao':'Tampa Inferior Traseira HD-50','categoria':'Mecânica','valor':955.00,'unidade':'UN'},
    {'codigo':'CS098','descricao':'Tampa Lateral Direita HD-50','categoria':'Mecânica','valor':905.00,'unidade':'UN'},
    {'codigo':'CS099','descricao':'Tampa Lateral HD-80','categoria':'Mecânica','valor':705.00,'unidade':'UN'},
    {'codigo':'CS100','descricao':'Tampa Superior HD-50','categoria':'Mecânica','valor':1130.00,'unidade':'UN'},
    {'codigo':'CS101','descricao':'Tampa Superior HD-80','categoria':'Mecânica','valor':205.00,'unidade':'UN'},
    {'codigo':'CS102','descricao':'Tampa Traseira HD-50','categoria':'Mecânica','valor':1005.00,'unidade':'UN'},
    {'codigo':'CS103','descricao':'Tampa Traseira HD-80','categoria':'Mecânica','valor':715.00,'unidade':'UN'},
    {'codigo':'CS104','descricao':'Tampao Do Dreno HD-50','categoria':'Hidráulica','valor':119.06,'unidade':'UN'},
    {'codigo':'CS105','descricao':'Tampão Do Dreno HD-80','categoria':'Hidráulica','valor':183.60,'unidade':'UN'},
    {'codigo':'CS106','descricao':'Tela De Filtro De Resíduo Direito HD-80','categoria':'Hidráulica','valor':337.61,'unidade':'UN'},
    {'codigo':'CS107','descricao':'Tela De Filtro De Resíduo Esquerdo HD-80','categoria':'Hidráulica','valor':337.61,'unidade':'UN'},
    {'codigo':'CS108','descricao':'Terminal De Aterramento HD-50','categoria':'Elétrica','valor':55.50,'unidade':'UN'},
    {'codigo':'CS109','descricao':'Termostato Do Boiler HD-50/H80','categoria':'Elétrica','valor':901.00,'unidade':'UN'},
    {'codigo':'CS110','descricao':'Termostato Do Tanque HD/HD-80','categoria':'Elétrica','valor':254.40,'unidade':'UN'},
    {'codigo':'CS111','descricao':'Trilho Dim HD-50/HD-80','categoria':'Elétrica','valor':40.00,'unidade':'UN'},
    {'codigo':'CS112','descricao':'Tubo Braço Lavagem Superior HD-80','categoria':'Hidráulica','valor':1635.00,'unidade':'UN'},
    {'codigo':'CS113','descricao':'Tubo Da Bomba De Lavagem (Mangote Curvo) HD-80','categoria':'Hidráulica','valor':350.00,'unidade':'UN'},
    {'codigo':'CS114','descricao':'Tubo De Drenagem Hdw-80 HD-80','categoria':'Hidráulica','valor':355.00,'unidade':'UN'},
    {'codigo':'CS115','descricao':'Tubo De Saida Da Bomba De Lavagem HD-50','categoria':'Hidráulica','valor':225.88,'unidade':'UN'},
    {'codigo':'CS116','descricao':'Tubo Saida Bomba De Lavagem HD-80','categoria':'Hidráulica','valor':263.55,'unidade':'UN'},
    {'codigo':'CS117','descricao':'Tubo Braço Superior HD-50','categoria':'Hidráulica','valor':52.00,'unidade':'UN'},
    {'codigo':'CS118','descricao':'Valvula De Agua HD-80','categoria':'Hidráulica','valor':159.00,'unidade':'UN'},
    {'codigo':'CS119','descricao':'Valvula Solenoide HDW-200 NT','categoria':'Hidráulica','valor':172.50,'unidade':'UN'},
    {'codigo':'CS120','descricao':'Etiqueta Painel','categoria':'Geral','valor':69.00,'unidade':'UN'},
    {'codigo':'CS121','descricao':'Contator 9A AC3 220v 1NA','categoria':'Elétrica','valor':393.92,'unidade':'UN'},
    {'codigo':'CS122','descricao':'Contator 38A AC3 220v 1NA/1NF','categoria':'Elétrica','valor':712.23,'unidade':'UN'},
    {'codigo':'CS123','descricao':'Conj Botao L/D Duplo C/ Sinaliz 220v - BL Contat e Capa M','categoria':'Segurança','valor':515.27,'unidade':'UN'},
    {'codigo':'CS124','descricao':'Conj Botao Emergencia c/ Bloco Cont e Colar Prot','categoria':'Segurança','valor':464.06,'unidade':'UN'},
    {'codigo':'CS125','descricao':'Fita de Vedação da Porta','categoria':'Mecânica','valor':10.00,'unidade':'UN'},
    {'codigo':'CS126','descricao':'Mont Flange Mancal Eixo Mtr C/B Bronze E Retentor-Nt 810-Vnd','categoria':'Mecânica','valor':1225.25,'unidade':'UN'},
    {'codigo':'CS127','descricao':'Conjunto de Termostato - NT810 - NR12','categoria':'Elétrica','valor':886.72,'unidade':'UN'}
];

const PARTS_CATALOG_VERSION = '2025-01-catalog-review';

const STATS_CONFIG = {
    APPROVAL_OUTLIER_MULTIPLIER: 6, // allow up to 6x SLA before considering outlier
    APPROVAL_OUTLIER_FLOOR_HOURS: 720, // 30 days safety cap
    OUTLIER_PERCENTILE_THRESHOLD: 0.95
};

const DataManager = {
    // Storage keys
    KEYS: {
        USERS: 'diversey_users',
        TECHNICIANS: 'diversey_tecnicos',
        SUPPLIERS: 'diversey_fornecedores',
        PARTS: 'diversey_pecas',
        SOLICITATIONS: 'diversey_solicitacoes',
        SETTINGS: 'diversey_settings',
        RECENT_PARTS: 'diversey_recent_parts',
        PARTS_VERSION: 'diversey_parts_version',
        EXPORT_LOG: 'diversey_export_log',
        EXPORT_FILES: 'diversey_export_files'
    },
    
    // Export log configuration (cloud-first)
    EXPORT_LOG_LIMIT: 100,

    PARTS_VERSION: PARTS_CATALOG_VERSION,
    SOLICITATIONS_RESET_KEY: 'diversey_solicitations_reset_version',
    SOLICITATIONS_RESET_VERSION: '2025-12-reset-v2-test-purge',

    // Status definitions (shared across the application)
    STATUS: {
        RASCUNHO: 'rascunho',
        ENVIADA: 'enviada',
        PENDENTE: 'pendente',
        APROVADA: 'aprovada',
        REJEITADA: 'rejeitada',
        EM_TRANSITO: 'em-transito',
        ENTREGUE: 'entregue',
        FINALIZADA: 'finalizada',
        HISTORICO_MANUAL: 'historico-manual'
    },

    // Cloud storage initialized flag
    cloudInitialized: false,
    initPromise: null,
    initialized: false,
    initializing: false,
    lastInitFailAt: 0,
    idbDegradedNotified: false,
    syncInProgress: false,
    _syncPromise: null,
    _debouncedSync: null,
    
    // Online-only mode: In-memory session cache for already-loaded data
    // This allows read-only access to data loaded during the session
    _sessionCache: {},
    
    // Online-only mode: Track connection status
    _isOnline: true,

    /**
     * Initialize data manager - Online-only mode
     * Cloud storage is required; local storage is only for session cache.
     */
    async init() {
        if (this.initialized) {
            return Promise.resolve(true);
        }
        if (this.initializing && this.initPromise) {
            return this.initPromise;
        }
        if (!this.initialized && this.lastInitFailAt && (Date.now() - this.lastInitFailAt) < 1000) {
            return Promise.resolve(false);
        }

        this.initializing = true;
        this.initPromise = (async () => {
            let success = false;
            try {
                // Initialize connection monitoring for online-only mode
                this._initConnectionMonitoring();
                
                // Initialize cloud storage - this is REQUIRED in online-only mode
                if (typeof CloudStorage !== 'undefined') {
                    try {
                        this.cloudInitialized = await CloudStorage.init();
                        const cloudReady = this.cloudInitialized && typeof CloudStorage.waitForCloudReady === 'function'
                            ? await CloudStorage.waitForCloudReady(10000)
                            : this.cloudInitialized;
                        
                        if (this.cloudInitialized) {
                            // Subscribe to real-time updates for solicitations
                            CloudStorage.subscribe(this.KEYS.SOLICITATIONS, (data) => {
                                console.log('Solicitations updated from cloud');
                                // Update session cache
                                this._sessionCache[this.KEYS.SOLICITATIONS] = data;
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

                            // Subscribe to real-time updates for users to keep gestor logins synchronized
                            CloudStorage.subscribe(this.KEYS.USERS, (users) => {
                                console.log('Users updated from cloud');
                                // Update session cache
                                this._sessionCache[this.KEYS.USERS] = users;

                                // Keep current session aligned with latest user data (e.g., gestor updates)
                                if (typeof Auth !== 'undefined' && Auth.currentUser && Array.isArray(users)) {
                                    const latestUser = users.find(u => u.username === Auth.currentUser.username);
                                    if (!latestUser || latestUser.disabled) {
                                        Auth.logout();
                                        if (typeof App !== 'undefined' && typeof App.showLogin === 'function') {
                                            App.showLogin();
                                        }
                                    } else {
                                        Auth.currentUser = Auth.buildSessionUser(latestUser);
                                        sessionStorage.setItem('diversey_current_user', JSON.stringify(Auth.currentUser));
                                        if (typeof App !== 'undefined' && App.currentPage) {
                                            Auth.renderMenu(App.currentPage);
                                        }
                                    }
                                }

                                // Refresh configuration screen if opened
                                if (typeof App !== 'undefined' && App.currentPage === 'configuracoes') {
                                    App.renderPage('configuracoes');
                                }
                            });
                            
                            // Sync initial data from cloud into session cache
                            if (cloudReady) {
                                await this._loadInitialDataFromCloud();
                            }
                        }
                    } catch (e) {
                        console.warn('Cloud storage initialization failed:', e);
                    }
                }

                // Online-only mode: IndexedDB is NOT used for business data persistence
                // We skip IndexedDB initialization for business data

                await this.applySolicitationsReset();

                // Online-only mode: Initialize default data in cloud if not present
                // This seeds the cloud with initial data on first deployment
                if (this.cloudInitialized) {
                    await this._ensureCloudDataExists();
                }

                // Migrate plaintext passwords to hashed form
                try {
                    await this.migrateUserPasswords();
                } catch (e) {
                    console.warn('Failed to migrate passwords to secure hash; affected users may need to reset credentials', e);
                }

                // Ensure at least one gestor account is always available for access recovery
                try {
                    await this.ensureDefaultGestor();
                } catch (e) {
                    console.warn('Failed to enforce default gestor credentials', e);
                }

                // Ensure baseline users exist for staging/development environments
                try {
                    await this.ensureBaselineUsersForStaging();
                } catch (e) {
                    console.warn('Failed to seed baseline users for staging', e);
                }

                // Fallback seeding when cloud is unavailable: keep essential users/technicians in session cache
                const cachedUsers = Array.isArray(this._sessionCache[this.KEYS.USERS]) ? [...this._sessionCache[this.KEYS.USERS]] : [];
                const hasAdmin = cachedUsers.some(u => this.normalizeUsername(u.username) === 'admin');
                const hasTechnician = cachedUsers.some(u => u.role === 'tecnico');
                if (cachedUsers.length === 0 || !hasAdmin || !hasTechnician) {
                    try {
                        const defaultUsers = await this.getDefaultUsers();
                        if (Array.isArray(defaultUsers) && defaultUsers.length > 0) {
                            const existingUsernames = new Set(cachedUsers.map(u => this.normalizeUsername(u.username)));
                            defaultUsers.forEach(u => {
                                if (!existingUsernames.has(this.normalizeUsername(u.username))) {
                                    cachedUsers.push(u);
                                }
                            });
                            this._sessionCache[this.KEYS.USERS] = cachedUsers;
                        }
                    } catch (e) {
                        console.warn('Failed to seed default users locally', e);
                    }
                }

                const cachedTechnicians = this._sessionCache[this.KEYS.TECHNICIANS];
                if (!cachedTechnicians || !Array.isArray(cachedTechnicians) || cachedTechnicians.length === 0) {
                    const defaultTechnicians = this.getDefaultTechnicians();
                    if (Array.isArray(defaultTechnicians) && defaultTechnicians.length > 0) {
                        this._sessionCache[this.KEYS.TECHNICIANS] = defaultTechnicians;
                    }
                }

                if (this.cloudInitialized) {
                    this.scheduleSync('init_complete');
                }

                success = true;
                return true;
            } catch (err) {
                console.error('DataManager init failed', err);
                this.lastInitFailAt = Date.now();
                return false;
            } finally {
                this.initialized = success;
                this.initializing = false;
                if (!success) {
                    this.initPromise = null;
                }
            }
        })();

        return this.initPromise;
    },
    
    /**
     * Initialize connection monitoring for online-only mode
     */
    _initConnectionMonitoring() {
        if (typeof window !== 'undefined') {
            this._isOnline = navigator.onLine;
            
            window.addEventListener('online', () => {
                this._isOnline = true;
                console.log('[ONLINE-ONLY] Browser connection restored');
                if (typeof Utils !== 'undefined' && Utils.showToast) {
                    Utils.showToast('Conexão restabelecida', 'success');
                }
                this.scheduleSync('browser_online');
            });
            
            window.addEventListener('offline', () => {
                this._isOnline = false;
                console.log('[ONLINE-ONLY] Browser connection lost');
                if (typeof Utils !== 'undefined' && Utils.showToast) {
                    Utils.showToast('Sem conexão: operações de escrita bloqueadas', 'warning');
                }
            });
        }

        // Register callback with FirebaseInit for RTDB connection changes
        if (typeof FirebaseInit !== 'undefined' && typeof FirebaseInit.onConnectionChange === 'function') {
            FirebaseInit.onConnectionChange((isConnected, wasConnected) => {
                if (isConnected && !wasConnected) {
                    console.log('[ONLINE-ONLY] RTDB connection restored - ready for sync');
                    if (typeof Utils !== 'undefined' && Utils.showToast) {
                        Utils.showToast('Banco de dados conectado', 'success');
                    }
                    this.scheduleSync('rtdb_reconnected');
                } else if (!isConnected && wasConnected) {
                    console.log('[ONLINE-ONLY] RTDB connection lost - writes will be blocked');
                    if (typeof Utils !== 'undefined' && Utils.showToast) {
                        Utils.showToast('Banco de dados desconectado', 'warning');
                    }
                }
            });
        }
    },
    
    /**
     * Check if system is online (for online-only mode blocking)
     */
    isOnline() {
        // Use centralized RTDB connection state from FirebaseInit
        const cloudReady = typeof CloudStorage !== 'undefined' ? CloudStorage.cloudReady === true : true;
        return this._isOnline &&
            this.cloudInitialized &&
            cloudReady &&
            typeof FirebaseInit !== 'undefined' &&
            FirebaseInit.isRTDBConnected();
    },
    
    /**
     * Check if write operations should be blocked (offline in online-only mode)
     */
    isWriteBlocked() {
        return !this.isOnline();
    },
    
    /**
     * Show offline error message
     */
    showOfflineError(operation = 'operação') {
        const message = `Sem conexão: ${operation} bloqueada. Reconecte à internet para continuar.`;
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast(message, 'error');
        }
        console.warn('[ONLINE-ONLY]', message);
        return { success: false, error: 'offline', message };
    },

    /**
     * Schedule a full cloud sync with debounce and lock.
     * Prevents overlapping sync operations.
     */
    scheduleSync(reason = 'auto') {
        if (!this._debouncedSync && typeof Utils !== 'undefined' && typeof Utils.debounce === 'function') {
            this._debouncedSync = Utils.debounce(() => this.syncAll(reason), 2000);
        }
        if (this._debouncedSync) {
            this._debouncedSync();
        }
    },

    /**
     * Execute a full cloud sync (cloud -> session cache) with mutex.
     */
    async syncAll(reason = 'manual') {
        if (this._syncPromise) {
            return this._syncPromise;
        }

        this._syncPromise = (async () => {
            this.syncInProgress = true;
            try {
                if (typeof CloudStorage === 'undefined') {
                    return false;
                }

                if (!this.cloudInitialized) {
                    this.cloudInitialized = await CloudStorage.init();
                }

                const cloudReady = typeof CloudStorage.waitForCloudReady === 'function'
                    ? await CloudStorage.waitForCloudReady(10000)
                    : true;

                if (!cloudReady) {
                    console.warn(`[SYNC] Cloud not ready for sync (${reason})`);
                    return false;
                }

                await CloudStorage.syncFromCloud();
                await this._loadInitialDataFromCloud();
                return true;
            } catch (error) {
                console.warn('syncAll failed', error);
                return false;
            } finally {
                this.syncInProgress = false;
                this._syncPromise = null;
            }
        })();

        return this._syncPromise;
    },
    
    /**
     * Load initial data from cloud into session cache
     */
    async _loadInitialDataFromCloud() {
        if (!this.cloudInitialized || typeof CloudStorage === 'undefined') {
            return;
        }
        
        const keys = [
            this.KEYS.USERS,
            this.KEYS.TECHNICIANS,
            this.KEYS.SUPPLIERS,
            this.KEYS.PARTS,
            this.KEYS.SOLICITATIONS,
            this.KEYS.SETTINGS
        ];
        
        for (const key of keys) {
            try {
                const data = await CloudStorage.loadData(key);
                if (data !== null && data !== undefined) {
                    this._sessionCache[key] = data;
                }
            } catch (e) {
                console.warn(`Failed to load ${key} from cloud`, e);
            }
        }
    },
    
    /**
     * Ensure cloud has initial data (first deployment seeding)
     */
    async _ensureCloudDataExists() {
        if (!this.cloudInitialized || typeof CloudStorage === 'undefined') {
            return;
        }
        
        // Check if users exist in cloud
        const cloudUsers = this._sessionCache[this.KEYS.USERS];
        if (!cloudUsers || !Array.isArray(cloudUsers) || cloudUsers.length === 0) {
            const defaultUsers = await this.getDefaultUsers();
            if (defaultUsers.length > 0) {
                await CloudStorage.saveData(this.KEYS.USERS, defaultUsers);
                this._sessionCache[this.KEYS.USERS] = defaultUsers;
            }
        }
        
        // Check if technicians exist in cloud
        const cloudTechnicians = this._sessionCache[this.KEYS.TECHNICIANS];
        if (!cloudTechnicians || !Array.isArray(cloudTechnicians) || cloudTechnicians.length === 0) {
            const defaultTechnicians = this.getDefaultTechnicians();
            await CloudStorage.saveData(this.KEYS.TECHNICIANS, defaultTechnicians);
            this._sessionCache[this.KEYS.TECHNICIANS] = defaultTechnicians;
        }
        
        // Check if suppliers exist in cloud
        const cloudSuppliers = this._sessionCache[this.KEYS.SUPPLIERS];
        if (!cloudSuppliers || !Array.isArray(cloudSuppliers) || cloudSuppliers.length === 0) {
            const defaultSuppliers = this.getDefaultSuppliers();
            await CloudStorage.saveData(this.KEYS.SUPPLIERS, defaultSuppliers);
            this._sessionCache[this.KEYS.SUPPLIERS] = defaultSuppliers;
        }
        
        // Check if parts exist in cloud
        const cloudParts = this._sessionCache[this.KEYS.PARTS];
        if (!cloudParts || !Array.isArray(cloudParts) || cloudParts.length === 0) {
            const defaultParts = this.getDefaultParts();
            await CloudStorage.saveData(this.KEYS.PARTS, defaultParts);
            this._sessionCache[this.KEYS.PARTS] = defaultParts;
        }
        
        // Initialize settings if not present
        const cloudSettings = this._sessionCache[this.KEYS.SETTINGS];
        if (!cloudSettings) {
            const defaultSettings = {
                theme: 'light',
                slaHours: 24,
                itemsPerPage: 10,
                statsRangeDays: 30,
                sheetIntegration: { provider: 'onedrive', target: '' }
            };
            await CloudStorage.saveData(this.KEYS.SETTINGS, defaultSettings);
            this._sessionCache[this.KEYS.SETTINGS] = defaultSettings;
        }
    },

    /**
     * Restore cached data from IndexedDB - DISABLED in online-only mode
     * Business data is not persisted locally.
     */
    async restoreFromIndexedDB() {
        // Online-only mode: IndexedDB is not used for business data persistence
        // This method is intentionally a no-op
        console.log('[ONLINE-ONLY] IndexedDB restore skipped - cloud is source of truth');
        return;
    },

    async applySolicitationsReset() {
        const alreadyApplied = localStorage.getItem(this.SOLICITATIONS_RESET_KEY);
        if (alreadyApplied === this.SOLICITATIONS_RESET_VERSION) {
            return false;
        }

        const isTestSolicitation = (sol) => {
            if (!sol || typeof sol !== 'object') {
                return false;
            }
            if (sol.isTest === true) {
                return true;
            }
            const createdBy = ((sol.createdBy || '') + '').toLowerCase();
            if (createdBy === 'healthcheck') {
                return true;
            }
            const id = ((sol.id || sol.numero || '') + '').toUpperCase();
            const source = ((sol.source || createdBy) + '').toLowerCase();
            const description = ((sol.descricao || sol.description || sol.observacoes || '') + '').toLowerCase();
            if (source.includes('test')) {
                return true;
            }
            if (id.includes('TEST')) {
                return true;
            }
            if (description.includes('teste') || description.includes('test')) {
                return true;
            }
            return false;
        };

        const solicitations = this.getSolicitations() || [];
        const cleanedSolicitations = solicitations.filter(sol => !isTestSolicitation(sol));

        let resetCompleted = false;
        try {
            resetCompleted = this.saveDataLocalOnly(this.KEYS.SOLICITATIONS, cleanedSolicitations);
        } catch (e) {
            console.warn('Failed to clear solicitations locally', e);
            return false;
        }

        if (!resetCompleted) {
            return false;
        }

        const hasIndexedDB = typeof IndexedDBStorage !== 'undefined';
        let idbResetSuccessful = !hasIndexedDB;

        if (hasIndexedDB) {
            let removeOk = true;
            let replaceOk = true;

            // Remove legacy key/value entry and also clear the mirrored requests object store
            // to avoid stale records being restored back into localStorage.
            if (typeof IndexedDBStorage.remove === 'function') {
                try {
                    await IndexedDBStorage.remove(this.KEYS.SOLICITATIONS);
                } catch (e) {
                    console.warn('Failed to remove solicitation key from IndexedDB', e);
                    removeOk = false;
                }
            }
            if (typeof IndexedDBStorage.replaceStore === 'function') {
                try {
                    await IndexedDBStorage.replaceStore('requests', cleanedSolicitations);
                } catch (e) {
                    console.warn('Failed to clear IndexedDB requests store', e);
                    replaceOk = false;
                }
            }

            idbResetSuccessful = removeOk && replaceOk;
        }

        const shouldClearCloud = this.cloudInitialized &&
            typeof CloudStorage !== 'undefined' &&
            typeof CloudStorage.saveData === 'function';
        let cloudCleared = !shouldClearCloud;

        if (shouldClearCloud) {
            try {
                await CloudStorage.saveData(this.KEYS.SOLICITATIONS, cleanedSolicitations);
                cloudCleared = true;
            } catch (e) {
                console.warn('Failed to clear solicitations in cloud storage', e);
                cloudCleared = false;
            }
        }

        // Only mark the reset when every persistence layer (local, IndexedDB mirror, and cloud backup) was cleared
        // to avoid historical requests resurfacing from any cache.
        const resetSuccessful = resetCompleted && idbResetSuccessful && cloudCleared;

        if (resetSuccessful) {
            localStorage.setItem(this.SOLICITATIONS_RESET_KEY, this.SOLICITATIONS_RESET_VERSION);
        }

        return resetSuccessful;
    },

    notifyIndexedDBFailure() {
        if (this.idbDegradedNotified) {
            return;
        }
        this.idbDegradedNotified = true;
        if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
            Utils.showToast('IndexedDB indisponível; cache offline usando localStorage.', 'warning');
        }
    },

    async persistToIndexedDB(key, data) {
        if (typeof IndexedDBStorage === 'undefined' || typeof IndexedDBStorage.set !== 'function') {
            return;
        }
        try {
            await IndexedDBStorage.set(key, data, { updatedAt: Date.now() });
            await this.mirrorCollectionToIndexedDB(key, data);
        } catch (err) {
            console.warn('IndexedDB persist failed', err);
            this.notifyIndexedDBFailure();
        }
    },

    async mirrorCollectionToIndexedDB(key, data) {
        if (typeof IndexedDBStorage === 'undefined' || typeof IndexedDBStorage.replaceStore !== 'function') {
            return;
        }
        const mapping = {
            [this.KEYS.SOLICITATIONS]: { store: 'requests', key: 'numero' },
            [this.KEYS.PARTS]: { store: 'parts', key: 'codigo' },
            [this.KEYS.USERS]: { store: 'users', key: 'id' },
            [this.KEYS.SUPPLIERS]: { store: 'suppliers', key: 'id' }
        };
        const config = mapping[key];
        if (!config || !Array.isArray(data)) {
            return;
        }
        const normalized = data
            .filter(Boolean)
            .map((item) => ({ ...item }))
            .filter((item) => item[config.key]);
        if (!normalized.length) {
            return;
        }
        await IndexedDBStorage.replaceStore(config.store, normalized);
    },

    /**
     * Save data to cloud storage - Online-only mode
     * Blocks write operations when offline.
     */
    saveData(key, data) {
        // Online-only mode: Block writes when offline
        if (this.isWriteBlocked()) {
            console.warn('[ONLINE-ONLY] Write blocked - no connection');
            if (typeof Utils !== 'undefined' && Utils.showToast) {
                Utils.showToast('Sem conexão: não foi possível salvar. Reconecte à internet.', 'error');
            }
            return false;
        }
        
        try {
            // Update session cache
            this._sessionCache[key] = data;
            
            // Online-only mode: Save directly to cloud - no localStorage persistence
            if (this.cloudInitialized && typeof CloudStorage !== 'undefined') {
                CloudStorage.saveData(key, data).catch(e => {
                    console.warn('Cloud save failed:', e);
                    if (typeof Utils !== 'undefined' && Utils.showToast) {
                        Utils.showToast('Erro ao salvar na nuvem', 'error');
                    }
                });
            } else {
                console.warn('[ONLINE-ONLY] Cloud not available for save operation');
                return false;
            }
            
            return true;
        } catch (e) {
            console.error('Error saving data:', e);
            return false;
        }
    },

    /**
     * Save data to session cache only - Online-only mode
     * Updates in-memory session cache without cloud persistence.
     * Used internally during initialization to seed session cache from cloud data.
     * @param {string} key - Storage key
     * @param {any} data - Data to cache in session
     * @returns {boolean} Always returns true
     */
    saveDataLocalOnly(key, data) {
        // Online-only mode: Only update session cache, no localStorage
        this._sessionCache[key] = data;
        return true;
    },

    /**
     * Check if a solicitation is marked as historical/manual.
     * @param {object} solicitation
     * @returns {boolean}
     */
    isHistoricalManual(solicitation) {
        const isStatusHistorical = solicitation?.status === this.STATUS.HISTORICO_MANUAL;
        if (isStatusHistorical) {
            return true;
        }
        // Backward compatibility with records that only persisted the flag
        return solicitation?.historicoManual === true;
    },

    normalizeHistoricalStatus(solicitation) {
        const normalized = { ...solicitation };
        const isHistorical = this.isHistoricalManual(normalized);
        if (isHistorical) {
            normalized.status = this.STATUS.HISTORICO_MANUAL;
            normalized.historicoManual = true;
        } else {
            delete normalized.historicoManual;
        }
        return normalized;
    },

    /**
     * Load data from session cache - Online-only mode
     * Data is loaded from cloud during init and cached in session.
     */
    loadData(key) {
        try {
            // Online-only mode: Return from session cache
            const cached = this._sessionCache[key];
            if (cached !== undefined) {
                return cached;
            }
            // Return null if not in cache (not yet loaded from cloud)
            return null;
        } catch (e) {
            console.error('Error loading data:', e);
            return null;
        }
    },

    /**
     * Force sync data from cloud
     */
    async syncFromCloud() {
        if (this.cloudInitialized &&
            typeof CloudStorage !== 'undefined' &&
            this.isCloudReady()) {
            await CloudStorage.syncFromCloud();
            // Reload data into session cache
            await this._loadInitialDataFromCloud();
        }
    },

    /**
     * Sync users specifically from cloud to ensure latest user data is available for login.
     * This is called before login to ensure new accounts created on other devices are recognized.
     * Note: Empty cloud data is intentionally ignored to prevent accidental lockout.
     * @returns {Promise<boolean>} - True if sync was successful
     */
    async syncUsersFromCloud() {
        if (typeof CloudStorage === 'undefined') {
            return false;
        }

        if (!this.cloudInitialized && typeof CloudStorage.init === 'function') {
            try {
                this.cloudInitialized = await CloudStorage.init();
            } catch (initErr) {
                console.warn('CloudStorage init failed during user sync', initErr);
            }
        }

        if (typeof CloudStorage.isCloudAvailable === 'function' && !CloudStorage.isCloudAvailable()) {
            return false;
        }

        try {
            const cloudUsers = await CloudStorage.loadData(this.KEYS.USERS);
            // Only sync if cloud has valid user data (non-empty array)
            // Empty arrays are ignored to prevent accidental lockout if cloud is cleared
            if (cloudUsers && Array.isArray(cloudUsers) && cloudUsers.length > 0) {
                // Online-only mode: Update session cache
                this._sessionCache[this.KEYS.USERS] = cloudUsers;
                console.log('Users synced from cloud for login');
                return true;
            }
        } catch (error) {
            console.warn('Failed to sync users from cloud:', error);
        }
        return false;
    },

    /**
     * Check if cloud storage is available
     */
    isCloudAvailable() {
        return this.cloudInitialized &&
            typeof CloudStorage !== 'undefined' &&
            CloudStorage.isCloudAvailable();
    },

    /**
     * Check if cloud is fully ready (auth + RTDB connection).
     */
    isCloudReady() {
        return this.cloudInitialized &&
            typeof CloudStorage !== 'undefined' &&
            CloudStorage.cloudReady === true;
    },

    /**
     * Check if the app is still establishing the cloud connection.
     */
    isCloudConnecting() {
        return this.cloudInitialized &&
            typeof CloudStorage !== 'undefined' &&
            CloudStorage.cloudReady !== true;
    },

    /**
     * Expose sync progress flag for UI.
     */
    isSyncInProgress() {
        return this.syncInProgress === true;
    },

    // ===== USERS =====
    async getDefaultUsers() {
        // In production mode, we still need to seed essential users on first initialization
        // This ensures admin, gestor, and technician accounts exist for initial access
        const technicians = this.getDefaultTechnicians();
        const gestorPassword = this.getGestorPassword();
        const canonicalGestorUsername = 'gestor';
        const gestorPasswordHash = await Utils.hashSHA256(gestorPassword, `${Utils.PASSWORD_SALT}:${canonicalGestorUsername}`);
        const baseTimestamp = Date.now();
        const baseUsersRaw = [
            { id: 'admin', username: 'admin', password: 'admin', name: 'Administrador', role: 'administrador', email: 'admin@diversey.com', updatedAt: baseTimestamp },
            { id: 'gestor', username: 'gestor', passwordHash: gestorPasswordHash, name: 'Welington Tavares', role: 'gestor', email: 'gestor@diversey.com', updatedAt: baseTimestamp },
            { id: 'gestor_wt', username: 'welington.tavares', password: 'tavares123', name: 'Welington Tavares', role: 'gestor', email: 'welington.tavares@diversey.com', updatedAt: baseTimestamp }
        ];
        const baseUsers = [];
        for (const user of baseUsersRaw) {
            try {
                if (user.passwordHash) {
                    baseUsers.push(user);
                } else {
                    const passwordHash = await Utils.hashSHA256(user.password, `${Utils.PASSWORD_SALT}:${user.username}`);
                    const { password: _password, ...userData } = user;
                    baseUsers.push({ ...userData, passwordHash });
                }
            } catch (_e) {
                console.error('Erro ao gerar hash de usuário padrão', _e);
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
                    disabled: tech.ativo === false,
                    updatedAt: baseTimestamp
                });
            } catch (e) {
                console.error('Erro ao gerar hash de técnico padrão', e);
            }
        }
        return [...baseUsers, ...technicianUsers];
    },

    /**
     * Normalize username for comparison and storage.
     * - Converts to lowercase and removes accents
     * - Trims whitespace
     * - Removes invalid characters (keeps only [a-z0-9.])
     * - Collapses multiple consecutive dots to single dot
     * - Removes leading and trailing dots
     */
    normalizeUsername(username) {
        if (!username) {
            return '';
        }
        // First apply basic normalization (lowercase, remove accents, trim)
        let normalized = Utils.normalizeText(username);
        
        // Keep only valid characters: a-z, 0-9, and dots
        normalized = normalized.replace(/[^a-z0-9.]/g, '');
        
        // Collapse multiple consecutive dots to single dot
        normalized = normalized.replace(/\.+/g, '.');
        
        // Remove leading and trailing dots
        normalized = normalized.replace(/^\.|\.$/g, '');
        
        return normalized;
    },

    /**
     * Get stable gestor recovery password from configuration.
     * Priority:
     * 1. window.DIVERSEY_BOOTSTRAP_GESTOR_PASSWORD (set via script tag in index.html)
     * 2. APP_CONFIG.security.bootstrap.gestorPassword
     * 3. Fallback to a default (NOT RECOMMENDED for production)
     * 
     * This password is used for the 'gestor' recovery account only.
     * It should be set during deployment and rotated regularly.
     */
    getGestorPassword() {
        // Check for global bootstrap password (highest priority)
        if (typeof window !== 'undefined' && window.DIVERSEY_BOOTSTRAP_GESTOR_PASSWORD) {
            return String(window.DIVERSEY_BOOTSTRAP_GESTOR_PASSWORD).trim();
        }
        
        // Check for APP_CONFIG security settings
        if (typeof APP_CONFIG !== 'undefined' && 
            APP_CONFIG.security?.bootstrap?.gestorPassword) {
            return String(APP_CONFIG.security.bootstrap.gestorPassword).trim();
        }
        
        // Fallback to default password (should be overridden in production)
        // This fallback allows the system to work out-of-the-box but is not secure for production
        return 'GestorRecovery2025!';
    },

    getUsers() {
        return this.loadData(this.KEYS.USERS) || [];
    },

    getUserById(id) {
        return this.getUsers().find(u => u.id === id);
    },

    getUserByUsername(username) {
        if (!username) {
            return undefined;
        }
        const target = this.normalizeUsername(username);
        const users = this.getUsers();
        return users.find(u => this.normalizeUsername(u.username) === target);
    },

    async _persistUsersToCloud(users) {
        if (!this.cloudInitialized && typeof CloudStorage !== 'undefined' && typeof CloudStorage.init === 'function') {
            try {
                this.cloudInitialized = await CloudStorage.init();
            } catch (_e) {
                // fall through to availability check
            }
        }

        if (!this.cloudInitialized || typeof CloudStorage === 'undefined' || typeof CloudStorage.saveData !== 'function') {
            return false;
        }
        try {
            return await CloudStorage.saveData(this.KEYS.USERS, users);
        } catch (e) {
            console.warn('Erro ao salvar usuários na nuvem', e);
            return false;
        }
    },

    async deleteUserById(userId) {
        if (!userId) {
            return false;
        }
        const users = this.getUsers();
        const filtered = users.filter(u => u.id !== userId);
        if (filtered.length === users.length) {
            return false;
        }
        const saved = await this._persistUsersToCloud(filtered);
        if (saved) {
            this._sessionCache[this.KEYS.USERS] = filtered;
        }
        return saved;
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
            this._sessionCache[this.KEYS.USERS] = users;
            await this._persistUsersToCloud(users);
        }
    },

    async saveUser(user) {
        if (!user || !user.username) {
            return { success: false, error: 'Usuário inválido' };
        }

        const users = this.getUsers();
        const normalizedUsername = this.normalizeUsername(user.username);
        const duplicate = users.find(u => this.normalizeUsername(u.username) === normalizedUsername && u.id !== user.id);
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
            disabled: user.disabled === true ? true : (user.disabled === false ? false : undefined),
            updatedAt: Date.now() // Add timestamp for merge conflict resolution
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

        const saved = await this._persistUsersToCloud(users);
        if (!saved) {
            return { success: false, error: 'Não foi possível salvar o gestor na nuvem. Verifique sua conexão e tente novamente.' };
        }

        this._sessionCache[this.KEYS.USERS] = users;
        return { success: true, user: normalizedUser };
    },

    getGestorUsers() {
        return this.getUsers().filter(u => u.role === 'gestor');
    },

    /**
     * Guarantee a gestor account exists with a known credential for recovery.
     * This recovery account ALWAYS has its password synchronized with the configured
     * bootstrap password. The hash is recalculated and updated on every call to ensure
     * the 'gestor' account can be accessed using the current configured password.
     * 
     * This is acceptable because:
     * - The 'gestor' account is specifically a recovery/bootstrap account
     * - It allows admins to regain access when needed
     * - The password is set securely during deployment, not stored in code
     * - Regular user accounts are never auto-reset this way
     */
    async ensureDefaultGestor() {
        const users = this.getUsers();
        const fallbackPassword = this.getGestorPassword();
        const fallback = {
            id: 'gestor',
            username: 'gestor',
            name: 'Welington Tavares',
            role: 'gestor',
            email: 'gestor@diversey.com'
        };

        const normalize = (value) => this.normalizeUsername(value);
        let updated = false;

        let gestorUser = users.find(u => normalize(u.username) === normalize(fallback.username));

        const canonicalUsername = fallback.username;
        const expectedPasswordHash = await Utils.hashSHA256(fallbackPassword, `${Utils.PASSWORD_SALT}:${canonicalUsername}`);

        if (!gestorUser) {
            // Create gestor user if missing
            gestorUser = { ...fallback, passwordHash: expectedPasswordHash };
            users.push(gestorUser);
            updated = true;
            console.info('[BOOTSTRAP] Created gestor recovery account');
        } else {
            // ALWAYS update the password hash to match the configured password
            // This ensures the gestor account can always be accessed with the bootstrap password
            if (gestorUser.passwordHash !== expectedPasswordHash) {
                gestorUser.passwordHash = expectedPasswordHash;
                updated = true;
                console.info('[BOOTSTRAP] Updated gestor recovery password hash');
            }
            
            // Ensure role is correct
            if (gestorUser.role !== 'gestor') {
                gestorUser.role = 'gestor';
                updated = true;
            }
        }

        if (updated) {
            this._sessionCache[this.KEYS.USERS] = users;
            await this._persistUsersToCloud(users);
        }
    },

    /**
     * Ensure baseline users exist for staging/development environments.
     * Creates or updates admin, gestor, and welington.btavares accounts with pre-computed hashes.
     * Only runs when APP_CONFIG.environment !== 'production'.
     * 
     * Pre-computed hashes (using salt "diversey_salt_v1"):
     * - admin / admin123: c08ab1a7671509ccb5ecdf9868eb30df793ce5104b404d11cfa82d4b84029283
     * - gestor / gestor123: ca762c2ec7cdcc2fb79450121aba3642873df25ed035810c8f6a12b76f9f42fa
     * - welington.btavares / btavares123: d012e1413fe36160d4b5caf6bc81c0286904116c5506040d943a2e4f5faa943b
     */
    async ensureBaselineUsersForStaging() {
        // Only run in non-production environments
        if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.environment === 'production') {
            console.info('[BASELINE] Skipping baseline user seeding in production environment');
            return false;
        }

        const baseTimestamp = Date.now();
        
        // Define baseline users with pre-computed hashes
        // These hashes were computed using: SHA256(password + (PASSWORD_SALT + ":" + username))
        const baselineUsers = [
            {
                id: 'admin',
                username: 'admin',
                name: 'Administrador',
                role: 'administrador',
                email: 'admin@diversey.com',
                passwordHash: 'c08ab1a7671509ccb5ecdf9868eb30df793ce5104b404d11cfa82d4b84029283', // admin123
                disabled: false,
                updatedAt: baseTimestamp
            },
            {
                id: 'gestor',
                username: 'gestor',
                name: 'Welington Tavares',
                role: 'gestor',
                email: 'gestor@diversey.com',
                passwordHash: 'ca762c2ec7cdcc2fb79450121aba3642873df25ed035810c8f6a12b76f9f42fa', // gestor123
                disabled: false,
                updatedAt: baseTimestamp
            },
            {
                id: 'gestor_wt',
                username: 'welington.btavares',
                name: 'Welington Bastos Tavares',
                role: 'gestor',
                email: 'welington.tavares@diversey.com',
                passwordHash: 'd012e1413fe36160d4b5caf6bc81c0286904116c5506040d943a2e4f5faa943b', // btavares123
                disabled: false,
                updatedAt: baseTimestamp
            }
        ];

        const users = this.getUsers();
        let updated = false;

        // Upsert each baseline user
        for (const baselineUser of baselineUsers) {
            const normalizedUsername = this.normalizeUsername(baselineUser.username);
            const existingIndex = users.findIndex(u => 
                this.normalizeUsername(u.username) === normalizedUsername
            );

            if (existingIndex >= 0) {
                // Update existing user - preserve ID but update other fields
                const existing = users[existingIndex];
                users[existingIndex] = {
                    ...baselineUser,
                    id: existing.id, // Keep existing ID
                    updatedAt: baseTimestamp
                };
                updated = true;
                console.info(`[BASELINE] Updated baseline user: ${baselineUser.username}`);
            } else {
                // Create new user
                users.push(baselineUser);
                updated = true;
                console.info(`[BASELINE] Created baseline user: ${baselineUser.username}`);
            }
        }

        if (updated) {
            this._sessionCache[this.KEYS.USERS] = users;
            const saved = await this._persistUsersToCloud(users);
            if (saved) {
                console.info('[BASELINE] Baseline users seeded successfully');
            }
            return saved;
        }

        return false;
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
    normalizePart(part) {
        if (!part || !part.codigo || !part.descricao || !part.unidade || !part.categoria) {
            return null;
        }
        const numericValue = Number(part.valor);
        if (!Number.isFinite(numericValue) || numericValue < 0) {
            return null;
        }
        return { ...part, valor: numericValue };
    },

    ensurePartsCatalogIsCurrent() {
        const storedVersion = localStorage.getItem(this.KEYS.PARTS_VERSION);
        if (storedVersion === this.PARTS_VERSION) {
            return;
        }

        try {
            const officialParts = this.getDefaultParts();
            const existingParts = this.getParts();
            const mergedCatalog = new Map();

            officialParts.forEach((part) => {
                const normalized = this.normalizePart(part);
                if (normalized) {
                    mergedCatalog.set(normalized.codigo, normalized);
                }
            });

            for (const part of existingParts) {
                if (!part || mergedCatalog.has(part.codigo)) {
                    continue;
                }
                const normalized = this.normalizePart(part);
                if (normalized && !mergedCatalog.has(normalized.codigo)) {
                    mergedCatalog.set(normalized.codigo, normalized);
                }
            }

            const updatedCatalog = Array.from(mergedCatalog.values());

            this.saveData(this.KEYS.PARTS, updatedCatalog);
            localStorage.setItem(this.KEYS.PARTS_VERSION, this.PARTS_VERSION);
        } catch (e) {
            const errorMessage = e?.message || e?.name || 'Parts catalog synchronization failed';
            console.warn(
                `Error reviewing official parts catalog (version ${storedVersion || 'unknown'} → ${this.PARTS_VERSION}): ${errorMessage}`,
                e
            );
        }
    },

    getDefaultParts() {
        return OFFICIAL_PARTS_BASE.map((item) => ({
            id: item.codigo,
            codigo: item.codigo,
            descricao: item.descricao,
            categoria: item.categoria || 'Catálogo Oficial',
            valor: item.valor,
            unidade: item.unidade || 'UN',
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
        const errors = [];
        
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
        return solicitations.filter(s => 
            s.status === this.STATUS.PENDENTE &&
            s.historicoManual !== true
        );
    },

    saveSolicitation(solicitation) {
        const normalizedSolicitation = this.normalizeHistoricalStatus(solicitation);

        const solicitations = this.getSolicitations();
        const index = solicitations.findIndex(s => s.id === normalizedSolicitation.id);
        let persistedSolicitation;
        
        if (index >= 0) {
            // Optimistic concurrency check
            const existing = solicitations[index];
            const existingVersion = Number(existing.audit?.version) || 0;
            const incomingVersion = normalizedSolicitation.audit?.version;
            
            // If incoming has version and it doesn't match, there's a conflict
            // Use Number() for type-safe comparison
            if (incomingVersion !== undefined && Number(incomingVersion) !== existingVersion) {
                console.warn(`Conflito de versão: esperado ${existingVersion}, recebido ${incomingVersion}`);
                return { success: false, error: 'conflict', message: 'Versão desatualizada. Recarregue os dados.' };
            }
            
            // Update with new version
            normalizedSolicitation.audit = {
                ...normalizedSolicitation.audit,
                version: existingVersion + 1,
                lastUpdatedAt: Date.now(),
                lastUpdatedBy: normalizedSolicitation.createdBy || 'Sistema'
            };
            
            solicitations[index] = normalizedSolicitation;
            persistedSolicitation = solicitations[index];
        } else {
            normalizedSolicitation.id = Utils.generateId();
            normalizedSolicitation.numero = Utils.generateNumber(
                solicitations.map(s => s.numero),
                normalizedSolicitation.data
            );
            normalizedSolicitation.createdAt = Date.now();
            
            // Initialize audit trail for new solicitation
            normalizedSolicitation.audit = {
                version: 1,
                createdAt: Date.now(),
                createdBy: normalizedSolicitation.createdBy || 'Sistema',
                lastUpdatedAt: Date.now(),
                lastUpdatedBy: normalizedSolicitation.createdBy || 'Sistema'
            };
            
            // Initialize timeline array for tracking events
            if (!normalizedSolicitation.timeline) {
                normalizedSolicitation.timeline = [];
            }
            normalizedSolicitation.timeline.push({
                event: 'created',
                at: Date.now(),
                by: normalizedSolicitation.createdBy || 'Sistema'
            });
            
            // Initialize approvals array for approval history
            if (!normalizedSolicitation.approvals) {
                normalizedSolicitation.approvals = [];
            }
            
            solicitations.push(normalizedSolicitation);
            persistedSolicitation = normalizedSolicitation;
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
            const solicitation = solicitations[index];
            const previousStatus = solicitation.status;
            
            solicitation.status = status;
            
            // Update audit version
            const currentVersion = solicitation.audit?.version || 0;
            solicitation.audit = {
                ...solicitation.audit,
                version: currentVersion + 1,
                lastUpdatedAt: Date.now(),
                lastUpdatedBy: extra.by || 'Sistema'
            };
            
            // Maintain statusHistory for backward compatibility
            if (!solicitation.statusHistory) {
                solicitation.statusHistory = [];
            }
            
            solicitation.statusHistory.push({
                status,
                at: Date.now(),
                by: extra.by || 'Sistema'
            });
            
            // Add to timeline for comprehensive event tracking
            if (!solicitation.timeline) {
                solicitation.timeline = [];
            }
            solicitation.timeline.push({
                event: 'status_changed',
                from: previousStatus,
                to: status,
                at: Date.now(),
                by: extra.by || 'Sistema',
                comment: extra.approvalComment || extra.rejectionReason || null
            });
            
            // Track approvals separately for the approvals trail
            if (status === 'aprovada' || status === 'rejeitada') {
                if (!solicitation.approvals) {
                    solicitation.approvals = [];
                }
                solicitation.approvals.push({
                    decision: status === 'aprovada' ? 'approved' : 'rejected',
                    at: Date.now(),
                    by: extra.by || 'Sistema',
                    comment: extra.approvalComment || extra.rejectionReason || null
                });
            }
            
            // Merge extra data
            Object.assign(solicitation, extra);
            
            const saved = this.saveData(this.KEYS.SOLICITATIONS, solicitations);
            if (saved) {
                this.queueOneDriveBackup(solicitation);
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
            const settings = this.getSettings();
            const integration = (typeof OneDriveIntegration !== 'undefined') ? OneDriveIntegration : null;
            if (!integration || typeof integration.enqueueSync !== 'function') {
                return;
            }
            const isConfigured = (typeof integration.isConfigured === 'function')
                ? integration.isConfigured(settings)
                : true; // Default to true for integrations that predate isConfigured support (backward compatibility)
            if (!isConfigured) {
                return;
            }
            integration.enqueueSync(solicitation);
        } catch (e) {
            console.warn('OneDrive backup enqueue failed', e);
        }
    },

    // ===== SETTINGS =====
    getSettings() {
        const defaults = {
            theme: 'light',
            slaHours: 24,
            itemsPerPage: 10,
            statsRangeDays: 30,
            sheetIntegration: { provider: 'onedrive', target: '' }
        };
        const settings = this.loadData(this.KEYS.SETTINGS) || {};
        return { ...defaults, ...settings, sheetIntegration: { ...defaults.sheetIntegration, ...(settings.sheetIntegration || {}) } };
    },

    saveSetting(key, value) {
        const settings = this.getSettings();
        settings[key] = value;
        return this.saveData(this.KEYS.SETTINGS, settings);
    },

    // ===== EXPORT LOG (Cloud-First) =====
    /**
     * Log an export operation with metadata.
     * Supports cloud-first requirement: tracks who/when/what for all exports.
     * @param {object} exportInfo - Export metadata
     * @param {string} exportInfo.type - Export type: 'pdf' | 'xlsx' | 'csv'
     * @param {string} exportInfo.filename - Generated filename
     * @param {string} exportInfo.source - Source module: 'solicitacoes' | 'relatorios' | 'pecas' | 'aprovacoes'
     * @param {object} exportInfo.filters - Applied filters (if any)
     * @param {number} exportInfo.recordCount - Number of records exported
     * @param {string} exportInfo.solicitationId - Related solicitation ID (for PDF exports)
     * @returns {object} The logged export entry
     */
    logExport(exportInfo) {
        try {
            const currentUser = (typeof Auth !== 'undefined' && Auth.getCurrentUser) 
                ? Auth.getCurrentUser() 
                : null;
            
            const entry = {
                id: Utils.generateId(),
                at: new Date().toISOString(),
                timestamp: Date.now(),
                type: exportInfo.type || 'unknown',
                filename: exportInfo.filename || 'unknown',
                source: exportInfo.source || 'unknown',
                filters: exportInfo.filters || {},
                recordCount: exportInfo.recordCount || 0,
                solicitationId: exportInfo.solicitationId || null,
                user: {
                    id: currentUser?.id || 'anonymous',
                    username: currentUser?.username || 'anonymous',
                    name: currentUser?.name || 'Anônimo',
                    role: currentUser?.role || 'unknown'
                },
                device: {
                    userAgent: (typeof navigator !== 'undefined' && navigator.userAgent) 
                        ? navigator.userAgent.substring(0, 100) 
                        : 'unknown',
                    platform: (typeof navigator !== 'undefined' && navigator.platform) 
                        ? navigator.platform 
                        : 'unknown'
                },
                // Cloud-first: mark as pending cloud sync
                cloudSynced: false
            };
            
            const logs = this.getExportLogs();
            logs.unshift(entry);
            
            // Keep only the most recent entries
            const trimmedLogs = logs.slice(0, this.EXPORT_LOG_LIMIT);
            
            this.saveData(this.KEYS.EXPORT_LOG, trimmedLogs);
            
            // Integrate with structured Logger for health panel
            if (typeof Logger !== 'undefined') {
                Logger.logExport('export_complete', {
                    type: entry.type,
                    filename: entry.filename,
                    source: entry.source,
                    recordCount: entry.recordCount,
                    username: entry.user.username
                });
            }
            
            console.info('[EXPORT]', entry.type.toUpperCase(), entry.filename, `by ${entry.user.username}`);
            
            return entry;
        } catch (e) {
            console.warn('Failed to log export:', e);
            return null;
        }
    },
    
    /**
     * Persist export artifact in cloud-first storage.
     * Stores a base64 payload alongside metadata so exports do not rely on manual downloads.
     * @param {object} entry - Export log entry returned by logExport
     * @param {object} artifact - Artifact payload and metadata
     * @param {string} artifact.payloadBase64 - Base64 encoded file content
     * @param {string} artifact.filename - File name
     * @param {string} artifact.contentType - MIME type
     * @param {string} artifact.source - Source module
     */
    saveExportArtifact(entry, artifact) {
        try {
            if (!entry || !artifact || !artifact.payloadBase64) {
                return null;
            }
            
            const artifacts = this.loadData(this.KEYS.EXPORT_FILES) || {};
            const opId = artifact.opId || entry.id;
            artifacts[entry.id] = {
                id: entry.id,
                opId,
                filename: artifact.filename || entry.filename,
                contentType: artifact.contentType || 'application/octet-stream',
                payloadBase64: artifact.payloadBase64,
                source: artifact.source || entry.source || 'unknown',
                createdAt: entry.timestamp || Date.now()
            };
            
            this.saveData(this.KEYS.EXPORT_FILES, artifacts);
            return artifacts[entry.id];
        } catch (e) {
            console.warn('Failed to persist export artifact:', e);
            return null;
        }
    },
    
    /**
     * Get export logs
     * @param {number} limit - Maximum number of logs to return
     * @returns {Array} Export log entries
     */
    getExportLogs(limit = null) {
        const logs = this.loadData(this.KEYS.EXPORT_LOG) || [];
        if (limit && limit > 0) {
            return logs.slice(0, limit);
        }
        return logs;
    },
    
    /**
     * Get export statistics
     * @param {number} rangeDays - Number of days to include
     * @returns {object} Export statistics
     */
    getExportStats(rangeDays = 30) {
        const logs = this.getExportLogs();
        const now = Date.now();
        const rangeMs = rangeDays * 24 * 60 * 60 * 1000;
        const rangeStart = now - rangeMs;
        
        const recentLogs = logs.filter(log => log.timestamp >= rangeStart);
        
        const byType = {};
        const byUser = {};
        const bySource = {};
        
        recentLogs.forEach(log => {
            byType[log.type] = (byType[log.type] || 0) + 1;
            byUser[log.user?.username || 'anonymous'] = (byUser[log.user?.username || 'anonymous'] || 0) + 1;
            bySource[log.source] = (bySource[log.source] || 0) + 1;
        });
        
        return {
            total: recentLogs.length,
            byType,
            byUser,
            bySource,
            rangeDays
        };
    },

    // ===== STATISTICS =====
    getStatistics(rangeDays = null, options = {}) {
        const { includeHistoricalManual = false } = options || {};
        const solicitationsRaw = this.getSolicitations();
        const solicitations = includeHistoricalManual
            ? solicitationsRaw
            : solicitationsRaw.filter(s => !this.isHistoricalManual(s));
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const settings = this.getSettings();
        const effectiveRange = rangeDays || settings.statsRangeDays || 30;
        const rangeStart = now - (effectiveRange * dayMs);
        const HOURS_IN_MS = 1000 * 60 * 60;
        const APPROVAL_OUTLIER_MULTIPLIER = STATS_CONFIG.APPROVAL_OUTLIER_MULTIPLIER;
        const APPROVAL_OUTLIER_FLOOR_HOURS = STATS_CONFIG.APPROVAL_OUTLIER_FLOOR_HOURS;
        const OUTLIER_PERCENTILE_THRESHOLD = STATS_CONFIG.OUTLIER_PERCENTILE_THRESHOLD;
        const normalizeTime = (value) => {
            if (!value) {
                return null;
            }
            if (typeof value === 'number') {
                return value;
            }
            const parsed = Utils.parseAsLocalDate(value).getTime();
            return isNaN(parsed) ? null : parsed;
        };
        const percentile = (values, threshold) => {
            if (!values.length) {
                return 0;
            }
            const sorted = [...values].sort((a, b) => a - b);
            const index = Math.max(0, Math.ceil(sorted.length * threshold) - 1);
            return sorted[index] || 0;
        };
        const filterOutlierTimes = (times) => {
            const maxApprovalHours = Math.max(settings.slaHours * APPROVAL_OUTLIER_MULTIPLIER, APPROVAL_OUTLIER_FLOOR_HOURS);
            const cleaned = times.filter(h => h <= maxApprovalHours);
            const p95 = percentile(cleaned, OUTLIER_PERCENTILE_THRESHOLD);
            return cleaned.filter(h => h <= p95);
        };
        const getReferenceDate = (solicitation) => {
            const fromData = normalizeTime(solicitation.data);
            if (fromData) {
                return fromData;
            }
            const fromCreated = normalizeTime(solicitation.createdAt);
            return fromCreated || null;
        };

        const scopedSolicitations = solicitations.filter(s => {
            const refDate = getReferenceDate(s);
            return refDate !== null && refDate >= rangeStart;
        });
        
        // Count by status
        const byStatus = {};
        scopedSolicitations.forEach(s => {
            byStatus[s.status] = (byStatus[s.status] || 0) + 1;
        });
        
        // Calculate SLA
        const approved = scopedSolicitations.filter(s => s.approvedAt && (s.createdAt || s.data));
        const approvalTimes = approved.map(s => {
            const created = getReferenceDate(s);
            const approvedAt = normalizeTime(s.approvedAt);
            if (created && approvedAt) {
                return (approvedAt - created) / HOURS_IN_MS;
            }
            return null;
        }).filter(t => t !== null && t >= 0);

        const trimmedTimes = filterOutlierTimes(approvalTimes);
        const avgApprovalTime = trimmedTimes.length > 0 
            ? trimmedTimes.reduce((sum, t) => sum + t, 0) / trimmedTimes.length
            : 0;
        
        // Volume by period
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(now - i * dayMs);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart.getTime() + dayMs);
            
            const count = scopedSolicitations.filter(s => {
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
            
            const count = scopedSolicitations.filter(s => {
                const refDate = getReferenceDate(s);
                return refDate !== null && refDate >= monthStart.getTime() && refDate <= monthEnd.getTime();
            }).length;
            
            last6Months.push({
                month: monthDate.toLocaleDateString('pt-BR', { month: 'short' }),
                count
            });
        }
        
        // Top parts (exclude rejected requests per requirement)
        const partsCount = {};
        scopedSolicitations.forEach(s => {
            // Skip rejected solicitations - they should not count towards top parts ranking
            if (s.status === 'rejeitada') {
                return;
            }
            (s.itens || []).forEach(item => {
                if (!item || !item.codigo) {
                    return;
                }
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
        scopedSolicitations.forEach(s => {
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

            // For top technicians ranking, only count approved requests (per requirement)
            // "Top técnicos: só approved (rejected fora)" - only approved and subsequent statuses
            // Note: 'pending' property removed from technicianAmounts as it's not relevant for 
            // an approved-only ranking. This ensures the "Top Técnicos" report accurately reflects
            // only successfully approved work, excluding drafts, pending, and rejected requests.
            const isApproved = s.status === 'aprovada' || s.status === 'em-transito' || 
                             s.status === 'entregue' || s.status === 'finalizada';
            if (isApproved) {
                if (!technicianAmounts[s.tecnicoNome || 'Não identificado']) {
                    technicianAmounts[s.tecnicoNome || 'Não identificado'] = { total: 0, count: 0 };
                }
                technicianAmounts[s.tecnicoNome || 'Não identificado'].total += Number(s.total) || 0;
                technicianAmounts[s.tecnicoNome || 'Não identificado'].count += 1;
            }
        });
        
        const totalPendingValue = scopedSolicitations
            .filter(s => s.status === 'pendente')
            .reduce((sum, s) => sum + (Number(s.total) || 0), 0);

        const topTechniciansByValue = Object.entries(technicianAmounts)
            .map(([name, info]) => ({ name, total: info.total, count: info.count }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
        
        return {
            total: scopedSolicitations.length,
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
            topTechniciansByValue,
            rangeDays: effectiveRange,
            rangeLabel: `Últimos ${effectiveRange} dias`
        };
    }
};

// Initialize data on load
DataManager.init();
