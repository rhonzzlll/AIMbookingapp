'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    try {
      // Log which file we're trying to load
      console.log(`Loading model from: ${file}`);
      
      const modelDefinition = require(path.join(__dirname, file));
      
      // Check if the export is a function
      if (typeof modelDefinition === 'function') {
        const model = modelDefinition(sequelize, Sequelize.DataTypes);
        db[model.name] = model;
        console.log(`Successfully loaded model: ${model.name}`);
      } else {
        console.error(`Warning: Model file ${file} does not export a function. Skipping.`);
      }
    } catch (error) {
      console.error(`Error loading model from ${file}:`, error);
    }
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;