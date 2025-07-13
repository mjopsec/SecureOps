const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ThreatActor = sequelize.define('ThreatActor', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  aliases: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  country: {
    type: DataTypes.STRING
  },
  motivation: {
    type: DataTypes.ENUM(
      'financial',
      'espionage',
      'hacktivism',
      'destruction',
      'unknown'
    ),
    defaultValue: 'unknown'
  },
  sophistication: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'advanced'),
    defaultValue: 'medium'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  firstSeen: {
    type: DataTypes.DATE
  },
  lastSeen: {
    type: DataTypes.DATE
  },
  description: {
    type: DataTypes.TEXT
  },
  targets: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  sectors: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  ttps: {
    type: DataTypes.JSONB,
    defaultValue: {
      tactics: [],
      techniques: [],
      procedures: []
    }
  },
  tools: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  infrastructure: {
    type: DataTypes.JSONB,
    defaultValue: {
      domains: [],
      ips: [],
      asns: []
    }
  },
  associatedMalware: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  mitreAttackIds: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  confidenceIndicators: {
    type: DataTypes.JSONB,
    defaultValue: {
      high: [],
      medium: [],
      low: []
    }
  },
  references: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'threat_actors',
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['aliases'],
      using: 'gin'
    },
    {
      fields: ['active']
    }
  ]
});

// Class methods
ThreatActor.findByAliases = function(alias) {
  return this.findAll({
    where: sequelize.where(
      sequelize.fn('array_to_string', sequelize.col('aliases'), ','),
      { [sequelize.Op.iLike]: `%${alias}%` }
    )
  });
};

ThreatActor.getActive = function() {
  return this.findAll({
    where: { active: true },
    order: [['lastSeen', 'DESC']]
  });
};

module.exports = ThreatActor;
