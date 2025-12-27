const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                // External libraries
                firebase: 'readonly',
                Chart: 'readonly',
                jsPDF: 'readonly',
                XLSX: 'readonly',
                QRCode: 'readonly',
                // Application modules
                Auth: 'writable',
                DataManager: 'writable',
                CloudStorage: 'writable',
                IndexedDBStorage: 'writable',
                Utils: 'writable',
                App: 'writable',
                Dashboard: 'writable',
                Solicitacoes: 'writable',
                Aprovacoes: 'writable',
                Pecas: 'writable',
                Fornecedores: 'writable',
                Tecnicos: 'writable',
                Relatorios: 'writable',
                PWA: 'writable',
                OneDriveIntegration: 'writable',
                SheetIntegration: 'writable',
                Logger: 'writable',
                // Runtime configuration
                APP_CONFIG: 'readonly',
                __ENVIRONMENT__: 'readonly'
            }
        },
        rules: {
            'indent': ['error', 4],
            'linebreak-style': ['error', 'unix'],
            'quotes': ['error', 'single'],
            'semi': ['error', 'always'],
            'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^(Auth|DataManager|CloudStorage|IndexedDBStorage|Utils|App|Dashboard|Solicitacoes|Aprovacoes|Pecas|Fornecedores|Tecnicos|Relatorios|PWA|OneDriveIntegration|SheetIntegration|Logger|_)', 'caughtErrorsIgnorePattern': '^_' }],
            'no-console': 'off',
            'no-undef': 'error',
            'no-extra-semi': 'error',
            'no-irregular-whitespace': 'error',
            'no-unreachable': 'error',
            'eqeqeq': ['error', 'always'],
            'curly': ['error', 'all'],
            'brace-style': ['error', '1tbs'],
            'no-var': 'error',
            'prefer-const': 'warn',
            'prefer-arrow-callback': 'warn',
            'no-duplicate-imports': 'error'
        }
    }
];
