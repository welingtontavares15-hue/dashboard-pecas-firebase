/**
 * Input Sanitization Module
 * Protege contra XSS (Cross-Site Scripting) usando DOMPurify
 */

// Importar DOMPurify via CDN ou npm
// <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>

const Sanitizer = {
    /**
     * Sanitiza HTML removendo scripts maliciosos
     * @param {string} dirty - HTML potencialmente perigoso
     * @returns {string} HTML limpo
     */
    sanitizeHTML(dirty) {
        if (typeof DOMPurify === 'undefined') {
            console.warn('DOMPurify not loaded, falling back to textContent');
            const div = document.createElement('div');
            div.textContent = dirty;
            return div.innerHTML;
        }
        
        return DOMPurify.sanitize(dirty, {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span', 'br'],
            ALLOWED_ATTR: ['class']
        });
    },

    /**
     * Sanitiza texto removendo TODAS as tags HTML
     * @param {string} text - Texto com possíveis tags
     * @returns {string} Texto puro
     */
    sanitizeText(text) {
        if (typeof DOMPurify === 'undefined') {
            return String(text || '').replace(/<[^>]*>/g, '');
        }
        
        return DOMPurify.sanitize(text, {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: []
        });
    },

    /**
     * Sanitiza URL para evitar javascript: e data: URIs maliciosos
     * @param {string} url - URL a validar
     * @returns {string} URL segura ou '#'
     */
    sanitizeURL(url) {
        if (!url) return '#';
        
        const urlStr = String(url).trim().toLowerCase();
        
        // Bloquear protocolos perigosos
        if (urlStr.startsWith('javascript:') || 
            urlStr.startsWith('data:') || 
            urlStr.startsWith('vbscript:')) {
            console.warn('Blocked dangerous URL protocol:', url);
            return '#';
        }
        
        return url;
    },

    /**
     * Sanitiza objeto recursivamente
     * @param {object} obj - Objeto a sanitizar
     * @returns {object} Objeto sanitizado
     */
    sanitizeObject(obj) {
        if (!obj || typeof obj !== 'object') {
            return obj;
        }

        const sanitized = Array.isArray(obj) ? [] : {};
        
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                
                if (typeof value === 'string') {
                    sanitized[key] = this.sanitizeText(value);
                } else if (typeof value === 'object' && value !== null) {
                    sanitized[key] = this.sanitizeObject(value);
                } else {
                    sanitized[key] = value;
                }
            }
        }
        
        return sanitized;
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.Sanitizer = Sanitizer;
}
