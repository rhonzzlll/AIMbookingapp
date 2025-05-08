module.exports = (sequelize, DataTypes) => {
  const Room = sequelize.define('Room', {
    roomId: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      field: 'roomId',
      allowNull: false
    },
    buildingId: {
      type: DataTypes.STRING(255),
      field: 'buildingId',
      allowNull: false
    },
    roomName: {
      type: DataTypes.STRING(255),
      field: 'roomName',
      allowNull: false
    },
    subRoom: {
      type: DataTypes.STRING(255),
      field: 'subRoom',
      allowNull: true
    },
    roomCapacity: {
      type: DataTypes.INTEGER,
      field: 'roomCapacity',
      allowNull: true
    },
    isQuadrant: {
      type: DataTypes.BOOLEAN,
      field: 'isQuadrant',
      allowNull: true
    },
    roomDescription: {
      type: DataTypes.STRING(255),
      field: 'roomDescription',
      allowNull: true
    },
    roomImage: {
      type: DataTypes.STRING(255),
      field: 'roomImage',
      allowNull: true
    }
  }, {
    tableName: 'room',
    schema: 'dbo',
    timestamps: false
  });

  Room.associate = (models) => {
    // Association with Building model if you have one
    if (models.Building) {
      Room.belongsTo(models.Building, {
        foreignKey: 'buildingId',
        targetKey: 'buildingId'
      });
    }
    
    // Association with Booking model if you have one
    if (models.Booking) {
      Room.hasMany(models.Booking, {
        foreignKey: 'roomId',
        sourceKey: 'roomId'
      });
    }
  };

  return Room;
};