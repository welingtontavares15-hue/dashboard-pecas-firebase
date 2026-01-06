// js/firebase-config.js
// Configure aqui o Firebase Web SDK (é seguro manter esses valores no client).
// NÃO coloque serviceAccountKey.json no repositório.
//
// Como obter: Firebase Console > Project settings > Your apps (Web app) > Firebase SDK snippet (Config)

// Define the Firebase configuration for this application.
// These values are pulled from the Firebase console (Project settings → Config).  
// The apiKey is public and safe to expose in client-side code.
window.FIREBASE_CONFIG = window.FIREBASE_CONFIG || {
    // API key for the Firebase project. This enables use of Firebase services on the web.
    apiKey: 'AIzaSyD0Z654T7k2cBg8xwI1Zij8s67de9oIMJ2Y0',
    // Auth domain used by Firebase Authentication.
    authDomain: 'solicitacoes-de-pecas.firebaseapp.com',
    // URL of the Realtime Database instance.
    databaseURL: 'https://solicitacoes-de-pecas-default-rtdb.firebaseio.com',
    // Unique identifier for the Firebase project.
    projectId: 'solicitacoes-de-pecas',
    // Cloud Storage bucket for file uploads.
    // Use the standard appspot.com domain instead of the deprecated
    // firebasestorage.app. Without this change file uploads and downloads
    // may fail in production environments.
    storageBucket: 'solicitacoes-de-pecas.appspot.com',
    // Sender ID for Firebase Cloud Messaging.
    messagingSenderId: '782693023312',
    // App ID for this specific Firebase app.
    appId: '1:782693023312:web:f22340c11c8c96cd4e9b55',
    // Optional measurement ID used for Google Analytics.
    measurementId: 'G-QVTQ20HN39'
};
