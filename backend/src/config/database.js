const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Database connection
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? logger.debug : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  }
);

// Model associations
const defineAssociations = (models) => {
  const { User, Incident, IOC, ThreatActor, Notification, Report, Timeline } = models;

  // User associations
  User.hasMany(Incident, { foreignKey: 'created_by', as: 'incidents' });
  User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });

  // Incident associations
  Incident.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
  Incident.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });
  Incident.hasMany(IOC, { foreignKey: 'incident_id', as: 'iocs', onDelete: 'CASCADE' });
  Incident.hasMany(Timeline, { foreignKey: 'incident_id', as: 'timeline', onDelete: 'CASCADE' });
  Incident.hasMany(Report, { foreignKey: 'incident_id', as: 'reports' });
  Incident.belongsToMany(ThreatActor, { 
    through: 'incident_threat_actors', 
    as: 'threatActors' 
  });

  // IOC associations
  IOC.belongsTo(Incident, { foreignKey: 'incident_id', as: 'incident' });
  IOC.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

  // ThreatActor associations
  ThreatActor.belongsToMany(Incident, { 
    through: 'incident_threat_actors', 
    as: 'incidents' 
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
