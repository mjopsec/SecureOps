// Authentication Module
app.auth = {
    init() {
        console.log('Auth module initialized');
    },

    // Login
    async login(email, password) {
        try {
            const result = await app.api.post('/api/auth/login', { email, password });
            
            if (result.success) {
                // Store user data
                localStorage.setItem('secureops_user', JSON.stringify(result.user));
                localStorage.setItem('secureops_token', result.token);
            }
            
            return result;
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: 'Network error. Please try again.'
            };
        }
    },

    // Logout
    logout() {
        // Clear stored data
        localStorage.removeItem('secureops_token');
        localStorage.removeItem('secureops_user');
        
        // Redirect to login
        app.showLogin();
        
        // Show message
        app.showToast('info', 'Logged Out', 'You have been successfully logged out');
    },

    // Get user info from token
    getUserInfo(token) {
        // In production, this would decode JWT token
        // For demo, we'll get from localStorage
        const storedUser = localStorage.getItem('secureops_user');
        if (storedUser) {
            return JSON.parse(storedUser);
        }
        
        // Default user for demo
        return {
            id: 1,
            name: 'Admin User',
            email: 'admin@secureops.com',
            role: 'Security Admin',
            permissions: ['create', 'read', 'update', 'delete', 'admin']
        };
    },

    // Check if user has permission
    hasPermission(permission) {
        const user = this.getUserInfo();
        return user && user.permissions && user.permissions.includes(permission);
    },

    // Validate session
    async validateSession() {
        const token = localStorage.getItem('secureops_token');
        if (!token) {
            return false;
        }
        
        // In production, validate with server
        // For demo, check if token exists
        return true;
    },

    // Refresh token
    async refreshToken() {
        // In production, exchange refresh token for new access token
        return {
            success: true,
            token: 'refreshed-token-' + Date.now()
        };
    }
};