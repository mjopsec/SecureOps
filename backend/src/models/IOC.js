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
    defaultValue: DataTypes.NOW,
    field: 'first_seen'
  },
  lastSeen: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'last_seen'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  maliciousScore: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    field: 'malicious_score',
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
    allowNull: false,
    field: 'incident_id'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by'
  }
}, {
  tableName: 'iocs',
  underscored: true,
  indexes: [
    {
      fields: ['type', 'value'],
      unique: true
    },
    {
      fields: ['incident_id']
    },
    {
      fields: ['tags'],
      using: 'gin'
    }
  ]
});

module.exports = IOC;