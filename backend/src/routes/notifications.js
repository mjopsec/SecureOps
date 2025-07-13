const express = require('express');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

const router = express.Router();

// Get user's notifications
router.get('/', async (req, res) => {
  try {
    const { unreadOnly, limit = 50, offset = 0 } = req.query;
    
    const where = { userId: req.user.id };
    if (unreadOnly === 'true') {
      where.isRead = false;
    }
    
    const notifications = await Notification.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json(notifications);
    
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread count
router.get('/unread-count', async (req, res) => {
  try {
    const count = await Notification.count({
      where: {
        userId: req.user.id,
        isRead: false
      }
    });
    
    res.json({ count });
    
  } catch (error) {
    logger.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Mark notification as read
router.post('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    await notification.update({
      isRead: true,
      readAt: new Date()
    });
    
    res.json({ success: true });
    
  } catch (error) {
    logger.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all as read
router.post('/read-all', async (req, res) => {
  try {
    const { ids } = req.body;
    
    const where = {
      userId: req.user.id,
      isRead: false
    };
    
    if (ids && Array.isArray(ids)) {
      where.id = { [Op.in]: ids };
    }
    
    await Notification.update(
      {
        isRead: true,
        readAt: new Date()
      },
      { where }
    );
    
    res.json({ success: true });
    
  } catch (error) {
    logger.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    await notification.destroy();
    
    res.json({ success: true });
    
  } catch (error) {
    logger.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

module.exports = router;