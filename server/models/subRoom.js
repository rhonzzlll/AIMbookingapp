module.exports = (sequelize, DataTypes) => {
  const Subroom = sequelize.define('Subroom', {
    subRoomId: { // Changed to match database column name (PascalCase)
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'subRoomId' // Explicitly map to database column name
    },
    roomId: {   
      type: DataTypes.STRING(255),
      allowNull: false,
      references: {
        model: 'room', 
        key: 'roomId'
      },
      field: 'roomId' // Explicitly map to database column name
    },
    subRoomName: { // Changed to match database column name (PascalCase)
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'subRoomName' // Explicitly map to database column name
    },
    subRoomCapacity: { // Changed to match database column name (PascalCase)
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'subRoomCapacity' // Explicitly map to database column name
    },
    subRoomDescription: { // Changed to match database column name (PascalCase)
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'subRoomDescription' // Explicitly map to database column name
    },
    subRoomImage: { // Changed to match database column name (PascalCase)
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'subRoomImage' // Explicitly map to database column name
    },
    // Add timestamp fields explicitly with field mappings
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,  // Change to false to match database
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,  // Change to false to match database
      field: 'updatedAt'
    }
  }, {
    tableName: 'subroom',
    schema: 'dbo',
    timestamps: true,
    freezeTableName: true
  });

  // Add this association code
  Subroom.associate = function(models) {
    Subroom.belongsTo(models.Room, {
      foreignKey: 'roomId',
      targetKey: 'roomId',
      onDelete: 'CASCADE'
    });
  };

  return Subroom;
};