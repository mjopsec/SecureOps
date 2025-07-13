const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const Incident = require('../models/Incident');
const IOC = require('../models/IOC');
const User = require('../models/User');
const Timeline = require('../models/Timeline');
const logger = require('../utils/logger');
const { createNotification } = require('../services/notificationService');

// Get all incidents with filters
exports.getIncidents = async (req, res) => {
  try {
    const {
      status,
      severity,
      type,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sort = 'createdAt',
      order = 'DESC'
    } = req.query;

    // Build where clause
    const where = {};
    
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (type) where.type = type;
    
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { organization: { [Op.iLike]: `%${search}%` } },
        { incidentId: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (startDate || endDate) {
      where.incidentDate = {};
      if (startDate) where.incidentDate[Op.gte] = new Date(startDate);
      if (endDate) where.incidentDate[Op.lte] = new Date(endDate);
    }

    // Calculate offset
    const offset = (page - 1) * limit;

    // Query incidents
    const { count, rows } = await Incident.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'name', 'email']
        },
        {
          model: IOC,
          as: 'iocs',
          attributes: ['id', 'type', 'value']
        }
      ],
      order: [[sort, order]],
      limit: parseInt(limit),
      offset
    });

    res.json({
      incidents: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Get incidents error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch incidents' 
    });
  }
};

// Get recent incidents for dashboard
exports.getRecentIncidents = async (req, res) => {
  try {
    const incidents = await Incident.findAll({
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.json(incidents);

  } catch (error) {
    logger.error('Get recent incidents error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recent incidents' 
    });
  }
};

// Get single incident
exports.getIncident = async (req, res) => {
  try {
    const { id } = req.params;

    const incident = await Incident.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'name', 'email']
        },
        {
          model: IOC,
          as: 'iocs'
        },
        {
          model: Timeline,
          as: 'timeline',
          include: [{
            model: User,
            as: 'creator',
            attributes: ['id', 'name']
          }],
          order: [['eventTime', 'ASC']]
        }
      ]
    });

    if (!incident) {
      return res.status(404).json({ 
        error: 'Incident not found' 
      });
    }

    res.json(incident);

  } catch (error) {
    logger.error('Get incident error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch incident' 
    });
  }
};

// Create new incident
exports.createIncident = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      organization,
      incidentDate,
      type,
      severity,
      impact,
      initialResponse,
      iocs,
      timeline,
      tags,
      assignedTo,
      notifyTeam,
      shareIntel
    } = req.body;

    // Create incident
    const incident = await Incident.create({
      title: title || `${type} incident at ${organization}`,
      description,
      organization,
      incidentDate,
      type,
      severity,
      impact,
      initialResponse,
      tags,
      assignedTo,
      isPublic: shareIntel || false,
      createdBy: req.user.id
    });

    // Calculate and save risk score
    await incident.calculateRiskScore();
    await incident.save();

    // Create IOCs if provided
    if (iocs && Object.keys(iocs).length > 0) {
      const iocPromises = [];
      
      for (const [type, items] of Object.entries(iocs)) {
        for (const item of items) {
          iocPromises.push(
            IOC.create({
              type,
              value: item.value,
              confidence: item.confidence || 'medium',
              tags: item.tags || [],
              notes: item.notes || '',
              incidentId: incident.id,
              createdBy: req.user.id
            })
          );
        }
      }
      
      await Promise.all(iocPromises);
    }

    // Create timeline events if provided
    if (timeline && timeline.length > 0) {
      const timelinePromises = timeline.map(event =>
        Timeline.create({
          incidentId: incident.id,
          eventTime: event.time,
          description: event.description,
          createdBy: req.user.id
        })
      );
      
      await Promise.all(timelinePromises);
    }

    // Create notifications
    if (notifyTeam) {
      await createNotification({
        type: 'incident',
        title: 'New Incident Created',
        message: `${incident.severity} severity ${incident.type} incident: ${incident.title}`,
        incidentId: incident.id,
        severity: incident.severity,
        recipients: 'team' // This would notify all team members
      });
    }

    // Fetch complete incident with associations
    const completeIncident = await Incident.findByPk(incident.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: IOC, as: 'iocs' },
        { model: Timeline, as: 'timeline' }
      ]
    });

    logger.info(`New incident created: ${incident.incidentId} by ${req.user.email}`);

    res.status(201).json(completeIncident);

  } catch (error) {
    logger.error('Create incident error:', error);
    res.status(500).json({ 
      error: 'Failed to create incident' 
    });
  }
};

