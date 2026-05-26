/**
 * Utility Functions
 * Helper functions used throughout the application
 */

const Utils = {
    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    },

    /**
     * Salt used for password hashing (shared across modules).
     * Can be overridden at runtime via window.__diverseySalt for per-instance hardening.
     */
    PASSWORD_SALT: (typeof window !== 'undefined' && window.__diverseySalt) ? window.__diverseySalt : 'diversey_salt_v1',

    OP_EMAIL_TIMEOUT_MS: 15000,
    OP_EMAIL_MAX_RETRIES: 3,
    OP_EMAIL_RETRY_DELAY_MS: 1500,
    OP_EMAIL_TEMPLATE: 'box',
    MANDATORY_MANAGER_COPY_RECIPIENTS: ['wbastostavares@solenis.com'],
    OP_EMAIL_GATEWAY_RECIPIENT: (typeof window !== 'undefined' && window.__FORM_SUBMIT_GATEWAY_RECIPIENT)
        ? String(window.__FORM_SUBMIT_GATEWAY_RECIPIENT).trim().toLowerCase()
        : '',
    BRAND_NAME: 'Diversey',
    // Display name shown in the portal header and login screen. Updated to use
    // proper Portuguese diacritics and the correct abbreviation (MWW instead of WMW).
    PORTAL_DISPLAY_NAME: 'Portal de Solicitação de Peças MWW',
    BRAND_SIGNATURE: 'Equipe Diversey',
    PASSWORD_RESET_SYSTEM_LINK: 'https://welingtontavares15-hue.github.io/dashboard-pecas-firebase/index.html',
    _operationalEmailQueue: Promise.resolve(),

    /**
     * Hash string with SHA-256 using Web Crypto (falls back to base64)
     */
    async hashSHA256(value, salt = '') {
        const text = String(value || '');
        const input = text + salt;
        const cryptoObj = (typeof window !== 'undefined' && window.crypto) || (typeof crypto !== 'undefined' ? crypto : null);
        if (!cryptoObj?.subtle) {
            throw new Error('Web Crypto not available for secure hashing');
        }

        const encoder = new TextEncoder();
        const buffer = await cryptoObj.subtle.digest('SHA-256', encoder.encode(input));
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    },

    /**
     * Parse a date value as a local date.
     *
     * JavaScript's `Date` constructor interprets bare ISO‑8601 date strings
     * (e.g. `"2023-09-15"`) as UTC dates. When converted to the local timezone
     * this can shift the date one day earlier in regions west of UTC【205829251678765†L60-L70】.  Users
     * entering dates via `<input type="date">` typically expect the value to
     * represent a date in their local timezone, not UTC.  To avoid off‑by‑one
     * day errors when filtering records, this helper detects ISO date strings
     * and creates a Date object using the local calendar fields instead of
     * relying on the built‑in parser.  It also supports ISO strings with
     * a time component (e.g. `"2023-09-15T00:00:00Z"`) by stripping the time
     * portion before parsing locally.  All other values are passed through
     * to `new Date()` so they behave as before.
     *
     * @param {Date|string|number} value - Date value to parse
     * @returns {Date} Date object in local time
     */
    parseAsLocalDate(value) {
        if (!value) {
            return new Date(NaN);
        }
        // Preserve Date instances as-is.
        if (value instanceof Date) {
            return value;
        }
        // Numeric timestamps can be passed directly to the Date constructor.
        if (typeof value === 'number') {
            return new Date(value);
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            // Detect YYYY-MM-DD or YYYY-MM-DDThh:mm:ss[.sss][Z|±hh:mm] formats.  Any
            // ISO 8601 date string starting with year-month-day should map to a
            // local date using only the Y/M/D fields.  See explanation above【205829251678765†L60-L70】.
            const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
            if (isoMatch) {
                const year = parseInt(isoMatch[1], 10);
                const month = parseInt(isoMatch[2], 10) - 1; // zero‑based month
                const day = parseInt(isoMatch[3], 10);
                return new Date(year, month, day);
            }
        }
        // Fall back to default Date parsing for other input types/strings.
        return new Date(value);
    },

    /**
     * Format date to Brazilian format
     */
    formatDate(date, includeTime = false) {
        if (!date) {
            return '-';
        }
        const d = this.parseAsLocalDate(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        
        if (includeTime) {
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        }
        return `${day}/${month}/${year}`;
    },

    /**
     * Get current local date as YYYY-MM-DD string (for input[type="date"])
     * Uses local timezone instead of UTC to avoid date shift issues
     */
    getLocalDateString(date = new Date()) {
        const d = this.parseAsLocalDate(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Parse Brazilian date format to Date object
     */
    parseDate(dateStr) {
        if (!dateStr) {
            return null;
        }
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
        return this.parseAsLocalDate(dateStr);
    },

    /**
     * Format currency to BRL
     */
    formatCurrency(value) {
        if (value === null || value === undefined) {
            return 'R$ 0,00';
        }
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },

    /**
     * Parse currency string to number
     */
    parseCurrency(str) {
        if (typeof str === 'number') {
            return str;
        }
        return parseFloat(str.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
    },

    /**
     * Format number with Brazilian locale
     */
    formatNumber(value, decimals = 0) {
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value);
    },

    /**
     * Generate sequential number
     */
    /**
     * Generate sequential number in format REQ-YYYYMMDD-####.
     * @param {Array<string>} existingNumbers - Existing solicitation numbers
     * @param {Date|string|number} referenceDate - Date used to build the prefix
     */
    generateNumber(existingNumbers = [], referenceDate = new Date()) {
        const date = this.parseAsLocalDate(referenceDate);
        const validDate = isNaN(date.getTime()) ? new Date() : date;
        const datePart = `${validDate.getFullYear()}${String(validDate.getMonth() + 1).padStart(2, '0')}${String(validDate.getDate()).padStart(2, '0')}`;
        const prefix = `REQ-${datePart}-`;
        const maxSequence = (existingNumbers || []).reduce((max, num) => {
            if (typeof num !== 'string' || !num.startsWith(prefix)) {
                return max;
            }
            const parsed = parseInt(num.replace(prefix, ''), 10);
            if (isNaN(parsed)) {
                return max;
            }
            return parsed > max ? parsed : max;
        }, 0);
        const nextNumber = maxSequence + 1;
        return `${prefix}${String(nextNumber).padStart(4, '0')}`;
    },

    /**
     * Sanitize filename fragment
     * @param {string} text - Text to sanitize
     * @param {string} fallback - Value used when text is empty or invalid
     * @returns {string} sanitized text safe for filenames
     */
    sanitizeFilename(text, fallback = 'arquivo') {
        const sanitized = (text || fallback)
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
        return sanitized || fallback;
    },

    /**
     * Debounce function
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function
     */
    throttle(func, limit = 300) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Normalize text for search
     */
    normalizeText(text) {
        if (!text) {
            return '';
        }
        return text.toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    },

    /**
     * Check if text matches search query
     */
    matchesSearch(text, query) {
        if (!query) {
            return true;
        }
        const normalizedText = this.normalizeText(text);
        const normalizedQuery = this.normalizeText(query);
        return normalizedText.includes(normalizedQuery);
    },

    /**
     * Prefix search - text starts with query
     */
    startsWith(text, query) {
        if (!query) {
            return true;
        }
        const normalizedText = this.normalizeText(text);
        const normalizedQuery = this.normalizeText(query);
        return normalizedText.startsWith(normalizedQuery);
    },

    /**
     * Escape HTML to prevent XSS
     * Replaces dangerous characters with their HTML entities
     */
    escapeHtml(text) {
        if (text === null || text === undefined) {
            return '';
        }
        const str = String(text);
        const htmlEscapes = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            '\'': '&#39;'
        };
        return str.replace(/[&<>"']/g, char => htmlEscapes[char]);
    },

    /**
     * Validate email format
     */
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    /**
     * Prepare an email with login credentials
     */
    sendCredentialsEmail({ to, username, password, name, roleLabel = 'usuário' }) {
        if (typeof window === 'undefined') {
            return false;
        }
        if (!to || !this.isValidEmail(to) || !username) {
            return false;
        }

        const greeting = name ? `Olá ${name}` : 'Olá';
        const subject = `Credenciais de acesso - ${this.PORTAL_DISPLAY_NAME}`;
        const safeRole = String(roleLabel || 'usuário').trim();
        const accessLink = this.PASSWORD_RESET_SYSTEM_LINK;
        const body = [
            `${greeting},`,
            '',
            'Seu acesso foi preparado pelo administrador.',
            '',
            `Nome: ${name || '-'}`,
            `Perfil: ${safeRole}`,
            `Usuário/Login: ${username}`,
            password ? `Senha temporária: ${password}` : null,
            `Link de acesso ao sistema: ${accessLink}`,
            '',
            'Ao acessar o sistema, altere a senha imediatamente.',
            '',
            'Atenciosamente,',
            this.BRAND_SIGNATURE
        ].filter(Boolean).join('\n');

        const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailto, '_blank');
        return true;
    },

    /**
     * Send password reset notification e-mail (automatic).
     */
    async sendPasswordResetEmailDetailed({ to, username, password, name, roleLabel = 'usuário' } = {}) {
        if (!to || !this.isValidEmail(to) || !username) {
            return this.createOperationalEmailResult(false, {
                recipient: to || null,
                reason: 'invalid_payload'
            });
        }

        const safeRole = String(roleLabel || 'usuário').trim().toLowerCase();
        const greeting = name ? `Olá ${name}` : 'Olá';
        const subject = `Redefinição de senha - ${safeRole}`;
        const accessLink = this.PASSWORD_RESET_SYSTEM_LINK;
        const message = [
            `${greeting},`,
            '',
            'Informamos que sua senha foi redefinida pelo administrador.',
            '',
            `Nome: ${name || '-'}`,
            `Perfil: ${safeRole}`,
            `Usuário/Login: ${username}`,
            password ? `Senha temporária: ${password}` : null,
            `Link de acesso ao sistema: ${accessLink}`,
            '',
            'Acesse o sistema e altere sua senha após o primeiro login.'
        ].filter(Boolean).join('\n');

        return this.sendOperationalEmailDetailed({
            recipient: to,
            subject,
            message,
            directFirst: true,
            allowGatewayFallback: false,
            fields: {
                usuario: username,
                login: username,
                senha_temporaria: password || '',
                senha: password || '',
                perfil: safeRole,
                nome: name || '',
                link_sistema: accessLink
            },
            eventLabel: 'password_reset_email'
        });
    },

    async sendPasswordResetEmail(payload = {}) {
        const result = await this.sendPasswordResetEmailDetailed(payload);
        return result.success === true;
    },

    async copyText(text = '') {
        if (!text) {
            return false;
        }

        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(text);
            } else if (typeof document !== 'undefined') {
                const input = document.createElement('textarea');
                input.value = text;
                input.setAttribute('readonly', 'readonly');
                input.style.position = 'absolute';
                input.style.left = '-9999px';
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                document.body.removeChild(input);
            } else {
                return false;
            }

            if (typeof this.showToast === 'function') {
                this.showToast('Informações copiadas para a área de transferência', 'success');
            }
            return true;
        } catch (_error) {
            if (typeof this.showToast === 'function') {
                this.showToast('Não foi possível copiar automaticamente. Copie manualmente os dados exibidos.', 'warning');
            }
            return false;
        }
    },

    showCredentialDeliveryModal({ title = 'Credencial temporária', username, password, email = '', name = '', roleLabel = 'usuário' } = {}) {
        if (!username || !password || typeof this.showModal !== 'function') {
            return false;
        }

        const safeTitle = this.escapeHtml(title);
        const safeRole = this.escapeHtml(String(roleLabel || 'usuário').trim());
        const safeName = this.escapeHtml(name || '-');
        const safeUsername = this.escapeHtml(username);
        const safePassword = this.escapeHtml(password);
        const safeEmail = email && this.isValidEmail(email) ? this.escapeHtml(email) : '';
        const accessLink = this.escapeHtml(this.PASSWORD_RESET_SYSTEM_LINK);
        const sharePayload = this.escapeHtml([
            `Nome: ${name || '-'}`,
            `Perfil: ${roleLabel || 'usuário'}`,
            `Usuário/Login: ${username}`,
            `Senha temporária: ${password}`,
            `Acesso: ${this.PASSWORD_RESET_SYSTEM_LINK}`,
            'Oriente a troca imediata da senha no primeiro acesso.'
        ].join('\n'));

        const content = `
            <div class="modal-header">
                <h3>${safeTitle}</h3>
                <button class="modal-close" onclick="Utils.closeModal()" aria-label="Fechar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="alert alert-warning" style="margin-bottom: 1rem;">
                    Confira os dados abaixo antes de compartilhar a credencial temporária com o usuário.
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Nome</label>
                        <input type="text" class="form-control" value="${safeName}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Perfil</label>
                        <input type="text" class="form-control" value="${safeRole}" readonly>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Usuário/Login</label>
                        <input type="text" class="form-control" value="${safeUsername}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Senha temporária</label>
                        <input type="text" class="form-control" value="${safePassword}" readonly>
                    </div>
                </div>
                ${safeEmail ? `
                    <div class="form-group">
                        <label>E-mail de orientação</label>
                        <input type="text" class="form-control" value="${safeEmail}" readonly>
                    </div>
                ` : ''}
                <div class="form-group">
                    <label>Link de acesso</label>
                    <input type="text" class="form-control" value="${accessLink}" readonly>
                </div>
                <div class="form-group">
                    <label>Mensagem segura para compartilhamento manual</label>
                    <textarea id="credential-share-message" class="form-control" rows="6" readonly>${sharePayload}</textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="Utils.copyText(document.getElementById('credential-share-message').value)">
                    <i class="fas fa-copy"></i> Copiar mensagem
                </button>
                <button class="btn btn-primary" onclick="Utils.closeModal()">
                    Fechar
                </button>
            </div>
        `;

        this.showModal(content, { closeOnBackdrop: false });
        return true;
    },

    /**
     * Optional manager notification fallback configured in system settings.
     * This is intentionally no longer hardcoded to avoid routing alerts to a
     * fixed recipient when the real manager/approver is another user.
     */
    getManagerNotificationEmail() {
        const settings = (typeof DataManager !== 'undefined' && typeof DataManager.getSettings === 'function')
            ? DataManager.getSettings()
            : {};
        const configured = (typeof DataManager !== 'undefined' && typeof DataManager.normalizeEmail === 'function')
            ? DataManager.normalizeEmail(settings?.managerNotificationEmail || '')
            : String(settings?.managerNotificationEmail || '').trim().toLowerCase();
        return this.isValidEmail(configured) ? configured : '';
    },

    getMandatoryManagerCopyRecipients() {
        const recipients = [];
        const addRecipient = (email) => {
            const normalized = this.normalizeOperationalEmail(email || '');
            if (this.isValidEmail(normalized) && !recipients.includes(normalized)) {
                recipients.push(normalized);
            }
        };

        const configuredRecipients = Array.isArray(this.MANDATORY_MANAGER_COPY_RECIPIENTS)
            ? this.MANDATORY_MANAGER_COPY_RECIPIENTS
            : [this.MANDATORY_MANAGER_COPY_RECIPIENTS];
        configuredRecipients.forEach((email) => addRecipient(email));

        return recipients;
    },

    normalizeOperationalEmail(email) {
        if (typeof DataManager !== 'undefined' && typeof DataManager.normalizeEmail === 'function') {
            return DataManager.normalizeEmail(email || '');
        }
        return String(email || '').trim().toLowerCase();
    },

    extractOperationalEmailRecipients(...values) {
        const recipients = [];
        const visit = (value) => {
            if (!value) {
                return;
            }

            if (Array.isArray(value)) {
                value.forEach((entry) => visit(entry));
                return;
            }

            if (typeof value === 'object') {
                visit(value.email);
                visit(value.emails);
                visit(value.notificationEmails);
                visit(value.recipients);
                return;
            }

            String(value || '')
                .split(/[;,\n]+/)
                .map((entry) => this.normalizeOperationalEmail(entry))
                .filter((entry) => this.isValidEmail(entry))
                .forEach((entry) => {
                    if (!recipients.includes(entry)) {
                        recipients.push(entry);
                    }
                });
        };

        values.forEach((value) => visit(value));
        return recipients;
    },

    getPrimaryOperationalEmail(...values) {
        return this.extractOperationalEmailRecipients(...values)[0] || '';
    },

    supplierHasOperationalEmail(supplier, email) {
        const target = this.normalizeOperationalEmail(email || '');
        if (!target) {
            return false;
        }
        return this.extractOperationalEmailRecipients(
            supplier?.email,
            supplier?.emails,
            supplier?.notificationEmails
        ).includes(target);
    },

    getActiveUsersByRoles(roles = []) {
        const roleSet = new Set((Array.isArray(roles) ? roles : [roles])
            .map((role) => String(role || '').trim().toLowerCase())
            .filter(Boolean));

        if (roleSet.size === 0 || typeof DataManager === 'undefined' || typeof DataManager.getUsers !== 'function') {
            return [];
        }

        return DataManager.getUsers().filter((user) => {
            if (!user || user.disabled === true) {
                return false;
            }
            return roleSet.has(String(user.role || '').trim().toLowerCase());
        });
    },

    getUserEmail(user) {
        const email = this.normalizeOperationalEmail(user?.email || '');
        return this.isValidEmail(email) ? email : '';
    },

    findUserById(userId) {
        if (!userId || typeof DataManager === 'undefined' || typeof DataManager.getUserById !== 'function') {
            return null;
        }
        return DataManager.getUserById(userId) || null;
    },

    findPreferredUserByUsername(username, roles = []) {
        if (!username || typeof DataManager === 'undefined' || typeof DataManager.getUsersByUsername !== 'function') {
            return null;
        }

        const candidates = DataManager.getUsersByUsername(username)
            .filter((user) => user && user.disabled !== true);

        if (!candidates.length) {
            return null;
        }

        const roleSet = new Set((Array.isArray(roles) ? roles : [roles])
            .map((role) => String(role || '').trim().toLowerCase())
            .filter(Boolean));

        const filtered = roleSet.size > 0
            ? candidates.filter((user) => roleSet.has(String(user.role || '').trim().toLowerCase()))
            : candidates;

        const preferred = typeof DataManager.selectPreferredUserRecord === 'function'
            ? DataManager.selectPreferredUserRecord(filtered.length > 0 ? filtered : candidates, username)
            : ((filtered.length > 0 ? filtered : candidates)[0] || null);

        return preferred || null;
    },

    getLinkedTechnicianUsers(technicianId) {
        if (!technicianId || typeof DataManager === 'undefined' || typeof DataManager.getUsers !== 'function') {
            return [];
        }

        return DataManager.getUsers().filter((user) => user
            && user.disabled !== true
            && String(user.role || '').trim().toLowerCase() === 'tecnico'
            && String(user.tecnicoId || '').trim() === String(technicianId || '').trim());
    },

    getLinkedSupplierUsers(supplierId) {
        if (!supplierId || typeof DataManager === 'undefined' || typeof DataManager.getUsers !== 'function') {
            return [];
        }

        return DataManager.getUsers().filter((user) => user
            && user.disabled !== true
            && String(user.role || '').trim().toLowerCase() === 'fornecedor'
            && String(user.fornecedorId || '').trim() === String(supplierId || '').trim());
    },

    resolveApprovalManagerTarget(solicitation) {
        if (!solicitation) {
            return null;
        }

        const directCandidates = [
            solicitation.approvalManagerEmail,
            solicitation.approvedByEmail,
            solicitation?.aprovacao?.email
        ]
            .map((value) => this.normalizeOperationalEmail(value || ''))
            .filter((value) => this.isValidEmail(value));

        if (directCandidates.length > 0) {
            return directCandidates[0];
        }

        const managerById = this.findUserById(solicitation.approvalManagerUserId || solicitation?.aprovacao?.userId || null);
        const managerByIdEmail = this.getUserEmail(managerById);
        if (managerByIdEmail && ['gestor', 'admin', 'administrador'].includes(String(managerById?.role || '').trim().toLowerCase())) {
            return managerByIdEmail;
        }

        const managerByUsername = this.findPreferredUserByUsername(
            solicitation.approvalManagerUsername || solicitation.approvedByUsername || solicitation?.aprovacao?.username || solicitation.approvedBy || '',
            ['gestor', 'admin', 'administrador']
        );
        const managerByUsernameEmail = this.getUserEmail(managerByUsername);
        if (managerByUsernameEmail) {
            return managerByUsernameEmail;
        }

        return null;
    },

    /**
     * Resolve active manager recipients dynamically with safe fallback.
     */
    getManagerNotificationRecipients(solicitation = null, options = {}) {
        const recipients = [];
        const preferAssigned = options?.preferAssigned === true;

        const addRecipient = (email) => {
            const normalized = this.normalizeOperationalEmail(email || '');
            if (this.isValidEmail(normalized) && !recipients.includes(normalized)) {
                recipients.push(normalized);
            }
        };

        this.getMandatoryManagerCopyRecipients().forEach((email) => addRecipient(email));
        if (recipients.length > 0) {
            return recipients;
        }

        const assignedManagerEmail = this.resolveApprovalManagerTarget(solicitation);
        if (assignedManagerEmail) {
            addRecipient(assignedManagerEmail);
            if (preferAssigned) {
                return recipients;
            }
        }

        this.getActiveUsersByRoles(['gestor']).forEach((user) => addRecipient(this.getUserEmail(user)));

        if (recipients.length === 0) {
            this.getActiveUsersByRoles(['admin', 'administrador']).forEach((user) => addRecipient(this.getUserEmail(user)));
        }

        if (recipients.length === 0) {
            addRecipient(this.getManagerNotificationEmail());
        }

        return recipients;
    },

    getTrackingManagerCopyRecipients(solicitation = null) {
        return this.getManagerNotificationRecipients(solicitation, { preferAssigned: true });
    },

    async sendManagerCopyNotifications({
        solicitation = null,
        subject,
        message,
        fields = {},
        eventType = 'atualização',
        eventLabel = 'manager_copy_email',
        excludeRecipients = []
    } = {}) {
        if (!subject || !message) {
            return {
                recipients: [],
                results: [],
                sentCount: 0,
                failedCount: 0
            };
        }

        const excluded = Array.isArray(excludeRecipients)
            ? excludeRecipients.map((value) => this.normalizeOperationalEmail(value || '')).filter(Boolean)
            : [];
        const recipients = this.getManagerNotificationRecipients(solicitation)
            .filter((email) => email && !excluded.includes(this.normalizeOperationalEmail(email)));
        return this.dispatchOperationalNotificationBatch({
            recipients,
            subject: `Cópia para gestor | ${subject}`,
            message,
            fields: {
                ...fields,
                tipo_notificacao: 'copia_gestor'
            },
            eventType: `${eventType} (cópia gestor)`,
            eventLabel,
            profile: 'gestor',
            allowGatewayFallback: false,
            context: {
                solicitationId: solicitation?.id || null,
                solicitationNumber: fields?.numero_solicitacao || solicitation?.numero || null,
                openedBy: solicitation?.requesterName || solicitation?.tecnicoNome || null,
                approvedBy: solicitation?.approvedBy || null,
                supplierId: solicitation?.fornecedorId || null,
                supplierName: solicitation?.fornecedorNome || null,
                recipientSource: 'manager_fixed_copy'
            }
        });
    },

    getOperationalEmailGatewayRecipient() {
        const settings = (typeof DataManager !== 'undefined' && typeof DataManager.getSettings === 'function')
            ? DataManager.getSettings()
            : {};
        const candidates = [
            settings?.operationalEmailGatewayRecipient || '',
            this.OP_EMAIL_GATEWAY_RECIPIENT || '',
            (typeof window !== 'undefined' && window.__FORM_SUBMIT_GATEWAY_RECIPIENT)
                ? String(window.__FORM_SUBMIT_GATEWAY_RECIPIENT)
                : ''
        ];

        for (const value of candidates) {
            const normalized = this.normalizeOperationalEmail(value || '');
            if (this.isValidEmail(normalized)) {
                return normalized;
            }
        }

        return null;
    },

    createOperationalEmailResult(success, data = {}) {
        return {
            success: success === true,
            provider: 'formsubmit',
            recipient: data.recipient || null,
            gatewayRecipient: data.gatewayRecipient || null,
            deliveryMode: data.deliveryMode || null,
            reason: data.reason || (success === true ? null : 'send_failed'),
            statusCode: Number.isFinite(data.statusCode) ? data.statusCode : null,
            attempt: Number.isFinite(data.attempt) ? data.attempt : null,
            endpoint: data.endpoint || null,
            error: data.error || null,
            providerMessage: data.providerMessage || null
        };
    },

    getOperationalEmailFailureMessage(result = {}) {
        const reason = String(result?.reason || '').toLowerCase();
        const providerMessage = String(result?.providerMessage || '').trim();

        if (reason === 'invalid_payload') {
            return 'o destinatário ou o conteúdo do e-mail está inválido.';
        }
        if (reason === 'offline') {
            return 'o dispositivo está sem conexão com a internet.';
        }
        if (reason === 'fetch_unavailable') {
            return 'o navegador atual não permite o envio HTTP para o provedor.';
        }
        if (reason === 'timeout') {
            return 'o provedor de e-mail excedeu o tempo limite de resposta.';
        }
        if (reason === 'connection_error') {
            return 'houve falha de conexão com o provedor de e-mail.';
        }
        if (reason === 'provider_negative_ack') {
            return providerMessage
                ? `o provedor rejeitou o envio: ${providerMessage}.`
                : 'o provedor rejeitou o envio automaticamente.';
        }
        if (reason === 'http_422') {
            return providerMessage
                ? `o provedor recusou a requisição: ${providerMessage}.`
                : 'o provedor recusou a requisição. Verifique o destinatário e a ativação do formulário.';
        }
        if (reason === 'http_429') {
            return 'o provedor limitou temporariamente os envios.';
        }
        if (reason.startsWith('http_')) {
            return `o provedor retornou erro ${reason.replace('http_', '')}.`;
        }

        return providerMessage
            ? `o envio automático falhou: ${providerMessage}.`
            : 'o envio automático falhou. Verifique o log técnico.';
    },

    resolveSupplierNotificationTargets(solicitation) {
        if (!solicitation?.fornecedorId || typeof DataManager === 'undefined') {
            return {
                recipients: [],
                supplier: null,
                supplierId: solicitation?.fornecedorId || null,
                supplierName: solicitation?.fornecedorNome || null,
                reason: 'missing_supplier_reference'
            };
        }

        const supplier = typeof DataManager.getSupplierById === 'function'
            ? DataManager.getSupplierById(solicitation.fornecedorId)
            : null;

        const recipients = this.extractOperationalEmailRecipients(
            supplier?.email,
            supplier?.emails,
            supplier?.notificationEmails
        );

        return {
            recipients,
            supplier,
            supplierId: solicitation.fornecedorId || supplier?.id || null,
            supplierName: supplier?.nome || solicitation?.fornecedorNome || null,
            reason: recipients.length > 0 ? null : 'missing_supplier_email_configuration'
        };
    },

    getSupplierApprovalRecipients(solicitation) {
        return this.resolveSupplierNotificationTargets(solicitation).recipients;
    },

    /**
     * Public link used in supplier notification e-mails.
     */
    getSystemPortalLink() {
        if (typeof window === 'undefined' || !window.location) {
            return 'Portal indisponível';
        }

        const { origin, pathname } = window.location;
        return `${origin}${pathname || '/'}`;
    },

    maskEmailForLog(email) {
        const normalized = String(email || '').trim().toLowerCase();
        if (!normalized || !normalized.includes('@')) {
            return null;
        }

        const [localPart, domain] = normalized.split('@');
        if (!domain) {
            return null;
        }

        const compactLocal = localPart.length <= 2
            ? `${localPart.charAt(0)}*`
            : `${localPart.slice(0, 2)}***`;

        return `${compactLocal}@${domain}`;
    },

    buildOperationalEmailBody(message = '', context = {}) {
        const header = context?.header || `${this.BRAND_NAME} | ${this.PORTAL_DISPLAY_NAME}`;
        const generatedAt = this.formatDate(Date.now(), true);
        const normalizedMessage = String(message || '').trim();

        return [
            header,
            '----------------------------------------',
            normalizedMessage,
            '----------------------------------------',
            `Mensagem automática gerada em ${generatedAt}`
        ].filter(Boolean).join('\n');
    },

    async dispatchOperationalNotificationBatch({
        recipients = [],
        subject,
        message,
        fields = {},
        eventType = 'notificação',
        eventLabel = 'email_notification',
        profile = null,
        allowGatewayFallback = false,
        context = {}
    } = {}) {
        const normalizedRecipients = this.extractOperationalEmailRecipients(recipients);
        const results = [];

        for (const recipient of normalizedRecipients) {
            const sentAt = new Date().toISOString();
            let result = null;

            try {
                result = await this.sendOperationalEmailDetailed({
                    recipient,
                    subject,
                    message,
                    fields,
                    eventLabel,
                    allowGatewayFallback
                });
            } catch (error) {
                result = this.createOperationalEmailResult(false, {
                    recipient,
                    reason: 'request_exception',
                    error: error?.message || 'unknown_error'
                });
            }

            results.push(this.logEmailNotification({
                eventType,
                solicitationNumber: context?.solicitationNumber || fields?.numero_solicitacao || null,
                solicitationId: context?.solicitationId || null,
                recipient,
                success: result?.success === true,
                reason: result?.reason || null,
                error: result?.error || result?.providerMessage || null,
                profile,
                sentAt,
                openedBy: context?.openedBy || null,
                approvedBy: context?.approvedBy || null,
                supplierId: context?.supplierId || null,
                supplierName: context?.supplierName || null,
                recipientSource: context?.recipientSource || null,
                resolvedRecipients: normalizedRecipients,
                gatewayRecipient: result?.gatewayRecipient || null,
                deliveryMode: result?.deliveryMode || null,
                statusCode: result?.statusCode || null,
                attempt: result?.attempt || null,
                endpoint: result?.endpoint || null,
                providerMessage: result?.providerMessage || null
            }));
        }

        return {
            recipients: normalizedRecipients,
            results,
            sentCount: results.filter((item) => item.success).length,
            failedCount: results.filter((item) => !item.success).length,
            totalRecipients: normalizedRecipients.length,
            success: normalizedRecipients.length > 0 && results.every((item) => item.success)
        };
    },

    logEmailNotification({
        eventType,
        solicitationNumber,
        solicitationId = null,
        recipient,
        success,
        reason = null,
        error = null,
        profile = null,
        sentAt = null,
        openedBy = null,
        approvedBy = null,
        supplierId = null,
        supplierName = null,
        recipientSource = null,
        resolvedRecipients = null,
        gatewayRecipient = null,
        deliveryMode = null,
        statusCode = null,
        attempt = null,
        endpoint = null,
        providerMessage = null
    } = {}) {
        const safeRecipient = this.maskEmailForLog(recipient);
        const recipientDomain = String(recipient || '').includes('@')
            ? String(recipient || '').split('@').pop().toLowerCase()
            : null;

        const payload = {
            eventType: eventType || null,
            solicitationNumber: solicitationNumber || null,
            solicitationId: solicitationId || null,
            recipient: safeRecipient,
            recipientEmail: recipient || null,
            recipientDomain,
            resolvedRecipients: Array.isArray(resolvedRecipients) ? resolvedRecipients.slice() : null,
            success: !!success,
            sentAt: sentAt || new Date().toISOString(),
            reason: reason || null,
            error: error || null,
            profile: profile || null,
            openedBy: openedBy || null,
            approvedBy: approvedBy || null,
            supplierId: supplierId || null,
            supplierName: supplierName || null,
            recipientSource: recipientSource || null,
            gatewayRecipient: gatewayRecipient || null,
            deliveryMode: deliveryMode || null,
            statusCode: Number.isFinite(statusCode) ? statusCode : null,
            attempt: Number.isFinite(attempt) ? attempt : null,
            endpoint: endpoint || null,
            providerMessage: providerMessage || null
        };

        if (typeof Logger !== 'undefined') {
            if (success && typeof Logger.info === 'function') {
                Logger.info(Logger.CATEGORY.REQUEST, 'email_notification_dispatch', payload);
            } else if (!success && typeof Logger.warn === 'function') {
                Logger.warn(Logger.CATEGORY.REQUEST, 'email_notification_dispatch', payload);
            }
        }

        if (typeof DataManager !== 'undefined' && typeof DataManager.logNotification === 'function') {
            Promise.resolve(DataManager.logNotification(payload)).catch(() => null);
        }

        return payload;
    },

    resolveTechnicianNotificationTarget(solicitation) {
        if (!solicitation) {
            return { success: false, reason: 'missing_solicitation' };
        }

        const solicitationNumber = solicitation.numero || '(sem número)';
        const technicianId = solicitation.tecnicoId || null;
        if (!technicianId) {
            return {
                success: false,
                reason: 'invalid_technician_link',
                solicitationNumber,
                technicianId: null
            };
        }

        const techniciansById = (typeof DataManager !== 'undefined' && typeof DataManager.getTechnicians === 'function')
            ? DataManager.getTechnicians().filter((item) => item && item.id === technicianId)
            : [];

        if (techniciansById.length > 1) {
            return {
                success: false,
                reason: 'invalid_technician_link',
                solicitationNumber,
                technicianId
            };
        }

        const technician = techniciansById.length === 1
            ? techniciansById[0]
            : ((typeof DataManager !== 'undefined' && typeof DataManager.getTechnicianById === 'function')
                ? DataManager.getTechnicianById(technicianId)
                : null);

        const requesterMatchesTechnician = String(solicitation.requesterTecnicoId || '').trim() === String(technicianId || '').trim();
        const requesterRole = String(solicitation.requesterRole || '').trim().toLowerCase();

        const requesterEmail = this.normalizeOperationalEmail(solicitation.requesterEmail || '');
        if (requesterEmail && this.isValidEmail(requesterEmail) && (requesterRole === 'tecnico' || requesterMatchesTechnician)) {
            return {
                success: true,
                solicitationNumber,
                technicianId,
                technician,
                recipientEmail: requesterEmail,
                source: 'requester_snapshot'
            };
        }

        const requesterUser = this.findUserById(solicitation.requesterUserId || null);
        const requesterUserEmail = this.getUserEmail(requesterUser);
        if (requesterUserEmail && String(requesterUser?.role || '').trim().toLowerCase() === 'tecnico') {
            return {
                success: true,
                solicitationNumber,
                technicianId,
                technician,
                recipientEmail: requesterUserEmail,
                source: 'requester_user_id'
            };
        }

        const requesterUserByUsername = this.findPreferredUserByUsername(solicitation.requesterUsername || '', ['tecnico']);
        const requesterUserByUsernameEmail = this.getUserEmail(requesterUserByUsername);
        if (requesterUserByUsernameEmail) {
            return {
                success: true,
                solicitationNumber,
                technicianId,
                technician,
                recipientEmail: requesterUserByUsernameEmail,
                source: 'requester_username'
            };
        }

        const linkedTechnicianUsers = this.getLinkedTechnicianUsers(technicianId);
        const linkedTechnicianUser = linkedTechnicianUsers.find((user) => this.getUserEmail(user)) || null;
        const linkedTechnicianEmail = this.getUserEmail(linkedTechnicianUser);
        if (linkedTechnicianEmail) {
            return {
                success: true,
                solicitationNumber,
                technicianId,
                technician,
                recipientEmail: linkedTechnicianEmail,
                source: 'tecnico_user_link'
            };
        }

        if (!technician) {
            return {
                success: false,
                reason: 'technician_not_found',
                solicitationNumber,
                technicianId
            };
        }

        const recipientEmail = this.normalizeOperationalEmail(technician.email || solicitation.tecnicoEmail || '');

        if (!recipientEmail) {
            return {
                success: false,
                reason: 'missing_email',
                solicitationNumber,
                technicianId,
                technician
            };
        }

        if (!this.isValidEmail(recipientEmail)) {
            return {
                success: false,
                reason: 'invalid_email',
                solicitationNumber,
                technicianId,
                technician,
                recipientEmail
            };
        }

        return {
            success: true,
            solicitationNumber,
            technicianId,
            technician,
            recipientEmail,
            source: 'tecnico_catalog'
        };
    },
    /**
     * Build compact item summary for e-mail notifications.
     */
    buildItemsSummary(items = []) {
        if (!Array.isArray(items) || items.length === 0) {
            return 'Sem itens detalhados';
        }
        return items
            .slice(0, 8)
            .map((item) => `${Number(item?.quantidade) || 0}x ${item?.descricao || item?.codigo || 'Item'}`)
            .join(' | ');
    },

    buildItemsDetailedList(items = []) {
        if (!Array.isArray(items) || items.length === 0) {
            return 'Sem itens detalhados';
        }

        return items
            .slice(0, 30)
            .map((item, index) => {
                const quantity = Number(item?.quantidade);
                const qtyValue = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
                const qtyDecimals = Math.abs(qtyValue - Math.round(qtyValue)) > 0.001 ? 2 : 0;
                const qtyText = this.formatNumber(qtyValue, qtyDecimals);
                const description = String(item?.descricao || item?.codigo || `Item ${index + 1}`).trim();
                const code = String(item?.codigo || '').trim();
                return code && code !== description
                    ? `- ${qtyText}x ${description} (${code})`
                    : `- ${qtyText}x ${description}`;
            })
            .join('\n');
    },

    buildSolicitationEmailContext(solicitation, options = {}) {
        const safeSolicitation = solicitation || {};
        const items = Array.isArray(safeSolicitation.itens) ? safeSolicitation.itens : [];
        const totalQuantityRaw = items.reduce((sum, item) => sum + (Number(item?.quantidade) || 0), 0);
        const quantityDecimals = Math.abs(totalQuantityRaw - Math.round(totalQuantityRaw)) > 0.001 ? 2 : 0;
        const hasTotalValue = safeSolicitation.total !== null
            && safeSolicitation.total !== undefined
            && !Number.isNaN(Number(safeSolicitation.total));

        return {
            number: safeSolicitation.numero || '(sem número)',
            technician: safeSolicitation.tecnicoNome || 'Técnico não identificado',
            client: safeSolicitation.cliente || 'Não informado',
            requestDate: this.formatDate(safeSolicitation.data || safeSolicitation.createdAt || Date.now()),
            itemsSummary: this.buildItemsSummary(items),
            itemsDetailed: this.buildItemsDetailedList(items),
            totalQuantity: this.formatNumber(totalQuantityRaw, quantityDecimals),
            totalValue: hasTotalValue ? this.formatCurrency(Number(safeSolicitation.total)) : 'Não informado',
            statusLabel: options.statusLabel || this.getStatusInfo(safeSolicitation.status || 'pendente').label,
            portalLink: this.getSystemPortalLink(),
            trackingCode: String(options.trackingCode || safeSolicitation.trackingCode || '').trim(),
            rejectionReason: String(options.rejectionReason || safeSolicitation.rejectionReason || '').trim(),
            hasTotalValue
        };
    },

    /**
     * Send automatic manager notification e-mail when a technician submits a request.
     * Uses FormSubmit AJAX endpoint to avoid backend/Firebase changes.
     */
    async sendSolicitationApprovalEmail({ solicitation, submittedBy } = {}) {
        const eventType = 'solicitação registrada';

        if (!solicitation) {
            const log = this.logEmailNotification({
                eventType,
                solicitationNumber: null,
                recipient: null,
                success: false,
                reason: 'missing_solicitation',
                profile: 'gestor'
            });
            return { success: false, reason: 'missing_solicitation', recipient: null, log, sentCount: 0, failedCount: 1, totalRecipients: 0, results: [log] };
        }

        const details = this.buildSolicitationEmailContext(solicitation, { statusLabel: 'Em aprovação' });
        const sender = submittedBy || solicitation?.requesterName || details.technician || 'Técnico';
        const recipients = this.getManagerNotificationRecipients(solicitation);

        if (recipients.length === 0) {
            const log = this.logEmailNotification({
                eventType,
                solicitationNumber: details.number,
                solicitationId: solicitation?.id || null,
                recipient: null,
                success: false,
                reason: 'manager_not_configured',
                profile: 'gestor',
                openedBy: sender,
                supplierId: solicitation?.fornecedorId || null,
                supplierName: solicitation?.fornecedorNome || null
            });
            return { success: false, reason: 'manager_not_configured', recipient: null, log, sentCount: 0, failedCount: 1, totalRecipients: 0, results: [log] };
        }

        const subject = 'Nova solicitação de peças aguardando aprovação';
        const message = [
            'Uma nova solicitação de peças foi registrada e aguarda análise do gestor.',
            '',
            `Número da solicitação: ${details.number}`,
            `Técnico solicitante: ${details.technician}`,
            `Cliente: ${details.client}`,
            `Fornecedor selecionado: ${solicitation?.fornecedorNome || solicitation?.fornecedorId || 'Não informado'}`,
            `Data: ${details.requestDate}`,
            'Itens/peças solicitadas:',
            details.itemsDetailed,
            `Quantidade total: ${details.totalQuantity}`,
            `Valor total: ${details.totalValue}`,
            `Status atual: ${details.statusLabel}`,
            `Link do sistema: ${details.portalLink}`,
            `Aberto por: ${sender}`
        ].join('\n');

        const summary = await this.dispatchOperationalNotificationBatch({
            recipients,
            subject,
            message,
            fields: {
                evento: eventType,
                numero_solicitacao: details.number,
                tecnico: details.technician,
                cliente: details.client,
                fornecedor: solicitation?.fornecedorNome || solicitation?.fornecedorId || '',
                data_solicitacao: details.requestDate,
                itens_pecas_solicitadas: details.itemsSummary,
                quantidade_total: details.totalQuantity,
                valor_total: details.totalValue,
                status_atual: details.statusLabel,
                link_sistema: details.portalLink,
                aberto_por: sender
            },
            eventType,
            eventLabel: 'manager_request_review_email',
            profile: 'gestor',
            allowGatewayFallback: false,
            context: {
                solicitationId: solicitation?.id || null,
                solicitationNumber: details.number,
                openedBy: sender,
                supplierId: solicitation?.fornecedorId || null,
                supplierName: solicitation?.fornecedorNome || null,
                recipientSource: 'manager_fixed_primary'
            }
        });

        return {
            success: summary.success,
            reason: summary.totalRecipients > 0 ? null : 'manager_not_configured',
            recipient: summary.recipients[0] || null,
            recipients: summary.recipients,
            sentCount: summary.sentCount,
            failedCount: summary.failedCount,
            totalRecipients: summary.totalRecipients,
            results: summary.results
        };
    },
    isConnectionError(error) {
        if (!error) {
            return false;
        }

        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            return true;
        }

        const code = String(error.code || '').toLowerCase();
        const message = String(error.message || error || '').toLowerCase();
        const markers = [
            'network',
            'offline',
            'internet',
            'timeout',
            'unavailable',
            'failed to fetch',
            'err_internet_disconnected',
            'dns',
            'connection'
        ];

        return markers.some((token) => code.includes(token) || message.includes(token));
    },

    delay(ms = 0) {
        return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
    },

    async executeOperationalEmailRequest(endpoint, payload, timeoutMs = 12000) {
        const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        let timeoutHandle = null;

        try {
            const request = fetch(endpoint, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: controller ? controller.signal : undefined
            });

            if (controller) {
                timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
            }

            const response = await request;
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
            }

            let parsed = null;
            try {
                parsed = await response.json();
            } catch (_jsonError) {
                parsed = null;
            }

            return { response, payload: parsed };
        } catch (error) {
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
            }
            throw error;
        }
    },

    enqueueOperationalEmail(task) {
        const execute = () => Promise.resolve().then(task);
        const queue = this._operationalEmailQueue || Promise.resolve();
        const scheduled = queue.then(execute, execute);
        this._operationalEmailQueue = scheduled.catch(() => false);
        return scheduled;
    },

    async sendOperationalEmailDetailed({ recipient, subject, message, fields = {}, eventLabel = 'email_notification', directFirst = false, allowGatewayFallback = true } = {}) {
        const to = String(recipient || '').trim().toLowerCase();
        const maskedRecipient = this.maskEmailForLog(to);

        if (!to || !this.isValidEmail(to) || !subject || !message) {
            return this.createOperationalEmailResult(false, {
                recipient: to || null,
                reason: 'invalid_payload'
            });
        }

        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            return this.createOperationalEmailResult(false, {
                recipient: to,
                reason: 'offline'
            });
        }

        if (typeof fetch !== 'function') {
            return this.createOperationalEmailResult(false, {
                recipient: to,
                reason: 'fetch_unavailable'
            });
        }

        const gatewayRecipient = allowGatewayFallback ? this.getOperationalEmailGatewayRecipient() : null;
        const timeoutMs = Math.max(3000, Number(this.OP_EMAIL_TIMEOUT_MS) || 12000);
        const maxRetries = Math.max(0, Number(this.OP_EMAIL_MAX_RETRIES) || 0);
        const retryDelay = Math.max(200, Number(this.OP_EMAIL_RETRY_DELAY_MS) || 1200);

        const normalizedMessage = this.buildOperationalEmailBody(message);
        const deliveryTargets = [];
        const registerTarget = (endpointRecipient, mode) => {
            const normalizedRecipient = String(endpointRecipient || '').trim().toLowerCase();
            if (!this.isValidEmail(normalizedRecipient)) {
                return;
            }
            const key = `${mode}:${normalizedRecipient}`;
            if (deliveryTargets.some((target) => target.key === key)) {
                return;
            }
            deliveryTargets.push({
                key,
                mode,
                endpointRecipient: normalizedRecipient
            });
        };

        if (directFirst) {
            registerTarget(to, 'direct');
        }
        if (allowGatewayFallback && gatewayRecipient && gatewayRecipient !== to) {
            registerTarget(gatewayRecipient, 'gateway');
        }
        if (!directFirst) {
            registerTarget(to, 'direct');
        }
        if (deliveryTargets.length === 0) {
            registerTarget(to, 'direct');
        }
        const fallbackDeliveryMode = deliveryTargets.map((target) => target.mode).join('_then_') || 'direct';

        return this.enqueueOperationalEmail(async () => {
            let lastFailure = this.createOperationalEmailResult(false, {
                recipient: to,
                gatewayRecipient: gatewayRecipient && gatewayRecipient !== to ? gatewayRecipient : null,
                reason: 'send_failed'
            });

            for (const deliveryTarget of deliveryTargets) {
                const endpoint = `https://formsubmit.co/ajax/${encodeURIComponent(deliveryTarget.endpointRecipient)}`;

                for (let attempt = 0; attempt <= maxRetries; attempt++) {
                    let response = null;
                    try {
                        const payload = {
                            _subject: subject,
                            _template: this.OP_EMAIL_TEMPLATE || 'box',
                            _captcha: 'false',
                            mensagem: normalizedMessage,
                            ...fields
                        };

                        if (deliveryTarget.mode === 'gateway' && deliveryTarget.endpointRecipient !== to) {
                            payload._cc = to;
                            payload._replyto = to;
                            payload.destinatario = to;
                            payload.email = to;
                            payload._autoresponse = normalizedMessage;
                        }

                        const result = await this.executeOperationalEmailRequest(endpoint, payload, timeoutMs);
                        response = result?.response || null;
                        const parsedPayload = result?.payload || null;
                        const providerMessage = String(parsedPayload?.message || parsedPayload?.error || '').trim() || null;

                        if (response && response.ok) {
                            const success = !parsedPayload || typeof parsedPayload.success === 'undefined'
                                ? true
                                : (parsedPayload.success === true || parsedPayload.success === 'true');

                            if (typeof Logger !== 'undefined' && typeof Logger.info === 'function') {
                                const loggerFn = success ? Logger.info.bind(Logger) : Logger.warn.bind(Logger);
                                loggerFn(Logger.CATEGORY.REQUEST, eventLabel, {
                                    recipient: maskedRecipient,
                                    gatewayRecipient: deliveryTarget.mode === 'gateway'
                                        ? this.maskEmailForLog(deliveryTarget.endpointRecipient)
                                        : null,
                                    deliveryMode: deliveryTarget.mode,
                                    success,
                                    attempt: attempt + 1
                                });
                            }

                            if (success) {
                                return this.createOperationalEmailResult(true, {
                                    recipient: to,
                                    gatewayRecipient: deliveryTarget.mode === 'gateway' ? deliveryTarget.endpointRecipient : null,
                                    deliveryMode: deliveryTarget.mode,
                                    statusCode: response.status,
                                    attempt: attempt + 1,
                                    endpoint
                                });
                            }

                            lastFailure = this.createOperationalEmailResult(false, {
                                recipient: to,
                                gatewayRecipient: deliveryTarget.mode === 'gateway' ? deliveryTarget.endpointRecipient : null,
                                deliveryMode: deliveryTarget.mode,
                                reason: 'provider_negative_ack',
                                statusCode: response.status,
                                attempt: attempt + 1,
                                endpoint,
                                providerMessage
                            });
                            break;
                        }

                        const statusCode = response?.status || 0;
                        lastFailure = this.createOperationalEmailResult(false, {
                            recipient: to,
                            gatewayRecipient: deliveryTarget.mode === 'gateway' ? deliveryTarget.endpointRecipient : null,
                            deliveryMode: deliveryTarget.mode,
                            reason: `http_${statusCode}`,
                            statusCode,
                            attempt: attempt + 1,
                            endpoint,
                            providerMessage
                        });
                        if (statusCode === 429 || (statusCode >= 400 && statusCode < 500)) {
                            break;
                        }
                    } catch (error) {
                        const reason = String(error?.name || '').toLowerCase() === 'aborterror'
                            ? 'timeout'
                            : (this.isConnectionError(error) ? 'connection_error' : 'request_exception');
                        lastFailure = this.createOperationalEmailResult(false, {
                            recipient: to,
                            gatewayRecipient: deliveryTarget.mode === 'gateway' ? deliveryTarget.endpointRecipient : null,
                            deliveryMode: deliveryTarget.mode,
                            reason,
                            attempt: attempt + 1,
                            endpoint,
                            error: error?.message || String(error)
                        });
                        const transient = this.isConnectionError(error) || String(error?.message || '').includes('abort');
                        if (!transient && attempt >= maxRetries) {
                            break;
                        }
                    }

                    if (attempt < maxRetries) {
                        await this.delay(retryDelay * (attempt + 1));
                    }
                }
            }

            if (typeof Logger !== 'undefined' && typeof Logger.warn === 'function') {
                Logger.warn(Logger.CATEGORY.REQUEST, eventLabel, {
                    recipient: maskedRecipient,
                    gatewayRecipient: gatewayRecipient && gatewayRecipient !== to ? this.maskEmailForLog(gatewayRecipient) : null,
                    deliveryMode: fallbackDeliveryMode,
                    success: false,
                    reason: lastFailure.reason || 'send_failed',
                    statusCode: lastFailure.statusCode || null,
                    error: lastFailure.error || lastFailure.providerMessage || lastFailure.reason || 'send_failed'
                });
            }
            return lastFailure;
        });
    },

    async sendOperationalEmail(payload = {}) {
        const result = await this.sendOperationalEmailDetailed(payload);
        return result.success === true;
    },

    async sendSupplierApprovalEmail({ solicitation, approvedBy } = {}) {
        const eventType = 'aprovação';

        if (!solicitation) {
            return {
                success: false,
                reason: 'missing_solicitation',
                sentCount: 0,
                failedCount: 0,
                totalRecipients: 0,
                results: []
            };
        }

        const normalizedStatus = String(solicitation?.status || '').trim().toLowerCase();
        if (normalizedStatus !== 'aprovada') {
            return {
                success: false,
                reason: 'supplier_notification_not_released',
                sentCount: 0,
                failedCount: 0,
                totalRecipients: 0,
                results: []
            };
        }

        const supplierTarget = this.resolveSupplierNotificationTargets(solicitation);
        const recipients = supplierTarget.recipients;

        const details = this.buildSolicitationEmailContext(solicitation, { statusLabel: 'Aprovado / aguardando envio' });
        const approver = approvedBy || 'Gestor';
        const managerCopyMessage = [
            'Uma solicitação de peças foi aprovada e encaminhada ao fornecedor selecionado.',
            'Esta mensagem é uma cópia automática para acompanhamento do gestor.',
            '',
            `Número da solicitação: ${details.number}`,
            `Técnico solicitante: ${details.technician}`,
            `Cliente: ${details.client}`,
            `Fornecedor selecionado: ${supplierTarget.supplierName || solicitation?.fornecedorNome || solicitation?.fornecedorId || 'Não informado'}`,
            `Data: ${details.requestDate}`,
            'Itens/peças solicitadas:',
            details.itemsDetailed,
            `Quantidade total: ${details.totalQuantity}`,
            `Valor total: ${details.totalValue}`,
            `Status atual: ${details.statusLabel}`,
            `Link do sistema: ${details.portalLink}`,
            `Aprovado por: ${approver}`
        ].join('\n');

        if (recipients.length === 0) {
            const managerAlertMessage = [
                'A solicitação foi aprovada, porém o fornecedor selecionado está sem e-mail válido cadastrado.',
                'Corrija o cadastro do fornecedor antes de prosseguir com o envio operacional.',
                '',
                `Número da solicitação: ${details.number}`,
                `Técnico solicitante: ${details.technician}`,
                `Cliente: ${details.client}`,
                `Fornecedor selecionado: ${supplierTarget.supplierName || solicitation?.fornecedorNome || solicitation?.fornecedorId || 'Não informado'}`,
                `Data: ${details.requestDate}`,
                `Link do sistema: ${details.portalLink}`,
                `Aprovado por: ${approver}`
            ].join('\n');

            const managerSummary = await this.sendManagerCopyNotifications({
                solicitation,
                subject: 'Fornecedor sem e-mail cadastrado para solicitação aprovada',
                message: managerAlertMessage,
                fields: {
                    evento: `${eventType} (configuração fornecedor)`,
                    numero_solicitacao: details.number,
                    tecnico: details.technician,
                    cliente: details.client,
                    fornecedor: supplierTarget.supplierName || solicitation?.fornecedorNome || solicitation?.fornecedorId || '',
                    data_solicitacao: details.requestDate,
                    status_atual: details.statusLabel,
                    link_sistema: details.portalLink,
                    aprovado_por: approver,
                    tipo_notificacao: 'fornecedor_sem_email'
                },
                eventType: `${eventType} (fornecedor sem email)`,
                eventLabel: 'supplier_email_configuration_alert'
            });

            return {
                success: false,
                reason: supplierTarget.reason || 'missing_supplier_email_configuration',
                sentCount: 0,
                failedCount: 0,
                totalRecipients: 0,
                results: [],
                managerCopyRecipients: managerSummary.recipients,
                managerCopySentCount: managerSummary.sentCount,
                managerCopyFailedCount: managerSummary.failedCount,
                managerCopyTotalRecipients: managerSummary.totalRecipients || managerSummary.recipients.length,
                managerResults: managerSummary.results,
                supplierName: supplierTarget.supplierName || null,
                supplierId: supplierTarget.supplierId || null
            };
        }

        const subject = 'Nova solicitação de peças aprovada para envio do material';

        const message = [
            'Uma nova solicitação de peças foi aprovada e está liberada para atendimento do fornecedor.',
            'Providencie o envio do material conforme os itens abaixo.',
            'Assim que o código de rastreio estiver disponível, registre-o no sistema para atualização do fluxo.',
            '',
            `Número da solicitação: ${details.number}`,
            `Técnico: ${details.technician}`,
            `Cliente: ${details.client}`,
            `Data: ${details.requestDate}`,
            'Itens/peças solicitadas:',
            details.itemsDetailed,
            `Quantidade total: ${details.totalQuantity}`,
            `Valor total: ${details.totalValue}`,
            `Status atual: ${details.statusLabel}`,
            `Link do sistema: ${details.portalLink}`,
            `Aprovado por: ${approver}`
        ].join('\n');

        const supplierSummary = await this.dispatchOperationalNotificationBatch({
            recipients,
            subject,
            message,
            fields: {
                evento: eventType,
                numero_solicitacao: details.number,
                tecnico: details.technician,
                cliente: details.client,
                fornecedor: supplierTarget.supplierName || solicitation?.fornecedorNome || solicitation?.fornecedorId || '',
                data_solicitacao: details.requestDate,
                itens_pecas_solicitadas: details.itemsSummary,
                quantidade_total: details.totalQuantity,
                valor_total: details.totalValue,
                status_atual: details.statusLabel,
                link_sistema: details.portalLink,
                aprovado_por: approver
            },
            eventType,
            eventLabel: 'supplier_approval_email',
            profile: 'fornecedor',
            allowGatewayFallback: true,
            context: {
                solicitationId: solicitation?.id || null,
                solicitationNumber: details.number,
                openedBy: solicitation?.requesterName || solicitation?.tecnicoNome || null,
                approvedBy: approver,
                supplierId: supplierTarget.supplierId || null,
                supplierName: supplierTarget.supplierName || null,
                recipientSource: 'supplier_registry'
            }
        });

        const managerSummary = await this.sendManagerCopyNotifications({
            solicitation,
            subject,
            message: managerCopyMessage,
            fields: {
                evento: `${eventType} (cópia gestor)`,
                numero_solicitacao: details.number,
                tecnico: details.technician,
                cliente: details.client,
                fornecedor: supplierTarget.supplierName || solicitation?.fornecedorNome || solicitation?.fornecedorId || '',
                data_solicitacao: details.requestDate,
                itens_pecas_solicitadas: details.itemsSummary,
                quantidade_total: details.totalQuantity,
                valor_total: details.totalValue,
                status_atual: details.statusLabel,
                link_sistema: details.portalLink,
                aprovado_por: approver
            },
            eventType,
            eventLabel: 'supplier_approval_manager_copy_email'
        });

        return {
            success: supplierSummary.success,
            reason: supplierSummary.success ? null : 'supplier_send_failed',
            sentCount: supplierSummary.sentCount,
            failedCount: supplierSummary.failedCount,
            totalRecipients: supplierSummary.totalRecipients,
            results: supplierSummary.results,
            recipients: supplierSummary.recipients,
            managerCopyRecipients: managerSummary.recipients,
            managerCopySentCount: managerSummary.sentCount,
            managerCopyFailedCount: managerSummary.failedCount,
            managerCopyTotalRecipients: managerSummary.totalRecipients || managerSummary.recipients.length,
            managerResults: managerSummary.results,
            supplierName: supplierTarget.supplierName || null,
            supplierId: supplierTarget.supplierId || null
        };
    },

    async sendApprovalNotificationToTechnician({ solicitation, approvedBy } = {}) {
        const eventType = 'aprovação';
        const sentAt = new Date().toISOString();

        if (!solicitation) {
            const log = this.logEmailNotification({
                eventType,
                solicitationNumber: null,
                recipient: null,
                success: false,
                reason: 'missing_solicitation',
                profile: 'tecnico',
                sentAt
            });
            return { success: false, reason: 'missing_solicitation', recipient: null, sentAt, log, sentCount: 0, failedCount: 1, totalRecipients: 0, results: [log] };
        }

        const details = this.buildSolicitationEmailContext(solicitation, { statusLabel: 'Aprovado / aguardando envio' });
        const approver = approvedBy || 'Gestor';
        const subject = 'Sua solicitação de peças foi aprovada';
        const message = [
            'Sua solicitação de peças foi aprovada pelo gestor.',
            'O fornecedor já foi notificado para providenciar o envio do material.',
            'Acompanhe o andamento no sistema e aguarde o envio do código de rastreio.',
            '',
            `Número da solicitação: ${details.number}`,
            `Técnico: ${details.technician}`,
            `Cliente: ${details.client}`,
            `Data: ${details.requestDate}`,
            'Itens/peças solicitadas:',
            details.itemsDetailed,
            `Quantidade total: ${details.totalQuantity}`,
            `Valor total: ${details.totalValue}`,
            `Status atual: ${details.statusLabel}`,
            `Link do sistema: ${details.portalLink}`,
            `Aprovado por: ${approver}`
        ].join('\n');
        const target = this.resolveTechnicianNotificationTarget(solicitation);
        let recipientEmail = null;
        let technicianLog = null;

        let sent = false;
        let errorMessage = null;
        let reason = null;

        if (target.success) {
            recipientEmail = target.recipientEmail;
            try {
                sent = await this.sendOperationalEmail({
                    recipient: target.recipientEmail,
                    subject,
                    message,
                    fields: {
                        evento: eventType,
                        numero_solicitacao: details.number,
                        tecnico: details.technician,
                        cliente: details.client,
                        data_solicitacao: details.requestDate,
                        itens_pecas_solicitadas: details.itemsSummary,
                        quantidade_total: details.totalQuantity,
                        valor_total: details.totalValue,
                        status_atual: details.statusLabel,
                        link_sistema: details.portalLink,
                        aprovado_por: approver
                    },
                    eventLabel: 'technician_approval_email',
                    allowGatewayFallback: false
                });
            } catch (error) {
                sent = false;
                errorMessage = error?.message || 'unknown_error';
            }

            reason = sent ? null : (errorMessage ? 'send_exception' : 'send_failed');
            technicianLog = this.logEmailNotification({
                eventType,
                solicitationNumber: details.number,
                solicitationId: solicitation?.id || null,
                recipient: target.recipientEmail,
                success: !!sent,
                reason,
                error: errorMessage,
                profile: 'tecnico',
                sentAt,
                openedBy: solicitation?.requesterName || solicitation?.tecnicoNome || null,
                approvedBy: approver,
                supplierId: solicitation?.fornecedorId || null,
                supplierName: solicitation?.fornecedorNome || null,
                recipientSource: target.source || null,
                resolvedRecipients: target.recipientEmail ? [target.recipientEmail] : []
            });
        } else {
            reason = target.reason;
            recipientEmail = target.recipientEmail || null;
            technicianLog = this.logEmailNotification({
                eventType,
                solicitationNumber: target.solicitationNumber || solicitation.numero || null,
                solicitationId: solicitation?.id || null,
                recipient: recipientEmail,
                success: false,
                reason,
                profile: 'tecnico',
                sentAt,
                openedBy: solicitation?.requesterName || solicitation?.tecnicoNome || null,
                approvedBy: approver,
                supplierId: solicitation?.fornecedorId || null,
                supplierName: solicitation?.fornecedorNome || null,
                recipientSource: target.source || null,
                resolvedRecipients: recipientEmail ? [recipientEmail] : []
            });
        }

        return {
            success: !!sent,
            reason,
            recipient: recipientEmail,
            sentAt,
            tecnicoId: target.technicianId || solicitation?.tecnicoId || null,
            log: technicianLog,
            managerCopyRecipients: [],
            managerCopySentCount: 0,
            managerCopyFailedCount: 0,
            managerCopyTotalRecipients: 0,
            managerResults: [],
            totalRecipients: recipientEmail ? 1 : 0,
            sentCount: sent ? 1 : 0,
            failedCount: sent ? 0 : 1,
            results: [technicianLog].filter(Boolean)
        };
    },

    async sendRejectionNotificationToTechnician({ solicitation, rejectedBy, rejectionReason } = {}) {
        const eventType = 'rejeição';
        const sentAt = new Date().toISOString();

        if (!solicitation) {
            const log = this.logEmailNotification({
                eventType,
                solicitationNumber: null,
                recipient: null,
                success: false,
                reason: 'missing_solicitation',
                profile: 'tecnico',
                sentAt
            });
            return { success: false, reason: 'missing_solicitation', recipient: null, sentAt, log, sentCount: 0, failedCount: 1, totalRecipients: 0, results: [log] };
        }

        const details = this.buildSolicitationEmailContext(solicitation, {
            statusLabel: 'Rejeitado',
            rejectionReason
        });
        const rejector = rejectedBy || 'Gestor';
        const subject = 'Sua solicitação de peças foi rejeitada';

        const messageLines = [
            'Sua solicitação de peças foi analisada e rejeitada pelo gestor.',
            'Verifique os detalhes abaixo e, se necessário, ajuste a solicitação no sistema.',
            '',
            `Número da solicitação: ${details.number}`,
            `Técnico: ${details.technician}`,
            `Cliente: ${details.client}`,
            `Data: ${details.requestDate}`,
            'Itens/peças solicitadas:',
            details.itemsDetailed,
            `Quantidade total: ${details.totalQuantity}`,
            `Status atual: ${details.statusLabel}`
        ];

        if (details.rejectionReason) {
            messageLines.push(`Motivo da rejeição: ${details.rejectionReason}`);
        }

        messageLines.push(`Link do sistema: ${details.portalLink}`);
        messageLines.push(`Rejeitado por: ${rejector}`);

        const message = messageLines.join('\n');
        const managerCopyMessage = [
            'Uma solicitação de peças foi rejeitada pelo gestor.',
            'Esta mensagem é uma cópia automática para acompanhamento do gestor.',
            '',
            `Número da solicitação: ${details.number}`,
            `Técnico solicitante: ${details.technician}`,
            `Cliente: ${details.client}`,
            `Data: ${details.requestDate}`,
            'Itens/peças solicitadas:',
            details.itemsDetailed,
            `Quantidade total: ${details.totalQuantity}`,
            `Status atual: ${details.statusLabel}`,
            details.rejectionReason ? `Motivo da rejeição: ${details.rejectionReason}` : null,
            `Link do sistema: ${details.portalLink}`,
            `Rejeitado por: ${rejector}`
        ].filter(Boolean).join('\n');
        const target = this.resolveTechnicianNotificationTarget(solicitation);
        let recipientEmail = null;
        let technicianLog = null;

        let sent = false;
        let errorMessage = null;
        let reason = null;

        if (target.success) {
            recipientEmail = target.recipientEmail;
            try {
                sent = await this.sendOperationalEmail({
                    recipient: target.recipientEmail,
                    subject,
                    message,
                    fields: {
                        evento: eventType,
                        numero_solicitacao: details.number,
                        tecnico: details.technician,
                        cliente: details.client,
                        data_solicitacao: details.requestDate,
                        itens_pecas_solicitadas: details.itemsSummary,
                        quantidade_total: details.totalQuantity,
                        status_atual: details.statusLabel,
                        motivo_rejeicao: details.rejectionReason || '',
                        link_sistema: details.portalLink,
                        rejeitado_por: rejector
                    },
                    eventLabel: 'technician_rejection_email'
                });
            } catch (error) {
                sent = false;
                errorMessage = error?.message || 'unknown_error';
            }

            reason = sent ? null : (errorMessage ? 'send_exception' : 'send_failed');
            technicianLog = this.logEmailNotification({
                eventType,
                solicitationNumber: details.number,
                recipient: target.recipientEmail,
                success: !!sent,
                reason,
                error: errorMessage,
                profile: 'tecnico',
                sentAt
            });
        } else {
            reason = target.reason;
            recipientEmail = target.recipientEmail || null;
            technicianLog = this.logEmailNotification({
                eventType,
                solicitationNumber: target.solicitationNumber || solicitation.numero || null,
                recipient: recipientEmail,
                success: false,
                reason,
                profile: 'tecnico',
                sentAt
            });
        }

        const managerSummary = await this.sendManagerCopyNotifications({
            solicitation,
            subject,
            message: managerCopyMessage,
            fields: {
                evento: `${eventType} (cópia gestor)`,
                numero_solicitacao: details.number,
                tecnico: details.technician,
                cliente: details.client,
                data_solicitacao: details.requestDate,
                itens_pecas_solicitadas: details.itemsSummary,
                quantidade_total: details.totalQuantity,
                status_atual: details.statusLabel,
                motivo_rejeicao: details.rejectionReason || '',
                link_sistema: details.portalLink,
                rejeitado_por: rejector
            },
            eventType,
            eventLabel: 'rejection_manager_copy_email',
            excludeRecipients: recipientEmail ? [recipientEmail] : []
        });

        return {
            success: !!sent,
            reason,
            recipient: recipientEmail,
            sentAt,
            tecnicoId: target.technicianId || solicitation?.tecnicoId || null,
            log: technicianLog,
            managerCopyRecipients: managerSummary.recipients,
            managerCopySentCount: managerSummary.sentCount,
            managerCopyFailedCount: managerSummary.failedCount,
            managerCopyTotalRecipients: managerSummary.recipients.length,
            managerResults: managerSummary.results,
            totalRecipients: (recipientEmail ? 1 : 0) + managerSummary.recipients.length,
            sentCount: (sent ? 1 : 0) + managerSummary.sentCount,
            failedCount: (sent ? 0 : 1) + managerSummary.failedCount,
            results: [technicianLog, ...managerSummary.results].filter(Boolean)
        };
    },

    async sendTrackingNotificationToTechnician({ solicitation, trackingCode, updatedBy } = {}) {
        const eventType = 'rastreio informado';
        const sentAt = new Date().toISOString();

        if (!solicitation) {
            const log = this.logEmailNotification({
                eventType,
                solicitationNumber: null,
                recipient: null,
                success: false,
                reason: 'missing_solicitation',
                profile: 'tecnico',
                sentAt
            });
            return { success: false, reason: 'missing_solicitation', recipient: null, sentAt, log };
        }

        const details = this.buildSolicitationEmailContext(solicitation, {
            statusLabel: 'Em trânsito',
            trackingCode
        });
        const sender = updatedBy || 'Fornecedor';
        const managerCopyRecipients = this.getTrackingManagerCopyRecipients(solicitation);

        if (!details.trackingCode) {
            const log = this.logEmailNotification({
                eventType,
                solicitationNumber: details.number,
                recipient: null,
                success: false,
                reason: 'missing_tracking_code',
                profile: 'tecnico',
                sentAt
            });

            return {
                success: false,
                reason: 'missing_tracking_code',
                recipient: null,
                sentAt,
                tecnicoId: solicitation?.tecnicoId || null,
                log,
                managerCopyRecipients,
                managerCopySentCount: 0,
                managerCopyFailedCount: 0,
                managerCopyTotalRecipients: managerCopyRecipients.length,
                managerResults: [],
                totalRecipients: 1 + managerCopyRecipients.length,
                sentCount: 0,
                failedCount: 1
            };
        }

        const subject = 'Rastreio informado para sua solicitação de peças';
        const message = [
            'Seu pedido já está em trânsito.',
            'Acompanhe a entrega para planejar o recebimento do material.',
            'Após receber o material, confirme no sistema para finalizar o fluxo.',
            '',
            `Número da solicitação: ${details.number}`,
            `Técnico: ${details.technician}`,
            `Cliente: ${details.client}`,
            `Data: ${details.requestDate}`,
            'Itens/peças solicitadas:',
            details.itemsDetailed,
            `Quantidade total: ${details.totalQuantity}`,
            `Código de rastreio: ${details.trackingCode}`,
            `Valor total: ${details.totalValue}`,
            `Status atual: ${details.statusLabel}`,
            `Link do sistema: ${details.portalLink}`,
            `Atualizado por: ${sender}`
        ].join('\n');
        const managerCopyMessage = [
            'O fornecedor informou o código de rastreio de uma solicitação de peças.',
            'Esta mensagem é uma cópia automática para acompanhamento do gestor.',
            '',
            `Número da solicitação: ${details.number}`,
            `Técnico solicitante: ${details.technician}`,
            `Cliente: ${details.client}`,
            `Data: ${details.requestDate}`,
            'Itens/peças solicitadas:',
            details.itemsDetailed,
            `Quantidade total: ${details.totalQuantity}`,
            `Código de rastreio: ${details.trackingCode}`,
            `Valor total: ${details.totalValue}`,
            `Status atual: ${details.statusLabel}`,
            `Link do sistema: ${details.portalLink}`,
            `Atualizado por: ${sender}`
        ].join('\n');

        const sendManagerCopies = async (excludeRecipients = []) => {
            const excluded = Array.isArray(excludeRecipients)
                ? excludeRecipients.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean)
                : [];
            const recipients = managerCopyRecipients.filter((email) => email && !excluded.includes(email));
            const results = [];

            for (const managerEmail of recipients) {
                const managerSentAt = new Date().toISOString();
                let managerSent = false;
                let managerError = null;

                try {
                    managerSent = await this.sendOperationalEmail({
                        recipient: managerEmail,
                        subject: `Cópia para gestor | ${subject}`,
                        message: managerCopyMessage,
                        fields: {
                            evento: `${eventType} (cópia gestor)`,
                            numero_solicitacao: details.number,
                            tecnico: details.technician,
                            cliente: details.client,
                            data_solicitacao: details.requestDate,
                            itens_pecas_solicitadas: details.itemsSummary,
                            quantidade_total: details.totalQuantity,
                            codigo_rastreio: details.trackingCode,
                            valor_total: details.totalValue,
                            status_atual: details.statusLabel,
                            link_sistema: details.portalLink,
                            atualizado_por: sender,
                            tipo_notificacao: 'copia_gestor'
                        },
                        eventLabel: 'tracking_manager_copy_email'
                    });
                } catch (error) {
                    managerSent = false;
                    managerError = error?.message || 'unknown_error';
                }

                const managerReason = managerSent ? null : (managerError ? 'send_exception' : 'send_failed');
                results.push(this.logEmailNotification({
                    eventType: `${eventType} (cópia gestor)`,
                    solicitationNumber: details.number,
                    recipient: managerEmail,
                    success: !!managerSent,
                    reason: managerReason,
                    error: managerError,
                    profile: 'gestor',
                    sentAt: managerSentAt
                }));
            }

            return {
                recipients,
                results,
                sentCount: results.filter((item) => item.success).length,
                failedCount: results.filter((item) => !item.success).length
            };
        };

        const target = this.resolveTechnicianNotificationTarget(solicitation);
        let sent = false;
        let errorMessage = null;
        let reason = null;
        let recipientEmail = null;
        let technicianLog = null;

        if (target.success) {
            recipientEmail = target.recipientEmail;
            try {
                sent = await this.sendOperationalEmail({
                    recipient: target.recipientEmail,
                    subject,
                    message,
                    fields: {
                        evento: eventType,
                        numero_solicitacao: details.number,
                        tecnico: details.technician,
                        cliente: details.client,
                        data_solicitacao: details.requestDate,
                        itens_pecas_solicitadas: details.itemsSummary,
                        quantidade_total: details.totalQuantity,
                        codigo_rastreio: details.trackingCode,
                        valor_total: details.totalValue,
                        status_atual: details.statusLabel,
                        link_sistema: details.portalLink,
                        atualizado_por: sender
                    },
                    eventLabel: 'tracking_technician_email'
                });
            } catch (error) {
                sent = false;
                errorMessage = error?.message || 'unknown_error';
            }

            reason = sent ? null : (errorMessage ? 'send_exception' : 'send_failed');
            technicianLog = this.logEmailNotification({
                eventType,
                solicitationNumber: details.number,
                recipient: target.recipientEmail,
                success: !!sent,
                reason,
                error: errorMessage,
                profile: 'tecnico',
                sentAt
            });
        } else {
            reason = target.reason;
            recipientEmail = target.recipientEmail || null;
            technicianLog = this.logEmailNotification({
                eventType,
                solicitationNumber: target.solicitationNumber || solicitation.numero || null,
                recipient: recipientEmail,
                success: false,
                reason,
                profile: 'tecnico',
                sentAt
            });
        }

        const managerSummary = await sendManagerCopies(recipientEmail ? [recipientEmail] : []);

        return {
            success: !!sent,
            reason,
            recipient: recipientEmail,
            sentAt,
            tecnicoId: target.technicianId || solicitation?.tecnicoId || null,
            log: technicianLog,
            managerCopyRecipients: managerSummary.recipients,
            managerCopySentCount: managerSummary.sentCount,
            managerCopyFailedCount: managerSummary.failedCount,
            managerCopyTotalRecipients: managerSummary.recipients.length,
            managerResults: managerSummary.results,
            totalRecipients: (recipientEmail ? 1 : 0) + managerSummary.recipients.length,
            sentCount: (sent ? 1 : 0) + managerSummary.sentCount,
            failedCount: (sent ? 0 : 1) + managerSummary.failedCount
        };
    },
    /**
     * Validate CNPJ format
     */
    isValidCNPJ(cnpj) {
        cnpj = cnpj.replace(/[^\d]/g, '');
        if (cnpj.length !== 14) {
            return false;
        }
        if (/^(\d)\1+$/.test(cnpj)) {
            return false;
        }
        
        // CNPJ validation algorithm
        let size = cnpj.length - 2;
        let numbers = cnpj.substring(0, size);
        const digits = cnpj.substring(size);
        let sum = 0;
        let pos = size - 7;
        
        for (let i = size; i >= 1; i--) {
            sum += numbers.charAt(size - i) * pos--;
            if (pos < 2) {
                pos = 9;
            }
        }
        
        let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
        if (result !== parseInt(digits.charAt(0))) {
            return false;
        }
        
        size = size + 1;
        numbers = cnpj.substring(0, size);
        sum = 0;
        pos = size - 7;
        
        for (let i = size; i >= 1; i--) {
            sum += numbers.charAt(size - i) * pos--;
            if (pos < 2) {
                pos = 9;
            }
        }
        
        result = sum % 11 < 2 ? 0 : 11 - sum % 11;
        return result === parseInt(digits.charAt(1));
    },

    /**
     * Format CNPJ
     */
    formatCNPJ(cnpj) {
        cnpj = cnpj.replace(/[^\d]/g, '');
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    },

    /**
     * Format phone number
     */
    formatPhone(phone) {
        phone = phone.replace(/[^\d]/g, '');
        if (phone.length === 11) {
            return phone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
        } else if (phone.length === 10) {
            return phone.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
        }
        return phone;
    },

    /**
     * Format address object to lines for display/PDF
     * @param {object} address - Object with endereco, numero, complemento, bairro, cidade, estado, cep, telefone
     * @returns {object} Object with line1, line2, line3 formatted strings
     */
    formatAddress(address) {
        if (!address) {
            return { line1: '', line2: '', line3: '' };
        }
        
        const line1 = `${address.endereco || ''}${address.numero ? ', ' + address.numero : ''}${address.complemento ? ' - ' + address.complemento : ''}`;
        const line2 = `${address.bairro || ''} - ${address.cidade || ''}/${address.estado || ''}`;
        const line3 = `CEP: ${address.cep || ''}${address.telefone ? ' | Tel: ' + address.telefone : ''}`;
        
        return { line1, line2, line3 };
    },

    /**
     * Calculate time difference in hours
     */
    getHoursDiff(date1, date2) {
        const d1 = this.parseAsLocalDate(date1);
        const d2 = this.parseAsLocalDate(date2);
        return Math.abs(d2 - d1) / (1000 * 60 * 60);
    },

    /**
     * Format time duration
     */
    formatDuration(hours) {
        if (hours < 1) {
            return `${Math.round(hours * 60)} min`;
        } else if (hours < 24) {
            return `${Math.round(hours)}h`;
        } else {
            const days = Math.floor(hours / 24);
            const remainingHours = Math.round(hours % 24);
            return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
        }
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        if (!message) {
            return;
        }

        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const toastType = icons[type] ? type : 'info';
        const toast = document.createElement('div');
        toast.className = `toast ${toastType}`;
        toast.setAttribute('role', 'alert');

        toast.innerHTML = `
            <i class="fas ${icons[toastType]} toast-icon"></i>
            <span class="toast-message">${Utils.escapeHtml(message)}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        const maxVisible = window.matchMedia && window.matchMedia('(max-width: 768px)').matches ? 2 : 4;
        while (container.children.length > maxVisible) {
            container.firstElementChild?.remove();
        }

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    },

    /**
     * Show loading overlay
     */
    showLoading() {
        document.getElementById('loading-overlay').classList.remove('hidden');
    },

    /**
     * Hide loading overlay
     */
    hideLoading() {
        document.getElementById('loading-overlay').classList.add('hidden');
    },

    /**
     * Show modal
     */
    showModal(content, options = {}) {
        const container = document.getElementById('modal-container');
        const modalContent = document.getElementById('modal-content');
        
        // Apply size class
        modalContent.className = 'modal-content';
        if (options.size) {
            modalContent.classList.add(`modal-${options.size}`);
        }
        
        modalContent.innerHTML = content;
        container.classList.remove('hidden');
        
        // Close on backdrop click
        container.querySelector('.modal-backdrop').onclick = () => {
            if (options.closeOnBackdrop !== false) {
                Utils.closeModal();
            }
        };
        
        // Focus first input
        setTimeout(() => {
            const firstInput = modalContent.querySelector('input:not([type="hidden"]), select, textarea');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    },

    /**
     * Close modal
     */
    closeModal() {
        document.getElementById('modal-container').classList.add('hidden');
    },

    /**
     * Confirm dialog
     */
    confirm(message, title = 'Confirmar') {
        return new Promise((resolve) => {
            const content = `
                <div class="modal-header">
                    <h3>${Utils.escapeHtml(title)}</h3>
                    <button class="modal-close" onclick="Utils.closeModal(); window.confirmResolve(false);">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>${Utils.escapeHtml(message)}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="Utils.closeModal(); window.confirmResolve(false);">
                        Cancelar
                    </button>
                    <button class="btn btn-primary" onclick="Utils.closeModal(); window.confirmResolve(true);">
                        Confirmar
                    </button>
                </div>
            `;
            
            window.confirmResolve = resolve;
            Utils.showModal(content, { closeOnBackdrop: false });
        });
    },

    /**
     * Prompt dialog
     */
    prompt(message, title = 'Digite', defaultValue = '') {
        return new Promise((resolve) => {
            const content = `
                <div class="modal-header">
                    <h3>${Utils.escapeHtml(title)}</h3>
                    <button class="modal-close" onclick="Utils.closeModal(); window.promptResolve(null);">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>${Utils.escapeHtml(message)}</label>
                        <input type="text" id="prompt-input" class="form-control" value="${Utils.escapeHtml(defaultValue)}">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="Utils.closeModal(); window.promptResolve(null);">
                        Cancelar
                    </button>
                    <button class="btn btn-primary" onclick="Utils.closeModal(); window.promptResolve(document.getElementById('prompt-input').value);">
                        OK
                    </button>
                </div>
            `;
            
            window.promptResolve = resolve;
            Utils.showModal(content, { closeOnBackdrop: false });
        });
    },

    /**
     * Download file
     */
    downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Encode text content to base64 (UTF-8 safe)
     */
    toBase64(content) {
        try {
            if (typeof Buffer !== 'undefined') {
                return Buffer.from(String(content || ''), 'utf8').toString('base64');
            }
            if (typeof TextEncoder !== 'undefined' && typeof btoa === 'function') {
                const bytes = new TextEncoder().encode(String(content || ''));
                let binary = '';
                for (let i = 0; i < bytes.length; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                return btoa(binary);
            }
            if (typeof btoa === 'function') {
                return btoa(String(content || ''));
            }
        } catch (e) {
            console.warn('Failed to encode base64', e);
        }
        return null;
    },

    /**
     * Export to CSV
     * @param {Array} data - Data to export
     * @param {string} filename - Filename for the export
     * @param {object} options - Optional metadata for export logging
     * @param {string} options.source - Source module name
     * @param {object} options.filters - Applied filters
     */
    exportToCSV(data, filename, options = {}) {
        if (!data.length) {
            return;
        }
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(';'),
            ...data.map(row => 
                headers.map(h => {
                    let value = row[h];
                    if (value === null || value === undefined) {
                        value = '';
                    }
                    if (typeof value === 'string' && (value.includes(';') || value.includes('"') || value.includes('\n'))) {
                        value = '"' + value.replace(/"/g, '""') + '"';
                    }
                    return value;
                }).join(';')
            )
        ].join('\n');
        
        const utf8Content = '\uFEFF' + csvContent;
        this.downloadFile(utf8Content, filename, 'text/csv;charset=utf-8');
        
        // Log export for cloud-first tracking
        if (typeof DataManager !== 'undefined' && DataManager.logExport) {
            const entry = DataManager.logExport({
                type: 'csv',
                filename,
                source: options.source || 'unknown',
                filters: options.filters || {},
                recordCount: data.length
            });
            
            const payloadBase64 = this.toBase64(utf8Content);
            const allowCloud = (typeof APP_CONFIG === 'undefined') || APP_CONFIG.features.exportCloudStorage !== false;
            if (allowCloud && entry && payloadBase64 && typeof DataManager.saveExportArtifact === 'function') {
                DataManager.saveExportArtifact(entry, {
                    payloadBase64,
                    filename,
                    contentType: 'text/csv;charset=utf-8',
                    source: options.source || 'unknown'
                });
            }
        }
    },

    /**
     * Export to Excel (XLSX)
     * @param {Array} data - Data to export
     * @param {string} filename - Filename for the export
     * @param {string} sheetName - Sheet name
     * @param {object} options - Optional metadata for export logging
     * @param {string} options.source - Source module name
     * @param {object} options.filters - Applied filters
     */
    exportToExcel(data, filename, sheetName = 'Dados', options = {}) {
        if (!window.XLSX) {
            this.showToast('Biblioteca XLSX não carregada', 'error');
            return;
        }
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        const workbookBase64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        XLSX.writeFile(wb, filename);
        
        // Log export for cloud-first tracking
        if (typeof DataManager !== 'undefined' && DataManager.logExport) {
            const entry = DataManager.logExport({
                type: 'xlsx',
                filename,
                source: options.source || 'unknown',
                filters: options.filters || {},
                recordCount: Array.isArray(data) ? data.length : 0
            });
            
            const allowCloud = (typeof APP_CONFIG === 'undefined') || APP_CONFIG.features.exportCloudStorage !== false;
            if (allowCloud && entry && typeof DataManager.saveExportArtifact === 'function') {
                DataManager.saveExportArtifact(entry, {
                    payloadBase64: workbookBase64,
                    filename,
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    source: options.source || 'unknown'
                });
            }
        }
    },

    /**
     * Generate PDF for solicitation
     */
    generatePDF(solicitation, options = {}) {
        if (!window.jspdf) {
            this.showToast('Biblioteca jsPDF não carregada', 'error');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 14;
        // Reduced line height (from 6 to 5) to fit more content and prevent overflow
        const lineHeight = 5;
        const primary = { r: 0, g: 123, b: 255 };
        const softBg = { r: 244, g: 246, b: 248 };
        const pageBg = { r: 248, g: 250, b: 252 };
        const headerHeight = 32;
        const brandName = this.BRAND_NAME;
        const brandTagline = this.PORTAL_DISPLAY_NAME;
        const { preview } = options || {};
        const technician = DataManager.getTechnicianById(solicitation.tecnicoId);
        const supplier = solicitation.fornecedorId ? DataManager.getSupplierById(solicitation.fornecedorId) : null;
        const statusLabel = (Utils.getStatusInfo(solicitation.status)?.label || solicitation.status || '').toUpperCase();
        const clientLabel = solicitation.cliente || 'Não informado';
        const trackingLabel = solicitation.trackingCode || 'Aguardando rastreio';
        const supplierLabel = supplier?.nome || 'Não definido';
        const formatMoney = (value) => Utils.formatCurrency(Number(value) || 0);
        const FALLBACK_TECHNICIAN_NAME = 'tecnico';
        const technicianName = solicitation.tecnicoNome || technician?.nome || FALLBACK_TECHNICIAN_NAME;
        const sanitizedTechName = Utils.sanitizeFilename(technicianName, FALLBACK_TECHNICIAN_NAME);
        const contentWidth = pageWidth - margin * 2;
        const SPACING = {
            footer: 16, // mm reserved for footer safe area
            observationSection: 10, // mm between sections before the observations block
            observationBoxMargin: 12 // mm of extra margin when validating the block
        };
        
        // Font size constants for consistency
        const FONT_SIZE = {
            HEADER_BRAND: 17,
            HEADER_TAGLINE: 10,
            HEADER_TITLE: 12,
            SECTION_TITLE: 11,
            SUMMARY: 9,
            TABLE_HEADER: 8,
            TABLE_BODY: 8,
            TOTALS: 9,
            FOOTER: 8
        };
        
        // Column width constants for items table
        const TABLE_COLS = {
            CODE_MAX_CHARS: 10  // Maximum characters for code column before truncation
        };
        
        // Helper function to wrap text within a given width
        const wrapText = (text, maxWidth) => {
            return doc.splitTextToSize(text || '', maxWidth);
        };
        const resetPageBackground = () => {
            doc.setFillColor(pageBg.r, pageBg.g, pageBg.b);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
        };
        const getSafeBottom = () => pageHeight - margin - SPACING.footer;
        const ensureSpace = (height, { renderHeader = false } = {}) => {
            const safeBottom = getSafeBottom();
            if (y + height <= safeBottom) {
                return;
            }
            doc.addPage();
            resetPageBackground();
            y = margin;
            if (renderHeader && typeof renderTableHeader === 'function') {
                renderTableHeader();
            }
        };
        
        // Background
        resetPageBackground();
        
        // Header bar
        doc.setFillColor(primary.r, primary.g, primary.b);
        doc.rect(0, 0, pageWidth, headerHeight, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(FONT_SIZE.HEADER_BRAND);
        doc.setFont(undefined, 'bold');
        doc.text(brandName, margin, 12);
        doc.setFontSize(FONT_SIZE.HEADER_TAGLINE);
        doc.setFont(undefined, 'italic');
        doc.text(brandTagline, margin, 18);
        doc.setFontSize(FONT_SIZE.HEADER_TITLE);
        doc.setFont(undefined, 'normal');
        doc.text('Solicitação de Peças', margin, 25);
        doc.setFont(undefined, 'bold');
        doc.text(`#${solicitation.numero || '-'}`, pageWidth - margin, 12, { align: 'right' });
        doc.setFont(undefined, 'normal');
        doc.text(Utils.formatDate(solicitation.data), pageWidth - margin, 18, { align: 'right' });
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.4);
        doc.line(margin, headerHeight - 2, pageWidth - margin, headerHeight - 2);
        
        let y = headerHeight + 12;
        const drawSectionTitle = (title) => {
            doc.setFontSize(FONT_SIZE.SECTION_TITLE);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(34, 43, 54);
            doc.text(title, margin, y);
            y += 6;
        };
        const getObservationAvailableHeight = () => getSafeBottom() - y - SPACING.observationSection;
        
        // Summary section - redesigned to avoid overlap
        drawSectionTitle('Dados da Solicitação');
        doc.setFillColor(softBg.r, softBg.g, softBg.b);
        doc.setDrawColor(232, 236, 241);
        
        // Calculate content for summary section with text wrapping
        doc.setFontSize(FONT_SIZE.SUMMARY);
        doc.setFont(undefined, 'normal');
        const _labelWidth = 55; // Width for label column
        const valueWidth = contentWidth / 2 - 10; // Width for each value column
        
        // Prepare summary data with proper structure
        const tecnicoValue = solicitation.tecnicoNome || 'Não informado';
        const criadoPorValue = solicitation.createdBy || 'Não informado';
        
        // Wrap long text values
        const tecnicoLines = wrapText(tecnicoValue, valueWidth - 5);
        const criadoPorLines = wrapText(criadoPorValue, valueWidth - 5);
        
        // Calculate dynamic box height based on wrapped content
        const maxLines = Math.max(tecnicoLines.length, criadoPorLines.length, 1);
        const summaryRowHeight = lineHeight * maxLines + 2;
        const summaryBoxHeight = summaryRowHeight * 3 + 6;
        
        doc.roundedRect(margin, y - 3, contentWidth, summaryBoxHeight, 2, 2, 'F');
        doc.setTextColor(64, 70, 79);
        
        // Row 1: Técnico and Status
        const row1Y = y + 3;
        doc.setFont(undefined, 'bold');
        doc.text('Técnico:', margin + 4, row1Y);
        doc.setFont(undefined, 'normal');
        doc.text(tecnicoLines, margin + 4 + 18, row1Y);
        
        doc.setFont(undefined, 'bold');
        doc.text('Status:', margin + contentWidth / 2 + 4, row1Y);
        doc.setFont(undefined, 'normal');
        doc.text(statusLabel, margin + contentWidth / 2 + 4 + 15, row1Y);
        
        // Row 2: Itens and Total
        const row2Y = row1Y + summaryRowHeight;
        doc.setFont(undefined, 'bold');
        doc.text('Itens:', margin + 4, row2Y);
        doc.setFont(undefined, 'normal');
        doc.text(String((solicitation.itens || []).length), margin + 4 + 14, row2Y);
        
        doc.setFont(undefined, 'bold');
        doc.text('Total:', margin + contentWidth / 2 + 4, row2Y);
        doc.setFont(undefined, 'normal');
        doc.text(formatMoney(solicitation.total), margin + contentWidth / 2 + 4 + 14, row2Y);
        
        // Row 3: Criado por
        const row3Y = row2Y + summaryRowHeight;
        doc.setFont(undefined, 'bold');
        doc.text('Criado por:', margin + 4, row3Y);
        doc.setFont(undefined, 'normal');
        doc.text(criadoPorLines, margin + 4 + 24, row3Y);
        
        y += summaryBoxHeight + 4;

        drawSectionTitle('Dados operacionais');
        const clientLines = wrapText(clientLabel, contentWidth - 30);
        const trackingLines = wrapText(trackingLabel, contentWidth - 30);
        const supplierLines = wrapText(supplierLabel, contentWidth - 34);
        const rowsHeight = [clientLines, trackingLines, supplierLines].reduce((acc, lines) => {
            const lineCount = Math.max(lines.length, 1);
            return acc + (lineCount * lineHeight) + 2;
        }, 0);
        const operationalBoxHeight = rowsHeight + 8;

        ensureSpace(operationalBoxHeight + 10);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(232, 236, 241);
        doc.roundedRect(margin, y - 3, contentWidth, operationalBoxHeight, 2, 2, 'S');
        doc.setFontSize(FONT_SIZE.SUMMARY);
        doc.setTextColor(64, 70, 79);

        let operationalY = y + 3;
        const drawOperationalRow = (label, lines, labelOffset = 0) => {
            const safeLines = (Array.isArray(lines) && lines.length > 0) ? lines : ['-'];
            doc.setFont(undefined, 'bold');
            doc.text(label, margin + 4 + labelOffset, operationalY);
            doc.setFont(undefined, 'normal');
            doc.text(safeLines, margin + 24 + labelOffset, operationalY);
            operationalY += (Math.max(safeLines.length, 1) * lineHeight) + 2;
        };

        drawOperationalRow('Cliente:', clientLines);
        drawOperationalRow('Rastreio:', trackingLines);
        drawOperationalRow('Fornecedor:', supplierLines);

        y += operationalBoxHeight + 4;
        
        // Technician or solicitation address (fallback always visible)
        const solicitationAddress = {
            endereco: solicitation.enderecoEntrega || solicitation.endereco || '',
            numero: solicitation.enderecoNumero || solicitation.numero || '',
            complemento: solicitation.complemento || '',
            bairro: solicitation.bairro || '',
            cidade: solicitation.cidade || '',
            estado: solicitation.estado || '',
            cep: solicitation.cep || '',
            telefone: solicitation.telefone || solicitation.contato || ''
        };
        const hasSolicitationAddress = Object.values(solicitationAddress).some(Boolean);
        const addressSource = (technician && technician.endereco) ? technician : (hasSolicitationAddress ? solicitationAddress : null);
        
        drawSectionTitle('Endereço para envio');
        const address = addressSource ? Utils.formatAddress(addressSource) : { line1: 'Endereço não informado', line2: '', line3: '' };
        
        // Wrap address lines if needed
        const addressLine1Wrapped = wrapText(address.line1, contentWidth - 8);
        const addressLine2Wrapped = wrapText(address.line2, contentWidth - 8);
        const addressLine3Wrapped = wrapText(address.line3, contentWidth - 8);
        const totalAddressLines = addressLine1Wrapped.length + addressLine2Wrapped.length + addressLine3Wrapped.length;
        const addressBoxHeight = Math.max(20, totalAddressLines * lineHeight + 6);
        
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(232, 236, 241);
        doc.roundedRect(margin, y - 3, contentWidth, addressBoxHeight, 2, 2, 'S');
        doc.setFont(undefined, 'normal');
        doc.setTextColor(64, 70, 79);
        
        let addressY = y + 3;
        doc.text(addressLine1Wrapped, margin + 4, addressY);
        addressY += addressLine1Wrapped.length * lineHeight;
        doc.text(addressLine2Wrapped, margin + 4, addressY);
        addressY += addressLine2Wrapped.length * lineHeight;
        doc.text(addressLine3Wrapped, margin + 4, addressY);
        
        y += addressBoxHeight + 4;
        
        // Items table - improved with proper column widths
        drawSectionTitle('Itens solicitados');
        
        // Define column structure with fixed widths to prevent overlap
        const colCode = { x: margin + 3, width: 22 };
        const colDesc = { x: margin + 27, width: 68 }; // Wider description column
        const colQty = { x: margin + 97, width: 20 };
        const colUnit = { x: margin + 119, width: 30 };
        const colTotal = { x: pageWidth - margin - 3, width: 25 };
        
        const renderTableHeader = () => {
            doc.setFillColor(primary.r, primary.g, primary.b);
            doc.setTextColor(255, 255, 255);
            doc.setFont(undefined, 'bold');
            doc.setFontSize(FONT_SIZE.TABLE_HEADER);
            doc.roundedRect(margin, y - 3, contentWidth, 8, 2, 2, 'F');
            doc.text('Código', colCode.x, y + 2);
            doc.text('Descrição', colDesc.x, y + 2);
            doc.text('Qtd', colQty.x + colQty.width / 2, y + 2, { align: 'center' });
            doc.text('Vlr Unit', colUnit.x + colUnit.width / 2, y + 2, { align: 'center' });
            doc.text('Total', colTotal.x, y + 2, { align: 'right' });
            y += 10;
            doc.setFont(undefined, 'normal');
            doc.setTextColor(34, 43, 54);
        };
        renderTableHeader();
        
        const items = solicitation.itens || [];
        if (items.length === 0) {
            doc.setFontSize(FONT_SIZE.SUMMARY);
            doc.text('Nenhum item informado.', margin, y + 2);
            y += 10;
        } else {
            doc.setFontSize(FONT_SIZE.TABLE_BODY);
            items.forEach((item, idx) => {
                // Wrap description text to fit in column
                const descLines = wrapText(item.descricao || '-', colDesc.width);
                const rowHeight = Math.max(6, descLines.length * lineHeight);
                
                // Check for page break
                ensureSpace(rowHeight + 8, { renderHeader: true });
                
                // Alternating row background
                if (idx % 2 === 0) {
                    doc.setFillColor(softBg.r, softBg.g, softBg.b);
                    doc.rect(margin, y - 4, contentWidth, rowHeight + 2, 'F');
                }
                
                // Draw cell content
                doc.setTextColor(34, 43, 54);
                const codeText = (item.codigo || '-').substring(0, TABLE_COLS.CODE_MAX_CHARS);
                doc.text(codeText, colCode.x, y);
                doc.text(descLines, colDesc.x, y);
                doc.text(String(item.quantidade || 0), colQty.x + colQty.width / 2, y, { align: 'center' });
                doc.text(formatMoney(item.valorUnit), colUnit.x + colUnit.width, y, { align: 'right' });
                doc.text(formatMoney((item.quantidade || 0) * (item.valorUnit || 0)), colTotal.x, y, { align: 'right' });
                
                y += rowHeight;
            });
        }
        
        // Totals
        y += 4;
        ensureSpace(36);
        doc.setDrawColor(232, 236, 241);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;
        doc.setFontSize(FONT_SIZE.TOTALS);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(34, 43, 54);
        doc.text('Resumo financeiro', margin, y);
        doc.setFont(undefined, 'normal');
        doc.text(`Subtotal: ${formatMoney(solicitation.subtotal)}`, pageWidth - margin, y, { align: 'right' });
        y += lineHeight + 1;
        doc.text(`Desconto: ${formatMoney(solicitation.desconto)}`, pageWidth - margin, y, { align: 'right' });
        y += lineHeight + 1;
        doc.text(`Frete: ${formatMoney(solicitation.frete)}`, pageWidth - margin, y, { align: 'right' });
        y += lineHeight + 3;
        doc.setFont(undefined, 'bold');
        doc.text(`Total: ${formatMoney(solicitation.total)}`, pageWidth - margin, y, { align: 'right' });
        
        // Observations
        if (solicitation.observacoes) {
            const obsLines = wrapText(solicitation.observacoes, contentWidth - 8);
            const minimumObservationRequirement = Math.max(
                lineHeight,
                Math.max(0, pageHeight - (2 * margin + SPACING.footer + SPACING.observationSection))
            );
            let obsIndex = 0;
            let chunkIndex = 0;
            
            while (obsIndex < obsLines.length) {
                if (chunkIndex === 0) {
                    y += SPACING.observationSection;
                }
                
                let availableHeight = getObservationAvailableHeight();
                if (availableHeight < minimumObservationRequirement) {
                    doc.addPage();
                    resetPageBackground();
                    y = margin;
                    availableHeight = getObservationAvailableHeight();
                }
                if (availableHeight < lineHeight) {
                    const availableText = Math.max(availableHeight, 0).toFixed(2);
                    const requiredText = minimumObservationRequirement.toFixed(2);
                    console.warn(`PDF observations: ${availableText}mm available but minimum usable height is ${requiredText}mm. Reduce observation text or adjust SPACING.footer / margins before exporting.`);
                    break;
                }

                const effectiveHeight = Math.max(availableHeight, lineHeight);
                const maxLinesPerPage = Math.floor(effectiveHeight / lineHeight);
                if (maxLinesPerPage < 1) {
                    break;
                }
                const nextIndex = Math.min(obsLines.length, obsIndex + maxLinesPerPage);
                const linesForChunk = obsLines.slice(obsIndex, nextIndex);
                const boxHeight = linesForChunk.length * lineHeight + 6;
                
                ensureSpace(boxHeight + SPACING.observationBoxMargin);
                drawSectionTitle(chunkIndex === 0 ? 'Observações' : 'Observações (cont.)');
                
                doc.setFillColor(softBg.r, softBg.g, softBg.b);
                doc.roundedRect(margin, y - 4, contentWidth, boxHeight, 2, 2, 'F');
                doc.setFont(undefined, 'normal');
                doc.setFontSize(FONT_SIZE.SUMMARY);
                doc.setTextColor(64, 70, 79);
                doc.text(linesForChunk, margin + 4, y + 2);
                y += boxHeight + 4;
                
                obsIndex = nextIndex;
                chunkIndex += 1;
            }
        }
        
        // Footer
        const footerY = pageHeight - 12;
        doc.setFontSize(FONT_SIZE.FOOTER);
        doc.setTextColor(120, 126, 135);
        doc.text(`ID: ${solicitation.id}`, margin, footerY);
        doc.text(`Gerado em: ${Utils.formatDate(new Date(), true)}`, pageWidth - margin, footerY, { align: 'right' });
        
        const filename = `solicitacao_${solicitation.numero || 'sem-numero'}_${sanitizedTechName}.pdf`;
        
        // Save or preview
        if (preview) {
            return doc.output('datauristring');
        }
        
        doc.save(filename);
        
        // Log export for cloud-first tracking
        if (typeof DataManager !== 'undefined' && DataManager.logExport) {
            const entry = DataManager.logExport({
                type: 'pdf',
                filename,
                source: options.source || 'solicitacoes',
                solicitationId: solicitation.id,
                recordCount: (solicitation.itens || []).length
            });
            
            const allowCloud = (typeof APP_CONFIG === 'undefined') || APP_CONFIG.features.exportCloudStorage !== false;
            const dataUri = doc.output('datauristring');
            const payloadBase64 = (typeof dataUri === 'string' && dataUri.includes(',')) ? dataUri.split(',')[1] : null;
            if (allowCloud && entry && payloadBase64 && typeof DataManager.saveExportArtifact === 'function') {
                DataManager.saveExportArtifact(entry, {
                    payloadBase64,
                    filename,
                    contentType: 'application/pdf',
                    source: options.source || 'solicitacoes'
                });
            }
        }
        
        return filename;
    },

    /**
     * Parse imported file (CSV/XLSX)
     */
    parseImportFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    if (file.name.endsWith('.csv')) {
                        const text = e.target.result;
                        const lines = text.split('\n');
                        const headers = lines[0].split(';').map(h => h.trim().replace(/"/g, ''));
                        const data = [];
                        
                        for (let i = 1; i < lines.length; i++) {
                            if (!lines[i].trim()) {
                                continue;
                            }
                            const values = lines[i].split(';').map(v => v.trim().replace(/"/g, ''));
                            const row = {};
                            headers.forEach((h, idx) => {
                                row[h] = values[idx] || '';
                            });
                            data.push(row);
                        }
                        resolve(data);
                    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                        resolve(jsonData);
                    } else {
                        reject(new Error('Formato de arquivo não suportado'));
                    }
                } catch (err) {
                    reject(err);
                }
            };
            
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            
            if (file.name.endsWith('.csv')) {
                reader.readAsText(file);
            } else {
                reader.readAsArrayBuffer(file);
            }
        });
    },

    /**
     * Get status info
     */
    getStatusInfo(status) {
        const statuses = {
            rascunho: { label: 'Em aprovação', icon: 'fa-clock', class: 'status-pendente-aprovacao' },
            enviada: { label: 'Em aprovação', icon: 'fa-clock', class: 'status-pendente-aprovacao' },
            criado: { label: 'Em aprovação', icon: 'fa-clock', class: 'status-pendente-aprovacao' },
            pendente: { label: 'Em aprovação', icon: 'fa-clock', class: 'status-pendente-aprovacao' },
            pendente_aprovacao: { label: 'Em aprovação', icon: 'fa-clock', class: 'status-pendente-aprovacao' },
            aprovada: { label: 'Aprovado / aguardando envio', icon: 'fa-check', class: 'status-aprovado' },
            aprovado: { label: 'Aprovado / aguardando envio', icon: 'fa-check', class: 'status-aprovado' },
            rejeitada: { label: 'Rejeitado', icon: 'fa-times', class: 'status-reprovado' },
            reprovado: { label: 'Rejeitado', icon: 'fa-times', class: 'status-reprovado' },
            'em-transito': { label: 'Em trânsito', icon: 'fa-truck', class: 'status-em-compra' },
            em_transito: { label: 'Em trânsito', icon: 'fa-truck', class: 'status-em-compra' },
            em_compra: { label: 'Em trânsito', icon: 'fa-truck', class: 'status-em-compra' },
            entregue: { label: 'Finalizada', icon: 'fa-flag-checkered', class: 'status-concluido' },
            enviado: { label: 'Finalizada', icon: 'fa-flag-checkered', class: 'status-concluido' },
            finalizada: { label: 'Finalizada', icon: 'fa-flag-checkered', class: 'status-concluido' },
            concluido: { label: 'Finalizada', icon: 'fa-check-double', class: 'status-concluido' },
            'historico-manual': { label: 'Finalizada', icon: 'fa-flag-checkered', class: 'status-concluido' }
        };
        return statuses[status] || { label: status, icon: 'fa-question', class: '' };
    },

    /**
     * Render status badge
     */
    renderStatusBadge(status) {
        const info = this.getStatusInfo(status);
        return `<span class="status-badge ${info.class}">
            <i class="fas ${info.icon}"></i>
            ${info.label}
        </span>`;
    },

    /**
     * Render pagination
     */
    renderPagination(currentPage, totalPages, onPageChange) {
        if (totalPages <= 1) {
            return '';
        }
        
        let html = '<div class="pagination">';
        
        // Previous button
        html += `<button ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
            <i class="fas fa-chevron-left"></i>
        </button>`;
        
        // Page numbers
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        const endPage = Math.min(totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        
        if (startPage > 1) {
            html += '<button data-page="1">1</button>';
            if (startPage > 2) {
                html += '<button disabled>...</button>';
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += '<button disabled>...</button>';
            }
            html += `<button data-page="${totalPages}">${totalPages}</button>`;
        }
        
        // Next button
        html += `<button ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
            <i class="fas fa-chevron-right"></i>
        </button>`;
        
        html += '</div>';
        
        // Attach event listeners after render
        setTimeout(() => {
            document.querySelectorAll('.pagination button[data-page]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const page = parseInt(btn.dataset.page);
                    if (!isNaN(page) && onPageChange) {
                        onPageChange(page);
                    }
                });
            });
        }, 0);
        
        return html;
    }
};


