// Authentication Module - Fixed
app.auth = {
    init() {
        console.log('Auth module initialized');
    },

    // Login with proper error handling
    async login(email, password) {
        try {
            const result = await app.api.post('/auth/login', { email, password });
            
            if (result.token) {
                // Set token in API module
                app.api.setToken(result.token);
                
                // Store user data
                localStorage.setItem('secureops_user', JSON.stringify(result.user));
                localStorage.setItem('secureops_token', result.token);
                
                return {
                    success: true,
                    token: result.token,
                    user: result.user
                };
            } else {
                return {
                    success: false,
                    message: result.message || 'Login failed'
                };
            }
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: error.message || 'Network error. Please check if the server is running.'
            };
        }
    },

    // Logout
    async logout() {
        try {
            // Call logout endpoint if token exists
            if (app.api.token) {
                await app.api.post('/auth/logout');
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        // Clear stored data regardless of API call result
        app.api.clearToken();
        localStorage.removeItem('secureops_user');
        
        // Redirect to login
        app.showLogin();
        
        // Show message
        app.showToast('info', 'Logged Out', 'You have been successfully logged out');
    },

    // Get user info from token/storage
    getUserInfo(token) {
        // Try to get from localStorage first
        const storedUser = localStorage.getItem('secureops_user');
        if (storedUser) {
            try {
                return JSON.parse(storedUser);
            } catch (error) {
                console.error('Error parsing stored user:', error);
            }
        }
        
        // If no stored user, decode from token (if JWT)
        if (token) {
            try {
                // Simple JWT decode (for the payload only, not verification)
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                
                const payload = JSON.parse(jsonPayload);
                return {
                    id: payload.id,
                    name: payload.name || payload.email,
                    email: payload.email,
                    role: payload.role || 'analyst',
                    permissions: ['create', 'read', 'update', 'delete']
                };
            } catch (error) {
                console.error('Error decoding token:', error);
            }
        }
        
        // Return null if no user found
        return null;
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
        
        try {
            // Check if token is still valid by calling a protected endpoint
            const result = await app.api.get('/auth/profile');
            return !!result;
        } catch (error) {
            console.error('Session validation error:', error);
            return false;
        }
    },

    // Refresh token
    async refreshToken() {
        const currentToken = localStorage.getItem('secureops_token');
        if (!currentToken) {
            return { success: false, message: 'No token to refresh' };
        }
        
        try {
            const result = await app.api.post('/auth/refresh-token', { token: currentToken });
            
            if (result.token) {
                app.api.setToken(result.token);
                localStorage.setItem('secureops_token', result.token);
                
                return {
                    success: true,
                    token: result.token
                };
            }
            
            return {
                success: false,
                message: 'Failed to refresh token'
            };
        } catch (error) {
            console.error('Token refresh error:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
};