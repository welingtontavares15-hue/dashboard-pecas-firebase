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

    /**
     * Hash string with SHA-256 using Web Crypto (falls back to base64)
     */
    async hashSHA256(value, salt = '') {
        const text = String(value || '');
        const input = text + salt;
        const globalCrypto = (typeof globalThis !== 'undefined' && globalThis.crypto) ? globalThis.crypto : undefined;
        const cryptoSource = globalCrypto || (typeof window !== 'undefined' ? window.crypto : null);
        const cryptoObj = cryptoSource && (cryptoSource.subtle ? cryptoSource : cryptoSource.webcrypto) || null;
        let effectiveCrypto = cryptoObj;
        if (!effectiveCrypto?.subtle) {
            // Node.js fallback using crypto module when Web Crypto is unavailable (e.g., during tests)
            if (typeof process !== 'undefined' && process.versions?.node) {
                const { createHash } = await import('crypto');
                return createHash('sha256').update(input).digest('hex');
            }
            throw new Error('Web Crypto not available for secure hashing');
        }

        const encoder = new TextEncoder();
        const buffer = await effectiveCrypto.subtle.digest('SHA-256', encoder.encode(input));
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    },

    /**
     * Parse a date value as local time.
     * Handles "YYYY-MM-DD" strings (from input[type="date"]) as local dates
     * to avoid UTC parsing that shifts dates in negative UTC timezones.
     * @param {Date|string|number} value - Date value to parse
     * @returns {Date} Date object in local time
     */
    parseAsLocalDate(value) {
        if (!value) {
            return new Date(NaN);
        }
        if (value instanceof Date) {
            return value;
        }
        if (typeof value === 'number') {
            return new Date(value);
        }
        if (typeof value === 'string') {
            // Check for YYYY-MM-DD format (from input[type="date"])
            const isoDateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (isoDateMatch) {
                // Parse as local date by using Date constructor with year, month, day
                const year = parseInt(isoDateMatch[1], 10);
                const month = parseInt(isoDateMatch[2], 10) - 1; // months are 0-indexed
                const day = parseInt(isoDateMatch[3], 10);
                return new Date(year, month, day);
            }
        }
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
     * Uses Sanitizer module if available for enhanced security
     */
    escapeHtml(text) {
        if (text === null || text === undefined) {
            return '';
        }
        
        // Use Sanitizer module if available for enhanced XSS protection
        if (typeof window !== 'undefined' && typeof window.Sanitizer !== 'undefined') {
            return window.Sanitizer.sanitizeText(text);
        }
        
        // Fallback to basic HTML escape
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
    sendCredentialsEmail({ to, username, password, name }) {
        if (typeof window === 'undefined') {
            return false;
        }
        if (!to || !this.isValidEmail(to) || !username || !password) {
            return false;
        }

        const greeting = name ? `Olá ${name}` : 'Olá';
        const subject = 'Nova senha de acesso - Dashboard de Peças';
        const body = `${greeting},

Sua senha foi redefinida pelo administrador.

Login: ${username}
Nova senha: ${password}

Recomendamos alterar a senha após o primeiro acesso.

Atenciosamente,
Equipe Diversey`;

        const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailto, '_blank');
        return true;
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
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        toast.innerHTML = `
            <i class="fas ${icons[type]} toast-icon"></i>
            <span class="toast-message">${Utils.escapeHtml(message)}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(toast);
        
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
        const brandName = 'Diversey';
        const brandTagline = 'A Solenis Company';
        const { preview } = options || {};
        const technician = DataManager.getTechnicianById(solicitation.tecnicoId);
        const statusLabel = (Utils.getStatusInfo(solicitation.status)?.label || solicitation.status || '').toUpperCase();
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
            rascunho: { label: 'Rascunho', icon: 'fa-edit', class: 'status-rascunho' },
            enviada: { label: 'Enviada', icon: 'fa-paper-plane', class: 'status-enviada' },
            pendente: { label: 'Pendente', icon: 'fa-clock', class: 'status-pendente' },
            aprovada: { label: 'Aprovada', icon: 'fa-check', class: 'status-aprovada' },
            rejeitada: { label: 'Rejeitada', icon: 'fa-times', class: 'status-rejeitada' },
            'em-transito': { label: 'Rastreio', icon: 'fa-truck', class: 'status-em-transito' },
            entregue: { label: 'Entregue', icon: 'fa-box', class: 'status-entregue' },
            finalizada: { label: 'Finalizada', icon: 'fa-flag-checkered', class: 'status-finalizada' },
            'historico-manual': { label: 'Histórico/Manual', icon: 'fa-archive', class: 'status-historico-manual' }
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
