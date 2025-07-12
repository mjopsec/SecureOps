// Validation Utilities
const validator = {
    // Email validation
    isEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    },

    // IP address validation
    isIP(ip) {
        const re = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return re.test(ip);
    },

    // Domain validation
    isDomain(domain) {
        const re = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
        return re.test(domain);
    },

    // URL validation
    isURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    // Hash validation (MD5, SHA1, SHA256)
    isHash(hash) {
        const md5 = /^[a-fA-F0-9]{32}$/;
        const sha1 = /^[a-fA-F0-9]{40}$/;
        const sha256 = /^[a-fA-F0-9]{64}$/;
        
        return md5.test(hash) || sha1.test(hash) || sha256.test(hash);
    },

    // Password strength
    passwordStrength(password) {
        let strength = 0;
        
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;
        
        const levels = ['weak', 'fair', 'good', 'strong', 'very strong'];
        return {
            score: strength,
            level: levels[Math.min(Math.floor(strength / 1.5), levels.length - 1)]
        };
    },

    // Required field validation
    required(value) {
        return value !== null && value !== undefined && value.toString().trim() !== '';
    },

    // Min length validation
    minLength(value, min) {
        return value && value.length >= min;
    },

    // Max length validation
    maxLength(value, max) {
        return !value || value.length <= max;
    },

    // Date validation
    isDate(date) {
        return date instanceof Date && !isNaN(date);
    },

    // Future date validation
    isFutureDate(date) {
        const d = new Date(date);
        return this.isDate(d) && d > new Date();
    },

    // Past date validation
    isPastDate(date) {
        const d = new Date(date);
        return this.isDate(d) && d < new Date();
    },

    // File size validation (in bytes)
    maxFileSize(file, maxSize) {
        return file && file.size <= maxSize;
    },

    // File type validation
    allowedFileType(file, allowedTypes) {
        if (!file || !file.type) return false;
        return allowedTypes.some(type => {
            if (type.includes('*')) {
                const baseType = type.split('/')[0];
                return file.type.startsWith(baseType);
            }
            return file.type === type;
        });
    },

    // Sanitize HTML
    sanitizeHTML(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    },

    // Validate form
    validateForm(formId, rules) {
        const form = document.getElementById(formId);
        if (!form) return { valid: false, errors: ['Form not found'] };
        
        const errors = {};
        let isValid = true;
        
        Object.keys(rules).forEach(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
            if (!field) return;
            
            const value = field.value;
            const fieldRules = rules[fieldName];
            
            fieldRules.forEach(rule => {
                let passed = true;
                let message = '';
                
                switch(rule.type) {
                    case 'required':
                        passed = this.required(value);
                        message = rule.message || `${fieldName} is required`;
                        break;
                    case 'email':
                        passed = !value || this.isEmail(value);
                        message = rule.message || 'Invalid email address';
                        break;
                    case 'minLength':
                        passed = this.minLength(value, rule.value);
                        message = rule.message || `Minimum length is ${rule.value}`;
                        break;
                    case 'maxLength':
                        passed = this.maxLength(value, rule.value);
                        message = rule.message || `Maximum length is ${rule.value}`;
                        break;
                    case 'pattern':
                        passed = !value || new RegExp(rule.value).test(value);
                        message = rule.message || 'Invalid format';
                        break;
                    case 'custom':
                        passed = rule.validator(value, field);
                        message = rule.message || 'Validation failed';
                        break;
                }
                
                if (!passed) {
                    isValid = false;
                    if (!errors[fieldName]) errors[fieldName] = [];
                    errors[fieldName].push(message);
                    field.classList.add('error');
                } else {
                    field.classList.remove('error');
                }
            });
        });
        
        return { valid: isValid, errors };
    }
};
