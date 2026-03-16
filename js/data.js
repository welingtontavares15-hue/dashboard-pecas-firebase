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
    'Sebastião Gomes Ribeiro':{'endereco':'RUA THOME DE SOUZA, 335','bairro':'LAGOA GRANDE - SEDE','cep':'45.810-000','municipio':'PORTO SEGURO','uf':'BA'},
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
        NOTIFICATION_LOG: 'diversey_notification_log',
        RECENT_PARTS: 'diversey_recent_parts',
        PARTS_VERSION: 'diversey_parts_version',
        EXPORT_LOG: 'diversey_export_log',
        EXPORT_FILES: 'diversey_export_files'
    },
    
    // Export log configuration (cloud-first)
    EXPORT_LOG_LIMIT: 100,
    NOTIFICATION_LOG_LIMIT: 200,

    PARTS_VERSION: PARTS_CATALOG_VERSION,
    SOLICITATIONS_RESET_KEY: 'diversey_solicitations_reset_version',
    SOLICITATIONS_RESET_VERSION: '2025-12-reset-v2-test-purge',
    SOLICITATIONS_LAST_BACKUP_KEY: 'diversey_solicitations_last_backup_at',

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

    normalizeWorkflowStatus(status) {
        const raw = Utils.normalizeText(String(status || '').replace(/-/g, '_'));
        const aliases = {
            rascunho: this.STATUS.RASCUNHO,
            enviada: this.STATUS.PENDENTE,
            criado: this.STATUS.PENDENTE,
            criada: this.STATUS.PENDENTE,
            pendente: this.STATUS.PENDENTE,
            pendente_aprovacao: this.STATUS.PENDENTE,
            aprovada: this.STATUS.APROVADA,
            aprovado: this.STATUS.APROVADA,
            rejeitada: this.STATUS.REJEITADA,
            reprovado: this.STATUS.REJEITADA,
            em_transito: this.STATUS.EM_TRANSITO,
            em_compra: this.STATUS.EM_TRANSITO,
            entregue: this.STATUS.FINALIZADA,
            finalizada: this.STATUS.FINALIZADA,
            concluido: this.STATUS.FINALIZADA,
            enviado: this.STATUS.FINALIZADA,
            historico_manual: this.STATUS.HISTORICO_MANUAL
        };

        return aliases[raw] || (String(status || '').trim() || this.STATUS.PENDENTE);
    },

    isValidWorkflowTransition(currentStatus, nextStatus) {
        const from = this.normalizeWorkflowStatus(currentStatus);
        const to = this.normalizeWorkflowStatus(nextStatus);

        if (!to) {
            return false;
        }

        if (from === to) {
            return true;
        }

        if (to === this.STATUS.HISTORICO_MANUAL) {
            return true;
        }

        const allowedTransitions = {
            [this.STATUS.RASCUNHO]: [this.STATUS.PENDENTE],
            [this.STATUS.PENDENTE]: [this.STATUS.APROVADA, this.STATUS.REJEITADA],
            [this.STATUS.APROVADA]: [this.STATUS.EM_TRANSITO],
            [this.STATUS.EM_TRANSITO]: [this.STATUS.FINALIZADA],
            [this.STATUS.REJEITADA]: [this.STATUS.PENDENTE],
            [this.STATUS.FINALIZADA]: []
        };

        if (!Object.prototype.hasOwnProperty.call(allowedTransitions, from)) {
            return true;
        }

        return (allowedTransitions[from] || []).includes(to);
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
    _pendingSyncReason: 'auto',
    realtimeSubscribed: false,
    
    // Online-only mode: In-memory session cache for already-loaded data
    // This allows read-only access to data loaded during the session
    _sessionCache: {},
    
    // Online-only mode: Track connection status
    _isOnline: true,
    _connectionToastMemory: {},

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
            let cloudReady = false;
            try {
                // Initialize connection monitoring for online-only mode
                this._initConnectionMonitoring();
                
                // Initialize cloud storage - this is REQUIRED in online-only mode
                if (typeof CloudStorage !== 'undefined') {
                    try {
                        this.cloudInitialized = await CloudStorage.init();
                        cloudReady = this.cloudInitialized && typeof CloudStorage.waitForCloudReady === 'function'
                            ? await CloudStorage.waitForCloudReady(15000)
                            : this.cloudInitialized;
                        
                        if (this.cloudInitialized) {
                            this._registerRealtimeSubscriptions();
                            
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

                // Cloud seeding must never run in the normal production bootstrap.
                // It is only safe under explicit bootstrap mode.
                if (this.cloudInitialized && this.isCloudBootstrapSeedingEnabled()) {
                    await this._ensureCloudDataExists();
                }

                this.ensureAutomaticSolicitationsBackup('startup');

                // Migrate plaintext passwords to hashed form
                try {
                    await this.migrateUserPasswords();
                } catch (e) {
                    console.warn('Failed to migrate passwords to secure hash; affected users may need to reset credentials', e);
                }

                // Ensure at least one gestor account is always available for access recovery
                try {
                    await this.ensureDefaultGestor();
                    await this.ensureRecoveryUsers();
                } catch (e) {
                    console.warn('Failed to enforce default gestor credentials', e);
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

                if ((typeof APP_CONFIG !== 'undefined' && typeof APP_CONFIG.isProduction === 'function' && APP_CONFIG.isProduction()) &&
                    this.getUsers().length === 0) {
                    let verifiedEmptyProvisioning = false;

                    if (cloudReady && typeof CloudStorage !== 'undefined' && typeof CloudStorage.loadData === 'function') {
                        try {
                            const cloudUsers = await CloudStorage.loadData(this.KEYS.USERS);
                            if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
                                this._sessionCache[this.KEYS.USERS] = cloudUsers;
                            } else if (Array.isArray(cloudUsers)) {
                                verifiedEmptyProvisioning = true;
                            }
                        } catch (_error) {
                            verifiedEmptyProvisioning = false;
                        }
                    }

                    if (verifiedEmptyProvisioning && this.getUsers().length === 0) {
                        if (typeof Logger !== 'undefined' && typeof Logger.warn === 'function') {
                            Logger.warn(Logger.CATEGORY.AUTH, 'no_provisioned_users_detected', {
                                environment: APP_CONFIG.environment || 'production'
                            });
                        }
                        if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
                            Utils.showToast('Ambiente sem usuários provisionados na nuvem. Solicite a habilitação inicial ao administrador.', 'warning');
                        }
                    }
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
                this.logOperationalEvent('info', 'sync', 'browser_connection_restored');
                this.showConnectionToast('browser_online', 'Conexão restabelecida', 'success');
                this.scheduleSync('browser_online');
            });
            
            window.addEventListener('offline', () => {
                this._isOnline = false;
                this.logOperationalEvent('warn', 'sync', 'browser_connection_lost');
                this.showConnectionToast('browser_offline', 'Sem conexão: operações de escrita bloqueadas', 'warning');
            });
        }

        // Register callback with FirebaseInit for RTDB connection changes
        if (typeof FirebaseInit !== 'undefined' && typeof FirebaseInit.onConnectionChange === 'function') {
            FirebaseInit.onConnectionChange((isConnected, wasConnected) => {
                if (isConnected && !wasConnected) {
                    this.logOperationalEvent('info', 'sync', 'rtdb_connection_restored');
                    this.showConnectionToast('cloud_connected', 'Sincronização em nuvem conectada', 'info', 8000);
                    this.scheduleSync('rtdb_reconnected');
                } else if (!isConnected && wasConnected) {
                    this.logOperationalEvent('warn', 'sync', 'rtdb_connection_lost');
                    this.showConnectionToast('cloud_disconnected', 'Sincronização em nuvem indisponível no momento', 'warning', 8000);
                }
            });
        }
    },

    /**
     * Ensure real-time subscriptions are attached (idempotent across reconnects)
     */
    _registerRealtimeSubscriptions() {
        if (!this.cloudInitialized || typeof CloudStorage === 'undefined' || typeof CloudStorage.subscribe !== 'function') {
            return;
        }

        const subscribeSafe = (key, handler) => {
            if (typeof CloudStorage.unsubscribe === 'function') {
                CloudStorage.unsubscribe(key);
            }
            CloudStorage.subscribe(key, handler);
        };

        const subscribeCollection = (key, label) => {
            subscribeSafe(key, (payload) => {
                this.logOperationalEvent('debug', 'sync', 'realtime_collection_updated', { key, label });
                this._sessionCache[key] = payload;
                this.emitDataUpdated([key], 'realtime');
            });
        };

        try {
            subscribeSafe(this.KEYS.SOLICITATIONS, (data) => {
                this.logOperationalEvent('debug', 'sync', 'realtime_solicitations_updated');
                this._sessionCache[this.KEYS.SOLICITATIONS] = data;
                this.emitDataUpdated([this.KEYS.SOLICITATIONS], 'realtime');
            });

            // Subscribe to real-time updates for users to keep sessions synchronized
            subscribeSafe(this.KEYS.USERS, (users) => {
                this.logOperationalEvent('debug', 'sync', 'realtime_users_updated');
                this._sessionCache[this.KEYS.USERS] = users;

                if (typeof Auth !== 'undefined' && Auth.currentUser && Array.isArray(users)) {
                    this.refreshAuthenticatedSession(users);
                }

                this.emitDataUpdated([this.KEYS.USERS], 'realtime');
            });

            // Keep cadastros/settings synchronized across devices and screens.
            subscribeCollection(this.KEYS.TECHNICIANS, 'Technicians');
            subscribeCollection(this.KEYS.SUPPLIERS, 'Suppliers');
            subscribeCollection(this.KEYS.PARTS, 'Parts');
            subscribeCollection(this.KEYS.SETTINGS, 'Settings');
            subscribeCollection(this.KEYS.NOTIFICATION_LOG, 'Notification log');
            subscribeCollection(this.KEYS.RECENT_PARTS, 'Recent parts');

            this.realtimeSubscribed = true;
        } catch (e) {
            this.realtimeSubscribed = false;
            console.warn('Failed to register realtime subscriptions', e);
        }
    },
    
    /**
     * Check if system is online (for online-only mode blocking)
     */
    isOnline() {
        if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
            this._isOnline = navigator.onLine;
        }
        return this._isOnline !== false;
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

    showConnectionToast(key, message, type = 'info', minIntervalMs = 4000) {
        const now = Date.now();
        const lastAt = this._connectionToastMemory[key] || 0;
        if ((now - lastAt) < minIntervalMs) {
            return;
        }
        this._connectionToastMemory[key] = now;
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast(message, type);
        }
    },

    emitDataUpdated(updatedKeys = [], source = 'local') {
        if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
            return;
        }

        const keys = Array.isArray(updatedKeys) ? updatedKeys.filter(Boolean) : [];
        window.dispatchEvent(new CustomEvent('data:updated', {
            detail: {
                keys,
                source
            }
        }));
    },

    cloneSerializable(value, fallback = null) {
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (_error) {
            return fallback;
        }
    },

    async persistCriticalCollection(key, data, options = {}) {
        const payload = this.cloneSerializable(data, data);
        const saved = await this._persistCollectionToCloud(key, payload, options);
        if (!saved) {
            return false;
        }

        this._sessionCache[key] = payload;
        this.emitDataUpdated([key], 'local');
        return true;
    },

    async persistCloudAccessSession(sessionUser = null) {
        if (typeof CloudStorage === 'undefined' || typeof CloudStorage.persistAccessSession !== 'function') {
            return false;
        }

        if (!this.cloudInitialized && typeof CloudStorage.init === 'function') {
            try {
                this.cloudInitialized = await CloudStorage.init();
            } catch (_e) {
                return false;
            }
        }

        if (!this.cloudInitialized) {
            return false;
        }

        try {
            return await CloudStorage.persistAccessSession(sessionUser);
        } catch (error) {
            console.warn('Erro ao persistir sessão de acesso na nuvem', error);
            return false;
        }
    },

    async ensureCloudAccessSession(sessionUser = null, options = {}) {
        const activeUser = sessionUser
            || (typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function'
                ? Auth.getCurrentUser()
                : null);

        if (!activeUser) {
            return true;
        }

        if (typeof CloudStorage === 'undefined' || typeof CloudStorage.persistAccessSession !== 'function') {
            return false;
        }

        if (!this.cloudInitialized && typeof CloudStorage.init === 'function') {
            try {
                this.cloudInitialized = await CloudStorage.init();
            } catch (_error) {
                return false;
            }
        }

        if (!this.cloudInitialized) {
            return false;
        }

        const timeoutMs = Math.max(1000, Number(options.timeoutMs) || 15000);
        const retries = Math.max(1, Number(options.retries) || 3);

        if (typeof CloudStorage.waitForCloudReady === 'function') {
            const ready = await CloudStorage.waitForCloudReady(timeoutMs);
            if (!ready) {
                this.logOperationalEvent('info', 'sync', 'cloud_access_session_write_pending', {
                    username: activeUser.username || null,
                    role: activeUser.role || null
                });
            }
        }

        for (let attempt = 1; attempt <= retries; attempt += 1) {
            try {
                const persisted = await CloudStorage.persistAccessSession(activeUser);
                if (persisted) {
                    return true;
                }
            } catch (error) {
                if (attempt >= retries) {
                    console.warn('Erro ao garantir sessao de acesso na nuvem', error);
                }
            }

            if (attempt < retries) {
                await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
            }
        }

        return false;
    },

    getLastCloudOperationError() {
        if (typeof CloudStorage !== 'undefined' && typeof CloudStorage.getLastOperationError === 'function') {
            return CloudStorage.getLastOperationError();
        }
        return null;
    },

    buildCloudPersistenceFailure(defaultMessage, options = {}) {
        const cloudError = this.getLastCloudOperationError();
        const permissionDeniedMessage = options.permissionDeniedMessage
            || 'A operação foi bloqueada pelas regras de segurança da nuvem. Publique as regras atualizadas do Firebase e tente novamente.';
        const unavailableMessage = options.unavailableMessage || defaultMessage;

        if (cloudError?.permissionDenied) {
            return {
                code: 'permission_denied',
                message: permissionDeniedMessage,
                details: cloudError
            };
        }

        if (cloudError?.code === 'cloud_not_ready' || cloudError?.retryable) {
            return {
                code: 'cloud_unavailable',
                message: unavailableMessage,
                details: cloudError
            };
        }

        return {
            code: 'cloud_save_failed',
            message: defaultMessage,
            details: cloudError
        };
    },

    async clearCloudAccessSession() {
        if (typeof CloudStorage === 'undefined' || typeof CloudStorage.clearAccessSession !== 'function') {
            return false;
        }

        try {
            return await CloudStorage.clearAccessSession();
        } catch (error) {
            console.warn('Erro ao remover sessão de acesso na nuvem', error);
            return false;
        }
    },

    refreshAuthenticatedSession(users = this.getUsers()) {
        if (typeof Auth === 'undefined' || typeof Auth.getCurrentUser !== 'function') {
            return;
        }

        const currentUser = Auth.getCurrentUser();
        if (!currentUser || !Array.isArray(users)) {
            return;
        }

        const byId = currentUser.id
            ? users.find((item) => item?.id === currentUser.id)
            : null;
        const byUsername = !byId
            ? users.find((item) => this.normalizeUsername(item?.username) === this.normalizeUsername(currentUser.username))
            : null;
        const latestUser = byId || byUsername || null;

        if (!latestUser || latestUser.disabled === true) {
            Auth.logout();
            if (typeof App !== 'undefined' && typeof App.showLogin === 'function') {
                App.showLogin();
            }
            return;
        }

        if (typeof Auth.buildSessionUser === 'function') {
            Auth.currentUser = Auth.buildSessionUser(latestUser);
        } else {
            Auth.currentUser = { ...latestUser };
        }

        if (typeof Auth.persistSession === 'function') {
            Auth.persistSession(Auth.currentUser);
        }
    },

    logOperationalEvent(level, category, message, data = {}) {
        if (typeof Logger === 'undefined' || typeof Logger[level] !== 'function') {
            return;
        }

        Logger[level](category, message, data);
    },

    isBootstrapUserProvisioningEnabled() {
        if (typeof APP_CONFIG === 'undefined') {
            return typeof process !== 'undefined' && process?.env?.NODE_ENV === 'test';
        }

        if (typeof APP_CONFIG.isProduction === 'function' && APP_CONFIG.isProduction()) {
            return typeof window !== 'undefined' && window.__ENABLE_USER_BOOTSTRAP === true;
        }

        return true;
    },

    isCloudBootstrapSeedingEnabled() {
        if (typeof process !== 'undefined' && process?.env?.NODE_ENV === 'test') {
            return true;
        }

        if (typeof window === 'undefined') {
            return false;
        }

        return window.__ENABLE_CLOUD_BOOTSTRAP === true;
    },

    async _persistCollectionToCloud(key, data, options = {}) {
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

        if (typeof CloudStorage.waitForCloudReady === 'function') {
            const ready = await CloudStorage.waitForCloudReady(15000);
            if (!ready) {
                this.logOperationalEvent('info', 'sync', 'critical_collection_cloud_ready_pending', {
                    key
                });
            }
        }

        const activeUser = typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function'
            ? Auth.getCurrentUser()
            : null;
        if (activeUser) {
            const sessionReady = await this.ensureCloudAccessSession(activeUser, { timeoutMs: 15000, retries: 3 });
            if (!sessionReady) {
                this.logOperationalEvent('info', 'sync', 'critical_collection_access_session_pending', {
                    key,
                    username: activeUser.username || null,
                    role: activeUser.role || null
                });
            }
        }

        try {
            const saved = await CloudStorage.saveData(key, data, options);
            if (saved) {
                return true;
            }

            const activeUser = typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function'
                ? Auth.getCurrentUser()
                : null;
            if (activeUser && typeof CloudStorage.recoverAccessSession === 'function') {
                await CloudStorage.recoverAccessSession('critical_collection_retry', { key });
            }
            if (typeof CloudStorage.waitForCloudReady === 'function') {
                await CloudStorage.waitForCloudReady(12000);
            }
            return await CloudStorage.saveData(key, data, options);
        } catch (e) {
            console.warn(`Erro ao salvar ${key} na nuvem`, e);
            return false;
        }
    },

    /**
     * Schedule a full cloud sync with debounce and lock.
     * Prevents overlapping sync operations.
     */
    scheduleSync(reason = 'auto') {
        this._pendingSyncReason = reason;
        if (!this._debouncedSync && typeof Utils !== 'undefined' && typeof Utils.debounce === 'function') {
            this._debouncedSync = Utils.debounce(() => {
                const pendingReason = this._pendingSyncReason || 'auto';
                this._pendingSyncReason = 'auto';
                this.syncAll(pendingReason);
            }, 2000);
        }
        if (this._debouncedSync) {
            this._debouncedSync();
            return;
        }
        this.syncAll(reason);
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
                this._registerRealtimeSubscriptions();
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
        if (!this.cloudInitialized || typeof CloudStorage === 'undefined' || typeof CloudStorage.saveData !== 'function') {
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
        if (!this.cloudInitialized || typeof CloudStorage === 'undefined' || typeof CloudStorage.saveData !== 'function') {
            return;
        }

        if (!this.isCloudBootstrapSeedingEnabled()) {
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
                orcamentoMensalPecas: 0,
                managerNotificationEmail: '',
                operationalEmailGatewayRecipient: '',
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
        this.logOperationalEvent('debug', 'sync', 'indexeddb_restore_skipped', { mode: 'online_only' });
        return;
    },

    async applySolicitationsReset() {
        const currentVersion = this.SOLICITATIONS_RESET_VERSION;
        const currentMarker = localStorage.getItem(this.SOLICITATIONS_RESET_KEY);
        const solicitations = this.cloneSerializable(this.getSolicitations(), []) || [];
        const normalize = (value) => {
            if (typeof Utils !== 'undefined' && typeof Utils.normalizeText === 'function') {
                return Utils.normalizeText(value);
            }
            return String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .trim();
        };

        const cleanedSolicitations = solicitations.filter((solicitation) => {
            const id = String(solicitation?.id || '').toUpperCase();
            const number = String(solicitation?.numero || '').toUpperCase();
            const source = normalize(solicitation?.source || '');
            const notes = normalize(solicitation?.observacoes || solicitation?.descricao || '');

            const isTestRecord = source === 'test'
                || id.startsWith('TEST-')
                || number.startsWith('TEST-')
                || notes.includes('solicitacao de teste')
                || notes.includes('solicitação de teste');

            return !isTestRecord;
        });

        if (cleanedSolicitations.length === solicitations.length) {
            if (currentMarker !== currentVersion) {
                localStorage.setItem(this.SOLICITATIONS_RESET_KEY, currentVersion);
            }
            return false;
        }

        const saved = await this.persistCriticalCollection(this.KEYS.SOLICITATIONS, cleanedSolicitations, {
            replaceCollection: true
        });
        if (!saved) {
            return false;
        }

        localStorage.setItem(this.SOLICITATIONS_RESET_KEY, currentVersion);
        return true;
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
        if (this.isWriteBlocked()) {
            console.warn('[ONLINE-ONLY] Write blocked - no connection');
            if (typeof Utils !== 'undefined' && Utils.showToast) {
                Utils.showToast('Sem conexão: não foi possível salvar. Reconecte à internet.', 'error');
            }
            return false;
        }

        if (!this.cloudInitialized || typeof CloudStorage === 'undefined' || typeof CloudStorage.saveData !== 'function') {
            console.warn('[ONLINE-ONLY] Cloud not available for save operation');
            if (typeof Utils !== 'undefined' && Utils.showToast) {
                Utils.showToast('Serviço de dados indisponível no momento. Tente novamente em instantes.', 'error');
            }
            return false;
        }

        if (typeof this.isCloudReady === 'function' && !this.isCloudReady()) {
            console.warn('[ONLINE-ONLY] Cloud not ready for save operation');
            if (typeof Utils !== 'undefined' && Utils.showToast) {
                Utils.showToast('Sincronização indisponível no momento. Aguarde reconexão para salvar.', 'warning');
            }
            return false;
        }

        try {
            this._sessionCache[key] = data;
            this.emitDataUpdated([key], 'local');

            CloudStorage.saveData(key, data).then((saved) => {
                if (saved === true) {
                    return;
                }

                console.warn('Cloud save rejected for optimistic write:', key);
                if (typeof Utils !== 'undefined' && Utils.showToast) {
                    Utils.showToast('Alteracao registrada localmente, mas a confirmacao na nuvem falhou. Refaça a sincronizacao.', 'warning');
                }
                this.scheduleSync(`retry:${key}`);
            }).catch((e) => {
                console.warn('Cloud save failed:', e);
                if (typeof Utils !== 'undefined' && Utils.showToast) {
                    Utils.showToast('Falha ao sincronizar alteracao com a nuvem. Tente novamente.', 'warning');
                }
                this.scheduleSync(`retry:${key}`);
            });

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

        if (this.cloudInitialized && typeof CloudStorage.waitForCloudReady === 'function') {
            try {
                await CloudStorage.waitForCloudReady(12000);
            } catch (_error) {
                // handled by availability guard below
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
                this.logOperationalEvent('info', 'auth', 'users_synced_before_login', { count: cloudUsers.length });
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
        if (!this.isBootstrapUserProvisioningEnabled()) {
            return [];
        }

        const technicians = this.getDefaultTechnicians();
        const gestorPassword = this.getGestorPassword();
        const canonicalGestorUsername = 'gestor';
        const gestorPasswordHash = await Utils.hashSHA256(gestorPassword, `${Utils.PASSWORD_SALT}:${canonicalGestorUsername}`);
        const baseTimestamp = Date.now();
        const baseUsersRaw = [
            { id: 'admin', username: 'admin', password: 'admin', name: 'Administrador', role: 'administrador', email: 'admin@diversey.com', updatedAt: baseTimestamp },
            { id: 'gestor', username: 'gestor', passwordHash: gestorPasswordHash, name: 'Welington Tavares', role: 'gestor', email: 'gestor@diversey.com', updatedAt: baseTimestamp },
            { id: 'gestor_wb', username: 'welington.tavares', password: '1234', name: 'Welington Bastos Tavares', role: 'gestor', email: 'wbastostavares@solenis.com', updatedAt: baseTimestamp },
            { id: 'fornecedor_ebst',   username: 'fornecedor',        password: 'fornecedor123', name: 'Fornecedor EBST',   role: 'fornecedor', email: 'pedidos@ebstecnologica.com.br', fornecedorId: 'sup-ebst',   updatedAt: baseTimestamp },
            { id: 'fornecedor_hobart', username: 'fornecedor.hobart', password: 'hobart123',     name: 'Fornecedor Hobart', role: 'fornecedor', email: 'pedidos@hobart.com.br',          fornecedorId: 'sup-hobart', updatedAt: baseTimestamp }
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

    normalizeUsername(username) {
        return Utils.normalizeText(username || '');
    },

    normalizeEmail(email) {
        return String(email || '').trim().toLowerCase();
    },

    normalizeSupplierName(name) {
        return Utils.normalizeText(name || '');
    },

    getCanonicalSupplierProfiles() {
        return [
            {
                id: 'sup-ebst',
                tokens: ['sup-ebst', 'ebst', 'ebstecnologica', 'pedidos@ebstecnologica.com.br', '@ebstecnologica.com.br']
            },
            {
                id: 'sup-hobart',
                tokens: ['sup-hobart', 'hobart', 'pedidos@hobart.com.br', '@hobart.com.br']
            }
        ];
    },

    matchesSupplierProfileToken(candidateValue, token) {
        const normalizedCandidate = String(candidateValue || '').trim().toLowerCase();
        const normalizedToken = String(token || '').trim().toLowerCase();
        if (!normalizedCandidate || !normalizedToken) {
            return false;
        }

        const strictToken = normalizedToken.includes('@') || normalizedToken.includes('-') || normalizedToken.includes('.');
        if (strictToken) {
            return normalizedCandidate === normalizedToken;
        }

        return normalizedCandidate === normalizedToken || normalizedCandidate.includes(normalizedToken);
    },

    getCanonicalSupplierId(value = '', options = {}) {
        const suppliers = Array.isArray(options.suppliers) ? options.suppliers : this.getSuppliers();
        const requestedId = String(value || '').trim();
        const explicitSupplier = options.supplier || (requestedId
            ? suppliers.find((supplier) => String(supplier?.id || '').trim() === requestedId)
            : null);
        const supplierRecipients = (typeof Utils !== 'undefined' && typeof Utils.extractOperationalEmailRecipients === 'function')
            ? Utils.extractOperationalEmailRecipients(
                explicitSupplier?.email,
                explicitSupplier?.emails,
                explicitSupplier?.notificationEmails
            )
            : [this.normalizeEmail(explicitSupplier?.email)];
        const candidates = [
            String(value || '').trim().toLowerCase(),
            this.normalizeSupplierName(options.name || ''),
            this.normalizeSupplierName(options.username || ''),
            this.normalizeSupplierName(options.supplierName || ''),
            this.normalizeEmail(options.email || ''),
            this.normalizeSupplierName(explicitSupplier?.nome || explicitSupplier?.name || ''),
            ...supplierRecipients.map((recipient) => this.normalizeEmail(recipient))
        ].filter(Boolean);

        const matchedProfile = this.getCanonicalSupplierProfiles().find((profile) =>
            candidates.some((candidate) =>
                profile.tokens.some((token) => this.matchesSupplierProfileToken(candidate, token))
            )
        );

        return matchedProfile?.id || requestedId || null;
    },

    normalizeSupplierReference(record = {}, options = {}) {
        const canonicalSupplierId = this.getCanonicalSupplierId(record?.fornecedorId, {
            name: record?.fornecedorNome || options.name,
            supplierName: record?.fornecedorNome || options.name,
            username: options.username,
            email: record?.fornecedorEmail || options.email
        });
        const normalizedSupplierId = canonicalSupplierId || (record?.fornecedorId ? String(record.fornecedorId).trim() : null);
        const supplier = normalizedSupplierId ? this.getSupplierById(normalizedSupplierId) : null;
        const normalizedSupplierName = String(
            record?.fornecedorNome ||
            supplier?.nome ||
            supplier?.name ||
            options.name ||
            ''
        ).trim() || null;

        return {
            fornecedorId: normalizedSupplierId,
            fornecedorNome: normalizedSupplierName,
            supplier
        };
    },

    getGestorPassword() {
        const key = 'diversey_gestor_recovery_password';
        const fallback = 'gestor123';

        if (!this.isBootstrapUserProvisioningEnabled()) {
            return fallback;
        }

        try {
            const stored = localStorage.getItem(key) || sessionStorage.getItem(key);
            if (stored && stored.trim()) {
                return stored.trim();
            }
            localStorage.setItem(key, fallback);
            sessionStorage.setItem(key, fallback);
        } catch (_e) {
            // fallback direto
        }

        return fallback;
    },

    getUsers() {
        return this.loadData(this.KEYS.USERS) || [];
    },

    getUserById(id) {
        return this.getUsers().find(u => u.id === id);
    },

    getUsersByUsername(username) {
        if (!username) {
            return [];
        }

        const target = this.normalizeUsername(username);
        if (!target) {
            return [];
        }

        return this.getUsers().filter((user) => this.normalizeUsername(user?.username) === target);
    },

    selectPreferredUserRecord(users = [], referenceUsername = '') {
        if (!Array.isArray(users) || users.length === 0) {
            return undefined;
        }

        const input = String(referenceUsername || '').trim();
        const inputLower = input.toLowerCase();

        const ranked = [...users].sort((a, b) => {
            const aUsername = String(a?.username || '').trim();
            const bUsername = String(b?.username || '').trim();

            const aExact = input && aUsername === input ? 1 : 0;
            const bExact = input && bUsername === input ? 1 : 0;
            if (aExact !== bExact) {
                return bExact - aExact;
            }

            const aCaseInsensitive = input && aUsername.toLowerCase() === inputLower ? 1 : 0;
            const bCaseInsensitive = input && bUsername.toLowerCase() === inputLower ? 1 : 0;
            if (aCaseInsensitive !== bCaseInsensitive) {
                return bCaseInsensitive - aCaseInsensitive;
            }

            const aEnabled = a?.disabled === true ? 0 : 1;
            const bEnabled = b?.disabled === true ? 0 : 1;
            if (aEnabled !== bEnabled) {
                return bEnabled - aEnabled;
            }

            const aHasHash = a?.passwordHash ? 1 : 0;
            const bHasHash = b?.passwordHash ? 1 : 0;
            if (aHasHash !== bHasHash) {
                return bHasHash - aHasHash;
            }

            const aUpdatedAt = Number(a?.updatedAt) || 0;
            const bUpdatedAt = Number(b?.updatedAt) || 0;
            if (aUpdatedAt !== bUpdatedAt) {
                return bUpdatedAt - aUpdatedAt;
            }

            const aCreatedAt = Number(a?.createdAt) || 0;
            const bCreatedAt = Number(b?.createdAt) || 0;
            if (aCreatedAt !== bCreatedAt) {
                return bCreatedAt - aCreatedAt;
            }

            return String(a?.id || '').localeCompare(String(b?.id || ''));
        });

        return ranked[0];
    },

    getUserByUsername(username) {
        const matches = this.getUsersByUsername(username);
        if (matches.length === 0) {
            return undefined;
        }

        if (matches.length > 1) {
            const normalizedUsername = this.normalizeUsername(username);
            const duplicateInfo = matches.map((user) => ({
                id: user?.id || null,
                username: user?.username || null,
                role: user?.role || null,
                updatedAt: user?.updatedAt || null
            }));

            if (typeof Logger !== 'undefined' && typeof Logger.warn === 'function') {
                Logger.warn(Logger.CATEGORY.AUTH, 'duplicate_username_detected', {
                    normalizedUsername,
                    duplicateCount: matches.length,
                    duplicates: duplicateInfo
                });
            }

            console.warn('Usuários duplicados detectados para login', {
                normalizedUsername,
                duplicateCount: matches.length,
                duplicates: duplicateInfo
            });
        }

        return this.selectPreferredUserRecord(matches, username);
    },

    findUserConflicts(user, users = this.getUsers()) {
        const normalizedUsername = this.normalizeUsername(user?.username);
        const normalizedEmail = this.normalizeEmail(user?.email);
        const currentId = user?.id || null;

        let duplicateUsernameUser = null;
        let duplicateEmailUser = null;

        for (const current of users || []) {
            if (!current || current.id === currentId) {
                continue;
            }

            if (!duplicateUsernameUser && normalizedUsername && this.normalizeUsername(current.username) === normalizedUsername) {
                duplicateUsernameUser = current;
            }

            if (!duplicateEmailUser && normalizedEmail) {
                const currentEmail = this.normalizeEmail(current.email);
                if (currentEmail && currentEmail === normalizedEmail) {
                    duplicateEmailUser = current;
                }
            }

            if (duplicateUsernameUser && duplicateEmailUser) {
                break;
            }
        }

        return { duplicateUsernameUser, duplicateEmailUser };
    },

    async _persistUsersToCloud(users) {
        return this._persistCollectionToCloud(this.KEYS.USERS, users);
    },

    handlePostUserRemoval(removedUsers = []) {
        const removed = Array.isArray(removedUsers) ? removedUsers.filter(Boolean) : [];
        if (removed.length === 0) {
            return;
        }

        if (typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function') {
            const currentUser = Auth.getCurrentUser();
            if (currentUser && removed.some((item) => item?.id && item.id === currentUser.id)) {
                Auth.logout();
                if (typeof App !== 'undefined' && typeof App.showLogin === 'function') {
                    App.showLogin();
                }
            }
        }

        if (typeof Auth !== 'undefined' && typeof Auth._rateLimitCache === 'object' && Auth._rateLimitCache) {
            removed.forEach((item) => {
                const normalizedRemoved = this.normalizeUsername(item?.username);
                if (normalizedRemoved) {
                    delete Auth._rateLimitCache[normalizedRemoved];
                }
            });
        }
    },

    async deleteUserById(userId) {
        if (!userId) {
            return false;
        }
        const users = this.cloneSerializable(this.getUsers(), []) || [];
        const removedUser = users.find(u => u.id === userId) || null;
        const filtered = users.filter(u => u.id !== userId);
        if (filtered.length === users.length) {
            return false;
        }
        const saved = await this._persistUsersToCloud(filtered);
        if (saved) {
            this._sessionCache[this.KEYS.USERS] = filtered;
            this.emitDataUpdated([this.KEYS.USERS], 'local');
            this.handlePostUserRemoval([removedUser]);
        }
        return saved;
    },

    async resetUserPasswordById(userId, newPassword) {
        const password = String(newPassword || '').trim();
        if (!userId || password.length < 4) {
            return { success: false, error: 'Informe uma nova senha com pelo menos 4 caracteres.' };
        }

        const users = this.cloneSerializable(this.getUsers(), []) || [];
        const index = users.findIndex((u) => u.id === userId);
        if (index < 0) {
            return { success: false, error: 'Usuário não encontrado.' };
        }

        const targetUser = users[index] || null;
        const normalizedUsername = this.normalizeUsername(targetUser?.username || '');
        if (!normalizedUsername) {
            return { success: false, error: 'Usuário sem login válido para redefinir senha.' };
        }

        const affectedIndexes = users.reduce((acc, currentUser, currentIndex) => {
            if (!currentUser) {
                return acc;
            }
            const sameId = currentUser.id === userId;
            const sameNormalizedUsername = this.normalizeUsername(currentUser.username) === normalizedUsername;
            if (sameId || sameNormalizedUsername) {
                acc.push(currentIndex);
            }
            return acc;
        }, []);

        if (!affectedIndexes.includes(index)) {
            affectedIndexes.push(index);
        }

        const now = Date.now();
        const affectedUserIds = [];

        try {
            for (const currentIndex of affectedIndexes) {
                const currentUser = users[currentIndex];
                const saltUsername = String(currentUser?.username || '').trim();

                if (!saltUsername) {
                    continue;
                }

                const passwordHash = await Utils.hashSHA256(password, `${Utils.PASSWORD_SALT}:${saltUsername}`);
                users[currentIndex] = {
                    ...currentUser,
                    passwordHash,
                    updatedAt: now
                };
                delete users[currentIndex].password;
                affectedUserIds.push(users[currentIndex].id);
            }
        } catch (error) {
            console.error('Erro ao gerar hash da nova senha', error);
            if (typeof Logger !== 'undefined' && typeof Logger.error === 'function') {
                Logger.error(Logger.CATEGORY.AUTH, 'password_reset_hash_failed', {
                    userId,
                    normalizedUsername,
                    error: error?.message || 'hash_error'
                });
            }
            return { success: false, error: 'Não foi possível redefinir a senha com segurança.' };
        }

        if (affectedUserIds.length === 0) {
            return { success: false, error: 'Não foi possível localizar o usuário de autenticação para atualizar a senha.' };
        }

        const uniqueAffectedUserIds = Array.from(new Set(affectedUserIds.filter(Boolean)));

        const saved = await this._persistUsersToCloud(users);
        if (!saved) {
            const failure = this.buildCloudPersistenceFailure(
                'Não foi possível salvar a nova senha na nuvem. Tente novamente.',
                {
                    permissionDeniedMessage: 'A redefinição de senha foi bloqueada pelas regras de segurança do Firebase para usuários. Publique as regras atualizadas e tente novamente.'
                }
            );
            if (typeof Logger !== 'undefined' && typeof Logger.warn === 'function') {
                Logger.warn(Logger.CATEGORY.AUTH, 'password_reset_cloud_save_failed', {
                    userId,
                    normalizedUsername,
                    affectedUserIds: uniqueAffectedUserIds,
                    cloudError: failure.details || null
                });
            }
            return { success: false, error: failure.message, code: failure.code };
        }

        this._sessionCache[this.KEYS.USERS] = users;
        this.refreshAuthenticatedSession(users);
        this.emitDataUpdated([this.KEYS.USERS], 'local');

        const updatedUser = this.getUserByUsername(targetUser.username) || users[index];
        if (!updatedUser || !updatedUser.username || !updatedUser.passwordHash) {
            return {
                success: false,
                error: 'A senha foi atualizada, mas a validação final do login falhou. Refaça o reset antes de enviar o e-mail.',
                code: 'auth_validation_failed'
            };
        }

        let validationHash;
        try {
            if (typeof Auth !== 'undefined' && typeof Auth.hashPassword === 'function') {
                validationHash = await Auth.hashPassword(password, updatedUser.username);
            } else {
                validationHash = await Utils.hashSHA256(password, `${Utils.PASSWORD_SALT}:${updatedUser.username}`);
            }
        } catch (validationError) {
            if (typeof Logger !== 'undefined' && typeof Logger.error === 'function') {
                Logger.error(Logger.CATEGORY.AUTH, 'password_reset_validation_hash_failed', {
                    userId,
                    username: updatedUser.username,
                    error: validationError?.message || 'validation_hash_error'
                });
            }
            return {
                success: false,
                error: 'A senha foi salva, mas a validação final do login não pôde ser concluída. Refaça o reset antes de enviar o e-mail.',
                code: 'auth_validation_failed'
            };
        }

        if (updatedUser.passwordHash !== validationHash) {
            if (typeof Logger !== 'undefined' && typeof Logger.warn === 'function') {
                Logger.warn(Logger.CATEGORY.AUTH, 'password_reset_validation_failed', {
                    userId,
                    username: updatedUser.username,
                    normalizedUsername,
                    affectedUserIds: uniqueAffectedUserIds
                });
            }

            return {
                success: false,
                error: 'A nova senha não ficou válida para autenticação. Refaça o reset; o e-mail não deve ser enviado.',
                code: 'auth_validation_failed'
            };
        }

        if (typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function') {
            const currentUser = Auth.getCurrentUser();
            if (currentUser && uniqueAffectedUserIds.includes(currentUser.id)) {
                const refreshedCurrentUser = users.find((item) => item.id === currentUser.id) || updatedUser;
                Auth.currentUser = Auth.buildSessionUser(refreshedCurrentUser);
                if (typeof Auth.persistSession === 'function') {
                    Auth.persistSession(Auth.currentUser);
                }
            }
        }

        if (typeof Logger !== 'undefined' && typeof Logger.info === 'function') {
            Logger.info(Logger.CATEGORY.AUTH, 'password_reset_success', {
                userId,
                username: updatedUser.username,
                normalizedUsername,
                affectedUsers: uniqueAffectedUserIds.length,
                affectedUserIds: uniqueAffectedUserIds,
                validated: true
            });
        }

        return {
            success: true,
            user: updatedUser,
            affectedUsers: uniqueAffectedUserIds.length,
            affectedUserIds: uniqueAffectedUserIds,
            normalizedUsername,
            validated: true
        };
    },

    /**
     * Create or update user (used for adding gestores)
     */
    async migrateUserPasswords() {
        const users = this.cloneSerializable(this.getUsers(), []) || [];
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
            const saved = await this._persistUsersToCloud(users);
            if (saved) {
                this._sessionCache[this.KEYS.USERS] = users;
                this.refreshAuthenticatedSession(users);
                this.emitDataUpdated([this.KEYS.USERS], 'local');
            } else {
                this.logOperationalEvent('warn', 'auth', 'password_migration_cloud_save_failed');
            }
        }
    },

    async saveUser(user) {
        if (!user || !user.username) {
            return { success: false, error: 'Usuário inválido' };
        }

        const users = this.cloneSerializable(this.getUsers(), []) || [];
        const candidate = {
            ...user,
            username: String(user.username || '').trim(),
            email: this.normalizeEmail(user.email)
        };

        if (!candidate.username) {
            return { success: false, error: 'Usuário inválido' };
        }

        const { duplicateUsernameUser, duplicateEmailUser } = this.findUserConflicts(candidate, users);
        if (duplicateUsernameUser) {
            return { success: false, errorCode: 'duplicate_username', error: 'Nome de usuário já cadastrado' };
        }
        if (duplicateEmailUser) {
            return { success: false, errorCode: 'duplicate_email', error: 'E-mail já cadastrado' };
        }

        const normalizedUser = {
            id: candidate.id || Utils.generateId(),
            username: candidate.username,
            name: candidate.name || candidate.username,
            role: candidate.role || 'gestor',
            email: candidate.email || '',
            tecnicoId: candidate.tecnicoId || null,
            fornecedorId: candidate.fornecedorId || null,
            disabled: candidate.disabled === true ? true : (candidate.disabled === false ? false : undefined),
            // Add timestamp for merge conflict resolution
            updatedAt: Date.now()
        };

        const index = users.findIndex(u => u.id === normalizedUser.id);

        if (!Object.prototype.hasOwnProperty.call(candidate, 'tecnicoId') && index >= 0) {
            normalizedUser.tecnicoId = users[index].tecnicoId || null;
        }
        if (!Object.prototype.hasOwnProperty.call(candidate, 'fornecedorId') && index >= 0) {
            normalizedUser.fornecedorId = users[index].fornecedorId || null;
        }

        try {
            if (candidate.passwordHash) {
                normalizedUser.passwordHash = candidate.passwordHash;
            } else if (candidate.password) {
                normalizedUser.passwordHash = await Utils.hashSHA256(candidate.password, `${Utils.PASSWORD_SALT}:${normalizedUser.username}`);
            } else if (index >= 0) {
                normalizedUser.passwordHash = users[index].passwordHash;
            }
        } catch (e) {
            console.error('Erro ao gerar hash de senha', e);
            return { success: false, error: 'Não foi possível salvar a senha com segurança' };
        }

        if (!normalizedUser.passwordHash) {
            return { success: false, error: 'Senha é obrigatória' };
        }

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
            return { success: false, error: 'Não foi possível salvar o usuário na nuvem. Tente novamente.' };
        }

        this._sessionCache[this.KEYS.USERS] = users;
        this.refreshAuthenticatedSession(users);
        this.emitDataUpdated([this.KEYS.USERS], 'local');
        return { success: true, user: normalizedUser };
    },

    getGestorUsers() {
        return this.getUsers().filter(u => u.role === 'gestor');
    },

    getFornecedorUsers() {
        return this.getUsers().filter(u => u.role === 'fornecedor');
    },

    /**
     * Guarantee a gestor account exists with a known credential for recovery.
     * If missing or without password hash, recreate with the fallback password.
     */
    async ensureDefaultGestor() {
        if (!this.isBootstrapUserProvisioningEnabled()) {
            return;
        }

        const users = this.cloneSerializable(this.getUsers(), []) || [];
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
        const passwordHash = await Utils.hashSHA256(fallbackPassword, `${Utils.PASSWORD_SALT}:${canonicalUsername}`);

        if (!gestorUser) {
            gestorUser = { ...fallback, passwordHash };
            users.push(gestorUser);
            updated = true;
        } else if (!gestorUser.passwordHash) {
            gestorUser.passwordHash = passwordHash;
            updated = true;
        }

        if (gestorUser.role !== 'gestor') {
            gestorUser.role = 'gestor';
            updated = true;
        }
        // Guarantee explicit gestor account requested for operational access.
        const requestedGestor = {
            id: 'gestor_wb',
            username: 'welington.tavares',
            name: 'Welington Bastos Tavares',
            role: 'gestor',
            email: 'wbastostavares@solenis.com',
            disabled: false
        };
        const requestedUsername = normalize(requestedGestor.username);
        const requestedEmail = this.normalizeEmail(requestedGestor.email);
        const requestedPasswordHash = await Utils.hashSHA256('1234', `${Utils.PASSWORD_SALT}:${requestedGestor.username}`);

        const requestedIndex = users.findIndex((u) =>
            u?.id === requestedGestor.id ||
            normalize(u?.username) === requestedUsername ||
            this.normalizeEmail(u?.email) === requestedEmail
        );

        if (requestedIndex < 0) {
            users.push({
                ...requestedGestor,
                passwordHash: requestedPasswordHash,
                updatedAt: Date.now()
            });
            updated = true;
        } else {
            const current = users[requestedIndex] || {};
            const merged = {
                ...current,
                ...requestedGestor,
                passwordHash: current.passwordHash || requestedPasswordHash,
                updatedAt: current.updatedAt || Date.now()
            };
            delete merged.password;

            const changed = (
                current.username !== merged.username ||
                current.name !== merged.name ||
                current.role !== merged.role ||
                this.normalizeEmail(current.email) !== this.normalizeEmail(merged.email) ||
                current.disabled !== merged.disabled ||
                !current.passwordHash
            );

            if (changed) {
                merged.updatedAt = Date.now();
                users[requestedIndex] = merged;
                updated = true;
            }
        }

        // Remove duplicated gestor entries that collide with the requested username/email.
        const primaryRequestedIndex = users.findIndex((item) =>
            item?.id === requestedGestor.id ||
            normalize(item?.username) === requestedUsername ||
            this.normalizeEmail(item?.email) === requestedEmail
        );
        const dedupedUsers = users.filter((u, index) => {
            const sameRequested =
                normalize(u?.username) === requestedUsername ||
                this.normalizeEmail(u?.email) === requestedEmail;
            if (!sameRequested) {
                return true;
            }
            return index === primaryRequestedIndex;
        });
        if (dedupedUsers.length !== users.length) {
            users.length = 0;
            users.push(...dedupedUsers);
            updated = true;
        }

        if (updated) {
            const saved = await this._persistUsersToCloud(users);
            if (saved) {
                this._sessionCache[this.KEYS.USERS] = users;
                this.refreshAuthenticatedSession(users);
                this.emitDataUpdated([this.KEYS.USERS], 'local');
            } else {
                this.logOperationalEvent('warn', 'auth', 'default_gestor_cloud_save_failed');
            }
        }
    },

    // ===== TECHNICIANS =====
    async ensureRecoveryUsers() {
        if (!this.isBootstrapUserProvisioningEnabled()) {
            return;
        }

        const users = this.cloneSerializable(this.getUsers(), []) || [];
        const technicians = this.getTechnicians();
        const now = Date.now();
        let updated = false;

        const upsertRecovery = async ({ id, username, password, name, role, email, tecnicoId = null }) => {
            const normalized = this.normalizeUsername(username);
            const hash = await Utils.hashSHA256(password, `${Utils.PASSWORD_SALT}:${username}`);
            const current = users.find(u => this.normalizeUsername(u.username) === normalized);

            if (!current) {
                users.push({
                    id,
                    username,
                    name,
                    role,
                    email,
                    tecnicoId,
                    disabled: false,
                    passwordHash: hash,
                    updatedAt: now
                });
                updated = true;
                return;
            }

            let changed = false;

            if (!current.id) {
                current.id = id;
                changed = true;
            }
            if (!current.username) {
                current.username = username;
                changed = true;
            }
            if (!current.name) {
                current.name = name;
                changed = true;
            }
            if (!current.role) {
                current.role = role;
                changed = true;
            }
            if (!current.email) {
                current.email = email;
                changed = true;
            }
            if (tecnicoId && !current.tecnicoId) {
                current.tecnicoId = tecnicoId;
                changed = true;
            }
            if (!current.passwordHash) {
                current.passwordHash = hash;
                changed = true;
            }
            if (typeof current.disabled !== 'boolean') {
                current.disabled = false;
                changed = true;
            }

            if (changed) {
                current.updatedAt = now;
                delete current.password;
                updated = true;
            }
        };

        const firstTechnician = technicians.find(t => t.ativo !== false) || technicians[0] || null;

        await upsertRecovery({
            id: 'admin',
            username: 'admin',
            password: 'admin',
            name: 'Administrador',
            role: 'administrador',
            email: 'admin@diversey.com'
        });

        await upsertRecovery({
            id: 'gestor',
            username: 'gestor',
            password: 'gestor123',
            name: 'Gestor',
            role: 'gestor',
            email: 'gestor@diversey.com'
        });

        await upsertRecovery({
            id: 'tecnico_recovery',
            username: 'tecnico',
            password: 'tecnico123',
            name: firstTechnician?.nome || 'Técnico',
            role: 'tecnico',
            email: firstTechnician?.email || 'tecnico@diversey.com',
            tecnicoId: firstTechnician?.id || null
        });

        if (updated) {
            const saved = await this._persistUsersToCloud(users);
            if (saved) {
                this._sessionCache[this.KEYS.USERS] = users;
                this.refreshAuthenticatedSession(users);
                this.emitDataUpdated([this.KEYS.USERS], 'local');
            } else {
                this.logOperationalEvent('warn', 'auth', 'recovery_users_cloud_save_failed');
            }
        }
    },

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

    async saveTechnicianAndUser(technician, userPayload = {}) {
        if (!technician || !technician.nome) {
            return { success: false, error: 'Dados do técnico inválidos.' };
        }

        const technicians = this.getTechnicians();
        const users = this.getUsers();
        const technicianId = technician.id || Utils.generateId();
        const normalizedTechnician = { ...technician, id: technicianId };
        const normalizedUsername = String(userPayload.username || normalizedTechnician.username || '').trim();
        const normalizedEmail = this.normalizeEmail(userPayload.email || normalizedTechnician.email || '');

        if (!normalizedUsername) {
            return { success: false, error: 'Informe um usuário para o técnico.' };
        }

        const technicianIndex = technicians.findIndex(t => t.id === technicianId);
        const nextTechnicians = technicianIndex >= 0
            ? technicians.map((t, idx) => (idx === technicianIndex ? { ...t, ...normalizedTechnician } : t))
            : [...technicians, normalizedTechnician];

        const userId = userPayload.id || `user_${technicianId}`;
        const candidateUser = {
            ...userPayload,
            id: userId,
            username: normalizedUsername,
            name: userPayload.name || normalizedTechnician.nome || normalizedUsername,
            role: 'tecnico',
            email: normalizedEmail,
            tecnicoId: technicianId,
            fornecedorId: null,
            disabled: normalizedTechnician.ativo === false,
            updatedAt: Date.now()
        };

        if (!candidateUser.passwordHash && candidateUser.password) {
            candidateUser.passwordHash = await Utils.hashSHA256(candidateUser.password, `${Utils.PASSWORD_SALT}:${candidateUser.username}`);
        }
        delete candidateUser.password;

        if (!candidateUser.passwordHash) {
            return { success: false, error: 'Senha do técnico inválida ou ausente.' };
        }

        const conflicts = this.findUserConflicts(candidateUser, users);
        if (conflicts.duplicateUsernameUser) {
            return { success: false, errorCode: 'duplicate_username', error: 'Nome de usuário já cadastrado' };
        }
        if (conflicts.duplicateEmailUser) {
            return { success: false, errorCode: 'duplicate_email', error: 'E-mail já cadastrado' };
        }

        const linkedUserIndex = users.findIndex(u =>
            u.id === candidateUser.id ||
            u.tecnicoId === technicianId ||
            (u.role === 'tecnico' && this.normalizeUsername(u.username) === this.normalizeUsername(candidateUser.username))
        );

        const nextUsers = linkedUserIndex >= 0
            ? users.map((u, idx) => (idx === linkedUserIndex ? { ...u, ...candidateUser } : u))
            : [...users, candidateUser];

        const savedTechnicians = await this._persistCollectionToCloud(this.KEYS.TECHNICIANS, nextTechnicians);
        if (!savedTechnicians) {
            return { success: false, error: 'Não foi possível salvar os dados do técnico na nuvem.' };
        }

        const savedUsers = await this._persistUsersToCloud(nextUsers);
        if (!savedUsers) {
            await this._persistCollectionToCloud(this.KEYS.TECHNICIANS, technicians);
            return { success: false, error: 'Não foi possível salvar o acesso do técnico. Alteração revertida.' };
        }

        this._sessionCache[this.KEYS.TECHNICIANS] = nextTechnicians;
        this._sessionCache[this.KEYS.USERS] = nextUsers;
        this.refreshAuthenticatedSession(nextUsers);
        this.emitDataUpdated([this.KEYS.TECHNICIANS, this.KEYS.USERS], 'local');

        return { success: true, technician: normalizedTechnician, user: candidateUser };
    },

    async deleteTechnicianAndUser(technicianId) {
        if (!technicianId) {
            return { success: false, error: 'Técnico inválido.' };
        }

        const technicians = this.getTechnicians();
        const target = technicians.find(t => t.id === technicianId);
        if (!target) {
            return { success: false, error: 'Técnico não encontrado.' };
        }

        const nextTechnicians = technicians.filter(t => t.id !== technicianId);
        const users = this.getUsers();
        const normalizedUsername = this.normalizeUsername(target.username);
        const nextUsers = users.filter(u =>
            u.tecnicoId !== technicianId &&
            !(u.role === 'tecnico' && this.normalizeUsername(u.username) === normalizedUsername)
        );
        const removedUsers = users.filter(u => !nextUsers.includes(u));

        const savedTechnicians = await this._persistCollectionToCloud(this.KEYS.TECHNICIANS, nextTechnicians);
        if (!savedTechnicians) {
            return { success: false, error: 'Não foi possível remover o técnico da base.' };
        }

        const savedUsers = await this._persistUsersToCloud(nextUsers);
        if (!savedUsers) {
            await this._persistCollectionToCloud(this.KEYS.TECHNICIANS, technicians);
            return { success: false, error: 'Não foi possível remover o usuário de autenticação. Alteração revertida.' };
        }

        this._sessionCache[this.KEYS.TECHNICIANS] = nextTechnicians;
        this._sessionCache[this.KEYS.USERS] = nextUsers;
        this.emitDataUpdated([this.KEYS.TECHNICIANS, this.KEYS.USERS], 'local');
        this.handlePostUserRemoval(removedUsers);
        return { success: true };
    },

    // ===== SUPPLIERS =====
    getDefaultSuppliers() {
        return [
            { id: 'sup-ebst',   nome: 'EBST',   email: 'pedidos@ebstecnologica.com.br', telefone: '', cnpj: '03.424.364/0001-97', ativo: true },
            { id: 'sup-hobart', nome: 'Hobart', email: 'pedidos@hobart.com.br',          telefone: '', cnpj: '',                    ativo: true }
        ];
    },

    getSuppliers() {
        return this.loadData(this.KEYS.SUPPLIERS) || [];
    },

    getSupplierById(id) {
        const suppliers = this.getSuppliers();
        const requestedId = String(id || '').trim();
        if (!requestedId) {
            return null;
        }

        const canonicalSupplierId = this.getCanonicalSupplierId(requestedId, { suppliers });
        const exactCanonicalMatch = canonicalSupplierId
            ? suppliers.find((supplier) => String(supplier?.id || '').trim() === canonicalSupplierId)
            : null;
        if (exactCanonicalMatch) {
            return exactCanonicalMatch;
        }

        const exactMatch = suppliers.find((supplier) => String(supplier?.id || '').trim() === requestedId);
        if (exactMatch && (!canonicalSupplierId || canonicalSupplierId === requestedId)) {
            return exactMatch;
        }

        if (!canonicalSupplierId) {
            return exactMatch || null;
        }

        return suppliers.find((supplier) =>
            this.getCanonicalSupplierId(supplier?.id, { suppliers, supplier }) === canonicalSupplierId
        ) || exactMatch || null;
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

    async saveSupplierAndUser(supplier, userPayload = {}) {
        if (!supplier || !supplier.nome) {
            return { success: false, error: 'Dados do fornecedor inválidos.' };
        }

        const suppliers = this.getSuppliers();
        const users = this.getUsers();
        const supplierId = supplier.id || Utils.generateId();
        const normalizedSupplier = { ...supplier, id: supplierId };
        const normalizedUsername = String(userPayload.username || normalizedSupplier.username || '').trim();
        const normalizedEmail = this.normalizeEmail(userPayload.email || normalizedSupplier.email || '');

        if (!normalizedUsername) {
            return { success: false, error: 'Informe um usuário para o fornecedor.' };
        }

        const supplierIndex = suppliers.findIndex(s => s.id === supplierId);
        const nextSuppliers = supplierIndex >= 0
            ? suppliers.map((s, idx) => (idx === supplierIndex ? { ...s, ...normalizedSupplier } : s))
            : [...suppliers, normalizedSupplier];

        const userId = userPayload.id || `fornecedor_${supplierId}`;
        const candidateUser = {
            ...userPayload,
            id: userId,
            username: normalizedUsername,
            name: userPayload.name || normalizedSupplier.nome || normalizedUsername,
            role: 'fornecedor',
            email: normalizedEmail,
            fornecedorId: supplierId,
            tecnicoId: null,
            disabled: normalizedSupplier.ativo === false,
            updatedAt: Date.now()
        };

        if (!candidateUser.passwordHash && candidateUser.password) {
            candidateUser.passwordHash = await Utils.hashSHA256(candidateUser.password, `${Utils.PASSWORD_SALT}:${candidateUser.username}`);
        }
        delete candidateUser.password;

        if (!candidateUser.passwordHash) {
            return { success: false, error: 'Senha do fornecedor inválida ou ausente.' };
        }

        const conflicts = this.findUserConflicts(candidateUser, users);
        if (conflicts.duplicateUsernameUser) {
            return { success: false, errorCode: 'duplicate_username', error: 'Nome de usuário já cadastrado' };
        }
        if (conflicts.duplicateEmailUser) {
            return { success: false, errorCode: 'duplicate_email', error: 'E-mail já cadastrado' };
        }

        const linkedUserIndex = users.findIndex(u =>
            u.id === candidateUser.id ||
            u.fornecedorId === supplierId ||
            (u.role === 'fornecedor' && this.normalizeUsername(u.username) === this.normalizeUsername(candidateUser.username))
        );

        const nextUsers = linkedUserIndex >= 0
            ? users.map((u, idx) => (idx === linkedUserIndex ? { ...u, ...candidateUser } : u))
            : [...users, candidateUser];

        const savedSuppliers = await this._persistCollectionToCloud(this.KEYS.SUPPLIERS, nextSuppliers);
        if (!savedSuppliers) {
            return { success: false, error: 'Não foi possível salvar os dados do fornecedor na nuvem.' };
        }

        const savedUsers = await this._persistUsersToCloud(nextUsers);
        if (!savedUsers) {
            await this._persistCollectionToCloud(this.KEYS.SUPPLIERS, suppliers);
            return { success: false, error: 'Não foi possível salvar o acesso do fornecedor. Alteração revertida.' };
        }

        this._sessionCache[this.KEYS.SUPPLIERS] = nextSuppliers;
        this._sessionCache[this.KEYS.USERS] = nextUsers;
        this.refreshAuthenticatedSession(nextUsers);
        this.emitDataUpdated([this.KEYS.SUPPLIERS, this.KEYS.USERS], 'local');

        return { success: true, supplier: normalizedSupplier, user: candidateUser };
    },

    async deleteSupplierAndUser(supplierId) {
        if (!supplierId) {
            return { success: false, error: 'Fornecedor inválido.' };
        }

        const suppliers = this.getSuppliers();
        const target = suppliers.find(s => s.id === supplierId);
        if (!target) {
            return { success: false, error: 'Fornecedor não encontrado.' };
        }

        const nextSuppliers = suppliers.filter(s => s.id !== supplierId);
        const users = this.getUsers();
        const normalizedUsername = this.normalizeUsername(target.username || '');
        const normalizedEmail = this.normalizeEmail(target.email || '');
        const nextUsers = users.filter((u) => {
            if (u.fornecedorId === supplierId) {
                return false;
            }
            if (u.role !== 'fornecedor') {
                return true;
            }
            const sameUsername = normalizedUsername && this.normalizeUsername(u.username) === normalizedUsername;
            const sameEmail = normalizedEmail && this.normalizeEmail(u.email) === normalizedEmail;
            return !(sameUsername || sameEmail);
        });
        const removedUsers = users.filter(u => !nextUsers.includes(u));

        const savedSuppliers = await this._persistCollectionToCloud(this.KEYS.SUPPLIERS, nextSuppliers);
        if (!savedSuppliers) {
            return { success: false, error: 'Não foi possível remover o fornecedor da base.' };
        }

        const savedUsers = await this._persistUsersToCloud(nextUsers);
        if (!savedUsers) {
            await this._persistCollectionToCloud(this.KEYS.SUPPLIERS, suppliers);
            return { success: false, error: 'Não foi possível remover o usuário de autenticação do fornecedor. Alteração revertida.' };
        }

        this._sessionCache[this.KEYS.SUPPLIERS] = nextSuppliers;
        this._sessionCache[this.KEYS.USERS] = nextUsers;
        this.emitDataUpdated([this.KEYS.SUPPLIERS, this.KEYS.USERS], 'local');
        this.handlePostUserRemoval(removedUsers);
        return { success: true };
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
                `Error reviewing official parts catalog (version ${storedVersion || 'unknown'} -> ${this.PARTS_VERSION}): ${errorMessage}`,
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
            fornecedorId: item.fornecedorId || 'sup-ebst',
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
    searchParts(query, page = 1, limit = 30, fornecedorId = null) {
        let parts = this.getParts().filter(p => p.ativo !== false);
        if (fornecedorId) {
            parts = parts.filter(p => (p.fornecedorId || 'sup-ebst') === fornecedorId);
        }
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

    async savePart(part) {
        const parts = this.cloneSerializable(this.getParts(), []) || [];
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
        
        const saved = await this._persistCollectionToCloud(this.KEYS.PARTS, parts);
        if (!saved) {
            return { success: false, error: 'Não foi possível salvar a peça na nuvem. Tente novamente.' };
        }

        this._sessionCache[this.KEYS.PARTS] = parts;
        this.emitDataUpdated([this.KEYS.PARTS], 'local');
        return { success: true, part };
    },

    async deletePart(id) {
        const parts = (this.cloneSerializable(this.getParts(), []) || []).filter(p => p.id !== id);
        const saved = await this._persistCollectionToCloud(this.KEYS.PARTS, parts);
        if (saved) {
            this._sessionCache[this.KEYS.PARTS] = parts;
            this.emitDataUpdated([this.KEYS.PARTS], 'local');
        }
        return saved;
    },

    async importParts(data) {
        const parts = this.cloneSerializable(this.getParts(), []) || [];
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
                
                const rawFornecedor = row.fornecedorId || row.FornecedorId || row.fornecedor_id || row.Fornecedor || '';
                const fornecedorId = ['sup-ebst', 'sup-hobart'].includes(String(rawFornecedor).trim().toLowerCase())
                    ? String(rawFornecedor).trim().toLowerCase()
                    : (String(rawFornecedor).trim().toLowerCase().includes('hobart') ? 'sup-hobart' : 'sup-ebst');

                const part = {
                    id: existing?.id || Utils.generateId(),
                    codigo: String(codigo).trim(),
                    descricao: String(descricao).trim(),
                    categoria: row.categoria || row.Categoria || 'Geral',
                    valor: parseFloat(row.valor || row.Valor || 0),
                    unidade: row.unidade || row.Unidade || 'UN',
                    fornecedorId: fornecedorId,
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
        
        const saved = await this.persistCriticalCollection(this.KEYS.PARTS, parts);
        if (!saved) {
            return {
                success: false,
                imported: 0,
                updated: 0,
                errors: [...errors, 'Falha ao persistir a importação na nuvem. Nenhuma alteração foi confirmada.']
            };
        }

        return { success: true, imported, updated, errors };
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

        this._sessionCache[this.KEYS.RECENT_PARTS] = recent;
        this.emitDataUpdated([this.KEYS.RECENT_PARTS], 'local');

        if (this.cloudInitialized &&
            typeof CloudStorage !== 'undefined' &&
            typeof CloudStorage.saveRecentPartsForTechnician === 'function') {
            CloudStorage.saveRecentPartsForTechnician(tecnicoId, recent[tecnicoId], {
                timeoutMs: 15000
            }).then((saved) => {
                if (!saved) {
                    this.logOperationalEvent('warn', 'sync', 'recent_parts_cloud_save_failed', {
                        tecnicoId,
                        partCode
                    });
                }
            }).catch((error) => {
                this.logOperationalEvent('warn', 'sync', 'recent_parts_cloud_save_exception', {
                    tecnicoId,
                    partCode,
                    error: error?.message || 'recent_parts_cloud_save_exception'
                });
            });
        }
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
            this.normalizeWorkflowStatus(s.status) === this.STATUS.PENDENTE &&
            s.historicoManual !== true
        );
    },

    async saveSolicitation(solicitation) {
        const normalizedSolicitation = this.normalizeHistoricalStatus(this.cloneSerializable(solicitation, { ...solicitation }) || {});
        normalizedSolicitation.status = this.normalizeWorkflowStatus(normalizedSolicitation.status || this.STATUS.PENDENTE);
        const normalizedSupplier = this.normalizeSupplierReference(normalizedSolicitation, {
            name: normalizedSolicitation.fornecedorNome,
            email: normalizedSolicitation.fornecedorEmail
        });
        normalizedSolicitation.fornecedorId = normalizedSupplier.fornecedorId;
        if (normalizedSupplier.fornecedorNome) {
            normalizedSolicitation.fornecedorNome = normalizedSupplier.fornecedorNome;
        }

        const solicitations = this.cloneSerializable(this.getSolicitations(), []) || [];
        const index = solicitations.findIndex(s => s.id === normalizedSolicitation.id);
        let persistedSolicitation;
        const now = Date.now();

        if (index >= 0) {
            const existing = solicitations[index];
            const existingVersion = Number(existing.audit?.version) || 0;
            const incomingVersion = normalizedSolicitation.audit?.version;
            const existingStatus = this.normalizeWorkflowStatus(existing.status || this.STATUS.PENDENTE);

            if (incomingVersion !== undefined && Number(incomingVersion) !== existingVersion) {
                console.warn(`Conflito de versão: esperado ${existingVersion}, recebido ${incomingVersion}`);
                return { success: false, error: 'conflict', message: 'Versão desatualizada. Recarregue os dados.' };
            }

            if (!this.isValidWorkflowTransition(existingStatus, normalizedSolicitation.status)) {
                console.warn(`Transição de status inválida ao salvar solicitação: ${existingStatus} -> ${normalizedSolicitation.status}`);
                return { success: false, error: 'invalid_transition', message: 'Fluxo de status inválido.' };
            }

            normalizedSolicitation.createdAt = existing.createdAt || normalizedSolicitation.createdAt || now;
            normalizedSolicitation.createdBy = existing.createdBy || normalizedSolicitation.createdBy || normalizedSolicitation.updatedBy || 'Sistema';
            normalizedSolicitation.timeline = Array.isArray(normalizedSolicitation.timeline)
                ? normalizedSolicitation.timeline
                : (this.cloneSerializable(existing.timeline, []) || []);
            normalizedSolicitation.approvals = Array.isArray(normalizedSolicitation.approvals)
                ? normalizedSolicitation.approvals
                : (this.cloneSerializable(existing.approvals, []) || []);
            normalizedSolicitation.statusHistory = Array.isArray(normalizedSolicitation.statusHistory)
                ? normalizedSolicitation.statusHistory
                : (this.cloneSerializable(existing.statusHistory, []) || []);
            normalizedSolicitation.audit = {
                ...(existing.audit || {}),
                ...(normalizedSolicitation.audit || {}),
                version: existingVersion + 1,
                createdAt: existing.audit?.createdAt || existing.createdAt || now,
                createdBy: existing.audit?.createdBy || existing.createdBy || normalizedSolicitation.createdBy || 'Sistema',
                lastUpdatedAt: now,
                lastUpdatedBy: normalizedSolicitation.updatedBy || normalizedSolicitation.createdBy || 'Sistema'
            };
            normalizedSolicitation.updatedAt = now;

            solicitations[index] = normalizedSolicitation;
            persistedSolicitation = solicitations[index];
        } else {
            normalizedSolicitation.id = Utils.generateId();
            normalizedSolicitation.numero = Utils.generateNumber(
                solicitations.map(s => s.numero),
                normalizedSolicitation.data
            );
            normalizedSolicitation.createdAt = now;
            normalizedSolicitation.updatedAt = now;
            normalizedSolicitation.createdBy = normalizedSolicitation.createdBy || normalizedSolicitation.updatedBy || 'Sistema';

            normalizedSolicitation.audit = {
                version: 1,
                createdAt: now,
                createdBy: normalizedSolicitation.createdBy,
                lastUpdatedAt: now,
                lastUpdatedBy: normalizedSolicitation.updatedBy || normalizedSolicitation.createdBy || 'Sistema'
            };

            if (!Array.isArray(normalizedSolicitation.timeline)) {
                normalizedSolicitation.timeline = [];
            }
            normalizedSolicitation.timeline.push({
                event: 'created',
                at: now,
                by: normalizedSolicitation.createdBy || 'Sistema'
            });

            if (!Array.isArray(normalizedSolicitation.approvals)) {
                normalizedSolicitation.approvals = [];
            }

            solicitations.push(normalizedSolicitation);
            persistedSolicitation = normalizedSolicitation;
        }

        const saved = await this.persistCriticalCollection(this.KEYS.SOLICITATIONS, solicitations, {
            changedIds: persistedSolicitation?.id ? [persistedSolicitation.id] : []
        });
        if (!saved) {
            return { success: false, error: 'cloud_save_failed', message: 'Não foi possível persistir a solicitação na nuvem.' };
        }

        if (persistedSolicitation) {
            this.queueOneDriveBackup(persistedSolicitation);
            this.createSolicitationsBackup({ download: false, reason: index >= 0 ? 'auto-update' : 'auto-create', silent: true });
        }

        return { success: true, solicitation: this.cloneSerializable(persistedSolicitation, persistedSolicitation) };
    },
    
    async updateSolicitationStatus(id, status, extra = {}) {
        const solicitations = this.cloneSerializable(this.getSolicitations(), []) || [];
        const index = solicitations.findIndex(s => s.id === id);

        if (index < 0) {
            return { success: false, error: 'not_found', message: 'Solicitação não encontrada.' };
        }

        const solicitation = solicitations[index];
        const previousStatus = this.normalizeWorkflowStatus(solicitation.status || this.STATUS.PENDENTE);
        const nextStatus = this.normalizeWorkflowStatus(status);
        const payload = { ...extra };
        const now = Date.now();
        const normalizedExistingSupplier = this.normalizeSupplierReference(solicitation, {
            name: solicitation.fornecedorNome,
            email: solicitation.fornecedorEmail
        });
        if (normalizedExistingSupplier.fornecedorId) {
            solicitation.fornecedorId = normalizedExistingSupplier.fornecedorId;
        }
        if (normalizedExistingSupplier.fornecedorNome) {
            solicitation.fornecedorNome = normalizedExistingSupplier.fornecedorNome;
        }
        if (Object.prototype.hasOwnProperty.call(payload, 'fornecedorId') || Object.prototype.hasOwnProperty.call(payload, 'fornecedorNome')) {
            const normalizedPayloadSupplier = this.normalizeSupplierReference({
                fornecedorId: Object.prototype.hasOwnProperty.call(payload, 'fornecedorId') ? payload.fornecedorId : solicitation.fornecedorId,
                fornecedorNome: Object.prototype.hasOwnProperty.call(payload, 'fornecedorNome') ? payload.fornecedorNome : solicitation.fornecedorNome,
                fornecedorEmail: payload.fornecedorEmail || solicitation.fornecedorEmail
            }, {
                name: solicitation.fornecedorNome,
                email: solicitation.fornecedorEmail
            });
            payload.fornecedorId = normalizedPayloadSupplier.fornecedorId;
            if (normalizedPayloadSupplier.fornecedorNome) {
                payload.fornecedorNome = normalizedPayloadSupplier.fornecedorNome;
            }
        }
        const actorSnapshot = {
            id: String(payload.byUserId || '').trim() || null,
            username: String(payload.byUsername || '').trim() || null,
            name: String(payload.by || '').trim() || 'Sistema',
            email: this.normalizeEmail(payload.byEmail || ''),
            role: String(payload.byRole || '').trim().toLowerCase() || null
        };

        if (previousStatus === nextStatus) {
            if (nextStatus === this.STATUS.EM_TRANSITO) {
                const incomingTrackingCode = String(payload.trackingCode || '').trim();
                const currentTrackingCode = String(solicitation.trackingCode || '').trim();

                if (incomingTrackingCode && incomingTrackingCode !== currentTrackingCode) {
                    const currentVersion = Number(solicitation.audit?.version) || 0;
                    solicitation.audit = {
                        ...(solicitation.audit || {}),
                        version: currentVersion + 1,
                        lastUpdatedAt: now,
                        lastUpdatedBy: payload.by || 'Sistema'
                    };

                    if (!Array.isArray(solicitation.timeline)) {
                        solicitation.timeline = [];
                    }
                    solicitation.timeline.push({
                        event: 'tracking_updated',
                        at: now,
                        by: payload.by || 'Sistema',
                        comment: incomingTrackingCode
                    });

                    payload.trackingCode = incomingTrackingCode;
                    payload.trackingUpdatedAt = payload.trackingUpdatedAt || now;
                    solicitation.trackingUpdatedByUserId = actorSnapshot.id;
                    solicitation.trackingUpdatedByUsername = actorSnapshot.username;
                    solicitation.trackingUpdatedByEmail = actorSnapshot.email || null;
                    solicitation.trackingUpdatedByRole = actorSnapshot.role;
                    delete payload.status;
                    delete payload.byUserId;
                    delete payload.byUsername;
                    delete payload.byEmail;
                    delete payload.byRole;

                    Object.assign(solicitation, payload);
                    solicitation.updatedAt = now;

                    const savedTrackingUpdate = await this.persistCriticalCollection(this.KEYS.SOLICITATIONS, solicitations, {
                        changedIds: solicitation?.id ? [solicitation.id] : []
                    });
                    if (!savedTrackingUpdate) {
                        return { success: false, error: 'cloud_save_failed', message: 'Não foi possível atualizar o rastreio na nuvem.' };
                    }

                    this.queueOneDriveBackup(solicitation);
                    this.createSolicitationsBackup({ download: false, reason: 'auto-tracking-update', silent: true });
                    return { success: true, solicitation: this.cloneSerializable(solicitation, solicitation) };
                }
            }

            console.warn(`Atualização de status ignorada (status já aplicado): ${previousStatus}`);
            return { success: false, error: 'already_applied', message: 'O status informado já está aplicado.' };
        }

        if (!this.isValidWorkflowTransition(previousStatus, nextStatus)) {
            console.warn(`Transição de status inválida: ${previousStatus} -> ${nextStatus}`);
            return { success: false, error: 'invalid_transition', message: 'Transição de status inválida.' };
        }

        if (nextStatus === this.STATUS.EM_TRANSITO) {
            const trackingCode = String(payload.trackingCode || solicitation.trackingCode || '').trim();
            if (!trackingCode) {
                console.warn('Transição para "Em trânsito" bloqueada: rastreio ausente.');
                return { success: false, error: 'missing_tracking_code', message: 'Informe um código de rastreio válido.' };
            }
            payload.trackingCode = trackingCode;
            payload.trackingUpdatedAt = payload.trackingUpdatedAt || now;
        }

        if (nextStatus === this.STATUS.FINALIZADA) {
            payload.deliveredAt = payload.deliveredAt || now;
            payload.finalizedAt = payload.finalizedAt || now;
        }

        if (nextStatus === this.STATUS.APROVADA) {
            payload.approvedAt = Number(payload.approvedAt) || now;
            payload.approvedBy = payload.approvedBy || payload.by || 'Sistema';
            payload.rejectedAt = null;
            payload.rejectedBy = null;
            payload.rejectionReason = null;
        }

        if (nextStatus === this.STATUS.REJEITADA) {
            payload.rejectedAt = Number(payload.rejectedAt) || now;
            payload.rejectedBy = payload.rejectedBy || payload.by || 'Sistema';
            payload.approvedAt = null;
            payload.approvedBy = null;
        }

        solicitation.status = nextStatus;
        solicitation.updatedAt = now;

        const currentVersion = Number(solicitation.audit?.version) || 0;
        solicitation.audit = {
            ...(solicitation.audit || {}),
            version: currentVersion + 1,
            lastUpdatedAt: now,
            lastUpdatedBy: payload.by || 'Sistema'
        };

        if (!Array.isArray(solicitation.statusHistory)) {
            solicitation.statusHistory = [];
        }
        solicitation.statusHistory.push({
            status: nextStatus,
            at: now,
            by: payload.by || 'Sistema'
        });

        if (!Array.isArray(solicitation.timeline)) {
            solicitation.timeline = [];
        }
        solicitation.timeline.push({
            event: 'status_changed',
            from: previousStatus,
            to: nextStatus,
            at: now,
            by: payload.by || 'Sistema',
            comment: payload.approvalComment || payload.rejectionReason || payload.trackingCode || null
        });

        if (nextStatus === this.STATUS.APROVADA || nextStatus === this.STATUS.REJEITADA) {
            if (!Array.isArray(solicitation.approvals)) {
                solicitation.approvals = [];
            }
            const decisionComment = payload.approvalComment || payload.rejectionReason || null;
            const decisionBy = payload.by || 'Sistema';
            const decisionAt = nextStatus === this.STATUS.APROVADA
                ? (Number(payload.approvedAt) || now)
                : (Number(payload.rejectedAt) || now);
            solicitation.approvals.push({
                decision: nextStatus === this.STATUS.APROVADA ? 'approved' : 'rejected',
                at: decisionAt,
                by: decisionBy,
                comment: decisionComment
            });

            solicitation.aprovacao = {
                ...(solicitation.aprovacao || {}),
                status: nextStatus,
                at: decisionAt,
                by: decisionBy,
                updatedAt: now,
                userId: actorSnapshot.id,
                username: actorSnapshot.username,
                email: actorSnapshot.email || null,
                role: actorSnapshot.role,
                comment: decisionComment,
                approvedAt: nextStatus === this.STATUS.APROVADA ? decisionAt : null,
                approvedBy: nextStatus === this.STATUS.APROVADA ? (payload.approvedBy || decisionBy) : null,
                rejectedAt: nextStatus === this.STATUS.REJEITADA ? decisionAt : null,
                rejectedBy: nextStatus === this.STATUS.REJEITADA ? (payload.rejectedBy || decisionBy) : null,
                rejectionReason: nextStatus === this.STATUS.REJEITADA ? (payload.rejectionReason || null) : null
            };

            solicitation.approvalManagerUserId = actorSnapshot.id;
            solicitation.approvalManagerUsername = actorSnapshot.username;
            solicitation.approvalManagerName = actorSnapshot.name;
            solicitation.approvalManagerEmail = actorSnapshot.email || null;
            solicitation.approvalManagerRole = actorSnapshot.role;
        }

        if (nextStatus === this.STATUS.EM_TRANSITO) {
            solicitation.trackingUpdatedByUserId = actorSnapshot.id;
            solicitation.trackingUpdatedByUsername = actorSnapshot.username;
            solicitation.trackingUpdatedByEmail = actorSnapshot.email || null;
            solicitation.trackingUpdatedByRole = actorSnapshot.role;
        }

        delete payload.status;
        delete payload.byUserId;
        delete payload.byUsername;
        delete payload.byEmail;
        delete payload.byRole;
        Object.assign(solicitation, payload);
        solicitation.status = nextStatus;
        solicitation.updatedAt = now;

        const saved = await this.persistCriticalCollection(this.KEYS.SOLICITATIONS, solicitations, {
            changedIds: solicitation?.id ? [solicitation.id] : []
        });
        if (!saved) {
            const failure = this.buildCloudPersistenceFailure(
                'Não foi possível persistir a mudança de status na nuvem.',
                {
                    permissionDeniedMessage: 'A operação foi bloqueada pelas regras de aprovação do Firebase. Publique as regras atualizadas antes de tentar aprovar ou rejeitar novamente.'
                }
            );
            return { success: false, error: failure.code, message: failure.message };
        }

        this.queueOneDriveBackup(solicitation);
        this.createSolicitationsBackup({ download: false, reason: 'auto-status-change', silent: true });
        return { success: true, solicitation: this.cloneSerializable(solicitation, solicitation) };
    },

    async deleteSolicitation(id) {
        const currentSolicitations = this.cloneSerializable(this.getSolicitations(), []) || [];
        this.createSolicitationsBackup({
            download: false,
            reason: 'auto-delete',
            silent: true,
            solicitations: currentSolicitations
        });
        const solicitations = currentSolicitations.filter(s => s.id !== id);
        if (solicitations.length === currentSolicitations.length) {
            return { success: false, error: 'not_found', message: 'Solicitação não encontrada.' };
        }

        const saved = await this.persistCriticalCollection(this.KEYS.SOLICITATIONS, solicitations, {
            removedIds: [id]
        });
        if (!saved) {
            return { success: false, error: 'cloud_save_failed', message: 'Não foi possível remover a solicitação na nuvem.' };
        }

        this.createSolicitationsBackup({ download: false, reason: 'post-delete', silent: true });
        return { success: true };
    },

    async clearAllSolicitations() {
        const currentSolicitations = this.cloneSerializable(this.getSolicitations(), []) || [];
        if (currentSolicitations.length > 0) {
            this.createSolicitationsBackup({
                download: false,
                reason: 'pre-clear-all',
                silent: true,
                solicitations: currentSolicitations
            });
        }

        const saved = await this.persistCriticalCollection(this.KEYS.SOLICITATIONS, [], {
            replaceCollection: true
        });
        if (!saved) {
            return { success: false, error: 'cloud_save_failed', message: 'Não foi possível limpar o histórico de solicitações na nuvem.' };
        }

        this.createSolicitationsBackup({ download: false, reason: 'post-clear-all', silent: true, solicitations: [] });
        return { success: true };
    },

    createSolicitationsBackup(options = {}) {
        const {
            download = true,
            reason = 'manual',
            silent = false,
            solicitations = null,
            trackExport = download === true
        } = options;

        try {
            const snapshotSolicitations = Array.isArray(solicitations) ? solicitations : this.getSolicitations();
            const now = new Date();
            const datePart = Utils.getLocalDateString(now).replace(/-/g, '');
            const timePart = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            const filename = `backup_solicitacoes_${datePart}_${timePart}.json`;
            const payload = {
                schemaVersion: 1,
                generatedAt: now.toISOString(),
                reason,
                totalSolicitations: snapshotSolicitations.length,
                solicitations: snapshotSolicitations
            };
            const json = JSON.stringify(payload, null, 2);
            const payloadBase64 = btoa(unescape(encodeURIComponent(json)));
            if (trackExport) {
                const entry = this.logExport({
                    type: 'json',
                    filename,
                    source: 'backup',
                    filters: { reason },
                    recordCount: snapshotSolicitations.length
                });

                if (entry) {
                    this.saveExportArtifact(entry, {
                        payloadBase64,
                        filename,
                        contentType: 'application/json',
                        source: 'backup'
                    });
                }
            }

            if (download && typeof Utils !== 'undefined' && typeof Utils.downloadFile === 'function') {
                Utils.downloadFile(json, filename, 'application/json;charset=utf-8');
            }

            localStorage.setItem(this.SOLICITATIONS_LAST_BACKUP_KEY, String(Date.now()));

            return {
                success: true,
                filename,
                count: snapshotSolicitations.length,
                silent
            };
        } catch (e) {
            console.warn('Failed to create solicitation backup', e);
            return { success: false, error: e?.message || 'backup_error' };
        }
    },

    ensureAutomaticSolicitationsBackup(reason = 'auto') {
        const solicitations = this.getSolicitations();
        if (!Array.isArray(solicitations) || solicitations.length === 0) {
            return false;
        }

        return this.createSolicitationsBackup({
            download: false,
            reason,
            silent: true,
            solicitations
        }).success;
    },

    async restoreSolicitationsBackup(payload) {
        try {
            const incoming = Array.isArray(payload)
                ? payload
                : (Array.isArray(payload?.solicitations) ? payload.solicitations : null);

            if (!incoming) {
                return { success: false, message: 'Arquivo de backup inválido.' };
            }

            const current = this.getSolicitations();
            const merged = new Map();

            const getKey = (sol) => sol?.id || sol?.numero || Utils.generateId();
            const getVersion = (sol) => Number(sol?.audit?.version) || 0;
            const getUpdatedAt = (sol) => Number(sol?.audit?.lastUpdatedAt || sol?.updatedAt || sol?.createdAt) || 0;

            current.forEach(sol => {
                merged.set(getKey(sol), sol);
            });

            let restoredCount = 0;
            incoming.filter(Boolean).forEach(sol => {
                const normalized = this.normalizeHistoricalStatus({ ...sol, id: sol.id || getKey(sol) });
                const key = getKey(normalized);
                const existing = merged.get(key);
                if (!existing || getVersion(normalized) > getVersion(existing) || (getVersion(normalized) === getVersion(existing) && getUpdatedAt(normalized) > getUpdatedAt(existing))) {
                    merged.set(key, normalized);
                    restoredCount += 1;
                }
            });

            const mergedSolicitations = Array.from(merged.values()).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            const saved = await this.persistCriticalCollection(this.KEYS.SOLICITATIONS, mergedSolicitations, {
                replaceCollection: true
            });
            if (saved) {
                this.createSolicitationsBackup({ download: false, reason: 'post-restore', silent: true });
                return { success: true, restoredCount, total: mergedSolicitations.length };
            }

            return { success: false, message: 'Não foi possível salvar os dados restaurados.' };
        } catch (e) {
            console.warn('Failed to restore solicitation backup', e);
            return { success: false, message: 'Erro ao restaurar backup.' };
        }
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
            preferredRangeDays: 30,
            defaultPeriodFilter: null,
            orcamentoMensalPecas: 0,
            managerNotificationEmail: '',
            operationalEmailGatewayRecipient: '',
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

    canPersistExportMetadataToCloud() {
        const currentUser = (typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function')
            ? Auth.getCurrentUser()
            : null;
        const role = String(currentUser?.role || '').trim().toLowerCase();
        return role === 'admin' || role === 'administrador' || role === 'gestor';
    },

    canPersistNotificationMetadataToCloud() {
        return this.canPersistExportMetadataToCloud();
    },

    getNotificationLog() {
        return this.loadData(this.KEYS.NOTIFICATION_LOG) || [];
    },

    async logNotification(notificationInfo = {}) {
        const entry = {
            id: notificationInfo.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
            createdAt: notificationInfo.createdAt || Date.now(),
            ...this.cloneSerializable(notificationInfo, notificationInfo)
        };

        if (!this.canPersistNotificationMetadataToCloud()) {
            return entry;
        }

        const logs = this.getNotificationLog();
        const trimmedLogs = [...logs, entry]
            .filter(Boolean)
            .sort((left, right) => Number(left?.createdAt || 0) - Number(right?.createdAt || 0))
            .slice(-this.NOTIFICATION_LOG_LIMIT);

        const saved = await this.persistCriticalCollection(this.KEYS.NOTIFICATION_LOG, trimmedLogs);
        if (saved) {
            this._sessionCache[this.KEYS.NOTIFICATION_LOG] = trimmedLogs;
        }

        return entry;
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
            this._sessionCache[this.KEYS.EXPORT_LOG] = trimmedLogs;
            if (this.canPersistExportMetadataToCloud()) {
                this.saveData(this.KEYS.EXPORT_LOG, trimmedLogs);
            }
            
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
            this._sessionCache[this.KEYS.EXPORT_FILES] = artifacts;
            if (this.canPersistExportMetadataToCloud()) {
                this.saveData(this.KEYS.EXPORT_FILES, artifacts);
            }
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

























































