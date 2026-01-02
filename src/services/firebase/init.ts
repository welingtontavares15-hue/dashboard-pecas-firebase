/**
 * Firebase Initialization and Configuration
 * 
 * Centralizes Firebase setup using the modular SDK (v11+)
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, connectAuthEmulator } from 'firebase/auth';
import { getDatabase, type Database, connectDatabaseEmulator } from 'firebase/database';
import { getFunctions, type Functions, connectFunctionsEmulator } from 'firebase/functions';

// Firebase configuration (public keys - security handled by Firebase Rules)
const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyD0Z56ZTk2cBg8xWI12j8s67de9oIMJ2Y0',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'solicitacoes-de-pecas.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://solicitacoes-de-pecas-default-rtdb.firebaseio.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'solicitacoes-de-pecas',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'solicitacoes-de-pecas.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '782693023312',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:782693023312:web:f22340c11c8c96cd4e9b55'
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let database: Database | null = null;
let functions: Functions | null = null;

/**
 * Initialize Firebase
 */
export const initializeFirebase = (): FirebaseApp => {
  if (app) {
    return app;
  }

  try {
    app = initializeApp(FIREBASE_CONFIG);
    auth = getAuth(app);
    database = getDatabase(app);
    functions = getFunctions(app);

    // Connect to emulators in development
    const isDev = import.meta.env.DEV || false;
    const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
    
    if (isDev && useEmulator) {
      connectAuthEmulator(auth, 'http://localhost:9099');
      connectDatabaseEmulator(database, 'localhost', 9000);
      connectFunctionsEmulator(functions, 'localhost', 5001);
      console.log('🔧 Firebase emulators connected');
    }

    console.log('✅ Firebase initialized successfully');
    return app;
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
};

/**
 * Get Firebase Auth instance
 */
export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    initializeFirebase();
  }
  return auth!;
};

/**
 * Get Firebase Database instance
 */
export const getFirebaseDatabase = (): Database => {
  if (!database) {
    initializeFirebase();
  }
  return database!;
};

/**
 * Get Firebase Functions instance
 */
export const getFirebaseFunctions = (): Functions => {
  if (!functions) {
    initializeFirebase();
  }
  return functions!;
};
