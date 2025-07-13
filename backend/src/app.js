const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import middleware
const errorHandler = require('./middleware/error');
const { authenticateToken } = require('./middleware/auth');

// Initialize express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
}));

// CORS configuration - allow all origins in development
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/health';
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// API base route
app.get('/api', (req, res) => {
  res.json({
    message: 'SecureOps API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      incidents: '/api/incidents',
      iocs: '/api/iocs',
      threats: '/api/threats',
      notifications: '/api/notifications'
    }
  });
});

// Import routes with error handling
try {
  const authRoutes = require('./routes/auth');
  const incidentRoutes = require('./routes/incidents');
  const iocRoutes = require('./routes/iocs');
  const threatRoutes = require('./routes/threats');
  const notificationRoutes = require('./routes/notifications');

  // API Routes - Auth routes don't need authentication middleware
  app.use('/api/auth', authRoutes);

  // Protected routes
  app.use('/api/incidents', authenticateToken, incidentRoutes);
  app.use('/api/iocs', authenticateToken, iocRoutes);
  app.use('/api/threats', authenticateToken, threatRoutes);
  app.use('/api/notifications', authenticateToken, notificationRoutes);

  // Stats endpoint
  app.get('/api/stats', authenticateToken, async (req, res) => {
    try {
      const { Incident, IOC } = require('./models');
      const { Op } = require('sequelize');
      
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const stats = {
        activeIncidents: await Incident.count({ 
          where: { status: ['open', 'investigating'] } 
        }),
        pendingReview: await Incident.count({ 
          where: { status: 'investigating' } 
        }),
        resolvedToday: await Incident.count({
          where: {
            status: 'resolved',
            resolvedAt: {
              [Op.gte]: todayStart
            }
          }
        }),
        totalIOCs: await IOC.count(),
        threatLevel: 'Medium'
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // Recent incidents endpoint
  app.get('/api/incidents/recent', authenticateToken, async (req, res) => {
    try {
      const { Incident, User } = require('./models');
      
      const incidents = await Incident.findAll({
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }],
        order: [['createdAt', 'DESC']],
        limit: 10,
        attributes: [
          'id', 'incidentId', 'title', 'organization', 
          'type', 'severity', 'status', 'createdAt'
        ]
      });
      
      res.json(incidents);
    } catch (error) {
      console.error('Recent incidents error:', error);
      res.status(500).json({ error: 'Failed to fetch recent incidents' });
    }
  });

} catch (error) {
  console.error('Error loading routes:', error);
}

// Initialize models to ensure associations are set up
try {
  require('./models');
} catch (error) {
  console.error('Error initializing models:', error);
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;