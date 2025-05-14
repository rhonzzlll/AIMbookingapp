const { Sequelize, Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'mssql',
  dialectOptions: {
    options: {
      encrypt: true,
    },
  },
  // Add this to completely replace the ILIKE operator with a SQL Server compatible version
  operatorsAliases: {
    $iLike: Op.like,
    $like: Op.like
  }
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Helper function for case-insensitive searches in SQL Server
db.caseInsensitiveLike = (field, value) => {
  return {
    [field]: sequelize.where(
      sequelize.fn('LOWER', sequelize.col(field)),
      Op.like,
      value.toLowerCase()
    )
  };
};

// Patch the Sequelize instance to handle ILIKE properly
const originalDialect = sequelize.dialect;
const originalQueryGenerator = originalDialect.queryGenerator;

// Override the SQL generation for ILIKE to use SQL Server's case-insensitive LIKE
if (originalQueryGenerator) {
  const originalGenerateWhere = originalQueryGenerator.whereItemQuery.bind(originalQueryGenerator);
  originalQueryGenerator.whereItemQuery = function(key, value, options) {
    if (key === Op.iLike || key === '$iLike') {
      // Replace with case-insensitive LIKE for SQL Server
      return `LOWER(${this.quoteIdentifier(options.field)}) LIKE LOWER(${this.escape(value)})`;
    }
    return originalGenerateWhere(key, value, options);
  };
}

// Import models dynamically
const modelsDir = path.join(__dirname, 'models');
fs.readdirSync(modelsDir)
  .filter(file => {
    return file.indexOf('.') !== 0 && file !== 'index.js' && file.slice(-3) === '.js';
  })
  .forEach(file => {
    const model = require(path.join(modelsDir, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// Set up associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;