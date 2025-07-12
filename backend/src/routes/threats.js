const express = require('express');
const { body } = require('express-validator');
const ThreatActor = require('../models/ThreatActor');
const logger = require('../utils/logger');

const router = express.Router();

// Get all threat actors
router.get('/', async (req, res) => {
  try {
    const { active, country, search } = req.query;
    
    const where = {};
    if (active !== undefined) where.active = active === 'true';
    if (country) where.country = country;
    
    const threats = await ThreatActor.findAll({
      where,
      order: [['lastSeen', 'DESC']]
    });
    
    res.json(threats);
    
  } catch (error) {
    logger.error('Get threat actors error:', error);
    res.status(500).json({ error: 'Failed to fetch threat actors' });
  }
});

// Get single threat actor
router.get('/:id', async (req, res) => {
  try {
    const threat = await ThreatActor.findByPk(req.params.id);
    
    if (!threat) {
      return res.status(404).json({ error: 'Threat actor not found' });
    }
    
    res.json(threat);
    
  } catch (error) {
    logger.error('Get threat actor error:', error);
    res.status(500).json({ error: 'Failed to fetch threat actor' });
  }
});

// Search by alias
router.get('/search/:alias', async (req, res) => {
  try {
    const threats = await ThreatActor.findByAliases(req.params.alias);
    res.json(threats);
    
  } catch (error) {
    logger.error('Search threat actors error:', error);
    res.status(500).json({ error: 'Failed to search threat actors' });
  }
});

// Create threat actor (admin only)
router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const threat = await ThreatActor.create(req.body);
    res.status(201).json(threat);
    
  } catch (error) {
    logger.error('Create threat actor error:', error);
    res.status(500).json({ error: 'Failed to create threat actor' });
  }
});

// Update threat actor (admin only)
router.put('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const threat = await ThreatActor.findByPk(req.params.id);
    if (!threat) {
      return res.status(404).json({ error: 'Threat actor not found' });
    }
    
    await threat.update(req.body);
    res.json(threat);
    
  } catch (error) {
    logger.error('Update threat actor error:', error);
    res.status(500).json({ error: 'Failed to update threat actor' });
  }
});

module.exports = router;