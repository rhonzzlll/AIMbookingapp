module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
    categoryId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      field: 'categoryId',
      autoIncrement: false, // Changed from true to false
      allowNull: false
    },
    buildingId: {
      type: DataTypes.INTEGER,
      field: 'buildingId',
      allowNull: true
    },
    categoryName: {
      type: DataTypes.STRING(255),
      field: 'categoryName',
      allowNull: false
    },
    categoryDescription: {
      type: DataTypes.STRING(255),
      field: 'categoryDescription',
      allowNull: true
    }
  }, {
    tableName: 'category',
    schema: 'dbo',
    timestamps: false
  });

  // Define associations
  Category.associate = (models) => {
    // Association with Building model if you have one
    if (models.Building) {
      Category.belongsTo(models.Building, {
        foreignKey: 'buildingId',
        targetKey: 'buildingId'
      });
    }
    
    // If you have rooms that belong to categories
    if (models.Room) {
      Category.hasMany(models.Room, {
        foreignKey: 'categoryId',
        sourceKey: 'categoryId'
      });
    }
  };

  return Category;
};