const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Timeline = sequelize.define('Timeline', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  incidentId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  eventTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  eventType: {
    type: DataTypes.ENUM(
      'detection',
      'response',
      'containment',
      'investigation',
      'recovery',
      'update',
      'escalation',
      'communication',
      'other'
    ),
    defaultValue: 'update'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  tableName: 'timelines',
  indexes: [
    {
      fields: ['incidentId', 'eventTime']
    }
  ]
});

module.exports = Timeline;
