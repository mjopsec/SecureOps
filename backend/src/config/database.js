const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Database connection with better error handling
const sequelize = new Sequelize(
  process.env.DB_NAME || 'secureops',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'secureops123',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' 
      ? (msg) => logger.debug(msg) 
      : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      connectTimeout: 30000, // 30 seconds
      statement_timeout: 30000,
      idle_in_transaction_session_timeout: 30000
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    },
    retry: {
      max: 3,
      match: [
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/
      ]
    }
  }
);

// Model associations
const defineAssociations = (models) => {
  const { User, Incident, IOC, ThreatActor, Notification, Report, Timeline } = models;

  // User associations
  User.hasMany(Incident, { foreignKey: 'created_by', as: 'createdIncidents' });
  User.hasMany(Incident, { foreignKey: 'assigned_to', as: 'assignedIncidents' });
  User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
  User.hasMany(IOC, { foreignKey: 'created_by', as: 'createdIOCs' });
  User.hasMany(Timeline, { foreignKey: 'created_by', as: 'createdTimelines' });
  User.hasMany(Report, { foreignKey: 'created_by', as: 'createdReports' });

  // Incident associations
  Incident.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
  Incident.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });
  Incident.hasMany(IOC, { foreignKey: 'incident_id', as: 'iocs', onDelete: 'CASCADE' });
  Incident.hasMany(Timeline, { foreignKey: 'incident_id', as: 'timeline', onDelete: 'CASCADE' });
  Incident.hasMany(Report, { foreignKey: 'incident_id', as: 'reports' });
  Incident.hasMany(Notification, { foreignKey: 'incident_id', as: 'notifications' });
  Incident.belongsToMany(ThreatActor, { 
    through: 'incident_threat_actors', 
    as: 'threatActors',
    foreignKey: 'incident_id',
    otherKey: 'threat_actor_id'
  });

  // IOC associations
  IOC.belongsTo(Incident, { foreignKey: 'incident_id', as: 'incident' });
  IOC.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

  // ThreatActor associations
  ThreatActor.belongsToMany(Incident, { 
    through: 'incident_threat_actors', 
    as: 'incidents',
    foreignKey: 'threat_actor_id',
    otherKey: 'incident_id'
  });

  // Notification associations
  Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Notification.belongsTo(Incident, { foreignKey: 'incident_id', as: 'incident' });

  // Report associations
  Report.belongsTo(Incident, { foreignKey: 'incident_id', as: 'incident' });
  Report.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

  // Timeline associations
  Timeline.belongsTo(Incident, { foreignKey: 'incident_id', as: 'incident' });
  Timeline.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
};

module.exports = { sequelize, defineAssociations };