// Update incident
exports.updateIncident = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    const incident = await Incident.findByPk(id);
    if (!incident) {
      return res.status(404).json({ 
        error: 'Incident not found' 
      });
    }

    // Track status changes for notifications
    const statusChanged = updates.status && updates.status !== incident.status;
    const previousStatus = incident.status;

    // Update incident
    await incident.update(updates);

    // Recalculate risk score if relevant fields changed
    if (updates.severity || updates.type || updates.status) {
      await incident.calculateRiskScore();
      await incident.save();
    }

    // Create notification for status change
    if (statusChanged) {
      await createNotification({
        type: 'status_change',
        title: 'Incident Status Updated',
        message: `Incident ${incident.incidentId} status changed from ${previousStatus} to ${updates.status}`,
        incidentId: incident.id,
        severity: incident.severity,
        recipients: [incident.createdBy, incident.assignedTo].filter(Boolean)
      });
    }

    // Add timeline entry for significant updates
    if (statusChanged || updates.containmentActions || updates.eradicationActions || updates.recoveryActions) {
      let description = '';
      if (statusChanged) {
        description = `Status changed from ${previousStatus} to ${updates.status}`;
      } else {
        description = 'Incident details updated';
      }
      
      await Timeline.create({
        incidentId: incident.id,
        eventTime: new Date(),
        description,
        metadata: { updates: Object.keys(updates) },
        createdBy: req.user.id
      });
    }

    // Fetch updated incident with associations
    const updatedIncident = await Incident.findByPk(id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: IOC, as: 'iocs' },
        { model: Timeline, as: 'timeline' }
      ]
    });

    logger.info(`Incident updated: ${incident.incidentId} by ${req.user.email}`);

    res.json(updatedIncident);

  } catch (error) {
    logger.error('Update incident error:', error);
    res.status(500).json({ 
      error: 'Failed to update incident' 
    });
  }
};

// Delete incident
exports.deleteIncident = async (req, res) => {
  try {
    const { id } = req.params;

    const incident = await Incident.findByPk(id);
    if (!incident) {
      return res.status(404).json({ 
        error: 'Incident not found' 
      });
    }

    // Check permissions (only admin or creator can delete)
    if (req.user.role !== 'admin' && req.user.id !== incident.createdBy) {
      return res.status(403).json({ 
        error: 'Insufficient permissions' 
      });
    }

    await incident.destroy();

    logger.info(`Incident deleted: ${incident.incidentId} by ${req.user.email}`);

    res.json({ 
      success: true,
      message: 'Incident deleted successfully' 
    });

  } catch (error) {
    logger.error('Delete incident error:', error);
    res.status(500).json({ 
      error: 'Failed to delete incident' 
    });
  }
};

// Add timeline event
exports.addTimelineEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { eventTime, description } = req.body;

    const incident = await Incident.findByPk(id);
    if (!incident) {
      return res.status(404).json({ 
        error: 'Incident not found' 
      });
    }

    const timelineEvent = await Timeline.create({
      incidentId: id,
      eventTime,
      description,
      createdBy: req.user.id
    });

    const eventWithCreator = await Timeline.findByPk(timelineEvent.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name']
      }]
    });

    res.status(201).json(eventWithCreator);

  } catch (error) {
    logger.error('Add timeline event error:', error);
    res.status(500).json({ 
      error: 'Failed to add timeline event' 
    });
  }
};

// Get incident statistics
exports.getIncidentStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const stats = await Incident.findAll({
      where,
      attributes: [
        'type',
        'severity',
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['type', 'severity', 'status']
    });

    res.json(stats);

  } catch (error) {
    logger.error('Get incident stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch incident statistics' 
    });
  }
};
