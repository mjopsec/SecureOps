// API Communication Module - Updated for Real Backend
app.api = {
    baseURL: window.location.origin + '/api',
    token: null,

    init() {
        this.token = localStorage.getItem('secureops_token');
    },

    // Set authorization header
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    },

    // Handle response
    async handleResponse(response) {
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Network error' }));
            throw new Error(error.error || error.message || 'Request failed');
        }
        
        return response.json();
    },

    // GET request
    async get(endpoint) {
        try {
            const response = await fetch(this.baseURL + endpoint, {
                method: 'GET',
                headers: this.getHeaders()
            });
            
            return this.handleResponse(response);
        } catch (error) {
            console.error('API GET error:', error);
            throw error;
        }
    },

    // POST request
    async post(endpoint, data) {
        try {
            const response = await fetch(this.baseURL + endpoint, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
            
            return this.handleResponse(response);
        } catch (error) {
            console.error('API POST error:', error);
            throw error;
        }
    },

    // PUT request
    async put(endpoint, data) {
        try {
            const response = await fetch(this.baseURL + endpoint, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
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
                headers: this.getHeaders()
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
            
            const headers = {};
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }
            
            const response = await fetch(this.baseURL + endpoint, {
                method: 'POST',
                headers,
                body: formData
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
    }
};
