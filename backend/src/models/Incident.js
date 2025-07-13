const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Incident = sequelize.define('Incident', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  incidentId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    field: 'incident_id'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  organization: {
    type: DataTypes.STRING,
    allowNull: false
  },
  incidentDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'incident_date'
  },
  type: {
    type: DataTypes.ENUM(
      'ransomware',
      'phishing',
      'malware',
      'ddos',
      'data-breach',
      'defacement',
      'apt',
      'insider',
      'supply-chain',
      'other'
    ),
    allowNull: false
  },
  severity: {
    type: DataTypes.ENUM('critical', 'high', 'medium', 'low'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM(
      'open',
      'investigating',
      'containment',
      'eradication',
      'recovery',
      'resolved',
      'closed'
    ),
    defaultValue: 'open'
  },
  impact: {
    type: DataTypes.TEXT
  },
  affectedSystems: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'affected_systems'
  },
  initialResponse: {
    type: DataTypes.TEXT,
    field: 'initial_response'
  },
  containmentActions: {
    type: DataTypes.TEXT,
    field: 'containment_actions'
  },
  eradicationActions: {
    type: DataTypes.TEXT,
    field: 'eradication_actions'
  },
  recoveryActions: {
    type: DataTypes.TEXT,
    field: 'recovery_actions'
  },
  lessonsLearned: {
    type: DataTypes.TEXT,
    field: 'lessons_learned'
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_public'
  },
  confidence: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    validate: {
      min: 0,
      max: 100
    }
  },
  riskScore: {
    type: DataTypes.INTEGER,
    field: 'risk_score',
    validate: {
      min: 0,
      max: 100
    }
  },
  estimatedCost: {
    type: DataTypes.DECIMAL(10, 2),
    field: 'estimated_cost'
  },
  additionalNotes: {
    type: DataTypes.TEXT,
    field: 'additional_notes'
  },
  attachments: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by'
  },
  assignedTo: {
    type: DataTypes.UUID,
    field: 'assigned_to'
  },
  resolvedAt: {
    type: DataTypes.DATE,
    field: 'resolved_at'
  },
  closedAt: {
    type: DataTypes.DATE,
    field: 'closed_at'
  }
}, {
  tableName: 'incidents',
  underscored: true,
  hooks: {
    beforeCreate: async (incident) => {
      // Generate incident ID
      const date = new Date();
      const year = date.getFullYear();
      const count = await Incident.count({
        where: {
          createdAt: {
            [require('sequelize').Op.gte]: new Date(year, 0, 1),
            [require('sequelize').Op.lt]: new Date(year + 1, 0, 1)
          }
        }
      });
      incident.incidentId = `INC-${year}-${String(count + 1).padStart(4, '0')}`;
    },
    beforeUpdate: (incident) => {
      // Update resolved/closed timestamps
      if (incident.changed('status')) {
        if (incident.status === 'resolved' && !incident.resolvedAt) {
          incident.resolvedAt = new Date();
        } else if (incident.status === 'closed' && !incident.closedAt) {
          incident.closedAt = new Date();
        }
      }
    }
  }
});

module.exports = Incident;