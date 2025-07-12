// API Communication Module - Fixed for proper backend integration
app.api = {
    // Use relative URL for API to work with Docker setup
    baseURL: '/api',
    token: null,

    init() {
        this.token = localStorage.getItem('secureops_token');
    },

    // Set authorization header
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    },

    // Handle response
    async handleResponse(response) {
        // Try to get response as text first
        const text = await response.text();
        
        // Try to parse as JSON
        try {
            const data = text ? JSON.parse(text) : {};
            
            if (!response.ok) {
                throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
            }
            
            return data;
        } catch (error) {
            if (!response.ok) {
                throw new Error(`Request failed: ${text || response.statusText}`);
            }
            throw error;
        }
    },

    // GET request
    async get(endpoint) {
        try {
            const response = await fetch(this.baseURL + endpoint, {
                method: 'GET',
                headers: this.getHeaders(),
                credentials: 'include'
            });
            
            return this.handleResponse(response);
        } catch (error) {
            console.error('API GET error:', error);
            throw error;
        }
    },

    // POST request
    async post(endpoint, data = {}) {
        try {
            const response = await fetch(this.baseURL + endpoint, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data),
                credentials: 'include'
            });
            
            return this.handleResponse(response);
        } catch (error) {
            console.error('API POST error:', error);
            throw error;
        }
    },

    // PUT request
    async put(endpoint, data = {}) {
        try {
            const response = await fetch(this.baseURL + endpoint, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(data),
                credentials: 'include'
            });
            
            return this.handleResponse(response);
        } catch (error) {
            console.error('API PUT error:', error);
            throw error;
        }
    },

    // DELETE request
    async delete(endpoint) {
        try {
            const response = await fetch(this.baseURL + endpoint, {
                method: 'DELETE',
                headers: this.getHeaders(),
                credentials: 'include'
            });
            
            return this.handleResponse(response);
        } catch (error) {
            console.error('API DELETE error:', error);
            throw error;
        }
    },

    // Upload file
    async upload(endpoint, file, additionalData = {}) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            // Add additional data to form
            Object.keys(additionalData).forEach(key => {
                formData.append(key, additionalData[key]);
            });
            
            const headers = {
                'Accept': 'application/json'
            };
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }
            
            const response = await fetch(this.baseURL + endpoint, {
                method: 'POST',
                headers,
                body: formData,
                credentials: 'include'
            });
            
            return this.handleResponse(response);
        } catch (error) {
            console.error('API upload error:', error);
            throw error;
        }
    },

    // Set token
    setToken(token) {
        this.token = token;
        localStorage.setItem('secureops_token', token);
    },

    // Clear token
    clearToken() {
        this.token = null;
        localStorage.removeItem('secureops_token');
    },

    // Add delay utility for demo purposes
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};