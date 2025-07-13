-- SecureOps Initial Database Schema

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enums
CREATE TYPE user_role AS ENUM ('admin', 'analyst', 'viewer');
CREATE TYPE incident_type AS ENUM ('ransomware', 'phishing', 'malware', 'ddos', 'data-breach', 'defacement', 'apt', 'insider', 'supply-chain', 'other');
CREATE TYPE severity_level AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE incident_status AS ENUM ('open', 'investigating', 'containment', 'eradication', 'recovery', 'resolved', 'closed');
CREATE TYPE ioc_type AS ENUM ('ip', 'domain', 'hash', 'email', 'url', 'cve', 'other');
CREATE TYPE confidence_level AS ENUM ('low', 'medium', 'high');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'analyst',
    department VARCHAR(255),
    phone VARCHAR(50),
    avatar VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    preferences JSONB DEFAULT '{"notifications": {"email": true, "inApp": true}, "theme": "light", "timezone": "UTC"}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incidents table
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    organization VARCHAR(255) NOT NULL,
    incident_date TIMESTAMP NOT NULL,
    type incident_type NOT NULL,
    severity severity_level NOT NULL,
    status incident_status DEFAULT 'open',
    impact TEXT,
    affected_systems JSONB DEFAULT '[]',
    initial_response TEXT,
    containment_actions TEXT,
    eradication_actions TEXT,
    recovery_actions TEXT,
    lessons_learned TEXT,
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    confidence INTEGER DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    estimated_cost DECIMAL(10, 2),
    additional_notes TEXT,
    attachments JSONB DEFAULT '[]',
    created_by UUID NOT NULL REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- IOCs table
CREATE TABLE iocs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type ioc_type NOT NULL,
    value VARCHAR(500) NOT NULL,
    confidence confidence_level DEFAULT 'medium',
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    source VARCHAR(255),
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    malicious_score INTEGER DEFAULT 50 CHECK (malicious_score >= 0 AND malicious_score <= 100),
    metadata JSONB DEFAULT '{}',
    enrichment JSONB DEFAULT '{}',
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type, value)
);

-- Threat Actors table
CREATE TABLE threat_actors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    aliases TEXT[] DEFAULT '{}',
    country VARCHAR(100),
    motivation VARCHAR(50),
    sophistication VARCHAR(20),
    active BOOLEAN DEFAULT true,
    first_seen TIMESTAMP,
    last_seen TIMESTAMP,
    description TEXT,
    targets TEXT[] DEFAULT '{}',
    sectors TEXT[] DEFAULT '{}',
    ttps JSONB DEFAULT '{"tactics": [], "techniques": [], "procedures": []}',
    tools TEXT[] DEFAULT '{}',
    infrastructure JSONB DEFAULT '{"domains": [], "ips": [], "asns": []}',
    associated_malware TEXT[] DEFAULT '{}',
    mitre_attack_ids TEXT[] DEFAULT '{}',
    confidence_indicators JSONB DEFAULT '{"high": [], "medium": [], "low": []}',
    references TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Timeline table
CREATE TABLE timelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    event_time TIMESTAMP NOT NULL,
    description TEXT NOT NULL,
    event_type VARCHAR(50) DEFAULT 'update',
    metadata JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    incident_id UUID REFERENCES incidents(id),
    link VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id VARCHAR(50) UNIQUE NOT NULL,
    incident_id UUID NOT NULL REFERENCES incidents(id),
    type VARCHAR(50) DEFAULT 'initial',
    format VARCHAR(20) DEFAULT 'pdf',
    classification VARCHAR(20) DEFAULT 'internal',
    content JSONB NOT NULL,
    template_used VARCHAR(255),
    file_path VARCHAR(500),
    shared_with UUID[] DEFAULT '{}',
    expires_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for incident-threat actor relationships
CREATE TABLE incident_threat_actors (
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    threat_actor_id UUID REFERENCES threat_actors(id) ON DELETE CASCADE,
    confidence confidence_level DEFAULT 'medium',
    PRIMARY KEY (incident_id, threat_actor_id)
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_date ON incidents(incident_date);
CREATE INDEX idx_incidents_org ON incidents(organization);
CREATE INDEX idx_iocs_incident ON iocs(incident_id);
CREATE INDEX idx_iocs_type_value ON iocs(type, value);
CREATE INDEX idx_iocs_tags ON iocs USING gin(tags);
CREATE INDEX idx_timeline_incident ON timelines(incident_id, event_time);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_threat_actors_aliases ON threat_actors USING gin(aliases);

-- Create update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_iocs_updated_at BEFORE UPDATE ON iocs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_threat_actors_updated_at BEFORE UPDATE ON threat_actors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_timelines_updated_at BEFORE UPDATE ON timelines FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert default admin user (password: admin123)
-- Note: This hash is for 'admin123' with bcrypt rounds=10
INSERT INTO users (email, password, name, role) VALUES 
('admin@secureops.com', '$2a$10$YTc1ZTM0ODkzZjBiZDA0NeLhLTG3hOBlQkvz/8zt6Phmx7P6JCyK.', 'Admin User', 'admin');

-- Insert sample threat actors
INSERT INTO threat_actors (name, aliases, country, motivation, sophistication, description, targets, ttps) VALUES
('APT28', ARRAY['Fancy Bear', 'Sofacy', 'Sednit'], 'Russia', 'espionage', 'advanced', 
 'Russian cyber espionage group', ARRAY['Government', 'Military', 'Defense'], 
 '{"tactics": ["Initial Access", "Persistence"], "techniques": ["Spear-phishing", "Zero-day exploits"]}'),
('Lazarus', ARRAY['Hidden Cobra', 'Zinc'], 'North Korea', 'financial', 'advanced',
 'North Korean state-sponsored group', ARRAY['Financial', 'Cryptocurrency'],
 '{"tactics": ["Execution", "Exfiltration"], "techniques": ["Ransomware", "Cryptocurrency theft"]}');