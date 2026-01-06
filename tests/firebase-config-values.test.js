const fs = require('fs');
const path = require('path');

describe('Firebase configuration values', () => {
    const expectedConfig = {
        apiKey: 'AIzaSyDQZ56ZTk2cBg8xWI2j8s67de9oIMJ2Y0',
        databaseURL: 'https://solicitacoes-de-pecas-default-rtdb.firebaseio.com',
        storageBucket: 'solicitacoes-de-pecas.firebasestorage.app'
    };

    const loadFile = (relativePath) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

    it('uses the production Firebase config in firebase-config.js', () => {
        const content = loadFile('js/firebase-config.js');
        expect(content).toContain(`apiKey: '${expectedConfig.apiKey}'`);
        expect(content).toContain(`databaseURL: '${expectedConfig.databaseURL}'`);
        expect(content).toContain(`storageBucket: '${expectedConfig.storageBucket}'`);
    });

    it('keeps fallback config in firebase-init.js synchronized', () => {
        const content = loadFile('js/firebase-init.js');
        expect(content).toContain(`apiKey: '${expectedConfig.apiKey}'`);
        expect(content).toContain(`databaseURL: '${expectedConfig.databaseURL}'`);
        expect(content).toContain(`storageBucket: '${expectedConfig.storageBucket}'`);
    });
});
