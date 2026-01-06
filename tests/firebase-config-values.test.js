const fs = require('fs');
const path = require('path');

describe('Firebase configuration values', () => {
    const expectedEndpoints = {
        databaseURL: /https:\/\/solicitacoes-de-pecas-default-rtdb\.firebaseio\.com\/?/,
        storageBucket: /^solicitacoes-de-pecas\.(firebasestorage\.app|appspot\.com)$/
    };

    const loadFile = (relativePath) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
    const extractValue = (content, key, source) => {
        const match = content.match(new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`, 'm'));
        if (!match) {
            throw new Error(`Could not find ${key} in ${source}`);
        }
        return match[1];
    };
    const extractConfig = (content, source) => ({
        apiKey: extractValue(content, 'apiKey', source),
        databaseURL: extractValue(content, 'databaseURL', source),
        storageBucket: extractValue(content, 'storageBucket', source)
    });

    it('uses the production Firebase endpoints in firebase-config.js', () => {
        const config = extractConfig(loadFile('js/firebase-config.js'), 'firebase-config.js');
        expect(config.apiKey).toMatch(/^AIza/);
        expect(config.databaseURL).toMatch(expectedEndpoints.databaseURL);
        expect(config.storageBucket).toMatch(expectedEndpoints.storageBucket);
    });

    it('keeps fallback config in firebase-init.js synchronized', () => {
        const primary = extractConfig(loadFile('js/firebase-config.js'), 'firebase-config.js');
        const fallback = extractConfig(loadFile('js/firebase-init.js'), 'firebase-init.js');
        expect(fallback.apiKey).toBe(primary.apiKey);
        expect(fallback.databaseURL).toBe(primary.databaseURL);
        expect(fallback.storageBucket).toBe(primary.storageBucket);
    });
});
