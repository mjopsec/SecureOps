// Threat Attribution Module
app.attribution = {
    // Threat actor database (expanded)
    threatActors: {
        'APT28': {
            aliases: ['Fancy Bear', 'Sofacy', 'Sednit', 'STRONTIUM'],
            country: 'Russia',
            targets: ['Government', 'Military', 'Defense', 'Aerospace'],
            ttps: ['Spear-phishing', 'Zero-day exploits', 'Credential harvesting', 'Watering hole attacks'],
            tools: ['X-Agent', 'X-Tunnel', 'Sofacy', 'CHOPSTICK', 'GAMEFISH'],
            confidence_indicators: {
                high: ['X-Agent malware', 'Sofacy toolkit', 'acrobatrelay.com'],
                medium: ['Spear-phishing campaigns', 'Government targets'],
                low: ['Eastern European timing', 'Russian language artifacts']
            }
        },
        'Lazarus': {
            aliases: ['Hidden Cobra', 'Zinc', 'Labyrinth Chollima'],
            country: 'North Korea',
            targets: ['Financial', 'Cryptocurrency', 'Technology', 'Media'],
            ttps: ['Ransomware', 'Cryptocurrency theft', 'Supply chain attacks', 'Destructive malware'],
            tools: ['WannaCry', 'MATA', 'BLINDINGCAN', 'DTrack', 'HOPLIGHT'],
            confidence_indicators: {
                high: ['WannaCry variants', 'MATA framework', 'cryptocurrency theft'],
                medium: ['Financial sector targeting', 'Korean timezone activity'],
                low: ['Code reuse patterns', 'Infrastructure overlap']
            }
        },
        'Carbanak': {
            aliases: ['Cobalt Group', 'Gold Niagara'],
            country: 'Unknown (Eastern Europe suspected)',
            targets: ['Financial', 'Hospitality', 'Retail'],
            ttps: ['ATM malware', 'POS malware', 'Lateral movement', 'Living off the land'],
            tools: ['Carbanak malware', 'Cobalt Strike', 'Mimikatz', 'PowerShell Empire'],
            confidence_indicators: {
                high: ['Carbanak backdoor', 'ATM targeting', 'Cobalt Strike beacons'],
                medium: ['Financial sector focus', 'Eastern European timing'],
                low: ['Russian language comments', 'Banking trojan tactics']
            }
        },
        'APT29': {
            aliases: ['Cozy Bear', 'The Dukes', 'YTTRIUM'],
            country: 'Russia',
            targets: ['Government', 'Think Tanks', 'Healthcare', 'Energy'],
            ttps: ['Supply chain compromise', 'Steganography', 'WellMess malware', 'Custom tooling'],
            tools: ['WellMess', 'WellMail', 'SoreFang', 'CozyCar', 'SeaDuke'],
            confidence_indicators: {
                high: ['WellMess/WellMail usage', 'SeaDuke variants', 'Steganography in images'],
                medium: ['Think tank targeting', 'COVID-19 research focus'],
                low: ['Moscow timezone activity', 'Russian holidays gaps']
            }
        }
    },

    // TTP mapping
    ttpPatterns: {
        'ransomware': ['Lazarus', 'Carbanak', 'FIN7'],
        'phishing': ['APT28', 'APT29', 'Carbanak'],
        'supply-chain': ['APT29', 'Lazarus'],
        'financial': ['Carbanak', 'Lazarus', 'FIN7'],
        'zero-day': ['APT28', 'APT29'],
        'cryptocurrency': ['Lazarus']
    },

    init() {
        console.log('Attribution module initialized');
    },

    // Analyze IOCs and incident data for attribution
    async analyze() {
        const results = document.getElementById('attributionResults');
        results.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Analyzing threat indicators...</div>';
        
        // Simulate analysis delay
        await app.api.delay(2000);
        
        // Get IOCs and incident data
        const iocs = app.ioc.getIOCs();
        const incidentType = app.incident.formData.type;
        const description = app.incident.formData.description || '';
        
        // Perform attribution analysis
        const matches = this.performAnalysis(iocs, incidentType, description);
        
        // Display results
        this.displayResults(matches);
    },

    // Perform attribution analysis
    performAnalysis(iocs, incidentType, description) {
        const matches = [];
        const scores = {};
        
        // Check IOC matches
        Object.entries(this.threatActors).forEach(([actor, data]) => {
            let score = 0;
            const indicators = [];
            
            // Check incident type patterns
            Object.entries(this.ttpPatterns).forEach(([pattern, actors]) => {
                if (incidentType.includes(pattern) && actors.includes(actor)) {
                    score += 10;
                    indicators.push(`Incident type matches known ${actor} TTPs`);
                }
            });
            
            // Check description for keywords
            const keywords = [...data.tools, ...data.ttps].map(k => k.toLowerCase());
            keywords.forEach(keyword => {
                if (description.toLowerCase().includes(keyword)) {
                    score += 15;
                    indicators.push(`Description mentions "${keyword}"`);
                }
            });
            
            // Check for specific IOC patterns
            if (iocs.domain) {
                iocs.domain.forEach(domain => {
                    // Check against known infrastructure
                    if (this.checkDomainPatterns(domain.value, actor)) {
                        score += 25;
                        indicators.push(`Domain pattern matches ${actor} infrastructure`);
                    }
                });
            }
            
            if (iocs.ip) {
                iocs.ip.forEach(ip => {
                    // Check against known IP ranges
                    if (this.checkIPPatterns(ip.value, actor)) {
                        score += 20;
                        indicators.push(`IP address in known ${actor} range`);
                    }
                });
            }
            
            if (iocs.hash) {
                iocs.hash.forEach(hash => {
                    // Check against known malware hashes
                    if (this.checkHashPatterns(hash.value, actor)) {
                        score += 30;
                        indicators.push(`File hash matches known ${actor} malware`);
                    }
                });
            }
            
            // Add to matches if score is significant
            if (score > 0) {
                scores[actor] = score;
                matches.push({
                    actor,
                    score,
                    confidence: this.calculateConfidence(score),
                    indicators,
                    data
                });
            }
        });
        
        // Sort by score
        matches.sort((a, b) => b.score - a.score);
        
        return matches;
    },

    // Check domain patterns
    checkDomainPatterns(domain, actor) {
        const patterns = {
            'APT28': ['.space', 'relay.com', 'microsoft'],
            'Lazarus': ['update', 'bitcoin', 'crypto', 'blockchain'],
            'Carbanak': ['secure', 'bank', 'pay'],
            'APT29': ['health', 'covid', 'vaccine']
        };
        
        if (patterns[actor]) {
            return patterns[actor].some(pattern => domain.includes(pattern));
        }
        return false;
    },

    // Check IP patterns
    checkIPPatterns(ip, actor) {
        const ranges = {
            'APT28': ['185.', '95.142'],
            'Lazarus': ['103.', '185.142'],
            'Carbanak': ['162.', '85.93']
        };
        
        if (ranges[actor]) {
            return ranges[actor].some(range => ip.startsWith(range));
        }
        return false;
    },

    // Check hash patterns
    checkHashPatterns(hash, actor) {
        // In a real system, this would check against a threat intelligence database
        // For demo, we'll use some patterns
        const hashPrefixes = {
            'APT28': ['3f7e', 'a1b2'],
            'Lazarus': ['fedc', '9876'],
            'Carbanak': ['d41d', '1234']
        };
        
        if (hashPrefixes[actor]) {
            return hashPrefixes[actor].some(prefix => hash.toLowerCase().startsWith(prefix));
        }
        return false;
    },

    // Calculate confidence level
    calculateConfidence(score) {
        if (score >= 50) return 'high';
        if (score >= 25) return 'medium';
        return 'low';
    },

    // Display attribution results
    displayResults(matches) {
        const results = document.getElementById('attributionResults');
        
        if (matches.length === 0) {
            results.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-question-circle empty-state-icon"></i>
                    <h3 class="empty-state-title">No Attribution Matches</h3>
                    <p class="empty-state-description">
                        No known threat actors matched the current indicators.
                        This could be a new threat actor or insufficient indicators for attribution.
                    </p>
                </div>
            `;
            return;
        }
        
        results.innerHTML = `
            <div class="attribution-summary">
                <p>Found ${matches.length} potential threat actor matches based on indicators and patterns.</p>
            </div>
            ${matches.map(match => this.renderAttributionCard(match)).join('')}
        `;
    },

    // Render attribution card
    renderAttributionCard(match) {
        const { actor, score, confidence, indicators, data } = match;
        
        return `
            <div class="attribution-card ${confidence}-confidence">
                <div class="attribution-header">
                    <h3 class="attribution-title">${actor}</h3>
                    <div class="attribution-meta">
                        <span class="confidence-badge confidence-${confidence}">
                            ${confidence} confidence (${score} points)
                        </span>
                    </div>
                </div>
                
                <div class="attribution-details">
                    <div class="detail-row">
                        <strong>Known Aliases:</strong>
                        <span>${data.aliases.join(', ')}</span>
                    </div>
                    
                    <div class="detail-row">
                        <strong>Origin:</strong>
                        <span>${data.country}</span>
                    </div>
                    
                    <div class="detail-row">
                        <strong>Primary Targets:</strong>
                        <span>${data.targets.join(', ')}</span>
                    </div>
                    
                    <div class="detail-row">
                        <strong>Known TTPs:</strong>
                        <span>${data.ttps.join(', ')}</span>
                    </div>
                    
                    <div class="detail-row">
                        <strong>Associated Tools:</strong>
                        <span>${data.tools.join(', ')}</span>
                    </div>
                    
                    <div class="indicators-section">
                        <strong>Matching Indicators:</strong>
                        <ul class="indicator-list">
                            ${indicators.map(ind => `<li>${ind}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                
                <div class="attribution-actions">
                    <button class="btn btn-sm btn-secondary" onclick="app.attribution.viewIntelligence('${actor}')">
                        <i class="fas fa-book"></i> View Intelligence
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="app.attribution.searchIOCs('${actor}')">
                        <i class="fas fa-search"></i> Search Related IOCs
                    </button>
                </div>
            </div>
        `;
    },

    // View threat intelligence
    viewIntelligence(actor) {
        const data = this.threatActors[actor];
        if (!data) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3 class="modal-title">${actor} - Threat Intelligence</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="intel-section">
                        <h4>Overview</h4>
                        <p>${actor} is a sophisticated threat actor attributed to ${data.country}. 
                        They are known for targeting ${data.targets.join(', ')} sectors.</p>
                    </div>
                    
                    <div class="intel-section">
                        <h4>Tactics, Techniques, and Procedures (TTPs)</h4>
                        <ul>
                            ${data.ttps.map(ttp => `<li>${ttp}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="intel-section">
                        <h4>Associated Malware & Tools</h4>
                        <ul>
                            ${data.tools.map(tool => `<li>${tool}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="intel-section">
                        <h4>Confidence Indicators</h4>
                        <div class="confidence-levels">
                            <div class="confidence-level">
                                <strong>High Confidence:</strong>
                                <ul>
                                    ${data.confidence_indicators.high.map(ind => `<li>${ind}</li>`).join('')}
                                </ul>
                            </div>
                            <div class="confidence-level">
                                <strong>Medium Confidence:</strong>
                                <ul>
                                    ${data.confidence_indicators.medium.map(ind => `<li>${ind}</li>`).join('')}
                                </ul>
                            </div>
                            <div class="confidence-level">
                                <strong>Low Confidence:</strong>
                                <ul>
                                    ${data.confidence_indicators.low.map(ind => `<li>${ind}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // Search for related IOCs
    searchIOCs(actor) {
        app.showToast('info', 'Coming Soon', 'IOC search functionality is under development');
    },

    // Generate attribution report section
    generateReportSection(matches) {
        if (!matches || matches.length === 0) {
            return 'No threat actor attribution could be determined based on available indicators.';
        }
        
        let report = 'THREAT ATTRIBUTION ANALYSIS\n';
        report += '===========================\n\n';
        
        matches.forEach((match, index) => {
            report += `${index + 1}. ${match.actor} (${match.confidence.toUpperCase()} CONFIDENCE)\n`;
            report += `   Score: ${match.score} points\n`;
            report += `   Origin: ${match.data.country}\n`;
            report += `   Known Aliases: ${match.data.aliases.join(', ')}\n`;
            report += `   Primary Targets: ${match.data.targets.join(', ')}\n`;
            report += `   \n`;
            report += `   Matching Indicators:\n`;
            match.indicators.forEach(ind => {
                report += `   - ${ind}\n`;
            });
            report += '\n';
        });
        
        return report;
    }
};
