require('dotenv').config();
const app = require('./src/app');
const { sequelize } = require('./src/config/database');
const logger = require('./src/utils/logger');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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
      logger.warn(`Database connection attempt ${retries}/${maxRetries} failed: ${error.message}`);
      
      if (retries >= maxRetries) {
        throw new Error('Failed to connect to database after maximum retries');
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// Initialize database using psql command
async function initializeDatabase() {
  try {
    logger.info('Initializing database...');
    
    // Check if tables exist
    const { QueryTypes } = require('sequelize');
    const tables = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
      { type: QueryTypes.SELECT }
    );
    
    const tableNames = tables.map(t => t.table_name);
    logger.info(`Found tables: ${tableNames.join(', ')}`);
    
    // If users table doesn't exist, run migration using psql
    if (!tableNames.includes('users')) {
      logger.info('Running initial database migration using psql...');
      
      try {
        // Use psql to run migration
        const cmd = `PGPASSWORD=${process.env.DB_PASSWORD} psql -h ${process.env.DB_HOST} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -f /app/migrations/001-initial-schema.sql`;
        
        await execPromise(cmd);
        logger.info('Migration completed successfully');
      } catch (error) {
        logger.warn('psql migration failed, trying alternative method...');
        
        // Alternative: Create basic tables manually
        try {
          // Create users table
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS users (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              email VARCHAR(255) UNIQUE NOT NULL,
              password VARCHAR(255) NOT NULL,
              name VARCHAR(255) NOT NULL,
              role VARCHAR(50) DEFAULT 'analyst',
              department VARCHAR(255),
              phone VARCHAR(50),
              avatar VARCHAR(255),
              is_active BOOLEAN DEFAULT true,
              last_login TIMESTAMP,
              two_factor_enabled BOOLEAN DEFAULT false,
              two_factor_secret VARCHAR(255),
              password_reset_token VARCHAR(255),
              password_reset_expires TIMESTAMP,
              preferences JSONB DEFAULT '{"notifications": {"email": true, "inApp": true}, "theme": "light", "timezone": "UTC"}',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
          
          logger.info('Created users table');
          
          // Create other essential tables
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS incidents (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              incident_id VARCHAR(50) UNIQUE NOT NULL,
              title VARCHAR(255) NOT NULL,
              description TEXT NOT NULL,
              organization VARCHAR(255) NOT NULL,
              incident_date TIMESTAMP NOT NULL,
              type VARCHAR(50) NOT NULL,
              severity VARCHAR(20) NOT NULL,
              status VARCHAR(20) DEFAULT 'open',
              impact TEXT,
              affected_systems JSONB DEFAULT '[]',
              initial_response TEXT,
              containment_actions TEXT,
              eradication_actions TEXT,
              recovery_actions TEXT,
              lessons_learned TEXT,
              tags TEXT[] DEFAULT '{}',
              is_public BOOLEAN DEFAULT false,
              confidence INTEGER DEFAULT 50,
              risk_score INTEGER,
              estimated_cost DECIMAL(10, 2),
              additional_notes TEXT,
              attachments JSONB DEFAULT '[]',
              created_by UUID NOT NULL,
              assigned_to UUID,
              resolved_at TIMESTAMP,
              closed_at TIMESTAMP,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
          
          logger.info('Created incidents table');
          
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS iocs (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              type VARCHAR(20) NOT NULL,
              value VARCHAR(500) NOT NULL,
              confidence VARCHAR(20) DEFAULT 'medium',
              tags TEXT[] DEFAULT '{}',
              notes TEXT,
              source VARCHAR(255),
              first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              is_active BOOLEAN DEFAULT true,
              malicious_score INTEGER DEFAULT 50,
              metadata JSONB DEFAULT '{}',
              enrichment JSONB DEFAULT '{}',
              incident_id UUID NOT NULL,
              created_by UUID NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(type, value)
            )
          `);
          
          logger.info('Created iocs table');
          
          // Create other tables as needed...
          
        } catch (tableError) {
          logger.error('Failed to create tables:', tableError.message);
        }
      }
    }
    
    // Initialize models
    require('./src/models');
    
    // Ensure admin user exists
    const { User } = require('./src/models');
    const bcrypt = require('bcryptjs');
    
    try {
      const adminEmail = 'admin@secureops.com';
      let admin = await User.findOne({ where: { email: adminEmail } });
      
      if (!admin) {
        logger.info('Creating admin user...');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        // Try direct SQL insert first
        try {
          await sequelize.query(
            `INSERT INTO users (id, email, password, name, role, is_active, created_at, updated_at) 
             VALUES (gen_random_uuid(), :email, :password, :name, :role, true, NOW(), NOW())
             ON CONFLICT (email) DO NOTHING`,
            {
              replacements: {
                email: adminEmail,
                password: hashedPassword,
                name: 'Admin User',
                role: 'admin'
              }
            }
          );
          logger.info('Admin user created via SQL');
        } catch (sqlError) {
          // Fallback to Sequelize create
          admin = await User.create({
            email: adminEmail,
            password: hashedPassword,
            name: 'Admin User',
            role: 'admin',
            isActive: true
          });
          logger.info('Admin user created via Sequelize');
        }
      } else {
        logger.info('Admin user already exists');
      }
      
      logger.info('✅ Admin credentials: admin@secureops.com / admin123');
    } catch (error) {
      logger.error('Error managing admin user:', error.message);
    }
    
  } catch (error) {
    logger.error('Database initialization error:', error);
    throw error;
  }
}

// Start server
async function startServer() {
  try {
    logger.info('Starting SecureOps server...');
    
    // Connect to database with retry
    await connectWithRetry();
    
    // Initialize database
    await initializeDatabase();
    
    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 SecureOps API server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API base: http://localhost:${PORT}/api`);
    });
    
    // Graceful shutdown
    const gracefulShutdown = async () => {
      logger.info('Received shutdown signal...');
      
      server.close(() => {
        logger.info('HTTP server closed');
      });
      
      try {
        await sequelize.close();
        logger.info('Database connection closed');
      } catch (error) {
        logger.error('Error closing database:', error);
      }
      
      process.exit(0);
    };
    
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
  } catch (error) {
    logger.error('Unable to start server:', error);
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Start the server
startServer();