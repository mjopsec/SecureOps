// Database seeding script for development/testing
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('../src/config/database');
const models = require('../src/models');

const { User, Incident, IOC, ThreatActor, Timeline, Notification } = models;

async function seedDatabase() {
  try {
    console.log('Starting database seed...');
    
    // Create admin user with proper password hash
    const adminPassword = await bcrypt.hash('admin123', 10);
    const [adminUser] = await User.findOrCreate({
      where: { email: 'admin@secureops.com' },
      defaults: {
        email: 'admin@secureops.com',
        password: adminPassword,
        name: 'Admin User',
        role: 'admin',
        department: 'Security Operations',
        isActive: true
      }
    });
    console.log('✓ Admin user created');
    
    // Create test users
    const analystPassword = await bcrypt.hash('analyst123', 10);
    const [analyst1] = await User.findOrCreate({
      where: { email: 'john.smith@secureops.com' },
      defaults: {
        email: 'john.smith@secureops.com',
        password: analystPassword,
        name: 'John Smith',
        role: 'analyst',
        department: 'Incident Response',
        isActive: true
      }
    });
    
    const [analyst2] = await User.findOrCreate({
      where: { email: 'sarah.johnson@secureops.com' },
      defaults: {
        email: 'sarah.johnson@secureops.com',
        password: analystPassword,
        name: 'Sarah Johnson',
        role: 'analyst',
        department: 'Threat Intelligence',
        isActive: true
      }
    });
    console.log('✓ Test users created');
    
    // Create sample incidents
    const incident1 = await Incident.create({
      title: 'Ransomware Attack on ACME Corp',
      description: 'Multiple endpoints infected with ransomware variant. Files encrypted with .locked extension.',
      organization: 'ACME Corporation',
      incidentDate: new Date('2025-01-10T14:30:00'),
      type: 'ransomware',
      severity: 'critical',
      status: 'open',
      impact: 'Production systems down. Estimated 500 workstations affected.',
      initialResponse: 'Network isolation implemented. Backup restoration in progress.',
      createdBy: analyst1.id,
      assignedTo: analyst1.id,
      tags: ['ransomware', 'critical', 'production']
    });
    
    const incident2 = await Incident.create({
      title: 'Phishing Campaign Targeting Finance Department',
      description: 'Sophisticated phishing emails mimicking internal HR communications.',
      organization: 'TechStart Inc',
      incidentDate: new Date('2025-01-08T09:15:00'),
      type: 'phishing',
      severity: 'high',
      status: 'investigating',
      impact: 'Three users clicked malicious links. Credentials potentially compromised.',
      initialResponse: 'Password resets initiated. Email filters updated.',
      createdBy: analyst2.id,
      assignedTo: analyst2.id,
      tags: ['phishing', 'email', 'credentials']
    });
    console.log('✓ Sample incidents created');
    
    // Create IOCs for incidents
    const iocs = [
      {
        type: 'ip',
        value: '185.142.236.34',
        confidence: 'high',
        tags: ['c2', 'ransomware'],
        notes: 'Known command and control server',
        incidentId: incident1.id,
        createdBy: analyst1.id
      },
      {
        type: 'domain',
        value: 'malicious-update.com',
        confidence: 'high',
        tags: ['malware', 'distribution'],
        notes: 'Hosting ransomware payload',
        incidentId: incident1.id,
        createdBy: analyst1.id
      },
      {
        type: 'hash',
        value: 'd41d8cd98f00b204e9800998ecf8427e',
        confidence: 'medium',
        tags: ['ransomware', 'executable'],
        notes: 'MD5 hash of ransomware executable',
        incidentId: incident1.id,
        createdBy: analyst1.id
      },
      {
        type: 'email',
        value: 'hr-update@techstart-corp.com',
        confidence: 'high',
        tags: ['phishing', 'spoofed'],
        notes: 'Spoofed sender address',
        incidentId: incident2.id,
        createdBy: analyst2.id
      }
    ];
    
    for (const ioc of iocs) {
      await IOC.create(ioc);
    }
    console.log('✓ IOCs created');
    
    // Create timeline events
    await Timeline.create({
      incidentId: incident1.id,
      eventTime: new Date('2025-01-10T14:30:00'),
      description: 'First ransomware alert triggered by EDR system',
      eventType: 'detection',
      createdBy: analyst1.id
    });
    
    await Timeline.create({
      incidentId: incident1.id,
      eventTime: new Date('2025-01-10T14:45:00'),
      description: 'Emergency response team activated',
      eventType: 'response',
      createdBy: analyst1.id
    });
    console.log('✓ Timeline events created');
    
    // Create notifications
    await Notification.create({
      userId: adminUser.id,
      type: 'incident',
      title: 'New Critical Incident',
      message: 'Ransomware attack detected at ACME Corporation',
      severity: 'danger',
      incidentId: incident1.id,
      link: `/incidents/${incident1.id}`
    });
    
    await Notification.create({
      userId: analyst2.id,
      type: 'assignment',
      title: 'New Incident Assignment',
      message: 'You have been assigned to a phishing incident',
      severity: 'warning',
      incidentId: incident2.id,
      link: `/incidents/${incident2.id}`
    });
    console.log('✓ Notifications created');
    
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\nYou can now login with:');
    console.log('  Email: admin@secureops.com');
    console.log('  Password: admin123');
    
  } catch (error) {
    console.error('❌ Seeding error:', error);
    throw error;
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedDatabase;