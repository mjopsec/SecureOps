const express = require('express');
const { body, param } = require('express-validator');
const incidentController = require('../controllers/incidentController');
const { authorize } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createIncidentValidation = [
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('organization').trim().notEmpty().withMessage('Organization is required'),
  body('incidentDate').isISO8601().withMessage('Valid incident date is required'),
  body('type').isIn([
    'ransomware', 'phishing', 'malware', 'ddos', 
    'data-breach', 'defacement', 'apt', 'insider', 
    'supply-chain', 'other'
  ]),
  body('severity').isIn(['critical', 'high', 'medium', 'low']),
  body('impact').optional().trim(),
  body('initialResponse').optional().trim(),
  body('tags').optional().isArray(),
  body('iocs').optional().isObject(),
  body('timeline').optional().isArray()
];

const updateIncidentValidation = [
  param('id').isUUID(),
  body('title').optional().trim(),
  body('description').optional().trim(),
  body('status').optional().isIn([
    'open', 'investigating', 'containment', 
    'eradication', 'recovery', 'resolved', 'closed'
  ]),
  body('severity').optional().isIn(['critical', 'high', 'medium', 'low']),
  body('assignedTo').optional().isUUID()
];

const addTimelineValidation = [
  param('id').isUUID(),
  body('eventTime').isISO8601(),
  body('description').trim().notEmpty()
];

// Routes
router.get('/', incidentController.getIncidents);
router.get('/recent', incidentController.getRecentIncidents);
router.get('/stats', incidentController.getIncidentStats);
router.get('/:id', incidentController.getIncident);

router.post('/', createIncidentValidation, incidentController.createIncident);
router.put('/:id', updateIncidentValidation, incidentController.updateIncident);
router.delete('/:id', authorize(['admin', 'analyst']), incidentController.deleteIncident);

router.post('/:id/timeline', addTimelineValidation, incidentController.addTimelineEvent);

module.exports = router;
