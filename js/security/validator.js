/**
 * Form Validation Module
 * Validações consistentes em todo o sistema
 */

const Validator = {
    /**
     * Validações de campos
     */
    rules: {
        required: (value) => {
            return value !== null && value !== undefined && String(value).trim() !== '';
        },
        
        email: (value) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(String(value));
        },
        
        minLength: (value, min) => {
            return String(value).length >= min;
        },
        
        maxLength: (value, max) => {
            return String(value).length <= max;
        },
        
        numeric: (value) => {
            return !isNaN(parseFloat(value)) && isFinite(value);
        },
        
        positiveNumber: (value) => {
            return Validator.rules.numeric(value) && parseFloat(value) > 0;
        },
        
        username: (value) => {
            // Apenas letras, números, ponto e underscore
            const usernameRegex = /^[a-zA-Z0-9._]+$/;
            return usernameRegex.test(String(value));
        },
        
        noSpecialChars: (value) => {
            // Bloquear caracteres especiais perigosos
            const dangerousChars = /<|>|&|"|'|`|;|\||\\|\/script/gi;
            return !dangerousChars.test(String(value));
        }
    },

    /**
     * Valida um campo individual
     * @param {any} value - Valor a validar
     * @param {array} rules - Array de regras: ['required', ['minLength', 3]]
     * @returns {object} {valid: boolean, errors: string[]}
     */
    validateField(value, rules) {
        const errors = [];
        
        for (const rule of rules) {
            let ruleName, ruleParams;
            
            if (Array.isArray(rule)) {
                [ruleName, ...ruleParams] = rule;
            } else {
                ruleName = rule;
                ruleParams = [];
            }
            
            if (!this.rules[ruleName]) {
                console.warn(`Validation rule '${ruleName}' not found`);
                continue;
            }
            
            if (!this.rules[ruleName](value, ...ruleParams)) {
                errors.push(this.getErrorMessage(ruleName, ruleParams));
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    },

    /**
     * Valida formulário completo
     * @param {object} formData - Dados do formulário
     * @param {object} schema - Schema de validação
     * @returns {object} {valid: boolean, errors: object}
     */
    validateForm(formData, schema) {
        const errors = {};
        let isValid = true;
        
        for (const field in schema) {
            const fieldValidation = this.validateField(formData[field], schema[field]);
            
            if (!fieldValidation.valid) {
                errors[field] = fieldValidation.errors;
                isValid = false;
            }
        }
        
        return { valid: isValid, errors };
    },

    /**
     * Mensagens de erro
     */
    getErrorMessage(rule, params) {
        const messages = {
            required: 'Este campo é obrigatório',
            email: 'Email inválido',
            minLength: `Mínimo de ${params[0]} caracteres`,
            maxLength: `Máximo de ${params[0]} caracteres`,
            numeric: 'Deve ser um número',
            positiveNumber: 'Deve ser um número positivo',
            username: 'Apenas letras, números, ponto e underscore',
            noSpecialChars: 'Caracteres especiais não permitidos'
        };
        
        return messages[rule] || 'Valor inválido';
    }
};

if (typeof window !== 'undefined') {
    window.Validator = Validator;
}
