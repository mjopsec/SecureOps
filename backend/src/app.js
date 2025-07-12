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

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:8080',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW * 60 * 1000, // minutes to ms
  max: process.env.RATE_LIMIT_MAX || 100,
  message: 'Too many requests from this IP, please try again later.'
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/incidents', authenticateToken, incidentRoutes);
app.use('/api/iocs', authenticateToken, iocRoutes);
app.use('/api/threats', authenticateToken, threatRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);

// Stats endpoint (public for dashboard)
app.get('/api/stats', async (req, res) => {
  try {
    const { Incident, IOC } = require('./models');
    
    const stats = {
      activeIncidents: await Incident.count({ where: { status: 'open' } }),
      pendingReview: await Incident.count({ where: { status: 'investigating' } }),
      resolvedToday: await Incident.count({
        where: {
          status: 'resolved',
          updatedAt: {
            [require('sequelize').Op.gte]: new Date().setHours(0, 0, 0, 0)
          }
        }
      }),
      totalIOCs: await IOC.count(),
      threatLevel: 'Medium' // This could be calculated based on recent incidents
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
