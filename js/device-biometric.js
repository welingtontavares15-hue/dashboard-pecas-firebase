/**
 * Device-only password unlock. WebAuthn PRF -> HKDF -> AES-GCM.
 * This does not issue a session: the recovered password MUST pass Auth.login.
 * No PRF secret, encryption key, or plaintext password is persisted.
 */
const DeviceBiometric = {
    databaseName: 'wwm-device-biometric-v1',
    storeName: 'vault',

    supported() {
        return !!(window.isSecureContext && window.crypto?.subtle && window.indexedDB
            && window.PublicKeyCredential && navigator.credentials?.create && navigator.credentials?.get);
    },

    async available() {
        if (!this.supported()) return false;
        try {
            return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        } catch (_error) { return false; }
    },

    encode(value) {
        return btoa(String.fromCharCode(...new Uint8Array(value)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },

    decode(value) {
        if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value) || value.length > 12000) {
            throw new Error('Configuração da digital inválida. Entre com senha e ative novamente.');
        }
        return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
    },

    random(length) { return window.crypto.getRandomValues(new Uint8Array(length)); },

    async storage(operation, value) {
        // This database is separate from business data and has no plaintext fallback.
        return new Promise((resolve, reject) => {
            let blocked = false;
            const request = window.indexedDB.open(this.databaseName, 1);
            request.onupgradeneeded = () => request.result.createObjectStore(this.storeName);
            request.onerror = () => reject(new Error('O navegador não permite salvar a configuração da digital.'));
            request.onblocked = () => { blocked = true; reject(new Error('Feche outras abas do portal e tente novamente.')); };
            request.onsuccess = () => {
                const db = request.result;
                if (blocked) { db.close(); return; }
                try {
                    const tx = db.transaction(this.storeName, operation === 'get' ? 'readonly' : 'readwrite');
                    const store = tx.objectStore(this.storeName);
                    const item = operation === 'get' ? store.get('device')
                        : (operation === 'delete' ? store.delete('device') : store.put(value, 'device'));
                    tx.oncomplete = () => { db.close(); resolve(item.result || null); };
                    tx.onerror = tx.onabort = () => { db.close(); reject(new Error('Não foi possível acessar a configuração da digital.')); };
                } catch (_error) { db.close(); reject(new Error('Não foi possível acessar a configuração da digital.')); }
            };
        });
    },

    async hasEnrollment() {
        // A read error is different from an absent registration.
        return !!(await this.storage('get'));
    },

    // Só o primeiro nome, para saudar na tela de login ("Olá, Carlos").
    // Não é segredo e não participa da criptografia; cadastros antigos não têm.
    greetingName(name) {
        const first = String(name || '').trim().split(/\s+/)[0] || '';
        return first.slice(0, 40);
    },

    async enrollmentInfo() {
        const record = await this.storage('get');
        return { enrolled: !!record, displayName: record && typeof record.displayName === 'string' ? record.displayName : '' };
    },

    async forget() { await this.storage('delete'); },

    validateRecord(record) {
        if (!record || record.version !== 1 || record.origin !== window.location.origin
            || record.rpId !== window.location.hostname
            || this.decode(record.iv).length !== 12 || this.decode(record.salt).length !== 32
            || this.decode(record.kdfSalt).length !== 32 || !this.decode(record.credentialId).length) {
            throw new Error('Ative a digital neste navegador em Meu Perfil.');
        }
    },

    binding(record) {
        return new TextEncoder().encode(JSON.stringify([
            'wwm-device-password-v1', record.origin, record.rpId, record.credentialId
        ]));
    },

    async keyFromAssertion(record) {
        const challenge = this.random(32);
        const credential = await navigator.credentials.get({ publicKey: {
            challenge, rpId: record.rpId, timeout: 60000,
            userVerification: 'required', hints: ['client-device'],
            allowCredentials: [{ type: 'public-key', id: this.decode(record.credentialId), transports: ['internal'] }],
            extensions: { prf: { eval: { first: this.decode(record.salt) } } }
        } });
        if (!credential || credential.type !== 'public-key'
            || credential.authenticatorAttachment === 'cross-platform'
            || this.encode(credential.rawId) !== record.credentialId) {
            throw new Error('Confirme a digital no próprio celular para continuar.');
        }
        const client = JSON.parse(new TextDecoder().decode(credential.response.clientDataJSON));
        const data = new Uint8Array(credential.response.authenticatorData);
        const expectedRp = new Uint8Array(await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(record.rpId)));
        if (client.type !== 'webauthn.get' || client.origin !== record.origin || client.crossOrigin === true
            || client.challenge !== this.encode(challenge) || data.length < 37
            || (data[32] & 5) !== 5 || !expectedRp.every((byte, index) => data[index] === byte)) {
            throw new Error('A verificação do celular não foi confirmada.');
        }
        const output = credential.getClientExtensionResults()?.prf?.results?.first;
        if (!output || output.byteLength !== 32) {
            throw new Error('Este celular ou navegador não oferece a proteção necessária. Continue usando sua senha.');
        }
        const secret = new Uint8Array(output);
        try {
            const master = await window.crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey']);
            return await window.crypto.subtle.deriveKey({
                name: 'HKDF', hash: 'SHA-256', salt: this.decode(record.kdfSalt), info: this.binding(record)
            }, master, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
        } finally { secret.fill(0); }
    },

    async enroll({ username, password, userId, name, onProgress }) {
        if (!(await this.available())) throw new Error('Biometria do celular indisponível neste navegador. Use sua senha.');
        if (!username || !password || userId == null) throw new Error('Confirme sua senha atual para ativar a digital.');
        const report = message => { if (typeof onProgress === 'function') onProgress(message); };
        report('1 de 3 — Confirme a criação da chave no celular.');
        const credential = await navigator.credentials.create({ publicKey: {
            challenge: this.random(32),
            rp: { id: window.location.hostname, name: 'Portal de Peças WWM' },
            user: { id: this.random(32), name: username, displayName: name || username },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
            authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'required', userVerification: 'required' },
            timeout: 60000, attestation: 'none', extensions: { prf: {} }
        } });
        // Attachment is nullable in WebAuthn. A missing optional report must not
        // reject a valid platform request. PRF output is still mandatory below.
        if (!credential || credential.type !== 'public-key' || credential.authenticatorAttachment === 'cross-platform'
            || credential.getClientExtensionResults()?.prf?.enabled === false) {
            throw new Error('A proteção da digital não está disponível neste aparelho. Use sua senha.');
        }
        const record = {
            version: 1, origin: window.location.origin, rpId: window.location.hostname,
            credentialId: this.encode(credential.rawId), salt: this.encode(this.random(32)),
            kdfSalt: this.encode(this.random(32)), iv: this.encode(this.random(12)),
            displayName: this.greetingName(name)
        };
        report('2 de 3 — Confirme novamente no celular para concluir a proteção.');
        const key = await this.keyFromAssertion(record);
        const plaintext = new TextEncoder().encode(JSON.stringify({ username, password, userId: String(userId) }));
        try {
            record.ciphertext = this.encode(await window.crypto.subtle.encrypt({
                name: 'AES-GCM', iv: this.decode(record.iv), additionalData: this.binding(record), tagLength: 128
            }, key, plaintext));
            report('3 de 3 — Salvando e verificando a digital neste navegador.');
            await this.storage('put', record);
            const stored = await this.storage('get');
            if (!stored || JSON.stringify(stored) !== JSON.stringify(record)) {
                throw new Error('O navegador não confirmou o salvamento da digital. Continue com sua senha e tente ativar novamente.');
            }
            const readback = new Uint8Array(await window.crypto.subtle.decrypt({
                name: 'AES-GCM', iv: this.decode(stored.iv), additionalData: this.binding(stored), tagLength: 128
            }, key, this.decode(stored.ciphertext)));
            try {
                if (readback.length !== plaintext.length || !readback.every((byte, index) => byte === plaintext[index])) {
                    throw new Error('A verificação do cadastro salvo falhou. A digital não foi confirmada.');
                }
            } finally { readback.fill(0); }
        } finally { plaintext.fill(0); }
    },

    async unlock() {
        if (!(await this.available())) throw new Error('Use um navegador com suporte à biometria do celular.');
        const record = await this.storage('get');
        this.validateRecord(record);
        const key = await this.keyFromAssertion(record);
        let decrypted;
        try {
            decrypted = new Uint8Array(await window.crypto.subtle.decrypt({
                name: 'AES-GCM', iv: this.decode(record.iv), additionalData: this.binding(record), tagLength: 128
            }, key, this.decode(record.ciphertext)));
            const payload = JSON.parse(new TextDecoder().decode(decrypted));
            if (typeof payload.username !== 'string' || !payload.username || typeof payload.password !== 'string'
                || !payload.password || typeof payload.userId !== 'string' || !payload.userId) throw new Error('Invalid payload');
            return payload;
        } catch (_error) {
            throw new Error('Não foi possível liberar este acesso. Entre com sua senha e ative a digital novamente.');
        } finally { decrypted?.fill(0); }
    }
};
window.DeviceBiometric = DeviceBiometric;
