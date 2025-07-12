const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');

// Create notification
async function createNotification(options) {
  try {
    const {
      type,
      title,
      message,
      severity = 'info',
      incidentId = null,
      link = null,
      recipients,
      metadata = {}
    } = options;
    
    // Determine recipients
    let userIds = [];
    
    if (Array.isArray(recipients)) {
      // Specific user IDs
      userIds = recipients;
    } else if (recipients === 'team') {
      // All active team members
      const users = await User.findAll({
        where: { isActive: true },
        attributes: ['id']
      });
      userIds = users.map(u => u.id);
    } else if (recipients === 'admins') {
      // Admin users only
      const admins = await User.findAll({
        where: { role: 'admin', isActive: true },
        attributes: ['id']
      });
      userIds = admins.map(u => u.id);
    }
    
    // Create notifications for each recipient
    const notifications = await Promise.all(
      userIds.map(userId =>
        Notification.create({
          userId,
          type,
          title,
          message,
          severity,
          incidentId,
          link,
          metadata
        })
      )
    );
    
    logger.info(`Created ${notifications.length} notifications of type ${type}`);
    
    // TODO: Implement real-time notifications via WebSocket
    // TODO: Send email notifications based on user preferences
    
    return notifications;
    
  } catch (error) {
    logger.error('Create notification error:', error);
    throw error;
  }
}

// Create incident notification
async function notifyIncidentCreated(incident, createdBy) {
  const notification = await createNotification({
    type: 'incident',
    title: 'New Incident Created',
    message: `${incident.severity} severity ${incident.type} incident: ${incident.title}`,
    severity: incident.severity === 'critical' ? 'danger' : 'warning',
    incidentId: incident.id,
    link: `/incidents/${incident.id}`,
    recipients: 'team',
    metadata: {
      organization: incident.organization,
      createdBy: createdBy.name
    }
  });
  
  return notification;
}

// Create assignment notification
async function notifyAssignment(incident, assignedTo, assignedBy) {
  const notification = await createNotification({
    type: 'assignment',
    title: 'Incident Assigned to You',
    message: `You have been assigned to incident ${incident.incidentId}`,
    severity: 'info',
    incidentId: incident.id,
    link: `/incidents/${incident.id}`,
    recipients: [assignedTo],
    metadata: {
      assignedBy: assignedBy.name,
      incidentTitle: incident.title
    }
  });
  
  return notification;
}

// Create status change notification
async function notifyStatusChange(incident, oldStatus, newStatus, changedBy) {
  // Notify creator and assignee
  const recipients = [incident.createdBy];
  if (incident.assignedTo && incident.assignedTo !== incident.createdBy) {
    recipients.push(incident.assignedTo);
  }
  
  const notification = await createNotification({
    type: 'status_change',
    title: 'Incident Status Updated',
    message: `Incident ${incident.incidentId} status changed from ${oldStatus} to ${newStatus}`,
    severity: newStatus === 'resolved' ? 'success' : 'info',
    incidentId: incident.id,
    link: `/incidents/${incident.id}`,
    recipients,
    metadata: {
      oldStatus,
      newStatus,
      changedBy: changedBy.name
    }
  });
  
  return notification;
}

// Create threat alert notification
async function notifyThreatAlert(threatActor, confidence, details) {
  const notification = await createNotification({
    type: 'threat_alert',
    title: `Threat Actor Detected: ${threatActor}`,
    message: `${confidence} confidence attribution to ${threatActor}. ${details}`,
    severity: confidence === 'high' ? 'danger' : 'warning',
    recipients: 'team',
    metadata: {
      threatActor,
      confidence,
      details
    }
  });
  
  return notification;
}

module.exports = {
  createNotification,
  notifyIncidentCreated,
  notifyAssignment,
  notifyStatusChange,
  notifyThreatAlert
};