const AnalyticsHelper = {
    COST_STATUSES: ['aprovada', 'em-transito', 'entregue', 'finalizada', 'historico-manual'],

    get engine() {
        return typeof AnalyticsEngine !== 'undefined' ? AnalyticsEngine : null;
    },

    getDefaultRangeDays() {
        return this.engine ? this.engine.getDefaultRangeDays() : ((DataManager?.getSettings?.().preferredRangeDays || DataManager?.getSettings?.().statsRangeDays || 30));
    },

    getGlobalPeriodFilter() {
        return this.engine ? this.engine.getDefaultPeriod() : null;
    },

    normalizePeriod(period = {}) {
        return this.engine ? this.engine.normalizePeriod(period, this.getDefaultRangeDays()) : period;
    },

    saveGlobalPeriodFilter(period = {}) {
        return this.engine ? this.engine.saveDefaultPeriodFilter(period) : period;
    },

    setGlobalPeriodByDays(days) {
        return this.saveGlobalPeriodFilter({ rangeDays: days });
    },

    getRangeLabel(period = this.getGlobalPeriodFilter()) {
        return this.engine ? this.engine.getRangeLabel(period) : 'Todos os registros';
    },

    getPreviousPeriod(period = this.getGlobalPeriodFilter()) {
        return this.engine ? this.engine.getPreviousPeriod(period) : period;
    },

    getSolicitationDate(solicitation) {
        return this.engine ? this.engine.getSolicitationDate(solicitation) : null;
    },

    getSolicitationClientName(solicitation) {
        return this.engine ? this.engine.getSolicitationClientName(solicitation) : 'Nao informado';
    },

    getSolicitationRegion(solicitation) {
        return this.engine ? this.engine.getSolicitationRegion(solicitation) : 'Sem regiao';
    },

    formatMonthLabel(date) {
        return this.engine ? this.engine.formatMonthLabel(date) : '';
    },

    matchesPeriod(date, period = this.getGlobalPeriodFilter()) {
        return this.engine ? this.engine.matchesPeriod(date, period) : true;
    },

    normalizeStatus(status) {
        return this.engine ? this.engine.normalizeStatus(status) : String(status || '').trim();
    },

    normalizeSolicitation(solicitation) {
        return this.engine ? this.engine.normalizeSolicitation(solicitation) : solicitation;
    },

    buildFilterState(raw = {}, scope = {}) {
        return this.engine ? this.engine.buildFilterState(raw, scope) : raw;
    },

    restoreModuleFilterState(moduleKey, options = {}) {
        return this.engine ? this.engine.restoreModuleFilterState(moduleKey, options) : (options.defaults || {});
    },

    persistModuleFilterState(moduleKey, filterState, options = {}) {
        return this.engine ? this.engine.persistModuleFilterState(moduleKey, filterState, options) : filterState;
    },

    clearModuleFilterState(moduleKey) {
        if (this.engine) {
            this.engine.clearModuleFilterState(moduleKey);
        }
    },

    buildFilterChips(filterState, options = {}) {
        return this.engine ? this.engine.buildFilterChips(filterState, options) : [];
    },

    filterSolicitations(solicitations = [], options = {}) {
        if (!this.engine) {
            return solicitations;
        }

        const explicitRangeDays = options.period && Object.prototype.hasOwnProperty.call(options.period, 'rangeDays')
            ? options.period.rangeDays
            : (Object.prototype.hasOwnProperty.call(options, 'rangeDays') ? options.rangeDays : undefined);
        const hasExplicitPeriod = Boolean(
            options.period?.dateFrom
            || options.period?.dateTo
            || options.dateFrom
            || options.dateTo
            || explicitRangeDays
        );

        return this.engine.applyFilters(solicitations, {
            search: options.search || '',
            statuses: options.statuses || options.status || [],
            tecnico: options.tecnico || '',
            fornecedor: options.fornecedor || '',
            regiao: options.regiao || '',
            cliente: options.cliente || '',
            prioridade: options.prioridade || '',
            minValue: options.minValue || '',
            dateFrom: options.period?.dateFrom || options.dateFrom || '',
            dateTo: options.period?.dateTo || options.dateTo || '',
            rangeDays: explicitRangeDays
        }, {
            moduleKey: options.moduleKey || 'analytics',
            useDefaultPeriod: typeof options.useDefaultPeriod === 'boolean'
                ? options.useDefaultPeriod
                : !hasExplicitPeriod,
            recordPredicate: options.recordPredicate || null
        });
    },

    buildDataset(solicitations = [], filterState = {}, datasetScope = {}) {
        return this.engine
            ? this.engine.buildDataset(solicitations, filterState, datasetScope)
            : { records: solicitations, filterState, period: null, totalCount: solicitations.length };
    },

    computeMetrics(dataset, options = {}) {
        return this.engine ? this.engine.computeMetrics(dataset, options) : {};
    },

    buildOperationalAnalysis(solicitations = [], options = {}) {
        return this.engine ? this.engine.buildOperationalAnalysis(solicitations, options) : {};
    }
};

if (typeof window !== 'undefined') {
    window.AnalyticsHelper = AnalyticsHelper;
}































