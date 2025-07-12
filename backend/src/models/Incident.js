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
    allowNull: false
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
    allowNull: false
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
    defaultValue: []
  },
  initialResponse: {
    type: DataTypes.TEXT
  },
  containmentActions: {
    type: DataTypes.TEXT
  },
  eradicationActions: {
    type: DataTypes.TEXT
  },
  recoveryActions: {
    type: DataTypes.TEXT
  },
  lessonsLearned: {
    type: DataTypes.TEXT
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
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
    validate: {
      min: 0,
      max: 100
    }
  },
  estimatedCost: {
    type: DataTypes.DECIMAL(10, 2)
  },
  additionalNotes: {
    type: DataTypes.TEXT
  },
  attachments: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  assignedTo: {
    type: DataTypes.UUID
  },
  resolvedAt: {
    type: DataTypes.DATE
  },
  closedAt: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'incidents',
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

// Class methods
Incident.getByStatus = function(status) {
  return this.findAll({ where: { status } });
};

Incident.getRecent = function(limit = 10) {
  return this.findAll({
    order: [['createdAt', 'DESC']],
    limit
  });
};

// Instance methods
Incident.prototype.calculateRiskScore = function() {
  let score = 0;
  
  // Severity scoring
  const severityScores = { critical: 40, high: 30, medium: 20, low: 10 };
  score += severityScores[this.severity] || 0;
  
  // Type scoring
  const typeScores = {
    ransomware: 30,
    'data-breach': 30,
    apt: 25,
    'supply-chain': 25,
    malware: 20,
    phishing: 15,
    ddos: 15,
    insider: 20,
    defacement: 10,
    other: 10
  };
  score += typeScores[this.type] || 0;
  
  // Status scoring (unresolved incidents score higher)
  if (['open', 'investigating'].includes(this.status)) {
    score += 20;
  } else if (['containment', 'eradication'].includes(this.status)) {
    score += 10;
  }
  
  // Time factor (older unresolved incidents score higher)
  if (this.status !== 'resolved' && this.status !== 'closed') {
    const daysOpen = Math.floor((new Date() - this.incidentDate) / (1000 * 60 * 60 * 24));
    score += Math.min(daysOpen, 10); // Max 10 points for age
  }
  
  this.riskScore = Math.min(score, 100);
  return this.riskScore;
};

module.exports = Incident;
