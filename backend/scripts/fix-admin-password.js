// Script to fix admin password
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('../src/config/database');
const User = require('../src/models/User');

async function fixAdminPassword() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✓ Connected to database');
    
    // Find admin user
    const admin = await User.findOne({ where: { email: 'admin@secureops.com' } });
    
    if (!admin) {
      console.log('Admin user not found. Creating...');
      
      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const newAdmin = await User.create({
        email: 'admin@secureops.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        isActive: true
      });
      
      console.log('✓ Admin user created successfully');
    } else {
      // Update existing admin password
      console.log('Admin user found. Updating password...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // Update directly to bypass hooks
      await sequelize.query(
        'UPDATE users SET password = :password WHERE email = :email',
        {
          replacements: {
            password: hashedPassword,
            email: 'admin@secureops.com'
          }
        }
      );
      
      console.log('✓ Admin password updated successfully');
    }
    
    console.log('\nYou can now login with:');
    console.log('Email: admin@secureops.com');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixAdminPassword();
