/**
 * Environment Configuration
 * 
 * This file handles environment variables and configuration.
 * For production, set these as environment variables in your hosting platform.
 */

export const ENV = {
  // Environment mode
  MODE: import.meta.env.MODE || 'production',
  DEV: import.meta.env.DEV || false,
  PROD: import.meta.env.PROD || true,

  // Firebase Configuration
  // These values are public by design - security is handled by Firebase Rules
  FIREBASE: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyD0Z56ZTk2cBg8xWI12j8s67de9oIMJ2Y0',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'solicitacoes-de-pecas.firebaseapp.com',
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://solicitacoes-de-pecas-default-rtdb.firebaseio.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'solicitacoes-de-pecas',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'solicitacoes-de-pecas.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '782693023312',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:782693023312:web:f22340c11c8c96cd4e9b55'
  },

  // App Configuration
  APP: {
    name: 'Dashboard de Solicitações de Peças',
    version: '2.0.0',
    company: 'Diversey - A Solenis Company'
  }
};
