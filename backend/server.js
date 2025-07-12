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

// Initialize database
async function initializeDatabase() {
  try {
    // Run migrations
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    // Check if database exists and create if not
    try {
      await execPromise(`PGPASSWORD=${process.env.DB_PASSWORD} psql -h ${process.env.DB_HOST} -U ${process.env.DB_USER} -lqt | grep -q ${process.env.DB_NAME}`);
      logger.info('Database already exists');
    } catch {
      logger.info('Creating database...');
      await execPromise(`PGPASSWORD=${process.env.DB_PASSWORD} psql -h ${process.env.DB_HOST} -U ${process.env.DB_USER} -d postgres -c "CREATE DATABASE ${process.env.DB_NAME}"`);
    }
    
    // Run migrations
    const fs = require('fs').promises;
    const path = require('path');
    const migrationsDir = path.join(__dirname, 'migrations');
    
    try {
      const files = await fs.readdir(migrationsDir);
      const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
      
      for (const file of sqlFiles) {
        logger.info(`Running migration: ${file}`);
        const migrationPath = path.join(migrationsDir, file);
        try {
          await execPromise(`PGPASSWORD=${process.env.DB_PASSWORD} psql -h ${process.env.DB_HOST} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -f ${migrationPath}`);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            logger.warn(`Migration ${file} warning:`, error.message);
          }
        }
      }
    } catch (error) {
      logger.warn('Migrations directory not found or error reading:', error.message);
    }
    
    // Sync models in development (without dropping tables)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: false });
      logger.info('Database models synchronized');
    }
    
    // Ensure admin user exists
    const { User } = require('./src/models');
    const bcrypt = require('bcryptjs');
    
    const adminEmail = 'admin@secureops.com';
    let admin = await User.findOne({ where: { email: adminEmail } });
    
    if (!admin) {
      logger.info('Creating admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      admin = await User.create({
        email: adminEmail,
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        isActive: true
      });
      logger.info('Admin user created successfully');
    } else {
      // Update password to ensure it's correct
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await admin.update({ password: hashedPassword });
      logger.info('Admin user password updated');
    }
    
    // Run seed if needed
    const userCount = await User.count();
    if (userCount === 1) {
      logger.info('Running database seed...');
      try {
        const seedDatabase = require('./scripts/seed-database');
        await seedDatabase();
      } catch (error) {
        logger.warn('Seed script not found or error:', error.message);
      }
    }
    
  } catch (error) {
    logger.error('Database initialization error:', error);
    throw error;
  }
}

// Start server
async function startServer() {
  try {
    // Connect to database with retry
    await connectWithRetry();
    
    // Initialize database
    await initializeDatabase();
    
    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`SecureOps API server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
      logger.info(`Health check available at: http://localhost:${PORT}/health`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
      });
      await sequelize.close();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Unable to start server:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  // Don't exit in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Start the server
startServer();