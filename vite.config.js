import { defineConfig } from 'vite';

// Define module paths for better maintainability
const SECURITY_MODULES = [
  './js/security/sanitizer.js',
  './js/security/rate-limiter.js',
  './js/security/validator.js'
];

const CORE_MODULES = [
  './js/config.js',
  './js/utils.js',
  './js/app.js',
  './js/storage.js',
  './js/data.js'
];

export default defineConfig({
  define: {
    'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(process.env.VITE_FIREBASE_API_KEY),
    'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.VITE_FIREBASE_AUTH_DOMAIN),
    'import.meta.env.VITE_FIREBASE_DATABASE_URL': JSON.stringify(process.env.VITE_FIREBASE_DATABASE_URL),
    'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(process.env.VITE_FIREBASE_PROJECT_ID),
    'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.VITE_FIREBASE_STORAGE_BUCKET),
    'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
    'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(process.env.VITE_FIREBASE_APP_ID),
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Desabilitar em produção
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remover console.log em produção
      }
    },
    // Performance: Code splitting configuration
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for third-party libraries
          'vendor': [
            'chart.js',
            'jspdf',
            'xlsx',
            'qrcode'
          ],
          // Security modules chunk
          'security': SECURITY_MODULES,
          // Core application chunk
          'core': CORE_MODULES,
          // Firebase related chunk
          'firebase': [
            './js/firebase-init.js'
          ],
          // Feature modules - dashboard
          'dashboard': [
            './js/dashboard.js',
            './js/relatorios.js'
          ],
          // Feature modules - solicitacoes
          'solicitacoes': [
            './js/solicitacoes.js',
            './js/aprovacoes.js'
          ],
          // Feature modules - catalog
          'catalog': [
            './js/pecas.js',
            './js/fornecedores.js',
            './js/tecnicos.js'
          ]
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Performance: Chunk size warnings
    chunkSizeWarningLimit: 500,
  },
  // Performance: Optimize dependencies
  optimizeDeps: {
    include: ['dompurify'],
    exclude: []
  }
});
