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

        return {
            id: this.generateRequestId(),
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            requestId: context.requestId,
            duration: Date.now() - context.startTime,
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

    /**
     * Persist log entry
     * @param {object} entry - Log entry to persist
     */
    persist(entry) {
        try {
            const logs = this.getLogs();
            
            // Deduplication: Check if we have a very similar error in the last 5 minutes
            if (entry.level === 'error') {
                const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
                const recentSimilarError = logs.find(log => {
                    return log.level === 'error' &&
                           log.category === entry.category &&
                           log.message === entry.message &&
                           new Date(log.timestamp).getTime() > fiveMinutesAgo;
                });
                
                if (recentSimilarError) {
                    // Skip logging the same error again within 5 minutes
                    console.debug(`Skipping duplicate error: ${entry.category}/${entry.message}`);
                    return;
                }
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
            
            // Cleanup old logs every 50 log entries to prevent bloat
            if (logs.length % 50 === 0) {
                this.cleanupOldLogs();
            }
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
            return limit ? logs.slice(0, limit) : logs;
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

    /**
     * Clean up old logs (older than 24 hours)
     * Called automatically during persist to prevent log bloat
     */
    cleanupOldLogs() {
        try {
            const logs = this.getLogs();
            const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
            
            // Keep only logs from the last 24 hours
            const recentLogs = logs.filter(log => {
                const logTime = new Date(log.timestamp).getTime();
                return logTime > dayAgo;
            });
            
            // Only update if we actually removed logs
            if (recentLogs.length < logs.length) {
                localStorage.setItem(this.LOG_KEY, JSON.stringify(recentLogs));
                console.debug(`Cleaned up ${logs.length - recentLogs.length} old log entries`);
            }
        } catch (e) {
            console.error('Failed to cleanup old logs:', e);
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
        const level = event.includes('failed') ? this.LEVEL.ERROR : this.LEVEL.INFO;
        this.persist(this.createEntry(level, this.CATEGORY.SYNC, event, data));
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
