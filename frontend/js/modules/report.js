// Report Generation Module
app.report = {
    currentReport: null,
    
    init() {
        console.log('Report module initialized');
    },

    // Generate incident report
    generate(incidentData) {
        const report = {
            id: incidentData.id || `INC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
            generatedAt: new Date().toISOString(),
            classification: incidentData.shareIntel ? 'PUBLIC' : 'CONFIDENTIAL',
            incident: incidentData,
            attribution: null
        };

        this.currentReport = report;
        
        // Show report modal
        this.showReportModal(report);
    },

    // Show report modal
    showReportModal(report) {
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3 class="modal-title">Incident Report Generated</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="report-actions-bar">
                        <button class="btn btn-primary" onclick="app.report.download('pdf')">
                            <i class="fas fa-file-pdf"></i> Download PDF
                        </button>
                        <button class="btn btn-secondary" onclick="app.report.download('txt')">
                            <i class="fas fa-file-alt"></i> Download Text
                        </button>
                        <button class="btn btn-secondary" onclick="app.report.download('json')">
                            <i class="fas fa-code"></i> Download JSON
                        </button>
                        <button class="btn btn-secondary" onclick="app.report.share()">
                            <i class="fas fa-share-alt"></i> Share Report
                        </button>
                    </div>
                    
                    <div class="report-preview">
                        ${this.generateTextReport(report)}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // Generate text report
    generateTextReport(report) {
        const incident = report.incident;
        const iocAnalysis = app.ioc.analyzePatterns();
        
        let text = `<pre>INCIDENT RESPONSE REPORT
========================

Report ID: ${report.id}
Generated: ${new Date(report.generatedAt).toLocaleString()}
Classification: ${report.classification}

1. EXECUTIVE SUMMARY
--------------------
Organization: ${incident.organization}
Incident Date: ${new Date(incident.incidentDate).toLocaleString()}
Incident Type: ${incident.type.toUpperCase()}
Severity Level: ${incident.severity.toUpperCase()}
Current Status: OPEN
Report Created By: ${app.state.user.name}

2. INCIDENT DESCRIPTION
-----------------------
${incident.description}

3. BUSINESS IMPACT
------------------
${incident.impact || 'Not specified'}

4. INITIAL RESPONSE
-------------------
${incident.initialResponse || 'Not specified'}

5. TIMELINE OF EVENTS
---------------------`;

        if (incident.timeline && incident.timeline.length > 0) {
            incident.timeline.forEach(event => {
                text += `\n${new Date(event.time).toLocaleString()} - ${event.description}`;
            });
        } else {
            text += '\nNo timeline events recorded';
        }

        text += `\n\n6. INDICATORS OF COMPROMISE (IOCs)
-----------------------------------
Total IOCs Collected: ${iocAnalysis.totalIOCs}`;

        const iocs = incident.iocs || app.ioc.getIOCs();
        
        if (iocs.ip && iocs.ip.length > 0) {
            text += `\n\nIP Addresses (${iocs.ip.length}):`;
            iocs.ip.forEach(ioc => {
                text += `\n- ${ioc.value}${ioc.confidence ? ` [${ioc.confidence} confidence]` : ''}`;
                if (ioc.notes) text += `\n  Notes: ${ioc.notes}`;
            });
        }
        
        if (iocs.domain && iocs.domain.length > 0) {
            text += `\n\nDomains/URLs (${iocs.domain.length}):`;
            iocs.domain.forEach(ioc => {
                text += `\n- ${ioc.value}${ioc.confidence ? ` [${ioc.confidence} confidence]` : ''}`;
                if (ioc.notes) text += `\n  Notes: ${ioc.notes}`;
            });
        }
        
        if (iocs.hash && iocs.hash.length > 0) {
            text += `\n\nFile Hashes (${iocs.hash.length}):`;
            iocs.hash.forEach(ioc => {
                text += `\n- ${ioc.value}${ioc.confidence ? ` [${ioc.confidence} confidence]` : ''}`;
                if (ioc.notes) text += `\n  Notes: ${ioc.notes}`;
            });
        }
        
        if (iocs.email && iocs.email.length > 0) {
            text += `\n\nEmail Addresses (${iocs.email.length}):`;
            iocs.email.forEach(ioc => {
                text += `\n- ${ioc.value}${ioc.confidence ? ` [${ioc.confidence} confidence]` : ''}`;
                if (ioc.notes) text += `\n  Notes: ${ioc.notes}`;
            });
        }

        text += `\n\n7. RECOMMENDATIONS
------------------
- Immediately block all identified IP addresses and domains at perimeter firewalls
- Scan all systems for the identified file hashes using EDR/AV solutions
- Review authentication logs for any access from identified IP addresses
- Search email systems for messages from identified email addresses
- Implement enhanced monitoring for similar attack patterns
- Conduct threat hunting exercises based on identified TTPs
- Update security awareness training to include this incident's tactics`;

        if (incident.additionalNotes) {
            text += `\n\n8. ADDITIONAL NOTES
-------------------
${incident.additionalNotes}`;
        }

        text += `\n\n9. NEXT STEPS
-------------
- Containment: Isolate affected systems and block malicious indicators
- Eradication: Remove malware and unauthorized access
- Recovery: Restore systems from clean backups
- Lessons Learned: Conduct post-incident review within 48 hours
- Documentation: Update playbooks based on incident findings

END OF REPORT
=============</pre>`;

        return text;
    },

    // Download report
    download(format) {
        if (!this.currentReport) {
            app.showToast('error', 'No Report', 'No report available to download');
            return;
        }

        let content = '';
        let filename = `incident-report-${this.currentReport.id}-${Date.now()}`;
        let mimeType = 'text/plain';

        switch(format) {
            case 'txt':
                content = this.generateTextReport(this.currentReport).replace(/<[^>]*>/g, '');
                filename += '.txt';
                break;
                
            case 'json':
                content = JSON.stringify(this.currentReport, null, 2);
                filename += '.json';
                mimeType = 'application/json';
                break;
                
            case 'pdf':
                // In a real application, this would generate a proper PDF
                // For demo, we'll show a message
                app.showToast('info', 'PDF Export', 'PDF generation requires server-side processing. Text file will be downloaded instead.');
                this.download('txt');
                return;
        }

        // Create download
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        app.showToast('success', 'Download Complete', `Report saved as ${filename}`);
    },

    // Share report
    share() {
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title">Share Report</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="share-options">
                        <div class="share-option">
                            <h4><i class="fas fa-users"></i> Share with Team</h4>
                            <p>Send report to security team members</p>
                            <div class="form-group">
                                <select class="form-control" multiple style="height: 100px;">
                                    <option>John Smith (Analyst)</option>
                                    <option>Sarah Johnson (Manager)</option>
                                    <option>Mike Chen (Engineer)</option>
                                    <option>Lisa Brown (CISO)</option>
                                </select>
                            </div>
                            <button class="btn btn-primary">
                                <i class="fas fa-paper-plane"></i> Send to Selected
                            </button>
                        </div>
                        
                        <div class="share-option">
                            <h4><i class="fas fa-globe"></i> Share to Threat Intel</h4>
                            <p>Contribute IOCs to threat intelligence community</p>
                            <div class="form-check">
                                <input type="checkbox" id="anonymize" checked>
                                <label for="anonymize">Anonymize organization details</label>
                            </div>
                            <button class="btn btn-secondary">
                                <i class="fas fa-upload"></i> Upload to TI Platform
                            </button>
                        </div>
                        
                        <div class="share-option">
                            <h4><i class="fas fa-link"></i> Generate Secure Link</h4>
                            <p>Create a secure link to share externally</p>
                            <div class="form-group">
                                <label>Expiration</label>
                                <select class="form-control">
                                    <option>24 hours</option>
                                    <option>7 days</option>
                                    <option>30 days</option>
                                    <option>Never</option>
                                </select>
                            </div>
                            <button class="btn btn-secondary">
                                <i class="fas fa-link"></i> Generate Link
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add click handlers
        modal.querySelectorAll('button.btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!btn.classList.contains('modal-close')) {
                    app.showToast('info', 'Coming Soon', 'Sharing functionality is under development');
                }
            });
        });
    },

    // Generate executive summary
    generateExecutiveSummary(incident) {
        const iocCount = app.ioc.analyzePatterns().totalIOCs;
        const timelineCount = incident.timeline ? incident.timeline.length : 0;
        
        return `
A ${incident.severity} severity ${incident.type} incident was detected at ${incident.organization} on ${new Date(incident.incidentDate).toLocaleDateString()}. 
The incident has been documented with ${iocCount} indicators of compromise and ${timelineCount} timeline events. 
${incident.impact ? 'Business operations were impacted as follows: ' + incident.impact.substring(0, 100) + '...' : 'Business impact assessment is pending.'}
Immediate response actions ${incident.initialResponse ? 'were taken' : 'are required'} to contain the threat.
        `.trim();
    },

    // Generate STIX format (simplified)
    generateSTIX(incident) {
        const stix = {
            type: "bundle",
            id: `bundle--${this.generateUUID()}`,
            objects: [
                {
                    type: "incident",
                    spec_version: "2.1",
                    id: `incident--${this.generateUUID()}`,
                    created: new Date().toISOString(),
                    modified: new Date().toISOString(),
                    name: `${incident.type} at ${incident.organization}`,
                    description: incident.description,
                    severity: incident.severity,
                    incident_type: [incident.type],
                    first_seen: incident.incidentDate,
                    organization: incident.organization
                }
            ]
        };

        // Add indicators
        const iocs = app.ioc.getIOCs();
        Object.entries(iocs).forEach(([type, items]) => {
            items.forEach(ioc => {
                stix.objects.push({
                    type: "indicator",
                    spec_version: "2.1",
                    id: `indicator--${this.generateUUID()}`,
                    created: new Date().toISOString(),
                    modified: new Date().toISOString(),
                    pattern: this.getSTIXPattern(type, ioc.value),
                    pattern_type: "stix",
                    valid_from: incident.incidentDate,
                    indicator_types: [this.mapIOCType(type)],
                    confidence: ioc.confidence || 50
                });
            });
        });

        return stix;
    },

    // Generate UUID
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    // Get STIX pattern
    getSTIXPattern(type, value) {
        const patterns = {
            'ip': `[network-traffic:dst_ref.value = '${value}']`,
            'domain': `[domain-name:value = '${value}']`,
            'hash': `[file:hashes.MD5 = '${value}']`,
            'email': `[email-addr:value = '${value}']`
        };
        return patterns[type] || `[x-custom:value = '${value}']`;
    },

    // Map IOC type to STIX
    mapIOCType(type) {
        const mapping = {
            'ip': 'malicious-activity',
            'domain': 'malicious-activity',
            'hash': 'malware',
            'email': 'phishing'
        };
        return mapping[type] || 'unknown';
    }
};
