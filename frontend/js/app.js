// SecureOps Main Application Controller
if (!window.app) window.app = {};

// Extend app object
Object.assign(app, {
    // Application state
    state: {
        user: null,
        currentPage: 'dashboard',
        incidents: [],
        notifications: [],
        isLoading: false
    },

    // Initialize application
    async init() {
        console.log('Initializing SecureOps...');
        
        // Initialize modules first
        this.api.init();
        this.auth.init();
        this.incident.init();
        this.ioc.init();
        this.attribution.init();
        this.report.init();
        
        // Check API connection
        const isConnected = await this.api.checkConnection();
        if (!isConnected) {
            console.warn('API connection failed, but continuing...');
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Check authentication
        const token = localStorage.getItem('secureops_token');
        if (token) {
            // Validate token
            try {
                const user = await this.api.get('/auth/profile');
                this.state.user = user;
                this.showMainApp();
                this.updateUserInfo();
                this.buildNavigation();
                this.navigateTo('dashboard');
                this.loadNotifications();
                this.startPolling();
            } catch (error) {
                console.error('Token validation failed:', error);
                this.api.clearToken();
                this.showLogin();
            }
        } else {
            this.showLogin();
        }
    },

    // Setup global event listeners
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.auth.logout();
            });
        }

        // Notification button
        const notificationBtn = document.getElementById('notificationBtn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                this.showNotifications();
            });
        }

        // Close notification panel
        const closeNotificationBtn = document.getElementById('closeNotificationBtn');
        if (closeNotificationBtn) {
            closeNotificationBtn.addEventListener('click', () => {
                this.hideNotifications();
            });
        }

        // Window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.page) {
                this.navigateTo(e.state.page, false);
            }
        });
    },

    // Handle login
    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const loginButton = document.getElementById('loginButton');
        const loginButtonText = document.getElementById('loginButtonText');
        const loginError = document.getElementById('loginError');
        const loginErrorText = document.getElementById('loginErrorText');

        // Reset error
        loginError.style.display = 'none';
        
        // Disable form
        loginButton.disabled = true;
        loginButtonText.innerHTML = 'Logging in... <i class="fas fa-spinner fa-spin"></i>';
        
        try {
            const result = await this.auth.login(email, password);
            
            if (result.success) {
                // Store user data
                this.state.user = result.user;
                
                // Show main app
                this.showMainApp();
                this.updateUserInfo();
                this.buildNavigation();
                this.navigateTo('dashboard');
                
                // Load initial data
                setTimeout(() => {
                    this.loadNotifications();
                    this.startPolling();
                }, 100);
                
                // Show success message
                this.showToast('success', 'Login Successful', `Welcome back, ${result.user.name}!`);
            } else {
                // Show error
                loginErrorText.textContent = result.message || 'Invalid credentials';
                loginError.style.display = 'flex';
            }
        } catch (error) {
            console.error('Login error:', error);
            loginErrorText.textContent = error.message || 'Unable to connect to server. Please check if the backend is running.';
            loginError.style.display = 'flex';
        } finally {
            // Re-enable form
            loginButton.disabled = false;
            loginButtonText.innerHTML = 'Login';
        }
    },

    // Show login screen
    showLogin() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        
        // Clear any stored data
        this.state.user = null;
        this.state.incidents = [];
        this.state.notifications = [];
    },

    // Show main application
    showMainApp() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'flex';
    },

    // Update user info in UI
    updateUserInfo() {
        if (this.state.user) {
            document.getElementById('userName').textContent = this.state.user.name;
            document.getElementById('userRole').textContent = this.state.user.role;
        }
    },

    // Build navigation menu
    buildNavigation() {
        const navMenu = document.getElementById('navMenu');
        const menuItems = [
            { id: 'dashboard', icon: 'fas fa-tachometer-alt', label: 'Dashboard' },
            { id: 'incidents', icon: 'fas fa-file-alt', label: 'Incidents' },
            { id: 'create', icon: 'fas fa-plus-circle', label: 'Create Report' },
            { id: 'analytics', icon: 'fas fa-chart-line', label: 'Analytics' },
            { id: 'threat-intel', icon: 'fas fa-database', label: 'Threat Intel' },
            { id: 'team', icon: 'fas fa-users', label: 'Team' },
            { id: 'settings', icon: 'fas fa-cog', label: 'Settings' }
        ];

        navMenu.innerHTML = menuItems.map(item => `
            <a href="#" class="nav-item ${item.id === this.state.currentPage ? 'active' : ''}" 
               data-page="${item.id}" onclick="app.navigateTo('${item.id}'); return false;">
                <i class="${item.icon}"></i>
                ${item.label}
            </a>
        `).join('');
    },

    // Navigate to page
    navigateTo(page, pushState = true) {
        this.state.currentPage = page;
        
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });
        
        // Update breadcrumb
        this.updateBreadcrumb(page);
        
        // Load page content
        this.loadPageContent(page);
        
        // Update browser history
        if (pushState) {
            history.pushState({ page }, '', `#${page}`);
        }
    },

    // Update breadcrumb
    updateBreadcrumb(page) {
        const breadcrumb = document.getElementById('breadcrumb');
        const pages = {
            dashboard: 'Dashboard',
            incidents: 'Incidents',
            create: 'Create Report',
            analytics: 'Analytics',
            'threat-intel': 'Threat Intelligence',
            team: 'Team',
            settings: 'Settings'
        };
        
        breadcrumb.innerHTML = `
            <a href="#" onclick="app.navigateTo('dashboard'); return false;">Home</a>
            <i class="fas fa-chevron-right"></i>
            <span>${pages[page] || page}</span>
        `;
    },

    // Load page content
    async loadPageContent(page) {
        const contentArea = document.getElementById('contentArea');
        
        // Show loading
        contentArea.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>';
        
        try {
            let content = '';
            
            switch(page) {
                case 'dashboard':
                    content = await this.loadDashboard();
                    break;
                case 'incidents':
                    content = await this.loadIncidents();
                    break;
                case 'create':
                    content = await this.loadCreateIncident();
                    break;
                case 'analytics':
                    content = await this.loadAnalytics();
                    break;
                case 'threat-intel':
                    content = await this.loadThreatIntel();
                    break;
                case 'team':
                    content = await this.loadTeam();
                    break;
                case 'settings':
                    content = await this.loadSettings();
                    break;
                default:
                    content = '<div class="empty-state"><p>Page not found</p></div>';
            }
            
            contentArea.innerHTML = content;
            
            // Initialize page-specific features
            this.initializePageFeatures(page);
            
        } catch (error) {
            console.error('Error loading page:', error);
            contentArea.innerHTML = '<div class="empty-state"><p>Error loading page</p></div>';
        }
    },

    // Initialize page-specific features
    initializePageFeatures(page) {
        switch(page) {
            case 'create':
                this.incident.initializeForm();
                break;
            case 'incidents':
                this.incident.initializeList();
                break;
            case 'analytics':
                this.initializeCharts();
                break;
        }
    },

    // Load dashboard content
    async loadDashboard() {
        let stats = { activeIncidents: 0, pendingReview: 0, resolvedToday: 0, totalIOCs: 0, threatLevel: 'Low' };
        let recentIncidents = [];
        
        try {
            stats = await this.api.get('/stats');
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
        
        try {
            recentIncidents = await this.api.get('/incidents/recent');
        } catch (error) {
            console.error('Failed to load recent incidents:', error);
        }
        
        return `
            <div class="page-header">
                <h1 class="page-title">Security Dashboard</h1>
                <p class="page-subtitle">Real-time security incident monitoring and response</p>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon danger">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.activeIncidents || 0}</div>
                        <div class="stat-label">Active Incidents</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.pendingReview || 0}</div>
                        <div class="stat-label">Pending Review</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.resolvedToday || 0}</div>
                        <div class="stat-label">Resolved Today</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon info">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.threatLevel || 'Low'}</div>
                        <div class="stat-label">Threat Level</div>
                    </div>
                </div>
            </div>
            
            <div class="grid grid-2">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">
                            <i class="fas fa-chart-line"></i>
                            Incident Trend
                        </h2>
                    </div>
                    <canvas id="incidentChart" height="200"></canvas>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">
                            <i class="fas fa-history"></i>
                            Recent Incidents
                        </h2>
                        <a href="#" class="btn btn-sm btn-ghost" onclick="app.navigateTo('incidents'); return false;">
                            View All
                        </a>
                    </div>
                    <div class="incident-list">
                        ${this.renderRecentIncidents(recentIncidents)}
                    </div>
                </div>
            </div>
        `;
    },

    // Render recent incidents
    renderRecentIncidents(incidents) {
        if (!incidents || incidents.length === 0) {
            return '<div class="empty-state"><p>No recent incidents</p></div>';
        }
        
        return incidents.map(incident => `
            <div class="incident-item">
                <div class="incident-severity ${incident.severity}"></div>
                <div class="incident-content">
                    <div class="incident-title">${incident.title}</div>
                    <div class="incident-meta">
                        <span><i class="fas fa-building"></i> ${incident.organization}</span>
                        <span><i class="fas fa-clock"></i> ${this.formatTime(incident.createdAt)}</span>
                    </div>
                </div>
                <div class="incident-status">
                    <span class="badge badge-${incident.status === 'open' ? 'danger' : 'success'}">
                        ${incident.status}
                    </span>
                </div>
            </div>
        `).join('');
    },

    // Additional page loaders remain the same...
    async loadIncidents() {
        let incidents = [];
        
        try {
            const response = await this.api.get('/incidents');
            incidents = response.incidents || [];
        } catch (error) {
            console.error('Failed to load incidents:', error);
        }
        
        return `
            <div class="page-header">
                <h1 class="page-title">Incident Management</h1>
                <div class="page-actions">
                    <button class="btn btn-primary" onclick="app.navigateTo('create')">
                        <i class="fas fa-plus"></i> New Incident
                    </button>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <div class="filters">
                        <select class="form-control" style="width: auto">
                            <option>All Status</option>
                            <option>Open</option>
                            <option>In Progress</option>
                            <option>Resolved</option>
                        </select>
                        <select class="form-control" style="width: auto">
                            <option>All Severity</option>
                            <option>Critical</option>
                            <option>High</option>
                            <option>Medium</option>
                            <option>Low</option>
                        </select>
                    </div>
                </div>
                
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Organization</th>
                            <th>Type</th>
                            <th>Severity</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.renderIncidentTable(incidents)}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderIncidentTable(incidents) {
        if (!incidents || incidents.length === 0) {
            return '<tr><td colspan="8" class="text-center">No incidents found</td></tr>';
        }
        
        return incidents.map(incident => `
            <tr>
                <td><strong>${incident.incidentId || incident.id}</strong></td>
                <td>${incident.title}</td>
                <td>${incident.organization}</td>
                <td><span class="badge badge-primary">${incident.type}</span></td>
                <td><span class="badge badge-${this.getSeverityClass(incident.severity)}">${incident.severity}</span></td>
                <td>
                    <span class="status">
                        <span class="status-dot ${incident.status}"></span>
                        ${incident.status}
                    </span>
                </td>
                <td>${new Date(incident.createdAt).toLocaleDateString()}</td>
                <td>
                    <div class="data-table-actions">
                        <button class="btn btn-sm btn-ghost" onclick="app.incident.view('${incident.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-ghost" onclick="app.incident.edit('${incident.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    getSeverityClass(severity) {
        const classes = {
            critical: 'danger',
            high: 'warning',
            medium: 'primary',
            low: 'success'
        };
        return classes[severity] || 'secondary';
    },

    // Load create incident page
    async loadCreateIncident() {
        return `
            <div class="page-header">
                <h1 class="page-title">Create Incident Report</h1>
                <p class="page-subtitle">Document and analyze cybersecurity incidents</p>
            </div>
            
            <form id="incidentForm" class="incident-form">
                <div class="form-progress">
                    <div class="progress">
                        <div class="progress-bar" id="formProgress" style="width: 25%"></div>
                    </div>
                    <div class="progress-steps">
                        <div class="step active">Basic Info</div>
                        <div class="step">Details</div>
                        <div class="step">IOCs</div>
                        <div class="step">Analysis</div>
                    </div>
                </div>
                
                <!-- Step 1: Basic Information -->
                <div class="form-step active" id="step1">
                    <div class="card">
                        <div class="card-header">
                            <h2 class="card-title">
                                <i class="fas fa-info-circle"></i>
                                Basic Information
                            </h2>
                        </div>
                        
                        <div class="grid grid-2">
                            <div class="form-group">
                                <label class="form-label">Organization Name <span class="required">*</span></label>
                                <input type="text" class="form-control" id="orgName" required>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Incident Date & Time <span class="required">*</span></label>
                                <input type="datetime-local" class="form-control" id="incidentDate" required>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Incident Type <span class="required">*</span></label>
                                <select class="form-control" id="incidentType" required>
                                    <option value="">Select incident type</option>
                                    <option value="ransomware">Ransomware Attack</option>
                                    <option value="phishing">Phishing Campaign</option>
                                    <option value="malware">Malware Infection</option>
                                    <option value="ddos">DDoS Attack</option>
                                    <option value="data-breach">Data Breach</option>
                                    <option value="apt">Advanced Persistent Threat</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Severity Level <span class="required">*</span></label>
                                <select class="form-control" id="severity" required>
                                    <option value="">Select severity</option>
                                    <option value="critical">Critical</option>
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-primary" onclick="app.incident.nextStep()">
                                Next <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Additional steps will be loaded dynamically -->
                <div class="form-step" id="step2"></div>
                <div class="form-step" id="step3"></div>
                <div class="form-step" id="step4"></div>
            </form>
        `;
    },

    async loadAnalytics() {
        return `
            <div class="page-header">
                <h1 class="page-title">Security Analytics</h1>
                <p class="page-subtitle">Comprehensive security metrics and insights</p>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">87%</div>
                    <div class="stat-label">Detection Rate</div>
                    <div class="stat-trend up">+5% from last month</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">2.4h</div>
                    <div class="stat-label">Avg Response Time</div>
                    <div class="stat-trend down">-30min from last month</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">342</div>
                    <div class="stat-label">Threats Blocked</div>
                    <div class="stat-trend up">+12% from last month</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">98.5%</div>
                    <div class="stat-label">System Uptime</div>
                    <div class="stat-trend">No change</div>
                </div>
            </div>
        `;
    },

    async loadThreatIntel() {
        return `
            <div class="page-header">
                <h1 class="page-title">Threat Intelligence</h1>
                <p class="page-subtitle">Real-time threat actor tracking and IOC database</p>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">
                        <i class="fas fa-user-secret"></i>
                        Active Threat Actors
                    </h2>
                </div>
                <div class="threat-actors">
                    ${this.renderThreatActors()}
                </div>
            </div>
        `;
    },

    renderThreatActors() {
        const actors = [
            { name: 'APT28', country: 'Russia', active: true, campaigns: 12 },
            { name: 'Lazarus', country: 'North Korea', active: true, campaigns: 8 },
            { name: 'Carbanak', country: 'Unknown', active: false, campaigns: 5 }
        ];
        
        return actors.map(actor => `
            <div class="threat-actor-card">
                <div class="actor-header">
                    <h3>${actor.name}</h3>
                    <span class="status">
                        <span class="status-dot ${actor.active ? 'active' : 'inactive'}"></span>
                        ${actor.active ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div class="actor-details">
                    <span><i class="fas fa-flag"></i> ${actor.country}</span>
                    <span><i class="fas fa-fire"></i> ${actor.campaigns} campaigns</span>
                </div>
            </div>
        `).join('');
    },

    async loadTeam() {
        return `
            <div class="page-header">
                <h1 class="page-title">Team Management</h1>
                <p class="page-subtitle">Security team members and roles</p>
            </div>
            
            <div class="card">
                <p>Team management features coming soon...</p>
            </div>
        `;
    },

    async loadSettings() {
        return `
            <div class="page-header">
                <h1 class="page-title">Settings</h1>
                <p class="page-subtitle">Configure your SecureOps platform</p>
            </div>
            
            <div class="card">
                <p>Settings page coming soon...</p>
            </div>
        `;
    },

    // Show/hide loading overlay
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.toggle('show', show);
        this.state.isLoading = show;
    },

    // Show toast message
    showToast(type, title, message) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${icons[type]}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="app.removeToast(this)">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            this.removeToast(toast.querySelector('.toast-close'));
        }, 5000);
    },

    // Remove toast
    removeToast(button) {
        const toast = button.closest('.toast');
        toast.classList.add('removing');
        setTimeout(() => {
            toast.remove();
        }, 300);
    },

    // Show notifications panel
    showNotifications() {
        const panel = document.getElementById('notificationPanel');
        panel.classList.add('show');
        this.markNotificationsAsRead();
    },

    // Hide notifications panel
    hideNotifications() {
        const panel = document.getElementById('notificationPanel');
        panel.classList.remove('show');
    },

    // Load notifications
    async loadNotifications() {
        try {
            const notifications = await this.api.get('/notifications');
            this.state.notifications = notifications || [];
            this.updateNotificationUI();
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.state.notifications = [];
        }
    },

    // Update notification UI
    updateNotificationUI() {
        const count = this.state.notifications.filter(n => !n.isRead).length;
        const countElement = document.getElementById('notificationCount');
        
        if (countElement) {
            countElement.textContent = count || '';
            countElement.style.display = count > 0 ? 'block' : 'none';
        }
        
        const list = document.getElementById('notificationList');
        if (!list) return;
        
        if (this.state.notifications.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>No notifications</p></div>';
            return;
        }
        
        list.innerHTML = this.state.notifications.map(notification => `
            <div class="notification-item ${notification.isRead ? '' : 'unread'}" onclick="app.handleNotificationClick('${notification.id}')">
                <div class="notification-icon ${notification.severity || 'info'}">
                    <i class="${this.getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${this.formatTime(notification.createdAt)}</div>
                </div>
            </div>
        `).join('');
    },

    // Get notification icon
    getNotificationIcon(type) {
        const icons = {
            incident: 'fas fa-exclamation-triangle',
            assignment: 'fas fa-user-plus',
            status_change: 'fas fa-sync',
            mention: 'fas fa-at',
            system: 'fas fa-cog',
            threat_alert: 'fas fa-shield-alt',
            report: 'fas fa-file-alt'
        };
        return icons[type] || 'fas fa-bell';
    },

    // Handle notification click
    async handleNotificationClick(notificationId) {
        const notification = this.state.notifications.find(n => n.id === notificationId);
        if (!notification) return;
        
        // Mark as read
        if (!notification.isRead) {
            try {
                await this.api.post(`/notifications/${notificationId}/read`);
                notification.isRead = true;
                this.updateNotificationUI();
            } catch (error) {
                console.error('Failed to mark notification as read:', error);
            }
        }
        
        // Navigate to relevant page
        if (notification.link) {
            this.hideNotifications();
            // Extract page from link (e.g., /incidents/123 -> incidents)
            const page = notification.link.split('/')[1];
            if (page) {
                this.navigateTo(page);
            }
        }
    },

    // Mark all notifications as read
    async markNotificationsAsRead() {
        const unreadIds = this.state.notifications
            .filter(n => !n.isRead)
            .map(n => n.id);
            
        if (unreadIds.length > 0) {
            try {
                await this.api.post('/notifications/read-all', { ids: unreadIds });
                this.state.notifications.forEach(n => n.isRead = true);
                this.updateNotificationUI();
            } catch (error) {
                console.error('Failed to mark notifications as read:', error);
            }
        }
    },

    // Start polling for updates
    startPolling() {
        // Poll for notifications every 30 seconds
        setInterval(() => {
            this.loadNotifications();
        }, 30000);
        
        // Poll for incident updates every minute
        setInterval(() => {
            if (this.state.currentPage === 'dashboard' || this.state.currentPage === 'incidents') {
                this.loadPageContent(this.state.currentPage);
            }
        }, 60000);
    },

    // Format time
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) {
            return 'Just now';
        } else if (diff < 3600000) {
            return Math.floor(diff / 60000) + ' minutes ago';
        } else if (diff < 86400000) {
            return Math.floor(diff / 3600000) + ' hours ago';
        } else if (diff < 604800000) {
            return Math.floor(diff / 86400000) + ' days ago';
        } else {
            return date.toLocaleDateString();
        }
    },

    // Handle window resize
    handleResize() {
        // Handle mobile menu
        if (window.innerWidth <= 1024) {
            document.querySelector('.sidebar').classList.remove('mobile-open');
        }
    },

    // Initialize charts (placeholder)
    initializeCharts() {
        // This would initialize Chart.js or other charting libraries
        console.log('Charts would be initialized here');
    }
});

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});