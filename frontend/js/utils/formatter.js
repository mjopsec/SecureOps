// Formatting Utilities
const formatter = {
    // Format date
    date(date, format = 'default') {
        const d = new Date(date);
        if (isNaN(d)) return 'Invalid Date';
        
        switch(format) {
            case 'short':
                return d.toLocaleDateString();
            case 'long':
                return d.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            case 'time':
                return d.toLocaleTimeString();
            case 'datetime':
                return d.toLocaleString();
            case 'iso':
                return d.toISOString();
            case 'relative':
                return this.relativeTime(d);
            default:
                return d.toLocaleDateString();
        }
    },

    // Format relative time
    relativeTime(date) {
        const d = new Date(date);
        const now = new Date();
        const diff = now - d;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        const weeks = Math.floor(diff / 604800000);
        const months = Math.floor(diff / 2592000000);
        const years = Math.floor(diff / 31536000000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
        return `${years} year${years > 1 ? 's' : ''} ago`;
    },

    // Format file size
    fileSize(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    // Format number
    number(num, options = {}) {
        const {
            decimals = 0,
            thousandsSeparator = ',',
            decimalSeparator = '.',
            prefix = '',
            suffix = ''
        } = options;
        
        const parts = Number(num).toFixed(decimals).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
        
        return prefix + parts.join(decimalSeparator) + suffix;
    },

    // Format percentage
    percentage(value, decimals = 0) {
        return this.number(value, { decimals, suffix: '%' });
    },

    // Format currency
    currency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },

    // Format phone number
    phone(phone) {
        const cleaned = ('' + phone).replace(/\D/g, '');
        const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
        if (match) {
            return '(' + match[1] + ') ' + match[2] + '-' + match[3];
        }
        return phone;
    },

    // Truncate text
    truncate(text, length = 50, suffix = '...') {
        if (!text || text.length <= length) return text;
        return text.substring(0, length - suffix.length) + suffix;
    },

    // Title case
    titleCase(str) {
        return str.replace(/\w\S*/g, (txt) => {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    },

    // Slug
    slug(str) {
        return str
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    },

    // Highlight text
    highlight(text, search, className = 'highlight') {
        if (!search) return text;
        
        const regex = new RegExp(`(${search})`, 'gi');
        return text.replace(regex, `<span class="${className}">$1</span>`);
    },

    // Format severity
    severity(level) {
        const severities = {
            critical: { label: 'Critical', class: 'danger', icon: 'fa-exclamation-circle' },
            high: { label: 'High', class: 'warning', icon: 'fa-exclamation-triangle' },
            medium: { label: 'Medium', class: 'primary', icon: 'fa-info-circle' },
            low: { label: 'Low', class: 'success', icon: 'fa-check-circle' }
        };
        
        return severities[level.toLowerCase()] || severities.medium;
    },

    // Format status
    status(status) {
        const statuses = {
            open: { label: 'Open', class: 'danger', icon: 'fa-folder-open' },
            investigating: { label: 'Investigating', class: 'warning', icon: 'fa-search' },
            resolved: { label: 'Resolved', class: 'success', icon: 'fa-check' },
            closed: { label: 'Closed', class: 'secondary', icon: 'fa-folder' }
        };
        
        return statuses[status.toLowerCase()] || statuses.open;
    },

    // Format IOC type
    iocType(type) {
        const types = {
            ip: { label: 'IP Address', icon: 'fa-network-wired' },
            domain: { label: 'Domain', icon: 'fa-globe' },
            hash: { label: 'File Hash', icon: 'fa-fingerprint' },
            email: { label: 'Email', icon: 'fa-envelope' }
        };
        
        return types[type.toLowerCase()] || { label: type, icon: 'fa-question' };
    },

    // Format JSON
    json(obj, indent = 2) {
        return JSON.stringify(obj, null, indent);
    },

    // Parse JSON safely
    parseJSON(str, fallback = null) {
        try {
            return JSON.parse(str);
        } catch {
            return fallback;
        }
    },

    // Format error message
    errorMessage(error) {
        if (typeof error === 'string') return error;
        if (error.message) return error.message;
        if (error.error) return error.error;
        return 'An unexpected error occurred';
    }
};
