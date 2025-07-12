const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const incidentRoutes = require('./routes/incidents');
const iocRoutes = require('./routes/iocs');
const threatRoutes = require('./routes/threats');
const notificationRoutes = require('./routes/notifications');

// Import middleware
const errorHandler = require('./middleware/error');
const { authenticateToken } = require('./middleware/auth');

// Initialize models to ensure associations are set up
require('./models');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
}));

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost',
      'http://localhost:80',
      'http://localhost:8080',
      'http://localhost:3000',
      'http://127.0.0.1',
      'http://127.0.0.1:80',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:3000'
    ];
    
    // Allow any origin in development
    if (process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // minutes to ms
  max: process.env.RATE_LIMIT_MAX || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
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
    version: '1.0.0'
  });
});

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
      threatLevel: 'Medium' // This could be calculated based on recent incidents
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