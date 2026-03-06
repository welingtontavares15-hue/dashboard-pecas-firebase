// js/firebase-config.js
// Configure aqui o Firebase Web SDK (é seguro manter esses valores no client).
// NÃƒO coloque serviceAccountKey.json no repositório.
//
// Como obter: Firebase Console > Project settings > Your apps (Web app) > Firebase SDK snippet (Config)

window.FIREBASE_CONFIG = window.FIREBASE_CONFIG || {
    apiKey: 'SUA_API_KEY',
    authDomain: 'SEU_PROJETO.firebaseapp.com',
    databaseURL: 'https://SEU_PROJETO-default-rtdb.firebaseio.com',
    projectId: 'SEU_PROJETO',
    storageBucket: 'SEU_PROJETO.appspot.com',
    messagingSenderId: 'SENDER_ID',
    appId: 'APP_ID'
};

