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
     * Format date to Brazilian format
     */
    formatDate(date, includeTime = false) {
        if (!date) return '-';
        const d = new Date(date);
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
     * Parse Brazilian date format to Date object
     */
    parseDate(dateStr) {
        if (!dateStr) return null;
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
        return new Date(dateStr);
    },

    /**
     * Format currency to BRL
     */
    formatCurrency(value) {
        if (value === null || value === undefined) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },

    /**
     * Parse currency string to number
     */
    parseCurrency(str) {
        if (typeof str === 'number') return str;
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
        const date = new Date(referenceDate);
        const validDate = isNaN(date) ? new Date() : date;
        const datePart = `${validDate.getFullYear()}${String(validDate.getMonth() + 1).padStart(2, '0')}${String(validDate.getDate()).padStart(2, '0')}`;
        const prefix = `REQ-${datePart}-`;
        const maxSequence = (existingNumbers || []).reduce((max, num) => {
            if (typeof num !== 'string' || !num.startsWith(prefix)) return max;
            const parsed = parseInt(num.replace(prefix, ''), 10);
            if (isNaN(parsed)) return max;
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
        if (!text) return '';
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
        if (!query) return true;
        const normalizedText = this.normalizeText(text);
        const normalizedQuery = this.normalizeText(query);
        return normalizedText.includes(normalizedQuery);
    },

    /**
     * Prefix search - text starts with query
     */
    startsWith(text, query) {
        if (!query) return true;
        const normalizedText = this.normalizeText(text);
        const normalizedQuery = this.normalizeText(query);
        return normalizedText.startsWith(normalizedQuery);
    },

    /**
     * Escape HTML to prevent XSS
     * Replaces dangerous characters with their HTML entities
     */
    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const str = String(text);
        const htmlEscapes = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
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
        if (typeof window === 'undefined') return false;
        if (!to || !this.isValidEmail(to) || !username || !password) return false;

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
        if (cnpj.length !== 14) return false;
        if (/^(\d)\1+$/.test(cnpj)) return false;
        
        // CNPJ validation algorithm
        let size = cnpj.length - 2;
        let numbers = cnpj.substring(0, size);
        const digits = cnpj.substring(size);
        let sum = 0;
        let pos = size - 7;
        
        for (let i = size; i >= 1; i--) {
            sum += numbers.charAt(size - i) * pos--;
            if (pos < 2) pos = 9;
        }
        
        let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
        if (result !== parseInt(digits.charAt(0))) return false;
        
        size = size + 1;
        numbers = cnpj.substring(0, size);
        sum = 0;
        pos = size - 7;
        
        for (let i = size; i >= 1; i--) {
            sum += numbers.charAt(size - i) * pos--;
            if (pos < 2) pos = 9;
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
        if (!address) return { line1: '', line2: '', line3: '' };
        
        const line1 = `${address.endereco || ''}${address.numero ? ', ' + address.numero : ''}${address.complemento ? ' - ' + address.complemento : ''}`;
        const line2 = `${address.bairro || ''} - ${address.cidade || ''}/${address.estado || ''}`;
        const line3 = `CEP: ${address.cep || ''}${address.telefone ? ' | Tel: ' + address.telefone : ''}`;
        
        return { line1, line2, line3 };
    },

    /**
     * Calculate time difference in hours
     */
    getHoursDiff(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
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
            if (firstInput) firstInput.focus();
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
     * Export to CSV
     */
    exportToCSV(data, filename) {
        if (!data.length) return;
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(';'),
            ...data.map(row => 
                headers.map(h => {
                    let value = row[h];
                    if (value === null || value === undefined) value = '';
                    if (typeof value === 'string' && (value.includes(';') || value.includes('"') || value.includes('\n'))) {
                        value = '"' + value.replace(/"/g, '""') + '"';
                    }
                    return value;
                }).join(';')
            )
        ].join('\n');
        
        this.downloadFile('\uFEFF' + csvContent, filename, 'text/csv;charset=utf-8');
    },

    /**
     * Export to Excel (XLSX)
     */
    exportToExcel(data, filename, sheetName = 'Dados') {
        if (!window.XLSX) {
            this.showToast('Biblioteca XLSX não carregada', 'error');
            return;
        }
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, filename);
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
        const lineHeight = 6;
        const primary = { r: 0, g: 123, b: 255 };
        const softBg = { r: 244, g: 246, b: 248 };
        const technician = DataManager.getTechnicianById(solicitation.tecnicoId);
        const statusLabel = (Utils.getStatusInfo(solicitation.status)?.label || solicitation.status || '').toUpperCase();
        const formatMoney = (value) => Utils.formatCurrency(Number(value) || 0);
        const FALLBACK_TECHNICIAN_NAME = 'tecnico';
        const technicianName = solicitation.tecnicoNome || technician?.nome || FALLBACK_TECHNICIAN_NAME;
        const sanitizedTechName = Utils.sanitizeFilename(technicianName, FALLBACK_TECHNICIAN_NAME);
        
        // Header bar
        doc.setFillColor(primary.r, primary.g, primary.b);
        doc.rect(0, 0, pageWidth, 24, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('Diversey', margin, 12);
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text('Solicitação de Peças', margin, 19);
        doc.text(`#${solicitation.numero || '-'}`, pageWidth - margin, 12, { align: 'right' });
        doc.text(Utils.formatDate(solicitation.data), pageWidth - margin, 19, { align: 'right' });
        
        let y = 32;
        const drawSectionTitle = (title) => {
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(34, 43, 54);
            doc.text(title, margin, y);
            y += 6;
        };
        
        // Summary section
        drawSectionTitle('Dados da Solicitação');
        doc.setFillColor(softBg.r, softBg.g, softBg.b);
        doc.setDrawColor(232, 236, 241);
        doc.roundedRect(margin, y - 3, pageWidth - margin * 2, 26, 2, 2, 'F');
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(64, 70, 79);
        doc.text(`Técnico: ${solicitation.tecnicoNome || 'Não informado'}`, margin + 4, y + 4);
        doc.text(`Status: ${statusLabel}`, pageWidth - margin - 4, y + 4, { align: 'right' });
        doc.text(`Itens: ${(solicitation.itens || []).length}`, margin + 4, y + 4 + lineHeight);
        doc.text(`Total: ${formatMoney(solicitation.total)}`, pageWidth - margin - 4, y + 4 + lineHeight, { align: 'right' });
        doc.text(`Criado por: ${solicitation.createdBy || 'Não informado'}`, margin + 4, y + 4 + lineHeight * 2);
        y += 30;
        
        // Technician address
        if (technician && technician.endereco) {
            drawSectionTitle('Endereço para envio');
            const address = Utils.formatAddress(technician);
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(232, 236, 241);
            doc.roundedRect(margin, y - 3, pageWidth - margin * 2, 20, 2, 2, 'S');
            doc.setFont(undefined, 'normal');
            doc.setTextColor(64, 70, 79);
            doc.text(address.line1, margin + 4, y + 4);
            doc.text(address.line2, margin + 4, y + 10);
            doc.text(address.line3, margin + 4, y + 16);
            y += 26;
        }
        
        // Items table
        drawSectionTitle('Itens solicitados');
        const renderTableHeader = () => {
            doc.setFillColor(primary.r, primary.g, primary.b);
            doc.setTextColor(255, 255, 255);
            doc.setFont(undefined, 'bold');
            doc.roundedRect(margin, y - 3, pageWidth - margin * 2, 8, 2, 2, 'F');
            doc.text('Código', margin + 3, y + 2);
            doc.text('Descrição', margin + 30, y + 2);
            doc.text('Qtd', pageWidth - margin - 52, y + 2, { align: 'right' });
            doc.text('Vlr Unit.', pageWidth - margin - 28, y + 2, { align: 'right' });
            doc.text('Total', pageWidth - margin, y + 2, { align: 'right' });
            y += 10;
            doc.setFont(undefined, 'normal');
            doc.setTextColor(34, 43, 54);
        };
        renderTableHeader();
        
        const items = solicitation.itens || [];
        if (items.length === 0) {
            doc.text('Nenhum item informado.', margin, y + 2);
            y += 10;
        } else {
            items.forEach((item, idx) => {
                if (y > pageHeight - 30) {
                    doc.addPage();
                    y = margin;
                    renderTableHeader();
                }
                
                if (idx % 2 === 0) {
                    doc.setFillColor(softBg.r, softBg.g, softBg.b);
                    doc.rect(margin, y - 4, pageWidth - margin * 2, 8, 'F');
                }
                
                doc.text(item.codigo || '-', margin + 3, y);
                doc.text((item.descricao || '-').substring(0, 60), margin + 30, y);
                doc.text(String(item.quantidade || 0), pageWidth - margin - 52, y, { align: 'right' });
                doc.text(formatMoney(item.valorUnit), pageWidth - margin - 28, y, { align: 'right' });
                doc.text(formatMoney((item.quantidade || 0) * (item.valorUnit || 0)), pageWidth - margin, y, { align: 'right' });
                y += 8;
            });
        }
        
        // Totals
        y += 2;
        doc.setDrawColor(232, 236, 241);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;
        doc.setFont(undefined, 'bold');
        doc.setTextColor(34, 43, 54);
        doc.text('Resumo financeiro', margin, y);
        doc.setFont(undefined, 'normal');
        doc.text(`Subtotal: ${formatMoney(solicitation.subtotal)}`, pageWidth - margin, y, { align: 'right' });
        y += lineHeight;
        doc.text(`Desconto: ${formatMoney(solicitation.desconto)}`, pageWidth - margin, y, { align: 'right' });
        y += lineHeight;
        doc.text(`Frete: ${formatMoney(solicitation.frete)}`, pageWidth - margin, y, { align: 'right' });
        y += lineHeight + 2;
        doc.setFont(undefined, 'bold');
        doc.text(`Total: ${formatMoney(solicitation.total)}`, pageWidth - margin, y, { align: 'right' });
        
        // Observations
        if (solicitation.observacoes) {
            y += 10;
            drawSectionTitle('Observações');
            const obsLines = doc.splitTextToSize(solicitation.observacoes, pageWidth - margin * 2 - 8);
            const boxHeight = obsLines.length * 5 + 6;
            doc.setFillColor(softBg.r, softBg.g, softBg.b);
            doc.roundedRect(margin, y - 4, pageWidth - margin * 2, boxHeight, 2, 2, 'F');
            doc.setFont(undefined, 'normal');
            doc.setTextColor(64, 70, 79);
            doc.text(obsLines, margin + 4, y + 2);
            y += boxHeight + 4;
        }
        
        // Footer
        const footerY = pageHeight - 12;
        doc.setFontSize(8);
        doc.setTextColor(120, 126, 135);
        doc.text(`ID: ${solicitation.id}`, margin, footerY);
        doc.text(`Gerado em: ${Utils.formatDate(new Date(), true)}`, pageWidth - margin, footerY, { align: 'right' });
        
        // Save
        doc.save(`solicitacao_${solicitation.numero || 'sem-numero'}_${sanitizedTechName}.pdf`);
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
                            if (!lines[i].trim()) continue;
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
            finalizada: { label: 'Finalizada', icon: 'fa-flag-checkered', class: 'status-finalizada' }
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
        if (totalPages <= 1) return '';
        
        let html = '<div class="pagination">';
        
        // Previous button
        html += `<button ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
            <i class="fas fa-chevron-left"></i>
        </button>`;
        
        // Page numbers
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        
        if (startPage > 1) {
            html += `<button data-page="1">1</button>`;
            if (startPage > 2) html += '<button disabled>...</button>';
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += '<button disabled>...</button>';
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
