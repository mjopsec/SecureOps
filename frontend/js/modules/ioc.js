// IOC (Indicators of Compromise) Management Module
app.ioc = {
    data: {
        ip: [],
        domain: [],
        hash: [],
        email: []
    },

    validators: {
        ip: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
        domain: /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/,
        hash: /^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{64}$/,
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },

    placeholders: {
        ip: '192.168.1.100',
        domain: 'malicious-site.com',
        hash: 'd41d8cd98f00b204e9800998ecf8427e',
        email: 'attacker@malicious.com'
    },

    init() {
        console.log('IOC module initialized');
        this.reset();
    },

    // Initialize IOC lists
    initialize() {
        // Restore any existing data
        ['ip', 'domain', 'hash', 'email'].forEach(type => {
            this.renderList(type);
        });
    },

    // Reset IOC data
    reset() {
        this.data = {
            ip: [],
            domain: [],
            hash: [],
            email: []
        };
    },

    // Add new IOC
    add(type) {
        const id = `ioc-${type}-${Date.now()}`;
        const item = {
            id,
            type,
            value: '',
            tags: [],
            confidence: 'medium',
            notes: ''
        };
        
        this.data[type].push(item);
        this.renderList(type);
        
        // Focus on new input
        setTimeout(() => {
            const input = document.querySelector(`#${id} input`);
            if (input) input.focus();
        }, 100);
    },

    // Remove IOC
    remove(type, id) {
        this.data[type] = this.data[type].filter(item => item.id !== id);
        this.renderList(type);
    },

    // Update IOC value
    update(type, id, value) {
        const item = this.data[type].find(item => item.id === id);
        if (item) {
            item.value = value;
            
            // Validate
            const input = document.querySelector(`#${id} input`);
            if (input) {
                if (value && !this.validate(type, value)) {
                    input.classList.add('error');
                } else {
                    input.classList.remove('error');
                }
            }
        }
    },

    // Validate IOC
    validate(type, value) {
        if (!value) return true; // Empty is valid (will be filtered out)
        return this.validators[type].test(value);
    },

    // Render IOC list
    renderList(type) {
        const container = document.getElementById(`ioc-${type}-list`);
        if (!container) return;
        
        if (this.data[type].length === 0) {
            container.innerHTML = '<p class="empty-ioc">No indicators added</p>';
            return;
        }
        
        container.innerHTML = this.data[type].map(item => `
            <div class="ioc-item" id="${item.id}">
                <input type="text" 
                    placeholder="${this.placeholders[type]}"
                    value="${item.value}"
                    onchange="app.ioc.update('${type}', '${item.id}', this.value)"
                    class="${item.value && !this.validate(type, item.value) ? 'error' : ''}">
                <div class="ioc-actions">
                    <button class="btn btn-sm btn-icon btn-ghost" 
                        onclick="app.ioc.showDetails('${type}', '${item.id}')"
                        title="Add details">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    <button class="btn btn-sm btn-icon btn-danger" 
                        onclick="app.ioc.remove('${type}', '${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    },

    // Show IOC details modal
    showDetails(type, id) {
        const item = this.data[type].find(item => item.id === id);
        if (!item) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title">IOC Details</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Value</label>
                        <input type="text" class="form-control" value="${item.value}" readonly>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Confidence Level</label>
                        <select class="form-control" id="iocConfidence">
                            <option value="low" ${item.confidence === 'low' ? 'selected' : ''}>Low</option>
                            <option value="medium" ${item.confidence === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="high" ${item.confidence === 'high' ? 'selected' : ''}>High</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Tags</label>
                        <input type="text" class="form-control" id="iocTags" 
                            placeholder="malware, c2, phishing (comma separated)"
                            value="${item.tags.join(', ')}">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Notes</label>
                        <textarea class="form-control" id="iocNotes" rows="3">${item.notes}</textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" onclick="app.ioc.saveDetails('${type}', '${id}', this)">Save</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // Save IOC details
    saveDetails(type, id, button) {
        const modal = button.closest('.modal');
        const item = this.data[type].find(item => item.id === id);
        
        if (item) {
            item.confidence = modal.querySelector('#iocConfidence').value;
            item.tags = modal.querySelector('#iocTags').value
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag);
            item.notes = modal.querySelector('#iocNotes').value;
            
            modal.remove();
            app.showToast('success', 'Details Saved', 'IOC details updated successfully');
        }
    },

    // Get all IOCs
    getIOCs() {
        const iocs = {};
        
        ['ip', 'domain', 'hash', 'email'].forEach(type => {
            iocs[type] = this.data[type]
                .filter(item => item.value && this.validate(type, item.value))
                .map(item => ({
                    value: item.value,
                    confidence: item.confidence,
                    tags: item.tags,
                    notes: item.notes
                }));
        });
        
        return iocs;
    },

    // Import IOCs from text
    importFromText(text, type) {
        const lines = text.split('\n');
        const imported = [];
        
        lines.forEach(line => {
            const value = line.trim();
            if (value && this.validate(type, value)) {
                const id = `ioc-${type}-${Date.now()}-${Math.random()}`;
                const item = {
                    id,
                    type,
                    value,
                    tags: [],
                    confidence: 'medium',
                    notes: 'Imported'
                };
                this.data[type].push(item);
                imported.push(value);
            }
        });
        
        this.renderList(type);
        
        if (imported.length > 0) {
            app.showToast('success', 'Import Complete', `Imported ${imported.length} ${type} indicators`);
        } else {
            app.showToast('warning', 'No Valid IOCs', 'No valid indicators found in the text');
        }
    },

    // Export IOCs
    exportIOCs(format = 'json') {
        const iocs = this.getIOCs();
        let content = '';
        let filename = `iocs-${new Date().toISOString().split('T')[0]}`;
        
        switch(format) {
            case 'json':
                content = JSON.stringify(iocs, null, 2);
                filename += '.json';
                break;
                
            case 'csv':
                content = 'Type,Value,Confidence,Tags,Notes\n';
                Object.entries(iocs).forEach(([type, items]) => {
                    items.forEach(item => {
                        content += `${type},"${item.value}",${item.confidence},"${item.tags.join(';')}","${item.notes}"\n`;
                    });
                });
                filename += '.csv';
                break;
                
            case 'txt':
                Object.entries(iocs).forEach(([type, items]) => {
                    if (items.length > 0) {
                        content += `# ${type.toUpperCase()} Indicators\n`;
                        items.forEach(item => {
                            content += `${item.value}\n`;
                        });
                        content += '\n';
                    }
                });
                filename += '.txt';
                break;
        }
        
        // Download file
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        app.showToast('success', 'Export Complete', `IOCs exported as ${filename}`);
    },

    // Analyze IOCs for patterns
    analyzePatterns() {
        const analysis = {
            totalIOCs: 0,
            byType: {},
            commonPorts: [],
            commonTLDs: [],
            hashTypes: { md5: 0, sha1: 0, sha256: 0 }
        };
        
        // Analyze IPs
        if (this.data.ip.length > 0) {
            analysis.byType.ip = this.data.ip.length;
            analysis.totalIOCs += this.data.ip.length;
            
            // Extract ports if present
            this.data.ip.forEach(item => {
                const match = item.value.match(/:(\d+)$/);
                if (match) {
                    analysis.commonPorts.push(match[1]);
                }
            });
        }
        
        // Analyze domains
        if (this.data.domain.length > 0) {
            analysis.byType.domain = this.data.domain.length;
            analysis.totalIOCs += this.data.domain.length;
            
            // Extract TLDs
            this.data.domain.forEach(item => {
                const parts = item.value.split('.');
                if (parts.length > 1) {
                    analysis.commonTLDs.push(parts[parts.length - 1]);
                }
            });
        }
        
        // Analyze hashes
        if (this.data.hash.length > 0) {
            analysis.byType.hash = this.data.hash.length;
            analysis.totalIOCs += this.data.hash.length;
            
            // Identify hash types
            this.data.hash.forEach(item => {
                if (item.value.length === 32) analysis.hashTypes.md5++;
                else if (item.value.length === 40) analysis.hashTypes.sha1++;
                else if (item.value.length === 64) analysis.hashTypes.sha256++;
            });
        }
        
        // Analyze emails
        if (this.data.email.length > 0) {
            analysis.byType.email = this.data.email.length;
            analysis.totalIOCs += this.data.email.length;
        }
        
        return analysis;
    }
};
