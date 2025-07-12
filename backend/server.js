require('dotenv').config();
const app = require('./src/app');
const { sequelize } = require('./src/config/database');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;

// Retry database connection
async function connectWithRetry() {
  const maxRetries = 30;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await sequelize.authenticate();
      logger.info('Database connection established successfully');
      return true;
    } catch (error) {
      retries++;
      logger.warn(`Database connection attempt ${retries}/${maxRetries} failed. Retrying in 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error('Failed to connect to database after maximum retries');
}

// Test database connection and sync models
async function startServer() {
  try {
    // Connect to database with retry
    await connectWithRetry();
    
    // Run migrations in production or sync in development
    if (process.env.NODE_ENV === 'production') {
      logger.info('Running in production mode - migrations should be run separately');
    } else {
      // In development, sync models (be careful - this can drop tables!)
      await sequelize.sync({ alter: false }); // Set to true only if you want to alter tables
      logger.info('Database models synchronized');
      
      // Run seed if database is empty
      const { User } = require('./src/models');
      const userCount = await User.count();
      if (userCount === 0) {
        logger.info('No users found, running database seed...');
        const seedDatabase = require('./scripts/seed-database');
        await seedDatabase();
      }
    }
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`SecureOps API server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
    });
    
  } catch (error) {
    logger.error('Unable to start server:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  process.exit(1);
});

// Handle SIGTERM
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await sequelize.close();
  process.exit(0);
});

startServer();