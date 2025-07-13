const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Report = sequelize.define('Report', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  reportId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  incidentId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM(
      'initial',
      'update',
      'final',
      'executive',
      'technical',
      'compliance'
    ),
    defaultValue: 'initial'
  },
  format: {
    type: DataTypes.ENUM('pdf', 'docx', 'html', 'json', 'stix'),
    defaultValue: 'pdf'
  },
  classification: {
    type: DataTypes.ENUM('public', 'internal', 'confidential', 'secret'),
    defaultValue: 'internal'
  },
  content: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  templateUsed: {
    type: DataTypes.STRING
  },
  filePath: {
    type: DataTypes.STRING
  },
  sharedWith: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: []
  },
  expiresAt: {
    type: DataTypes.DATE
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  tableName: 'reports',
  hooks: {
    beforeCreate: async (report) => {
      // Generate report ID
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const count = await Report.count({
        where: {
          createdAt: {
            [require('sequelize').Op.gte]: new Date(year, date.getMonth(), 1),
            [require('sequelize').Op.lt]: new Date(year, date.getMonth() + 1, 1)
          }
        }
      });
      report.reportId = `RPT-${year}${month}-${String(count + 1).padStart(3, '0')}`;
    }
  }
});

module.exports = Report;
