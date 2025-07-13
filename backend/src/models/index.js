const { defineAssociations } = require('../config/database');

// Import all models
const User = require('./User');
const Incident = require('./Incident');
const IOC = require('./IOC');
const ThreatActor = require('./ThreatActor');
const Notification = require('./Notification');
const Report = require('./Report');
const Timeline = require('./Timeline');

// Define model associations
const models = {
  User,
  Incident,
  IOC,
  ThreatActor,
  Notification,
  Report,
  Timeline
};

defineAssociations(models);

module.exports = models;
