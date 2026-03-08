/**
 * Structured Logger Module
 * Provides request-correlated logging and event tracking for observability
 * 
 * Key Features:
 * - Unique requestId per operation for correlation
 * - Structured log format for easy parsing
 * - Event categorization (login, sync, export, error)
 * - Admin health panel data aggregation
 */

const Logger = {
    LOG_KEY: 'diversey_structured_logs',
    LOG_LIMIT: 500,
    HEALTH_KEY: 'diversey_health_stats',
    DEDUP_WINDOW_MS: 8000,

    /**
     * Log levels
     */
    LEVEL: {
        DEBUG: 'debug',
        INFO: 'info',
        WARN: 'warn',
        ERROR: 'error'
    },

    /**
     * Event categories for health tracking
     */
    CATEGORY: {
        AUTH: 'auth',
        SYNC: 'sync',
        EXPORT: 'export',
        REQUEST: 'request',
        SYSTEM: 'system',
        APPROVAL: 'approval'
    },

    /**
     * Generate unique request ID for correlation
     * @returns {string} Unique request identifier
     */
    generateRequestId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `req_${timestamp}_${random}`;
    },

    /**
     * Get or create request context for current operation
     * @returns {object} Request context with id and startTime
     */
    getRequestContext() {
        if (!this._currentContext) {
            this._currentContext = {
                requestId: this.generateRequestId(),
                startTime: Date.now()
            };
        }
        return this._currentContext;
    },

    /**
     * Start a new request context
     * @param {object} metadata - Additional context metadata
     * @returns {object} New request context
     */
    startRequest(metadata = {}) {
        this._currentContext = {
            requestId: this.generateRequestId(),
            startTime: Date.now(),
            ...metadata
        };
        return this._currentContext;
    },

    /**
     * End current request context
     */
    endRequest() {
        this._currentContext = null;
    },

    /**
     * Create structured log entry
     * @param {string} level - Log level
     * @param {string} category - Event category
     * @param {string} message - Log message
     * @param {object} data - Additional data
     * @returns {object} Structured log entry
     */
    createEntry(level, category, message, data = {}) {
        const context = this.getRequestContext();
        const user = this.getCurrentUser();
        const explicitRequestId = data?.requestId || data?.opId || data?.operationId;
        const requestId = explicitRequestId
            ? String(explicitRequestId)
            : this.generateRequestId();
        const startReference = Number(data?.startedAt || context.startTime || Date.now());

        return {
            id: this.generateRequestId(),
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            requestId,
            duration: Math.max(0, Date.now() - startReference),
            user: user ? { id: user.id, username: user.username, role: user.role } : null,
            data,
            device: this.getDeviceInfo()
        };
    },

    /**
     * Get current user info (if Auth module available)
     */
    getCurrentUser() {
        if (typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function') {
            return Auth.getCurrentUser();
        }
        return null;
    },

    /**
     * Get device information
     */
    getDeviceInfo() {
        if (typeof navigator === 'undefined') {
            return { platform: 'server' };
        }
        return {
            platform: navigator.platform || 'unknown',
            language: navigator.language || 'unknown',
            online: navigator.onLine !== false
        };
    },

    normalizeSyncError(errorLike = '', fallbackCode = '') {
        const raw = String(
            (typeof errorLike === 'string' ? errorLike : (errorLike?.message || errorLike?.code || ''))
            || fallbackCode
            || 'unknown_error'
        ).trim();
        const lower = raw.toLowerCase();
        const map = [
            { code: 'offline', pattern: /offline|sem conexao|network.*offline|navigator\.online/ },
            { code: 'timeout', pattern: /timeout|timed out|deadline|aborted/ },
            { code: 'permission_denied', pattern: /permission|denied|forbidden|auth\/insufficient-permission/ },
            { code: 'version_conflict', pattern: /conflict|version|stale|concurrent/ },
            { code: 'cloud_not_ready', pattern: /cloud_not_ready|cloud not ready|not connected/ },
            { code: 'cloud_unavailable', pattern: /cloud_unavailable|cloud unavailable|firebase.*not.*ready/ },
            { code: 'snapshot_invalid', pattern: /snapshot|payload|invalid.*format|invalid_snapshot/ },
            { code: 'write_failed', pattern: /save_failed|write failed|set failed|persist failed/ },
            { code: 'read_failed', pattern: /read failed|load failed|fetch failed|get failed/ }
        ];
        const matched = map.find((entry) => entry.pattern.test(lower));
        const code = matched?.code || fallbackCode || raw || 'unknown_error';
        const messageByCode = {
            offline: 'sem conexão com a internet',
            timeout: 'tempo limite de comunicação excedido',
            permission_denied: 'permissão negada para operação',
            version_conflict: 'conflito de versão detectado',
            cloud_not_ready: 'nuvem ainda não está pronta',
            cloud_unavailable: 'serviço de nuvem indisponível',
            snapshot_invalid: 'snapshot inválido recebido',
            write_failed: 'falha ao gravar dados',
            read_failed: 'falha ao ler dados',
            unknown_error: 'erro de sincronização não identificado'
        };

        return {
            code,
            raw,
            normalizedMessage: messageByCode[code] || raw || messageByCode.unknown_error
        };
    },

    normalizeSyncPayload(event, data = {}) {
        const eventName = String(event || 'sync_event').trim() || 'sync_event';
        const action = data?.action || data?.operation || eventName;
        const stage = data?.stage || data?.status || 'unknown_stage';
        const entityId = data?.entityId || data?.key || null;
        const userId = data?.userId || data?.user?.id || null;
        const source = data?.origin || data?.source || 'sync_layer';
        const errorInfo = this.normalizeSyncError(data?.errorCode || data?.errorOriginal || data?.error || data?.reason, data?.errorCode || '');
        const isFailure = /failed|error|fail/i.test(eventName) || String(data?.status || '').toLowerCase() === 'fail';
        const isPending = /pending|queued|retry/i.test(eventName) || String(data?.status || '').toLowerCase() === 'pending';
        const level = isFailure ? this.LEVEL.ERROR : (isPending ? this.LEVEL.WARN : this.LEVEL.INFO);

        let message = eventName;
        if (isFailure) {
            message = `Falha de sync em ${action} (${stage}): ${errorInfo.normalizedMessage}`;
        } else if (isPending) {
            message = `Sync pendente em ${action} (${stage})`;
        } else if (/success|complete|done|synced/i.test(eventName)) {
            message = `Sync concluída em ${action}`;
        } else if (/start|saving|running/i.test(eventName)) {
            message = `Sync iniciada em ${action}`;
        }

        return {
            level,
            message,
            data: {
                ...data,
                action,
                operation: action,
                stage,
                origin: source,
                entityId,
                userId,
                errorCode: errorInfo.code,
                errorOriginal: data?.errorOriginal || errorInfo.raw
            }
        };
    },

    buildDedupFingerprint(entry) {
        const data = entry?.data || {};
        const action = data.action || data.operation || '';
        const stage = data.stage || data.status || '';
        const entityId = data.entityId || data.key || '';
        const errorCode = data.errorCode || data.error || data.reason || '';
        const attempts = data.attempts || data.attempt || '';
        return [
            entry?.level || '',
            entry?.category || '',
            entry?.requestId || '',
            entry?.message || '',
            action,
            stage,
            entityId,
            errorCode,
            attempts
        ].join('|');
    },

    shouldSkipDuplicate(entry, logs = []) {
        if (!entry || !Array.isArray(logs) || logs.length === 0) {
            return false;
        }
        const fingerprint = this.buildDedupFingerprint(entry);
        const nowMs = Date.parse(entry.timestamp) || Date.now();
        const limitMs = Math.max(1000, Number(this.DEDUP_WINDOW_MS) || 8000);

        return logs.some((existing) => {
            if (!existing) {
                return false;
            }
            if (this.buildDedupFingerprint(existing) !== fingerprint) {
                return false;
            }
            const existingMs = Date.parse(existing.timestamp) || 0;
            return Math.abs(nowMs - existingMs) <= limitMs;
        });
    },

    compactLogs(logs = []) {
        if (!Array.isArray(logs) || logs.length === 0) {
            return [];
        }
        const compacted = [];
        const seen = new Map();
        const limitMs = Math.max(1000, Number(this.DEDUP_WINDOW_MS) || 8000);

        logs.forEach((entry) => {
            if (!entry) {
                return;
            }
            const fingerprint = this.buildDedupFingerprint(entry);
            const ts = Date.parse(entry.timestamp) || 0;
            const previousTs = seen.get(fingerprint);
            if (previousTs !== undefined && Math.abs(previousTs - ts) <= limitMs) {
                return;
            }
            seen.set(fingerprint, ts);
            compacted.push(entry);
        });

        return compacted;
    },

    normalizeLegacyEntry(entry) {
        if (!entry || typeof entry !== 'object') {
            return entry;
        }
        if (entry.category === this.CATEGORY.SYNC && String(entry.message || '').toLowerCase() === 'operation_failed') {
            const normalized = this.normalizeSyncPayload('operation_failed', entry.data || {});
            return {
                ...entry,
                level: normalized.level,
                message: normalized.message,
                data: normalized.data
            };
        }
        return entry;
    },

    /**
     * Persist log entry
     * @param {object} entry - Log entry to persist
     */
    persist(entry) {
        try {
            const logs = this.getLogs();
            if (this.shouldSkipDuplicate(entry, logs)) {
                return;
            }
            logs.unshift(entry);
            
            // Trim to limit
            const trimmedLogs = logs.slice(0, this.LOG_LIMIT);
            localStorage.setItem(this.LOG_KEY, JSON.stringify(trimmedLogs));

            // Update health stats
            this.updateHealthStats(entry);

            // Output to console for debugging
            const consoleFn = entry.level === 'error' ? console.error :
                entry.level === 'warn' ? console.warn :
                    entry.level === 'debug' ? console.debug : console.log;
            
            consoleFn(`[${entry.category.toUpperCase()}] ${entry.requestId}`, entry.message, entry.data);
        } catch (e) {
            console.error('Logger persist failed:', e);
        }
    },

    /**
     * Get all logs
     * @param {number} limit - Optional limit
     * @returns {Array} Log entries
     */
    getLogs(limit = null) {
        try {
            const logs = JSON.parse(localStorage.getItem(this.LOG_KEY) || '[]');
            let normalizedMutated = false;
            const normalizedLogs = Array.isArray(logs)
                ? logs.map((entry) => {
                    const normalized = this.normalizeLegacyEntry(entry);
                    if (!normalizedMutated && JSON.stringify(normalized) !== JSON.stringify(entry)) {
                        normalizedMutated = true;
                    }
                    return normalized;
                })
                : [];
            const compacted = this.compactLogs(normalizedLogs);
            if (normalizedMutated || compacted.length !== (Array.isArray(logs) ? logs.length : 0)) {
                localStorage.setItem(this.LOG_KEY, JSON.stringify(compacted.slice(0, this.LOG_LIMIT)));
            }
            return limit ? compacted.slice(0, limit) : compacted;
        } catch (_e) {
            return [];
        }
    },

    /**
     * Get logs by category
     * @param {string} category - Category to filter
     * @param {number} limit - Optional limit
     * @returns {Array} Filtered log entries
     */
    getLogsByCategory(category, limit = 50) {
        return this.getLogs().filter(log => log.category === category).slice(0, limit);
    },

    /**
     * Get logs by level
     * @param {string} level - Level to filter (or array of levels)
     * @param {number} limit - Optional limit
     * @returns {Array} Filtered log entries
     */
    getLogsByLevel(level, limit = 50) {
        const levels = Array.isArray(level) ? level : [level];
        return this.getLogs().filter(log => levels.includes(log.level)).slice(0, limit);
    },

    /**
     * Get error logs for health panel
     * @param {number} limit - Maximum entries
     * @returns {Array} Error log entries
     */
    getRecentErrors(limit = 20) {
        return this.getLogsByLevel([this.LEVEL.ERROR, this.LEVEL.WARN], limit);
    },

    /**
     * Update health statistics
     * @param {object} entry - Log entry
     */
    updateHealthStats(entry) {
        try {
            const stats = this.getHealthStats();
            const now = Date.now();
            const hourAgo = now - (60 * 60 * 1000);
            const dayAgo = now - (24 * 60 * 60 * 1000);

            // Initialize category stats if needed
            if (!stats.byCategory[entry.category]) {
                stats.byCategory[entry.category] = { total: 0, errors: 0, lastHour: 0, lastDay: 0 };
            }

            // Update counters
            stats.byCategory[entry.category].total++;
            if (entry.level === 'error') {
                stats.byCategory[entry.category].errors++;
                stats.totalErrors++;
            }

            // Add to time series for recent window tracking
            if (!stats.recentEvents) {
                stats.recentEvents = [];
            }
            stats.recentEvents.unshift({
                timestamp: now,
                category: entry.category,
                level: entry.level
            });
            
            // Keep only last 1000 events for time-window calculations
            stats.recentEvents = stats.recentEvents.slice(0, 1000);

            // Recalculate hourly/daily counts efficiently with single pass
            // Reset counts first
            Object.keys(stats.byCategory).forEach(cat => {
                stats.byCategory[cat].lastHour = 0;
                stats.byCategory[cat].lastDay = 0;
            });
            
            // Single pass through recentEvents
            for (const event of stats.recentEvents) {
                const cat = event.category;
                if (stats.byCategory[cat]) {
                    if (event.timestamp > hourAgo) {
                        stats.byCategory[cat].lastHour++;
                    }
                    if (event.timestamp > dayAgo) {
                        stats.byCategory[cat].lastDay++;
                    }
                }
            }

            stats.lastUpdated = now;
            localStorage.setItem(this.HEALTH_KEY, JSON.stringify(stats));
        } catch (_e) {
            console.warn('Health stats update failed:', _e);
        }
    },

    /**
     * Get health statistics
     * @returns {object} Health statistics
     */
    getHealthStats() {
        try {
            const stored = localStorage.getItem(this.HEALTH_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (_e) {
            // Return default
        }
        return {
            byCategory: {},
            totalErrors: 0,
            recentEvents: [],
            lastUpdated: null
        };
    },

    /**
     * Get system health summary for admin panel
     * @returns {object} Health summary
     */
    getHealthSummary() {
        const stats = this.getHealthStats();
        const now = Date.now();
        const hourAgo = now - (60 * 60 * 1000);
        const dayAgo = now - (24 * 60 * 60 * 1000);

        const recentEvents = stats.recentEvents || [];
        const errorsLastHour = recentEvents.filter(e => 
            e.timestamp > hourAgo && e.level === 'error'
        ).length;
        const errorsLastDay = recentEvents.filter(e => 
            e.timestamp > dayAgo && e.level === 'error'
        ).length;
        const warningsLastHour = recentEvents.filter(e => 
            e.timestamp > hourAgo && e.level === 'warn'
        ).length;

        // Calculate health status
        let status = 'healthy';
        if (errorsLastHour > 10 || errorsLastDay > 50) {
            status = 'critical';
        } else if (errorsLastHour > 3 || errorsLastDay > 20 || warningsLastHour > 10) {
            status = 'degraded';
        }

        return {
            status,
            errorsLastHour,
            errorsLastDay,
            warningsLastHour,
            categoryBreakdown: stats.byCategory,
            totalEvents: recentEvents.length,
            lastUpdated: stats.lastUpdated
        };
    },

    /**
     * Clear all logs (admin function)
     */
    clearLogs() {
        try {
            localStorage.removeItem(this.LOG_KEY);
            localStorage.removeItem(this.HEALTH_KEY);
        } catch (e) {
            console.error('Failed to clear logs:', e);
        }
    },

    // ===== Convenience logging methods =====

    /**
     * Log debug message
     */
    debug(category, message, data = {}) {
        this.persist(this.createEntry(this.LEVEL.DEBUG, category, message, data));
    },

    /**
     * Log info message
     */
    info(category, message, data = {}) {
        this.persist(this.createEntry(this.LEVEL.INFO, category, message, data));
    },

    /**
     * Log warning message
     */
    warn(category, message, data = {}) {
        this.persist(this.createEntry(this.LEVEL.WARN, category, message, data));
    },

    /**
     * Log error message
     */
    error(category, message, data = {}) {
        this.persist(this.createEntry(this.LEVEL.ERROR, category, message, data));
    },

    // ===== Domain-specific logging methods =====

    /**
     * Log authentication event
     * @param {string} event - Event type (login_success, login_failed, logout)
     * @param {object} data - Event data
     */
    logAuth(event, data = {}) {
        const level = event.includes('failed') || event.includes('blocked') ? 
            this.LEVEL.WARN : this.LEVEL.INFO;
        this.persist(this.createEntry(level, this.CATEGORY.AUTH, event, data));
    },

    /**
     * Log sync event
     * @param {string} event - Event type (sync_start, sync_complete, sync_failed)
     * @param {object} data - Event data
     */
    logSync(event, data = {}) {
        const normalized = this.normalizeSyncPayload(event, data);
        this.persist(this.createEntry(
            normalized.level,
            this.CATEGORY.SYNC,
            normalized.message,
            normalized.data
        ));
    },

    /**
     * Log export event
     * @param {string} event - Event type (export_start, export_complete, export_failed)
     * @param {object} data - Event data
     */
    logExport(event, data = {}) {
        const level = event.includes('failed') ? this.LEVEL.ERROR : this.LEVEL.INFO;
        this.persist(this.createEntry(level, this.CATEGORY.EXPORT, event, data));
    },

    /**
     * Log approval event
     * @param {string} event - Event type (approved, rejected, batch_approved)
     * @param {object} data - Event data
     */
    logApproval(event, data = {}) {
        this.persist(this.createEntry(this.LEVEL.INFO, this.CATEGORY.APPROVAL, event, data));
    },

    /**
     * Log request/solicitation event
     * @param {string} event - Event type (created, updated, submitted)
     * @param {object} data - Event data
     */
    logRequest(event, data = {}) {
        this.persist(this.createEntry(this.LEVEL.INFO, this.CATEGORY.REQUEST, event, data));
    }
};

// Export for browser
if (typeof window !== 'undefined') {
    window.Logger = Logger;
}

