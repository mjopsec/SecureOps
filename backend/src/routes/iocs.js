const express = require('express');
const { body, param } = require('express-validator');
const { Op } = require('sequelize');
const IOC = require('../models/IOC');
const Incident = require('../models/Incident');
const logger = require('../utils/logger');

const router = express.Router();

// Validation rules
const createIOCValidation = [
  body('type').isIn(['ip', 'domain', 'hash', 'email', 'url', 'cve', 'other']),
  body('value').trim().notEmpty(),
  body('incidentId').isUUID(),
  body('confidence').optional().isIn(['low', 'medium', 'high']),
  body('tags').optional().isArray(),
  body('notes').optional().trim()
];

// Get all IOCs
router.get('/', async (req, res) => {
  try {
    const { type, incidentId, search, page = 1, limit = 50 } = req.query;
    
    const where = {};
    if (type) where.type = type;
    if (incidentId) where.incidentId = incidentId;
    if (search) {
      where.value = { [Op.iLike]: `%${search}%` };
    }
    
    const offset = (page - 1) * limit;
    
    const { count, rows } = await IOC.findAndCountAll({
      where,
      include: [{
        model: Incident,
        as: 'incident',
        attributes: ['id', 'incidentId', 'title', 'organization']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });
    
    res.json({
      iocs: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    logger.error('Get IOCs error:', error);
    res.status(500).json({ error: 'Failed to fetch IOCs' });
  }
});

// Get single IOC
router.get('/:id', async (req, res) => {
  try {
    const ioc = await IOC.findByPk(req.params.id, {
      include: [{
        model: Incident,
        as: 'incident'
      }]
    });
    
    if (!ioc) {
      return res.status(404).json({ error: 'IOC not found' });
    }
    
    res.json(ioc);
    
  } catch (error) {
    logger.error('Get IOC error:', error);
    res.status(500).json({ error: 'Failed to fetch IOC' });
  }
});

// Create IOC
router.post('/', createIOCValidation, async (req, res) => {
  try {
    const { type, value, incidentId, confidence, tags, notes } = req.body;
    
    // Check if incident exists
    const incident = await Incident.findByPk(incidentId);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    
    // Create IOC
    const ioc = await IOC.create({
      type,
      value,
      incidentId,
      confidence: confidence || 'medium',
      tags: tags || [],
      notes,
      createdBy: req.user.id
    });
    
    // Enrich IOC data (mock enrichment for demo)
    await ioc.enrich();
    await ioc.save();
    
    res.status(201).json(ioc);
    
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'This IOC already exists' });
    }
    
    logger.error('Create IOC error:', error);
    res.status(500).json({ error: 'Failed to create IOC' });
  }
});

// Update IOC
router.put('/:id', async (req, res) => {
  try {
    const ioc = await IOC.findByPk(req.params.id);
    if (!ioc) {
      return res.status(404).json({ error: 'IOC not found' });
    }
    
    const { confidence, tags, notes, isActive, maliciousScore } = req.body;
    
    await ioc.update({
      confidence,
      tags,
      notes,
      isActive,
      maliciousScore,
      lastSeen: new Date()
    });
    
    res.json(ioc);
    
  } catch (error) {
    logger.error('Update IOC error:', error);
    res.status(500).json({ error: 'Failed to update IOC' });
  }
});

// Delete IOC
router.delete('/:id', async (req, res) => {
  try {
    const ioc = await IOC.findByPk(req.params.id);
    if (!ioc) {
      return res.status(404).json({ error: 'IOC not found' });
    }
    
    await ioc.destroy();
    
    res.json({ success: true, message: 'IOC deleted successfully' });
    
  } catch (error) {
    logger.error('Delete IOC error:', error);
    res.status(500).json({ error: 'Failed to delete IOC' });
  }
});

// Find related IOCs
router.get('/:id/related', async (req, res) => {
  try {
    const relatedIOCs = await IOC.findRelated(req.params.id);
    res.json(relatedIOCs);
    
  } catch (error) {
    logger.error('Find related IOCs error:', error);
    res.status(500).json({ error: 'Failed to find related IOCs' });
  }
});

module.exports = router;