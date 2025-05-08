module.exports = (sequelize, DataTypes) => {
  const Building = sequelize.define('Building', {
    buildingId: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      field: 'buildingId',
      allowNull: false
    },
    buildingName: {
      type: DataTypes.STRING(255),
      field: 'buildingName',
      allowNull: false
    },
    buildingDescription: {
      type: DataTypes.STRING(255),
      field: 'buildingDescription',
      allowNull: true 
    },
    buildingImage: {
      type: DataTypes.TEXT('long'), // Use TEXT type instead of STRING
      field: 'buildingImage',
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'createdAt',
      allowNull: true
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updatedAt',
      allowNull: true
    }
  }, {
    tableName: 'building',
    schema: 'dbo',
    timestamps: true,
    // Since you have custom column names for timestamps
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  });

  // Define associations
  Building.associate = (models) => {
    // Association with Room model
    if (models.Room) {
      Building.hasMany(models.Room, {
        foreignKey: 'buildingId',
        sourceKey: 'buildingId'
      });
    }
    
    // Association with Category model
    if (models.Category) {
      Building.hasMany(models.Category, {
        foreignKey: 'buildingId',
        sourceKey: 'buildingId'
      });
    }
  };

  return Building;
};