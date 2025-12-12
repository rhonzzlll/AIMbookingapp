module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
    categoryId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      field: 'categoryId',
      autoIncrement: false, // Keep as false if you don't want auto-increment
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
    timestamps: false
  });

  // Define associations
  Category.associate = (models) => {
    if (models.Building) {
      Category.belongsTo(models.Building, {
        foreignKey: 'buildingId',
        targetKey: 'buildingId'
      });
    }
    if (models.Room) {
      Category.hasMany(models.Room, {
        foreignKey: 'categoryId',
        sourceKey: 'categoryId'
      });
    }
  };

  return Category;
};