const fs = require('fs');
const path = require('path');

describe('Firebase configuration values', () => {
    const expectedEndpoints = {
        databaseURL: 'https://solicitacoes-de-pecas-default-rtdb.firebaseio.com',
        storageBucket: 'solicitacoes-de-pecas.firebasestorage.app'
    };

    const loadFile = (relativePath) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
    const extractConfig = (content) => ({
        apiKey: (content.match(/apiKey:\s*['"]([^'"]+)['"]/) || [null, ''])[1],
        databaseURL: (content.match(/databaseURL:\s*['"]([^'"]+)['"]/) || [null, ''])[1],
        storageBucket: (content.match(/storageBucket:\s*['"]([^'"]+)['"]/) || [null, ''])[1]
    });

    it('uses the production Firebase endpoints in firebase-config.js', () => {
        const config = extractConfig(loadFile('js/firebase-config.js'));
        expect(config.apiKey).toMatch(/^AIza/);
        expect(config.databaseURL).toBe(expectedEndpoints.databaseURL);
        expect(config.storageBucket).toBe(expectedEndpoints.storageBucket);
    });

    it('keeps fallback config in firebase-init.js synchronized', () => {
        const primary = extractConfig(loadFile('js/firebase-config.js'));
        const fallback = extractConfig(loadFile('js/firebase-init.js'));
        expect(fallback.apiKey).toBe(primary.apiKey);
        expect(fallback.databaseURL).toBe(primary.databaseURL);
        expect(fallback.storageBucket).toBe(primary.storageBucket);
    });
});
