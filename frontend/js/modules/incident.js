// Incident Management Module
app.incident = {
    currentStep: 1,
    formData: {},
    timeline: [],

    init() {
        console.log('Incident module initialized');
    },

    // Initialize incident form
    initializeForm() {
        this.currentStep = 1;
        this.formData = {};
        this.timeline = [];
        
        // Set default datetime to now
        const now = new Date();
        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        document.getElementById('incidentDate').value = localDateTime;
    },

    // Navigate to next step
    nextStep() {
        if (!this.validateStep(this.currentStep)) {
            return;
        }
        
        // Save current step data
        this.saveStepData(this.currentStep);
        
        // Load next step
        this.currentStep++;
        this.loadStep(this.currentStep);
        this.updateProgress();
    },

    // Navigate to previous step
    prevStep() {
        this.currentStep--;
        this.loadStep(this.currentStep);
        this.updateProgress();
    },

    // Validate current step
    validateStep(step) {
        let isValid = true;
        
        switch(step) {
            case 1:
                // Validate basic info
                const requiredFields = ['orgName', 'incidentDate', 'incidentType', 'severity'];
                requiredFields.forEach(field => {
                    const element = document.getElementById(field);
                    if (!element.value) {
                        element.classList.add('error');
                        isValid = false;
                    } else {
                        element.classList.remove('error');
                    }
                });
                
                if (!isValid) {
                    app.showToast('error', 'Validation Error', 'Please fill in all required fields');
                }
                break;
        }
        
        return isValid;
    },

    // Save step data
    saveStepData(step) {
        switch(step) {
            case 1:
                this.formData.organization = document.getElementById('orgName').value;
                this.formData.incidentDate = document.getElementById('incidentDate').value;
                this.formData.type = document.getElementById('incidentType').value;
                this.formData.severity = document.getElementById('severity').value;
                break;
            case 2:
                this.formData.description = document.getElementById('incidentDesc').value;
                this.formData.impact = document.getElementById('impact').value;
                this.formData.initialResponse = document.getElementById('response').value;
                break;
            case 3:
                this.formData.iocs = app.ioc.getIOCs();
                break;
        }
    },

    // Load step content
    loadStep(step) {
        // Hide all steps
        document.querySelectorAll('.form-step').forEach(el => {
            el.classList.remove('active');
        });
        
        // Show current step
        const stepElement = document.getElementById(`step${step}`);
        stepElement.classList.add('active');
        
        // Update step indicators
        document.querySelectorAll('.progress-steps .step').forEach((el, index) => {
            el.classList.toggle('active', index < step);
        });
        
        // Load step content
        switch(step) {
            case 2:
                this.loadStep2();
                break;
            case 3:
                this.loadStep3();
                break;
            case 4:
                this.loadStep4();
                break;
        }
    },

    // Load Step 2: Incident Details
    loadStep2() {
        const step2 = document.getElementById('step2');
        step2.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">
                        <i class="fas fa-file-medical"></i>
                        Incident Details & Timeline
                    </h2>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Incident Description <span class="required">*</span></label>
                    <textarea class="form-control" id="incidentDesc" rows="4" required
                        placeholder="Provide a detailed description of the incident...">${this.formData.description || ''}</textarea>
                    <div class="form-hint">Include what happened, how it was discovered, and initial observations</div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Business Impact</label>
                    <textarea class="form-control" id="impact" rows="3"
                        placeholder="Describe the impact on business operations...">${this.formData.impact || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Initial Response Actions</label>
                    <textarea class="form-control" id="response" rows="3"
                        placeholder="What actions were taken immediately?">${this.formData.initialResponse || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">
                        <i class="fas fa-clock"></i>
                        Incident Timeline
                    </label>
                    <div class="timeline-builder">
                        <div class="timeline" id="incidentTimeline">
                            ${this.renderTimeline()}
                        </div>
                        <button type="button" class="btn btn-secondary" onclick="app.incident.addTimelineEvent()">
                            <i class="fas fa-plus"></i> Add Timeline Event
                        </button>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="app.incident.prevStep()">
                        <i class="fas fa-arrow-left"></i> Previous
                    </button>
                    <button type="button" class="btn btn-primary" onclick="app.incident.nextStep()">
                        Next <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
    },

    // Load Step 3: IOCs
    loadStep3() {
        const step3 = document.getElementById('step3');
        step3.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">
                        <i class="fas fa-search"></i>
                        Indicators of Compromise (IOCs)
                    </h2>
                </div>
                
                <div class="ioc-instructions">
                    <p>Add any indicators that can help identify or track this threat:</p>
                </div>
                
                <div class="ioc-grid">
                    <div class="ioc-section">
                        <div class="ioc-header">
                            <label class="form-label">IP Addresses</label>
                            <button type="button" class="btn btn-sm btn-secondary" onclick="app.ioc.add('ip')">
                                <i class="fas fa-plus"></i> Add
                            </button>
                        </div>
                        <div class="ioc-list" id="ioc-ip-list"></div>
                    </div>
                    
                    <div class="ioc-section">
                        <div class="ioc-header">
                            <label class="form-label">Domains/URLs</label>
                            <button type="button" class="btn btn-sm btn-secondary" onclick="app.ioc.add('domain')">
                                <i class="fas fa-plus"></i> Add
                            </button>
                        </div>
                        <div class="ioc-list" id="ioc-domain-list"></div>
                    </div>
                    
                    <div class="ioc-section">
                        <div class="ioc-header">
                            <label class="form-label">File Hashes</label>
                            <button type="button" class="btn btn-sm btn-secondary" onclick="app.ioc.add('hash')">
                                <i class="fas fa-plus"></i> Add
                            </button>
                        </div>
                        <div class="ioc-list" id="ioc-hash-list"></div>
                    </div>
                    
                    <div class="ioc-section">
                        <div class="ioc-header">
                            <label class="form-label">Email Addresses</label>
                            <button type="button" class="btn btn-sm btn-secondary" onclick="app.ioc.add('email')">
                                <i class="fas fa-plus"></i> Add
                            </button>
                        </div>
                        <div class="ioc-list" id="ioc-email-list"></div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">
                        <i class="fas fa-upload"></i>
                        Upload Evidence Files
                    </label>
                    <div class="file-upload-area" id="evidenceUpload">
                        <input type="file" id="evidenceFiles" multiple accept=".jpg,.jpeg,.png,.pdf,.txt,.log,.pcap" style="display: none;">
                        <div class="upload-placeholder" onclick="document.getElementById('evidenceFiles').click()">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Click to upload or drag and drop</p>
                            <small>Supported: Images, PDFs, Logs, PCAP files</small>
                        </div>
                        <div class="uploaded-files" id="uploadedFiles"></div>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="app.incident.prevStep()">
                        <i class="fas fa-arrow-left"></i> Previous
                    </button>
                    <button type="button" class="btn btn-primary" onclick="app.incident.nextStep()">
                        Next <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Initialize IOC lists
        app.ioc.initialize();
        
        // Setup file upload
        this.setupFileUpload();
    },

    // Load Step 4: Analysis & Submit
    loadStep4() {
        const step4 = document.getElementById('step4');
        step4.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">
                        <i class="fas fa-fingerprint"></i>
                        Attribution Analysis & Review
                    </h2>
                </div>
                
                <div class="analysis-section">
                    <button type="button" class="btn btn-primary" onclick="app.attribution.analyze()">
                        <i class="fas fa-sync-alt"></i> Run Attribution Analysis
                    </button>
                    
                    <div id="attributionResults" class="attribution-results"></div>
                </div>
                
                <div class="review-section">
                    <h3>Incident Summary</h3>
                    <div class="summary-grid">
                        ${this.renderSummary()}
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Additional Notes</label>
                    <textarea class="form-control" id="additionalNotes" rows="3"
                        placeholder="Any additional information or observations..."></textarea>
                </div>
                
                <div class="form-check">
                    <input type="checkbox" id="notifyTeam" checked>
                    <label for="notifyTeam">Notify security team members</label>
                </div>
                
                <div class="form-check">
                    <input type="checkbox" id="shareIntel">
                    <label for="shareIntel">Share IOCs with threat intelligence community</label>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="app.incident.prevStep()">
                        <i class="fas fa-arrow-left"></i> Previous
                    </button>
                    <button type="button" class="btn btn-success" onclick="app.incident.submit()">
                        <i class="fas fa-check"></i> Submit Incident Report
                    </button>
                </div>
            </div>
        `;
    },

    // Update progress bar
    updateProgress() {
        const progress = (this.currentStep / 4) * 100;
        document.getElementById('formProgress').style.width = progress + '%';
    },

    // Add timeline event
    addTimelineEvent() {
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title">Add Timeline Event</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Date & Time</label>
                        <input type="datetime-local" class="form-control" id="eventTime">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Event Description</label>
                        <textarea class="form-control" id="eventDesc" rows="3"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" onclick="app.incident.saveTimelineEvent(this)">Add Event</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Set current time
        const now = new Date();
        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        modal.querySelector('#eventTime').value = localDateTime;
    },

    // Save timeline event
    saveTimelineEvent(button) {
        const modal = button.closest('.modal');
        const time = modal.querySelector('#eventTime').value;
        const description = modal.querySelector('#eventDesc').value;
        
        if (time && description) {
            this.timeline.push({ time, description });
            this.timeline.sort((a, b) => new Date(a.time) - new Date(b.time));
            
            // Refresh timeline display
            document.getElementById('incidentTimeline').innerHTML = this.renderTimeline();
            
            modal.remove();
            app.showToast('success', 'Event Added', 'Timeline event added successfully');
        }
    },

    // Render timeline
    renderTimeline() {
        if (this.timeline.length === 0) {
            return '<p class="empty-state">No timeline events added yet</p>';
        }
        
        return this.timeline.map(event => `
            <div class="timeline-item">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <div class="timeline-time">${new Date(event.time).toLocaleString()}</div>
                    <div class="timeline-description">${event.description}</div>
                </div>
            </div>
        `).join('');
    },

    // Setup file upload
    setupFileUpload() {
        const fileInput = document.getElementById('evidenceFiles');
        const uploadArea = document.getElementById('evidenceUpload');
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });
        
        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            this.handleFileUpload(e.dataTransfer.files);
        });
    },

    // Handle file upload
    async handleFileUpload(files) {
        const uploadedFiles = document.getElementById('uploadedFiles');
        
        for (const file of files) {
            // Validate file
            if (file.size > 10 * 1024 * 1024) {
                app.showToast('error', 'File Too Large', `${file.name} exceeds 10MB limit`);
                continue;
            }
            
            // Upload file
            app.showLoading(true);
            try {
                const result = await app.api.upload('/api/evidence', file);
                
                // Add to uploaded files list
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.innerHTML = `
                    <i class="fas fa-file"></i>
                    <span>${file.name}</span>
                    <span class="file-size">${this.formatFileSize(file.size)}</span>
                    <button class="btn-remove" onclick="this.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                uploadedFiles.appendChild(fileItem);
                
            } catch (error) {
                app.showToast('error', 'Upload Failed', `Failed to upload ${file.name}`);
            }
            app.showLoading(false);
        }
    },

    // Format file size
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
        return Math.round(bytes / 1048576) + ' MB';
    },

    // Render summary
    renderSummary() {
        return `
            <div class="summary-item">
                <label>Organization:</label>
                <span>${this.formData.organization}</span>
            </div>
            <div class="summary-item">
                <label>Incident Date:</label>
                <span>${new Date(this.formData.incidentDate).toLocaleString()}</span>
            </div>
            <div class="summary-item">
                <label>Type:</label>
                <span class="badge badge-primary">${this.formData.type}</span>
            </div>
            <div class="summary-item">
                <label>Severity:</label>
                <span class="badge badge-${app.getSeverityClass(this.formData.severity)}">${this.formData.severity}</span>
            </div>
            <div class="summary-item">
                <label>IOCs Collected:</label>
                <span>${this.countIOCs()} indicators</span>
            </div>
            <div class="summary-item">
                <label>Timeline Events:</label>
                <span>${this.timeline.length} events</span>
            </div>
        `;
    },

    // Count IOCs
    countIOCs() {
        const iocs = app.ioc.getIOCs();
        return Object.values(iocs).reduce((sum, arr) => sum + arr.length, 0);
    },

    // Submit incident
    async submit() {
        // Collect all form data
        this.saveStepData(4);
        this.formData.additionalNotes = document.getElementById('additionalNotes').value;
        this.formData.notifyTeam = document.getElementById('notifyTeam').checked;
        this.formData.shareIntel = document.getElementById('shareIntel').checked;
        this.formData.timeline = this.timeline;
        
        app.showLoading(true);
        
        try {
            // Submit to API
            const result = await app.api.post('/api/incidents', this.formData);
            
            app.showLoading(false);
            app.showToast('success', 'Incident Created', 'Incident report has been submitted successfully');
            
            // Generate and show report
            app.report.generate(result);
            
            // Navigate to incidents page
            setTimeout(() => {
                app.navigateTo('incidents');
            }, 2000);
            
        } catch (error) {
            app.showLoading(false);
            app.showToast('error', 'Submission Failed', 'Failed to submit incident report');
        }
    },

    // View incident details
    async view(incidentId) {
        // In a real app, this would load full incident details
        app.showToast('info', 'Coming Soon', 'Detailed incident view is under development');
    },

    // Edit incident
    async edit(incidentId) {
        // In a real app, this would load incident for editing
        app.showToast('info', 'Coming Soon', 'Incident editing is under development');
    }
};
