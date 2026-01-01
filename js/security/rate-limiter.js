/**
 * Advanced Rate Limiting Module
 * Protege contra brute force e abuso de API
 */

const RateLimiter = {
    // Configuração
    config: {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000, // 15 minutos
        lockoutMs: 15 * 60 * 1000, // 15 minutos inicial
        maxLockoutMs: 24 * 60 * 60 * 1000, // 24 horas máximo
        progressiveMultiplier: 2
    },

    // Cache em memória (não persiste no localStorage por segurança)
    cache: new Map(),

    /**
     * Verifica se operação é permitida
     * @param {string} key - Identificador único (ex: username, IP)
     * @param {string} action - Tipo de ação (login, export, etc)
     * @returns {object} {allowed: boolean, remainingAttempts: number, resetTime: number}
     */
    check(key, action = 'default') {
        const cacheKey = `${action}:${key}`;
        const now = Date.now();
        
        let record = this.cache.get(cacheKey);
        
        if (!record) {
            record = {
                attempts: [],
                lockoutUntil: 0,
                lockoutCount: 0
            };
            this.cache.set(cacheKey, record);
        }

        // Verificar se está em lockout
        if (record.lockoutUntil > now) {
            return {
                allowed: false,
                remainingAttempts: 0,
                resetTime: record.lockoutUntil,
                message: `Conta bloqueada temporariamente. Tente novamente em ${Math.ceil((record.lockoutUntil - now) / 60000)} minutos.`
            };
        }

        // Limpar tentativas antigas (fora da janela)
        record.attempts = record.attempts.filter(
            timestamp => now - timestamp < this.config.windowMs
        );

        // Verificar limite
        if (record.attempts.length >= this.config.maxAttempts) {
            // Aplicar lockout progressivo
            const lockoutDuration = Math.min(
                this.config.lockoutMs * Math.pow(this.config.progressiveMultiplier, record.lockoutCount),
                this.config.maxLockoutMs
            );
            
            record.lockoutUntil = now + lockoutDuration;
            record.lockoutCount++;
            
            return {
                allowed: false,
                remainingAttempts: 0,
                resetTime: record.lockoutUntil,
                message: `Muitas tentativas. Bloqueado por ${Math.ceil(lockoutDuration / 60000)} minutos.`
            };
        }

        // Registrar tentativa
        record.attempts.push(now);
        
        return {
            allowed: true,
            remainingAttempts: this.config.maxAttempts - record.attempts.length,
            resetTime: now + this.config.windowMs,
            message: 'OK'
        };
    },

    /**
     * Reseta rate limit para uma chave (após sucesso)
     * @param {string} key - Identificador
     * @param {string} action - Tipo de ação
     */
    reset(key, action = 'default') {
        const cacheKey = `${action}:${key}`;
        this.cache.delete(cacheKey);
    },

    /**
     * Limpa cache antigo (executar periodicamente)
     */
    cleanup() {
        const now = Date.now();
        for (const [key, record] of this.cache.entries()) {
            if (record.lockoutUntil < now && record.attempts.length === 0) {
                this.cache.delete(key);
            }
        }
    }
};

// Cleanup automático a cada hora
setInterval(() => RateLimiter.cleanup(), 60 * 60 * 1000);

if (typeof window !== 'undefined') {
    window.RateLimiter = RateLimiter;
}
