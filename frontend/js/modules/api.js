// API Communication Module - Fixed for proper backend integration
if (!window.app) window.app = {};

app.api = {
    // API base URL - untuk Docker setup
    baseURL: window.location.origin + '/api',
    token: null,

    init() {
        this.token = localStorage.getItem('secureops_token');
        console.log('API module initialized with baseURL:', this.baseURL);
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
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            
            if (!response.ok) {
                // Handle error response
                const error = new Error(data.message || data.error || `Request failed with status ${response.status}`);
                error.status = response.status;
                error.data = data;
                throw error;
            }
            
            return data;
        } else {
            // Handle non-JSON response
            const text = await response.text();
            
            if (!response.ok) {
                const error = new Error(text || `Request failed with status ${response.status}`);
                error.status = response.status;
                throw error;
            }
            
            // Try to parse as JSON anyway
            try {
                return JSON.parse(text);
            } catch {
                return { message: text };
            }
        }
    },

    // GET request
    async get(endpoint) {
        try {
            console.log('GET request to:', this.baseURL + endpoint);
            
            const response = await fetch(this.baseURL + endpoint, {
                method: 'GET',
                headers: this.getHeaders()
            });
            
            return await this.handleResponse(response);
        } catch (error) {
            console.error('API GET error:', error);
            throw error;
        }
    },

    // POST request
    async post(endpoint, data = {}) {
        try {
            console.log('POST request to:', this.baseURL + endpoint);
            console.log('POST data:', data);
            
            const response = await fetch(this.baseURL + endpoint, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
            
            return await this.handleResponse(response);
        } catch (error) {
            console.error('API POST error:', error);
            throw error;
        }
    },

    // PUT request
    async put(endpoint, data = {}) {
        try {
            console.log('PUT request to:', this.baseURL + endpoint);
            
            const response = await fetch(this.baseURL + endpoint, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
            
            return await this.handleResponse(response);
        } catch (error) {
            console.error('API PUT error:', error);
            throw error;
        }
    },

    // DELETE request
    async delete(endpoint) {
        try {
            console.log('DELETE request to:', this.baseURL + endpoint);
            
            const response = await fetch(this.baseURL + endpoint, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            
            return await this.handleResponse(response);
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
                body: formData
            });
            
            return await this.handleResponse(response);
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

    // Check if API is reachable
    async checkConnection() {
        try {
            const response = await fetch(this.baseURL.replace('/api', '/health'));
            return response.ok;
        } catch {
            return false;
        }
    },

    // Add delay utility for demo purposes
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};