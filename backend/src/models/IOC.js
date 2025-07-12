const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const IOC = sequelize.define('IOC', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('ip', 'domain', 'hash', 'email', 'url', 'cve', 'other'),
    allowNull: false
  },
  value: {
    type: DataTypes.STRING,
    allowNull: false
  },
  confidence: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium'
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  notes: {
    type: DataTypes.TEXT
  },
  source: {
    type: DataTypes.STRING
  },
  firstSeen: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  lastSeen: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  maliciousScore: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    validate: {
      min: 0,
      max: 100
    }
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  enrichment: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  incidentId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  tableName: 'iocs',
  indexes: [
    {
      fields: ['type', 'value'],
      unique: true
    },
    {
      fields: ['incidentId']
    },
    {
      fields: ['tags'],
      using: 'gin'
    }
  ],
  hooks: {
    beforeSave: (ioc) => {
      // Normalize values based on type
      switch(ioc.type) {
        case 'ip':
          // Remove whitespace
          ioc.value = ioc.value.trim();
          break;
        case 'domain':
        case 'url':
          // Convert to lowercase, remove protocol if present
          ioc.value = ioc.value.toLowerCase().trim();
          if (ioc.type === 'domain') {
            ioc.value = ioc.value.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
          }
          break;
        case 'hash':
          // Convert to lowercase, remove whitespace
          ioc.value = ioc.value.toLowerCase().replace(/\s/g, '');
          // Detect hash type
          if (!ioc.metadata.hashType) {
            if (ioc.value.length === 32) ioc.metadata.hashType = 'md5';
            else if (ioc.value.length === 40) ioc.metadata.hashType = 'sha1';
            else if (ioc.value.length === 64) ioc.metadata.hashType = 'sha256';
          }
          break;
        case 'email':
          // Convert to lowercase
          ioc.value = ioc.value.toLowerCase().trim();
          break;
      }
    }
  }
});

// Class methods
IOC.findByValue = function(value, type = null) {
  const where = { value };
  if (type) where.type = type;
  return this.findOne({ where });
};

IOC.findRelated = function(iocId) {
  // Find IOCs that share tags or appear in same incidents
  return sequelize.query(`
    SELECT DISTINCT i2.*
    FROM iocs i1
    JOIN iocs i2 ON i1.incident_id = i2.incident_id
    WHERE i1.id = :iocId AND i2.id != :iocId
    UNION
    SELECT DISTINCT i2.*
    FROM iocs i1
    JOIN iocs i2 ON i1.tags && i2.tags
    WHERE i1.id = :iocId AND i2.id != :iocId
    LIMIT 20
  `, {
    replacements: { iocId },
    type: sequelize.QueryTypes.SELECT,
    model: IOC,
    mapToModel: true
  });
};

// Instance methods
IOC.prototype.validate = function() {
  const validators = {
    ip: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    domain: /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/,
    hash: /^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{64}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    url: /^https?:\/\/.+/,
    cve: /^CVE-\d{4}-\d{4,}$/
  };
  
  if (validators[this.type]) {
    return validators[this.type].test(this.value);
  }
  return true;
};

IOC.prototype.enrich = async function() {
  // This would call external APIs to enrich IOC data
  // For demo purposes, we'll just add some mock data
  const enrichmentData = {
    ip: {
      geoLocation: 'United States',
      isp: 'Example ISP',
      reputation: 'malicious',
      lastActivity: new Date()
    },
    domain: {
      registrar: 'Example Registrar',
      createdDate: '2023-01-01',
      dnsRecords: ['1.2.3.4'],
      reputation: 'suspicious'
    },
    hash: {
      fileName: 'malware.exe',
      fileSize: 1024000,
      firstSeen: '2023-06-01',
      detections: 45
    }
  };
  
  if (enrichmentData[this.type]) {
    this.enrichment = {
      ...this.enrichment,
      ...enrichmentData[this.type],
      enrichedAt: new Date()
    };
  }
  
  return this.enrichment;
};

module.exports = IOC;
