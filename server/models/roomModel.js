module.exports = (sequelize, DataTypes) => {
  const Room = sequelize.define('Room', {
    roomId: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      allowNull: false
    },
    buildingId: {        
      type: DataTypes.STRING(255),
      allowNull: false,
      references: {
        model: 'building',
        key: 'buildingId'
      }
    },
    categoryId: {   
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'category',
        key: 'categoryId'
      }
    },
    roomName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    roomCapacity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    isQuadrant: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    roomImage: {
      type: DataTypes.TEXT, // Use TEXT for MySQL
      allowNull: true
    },
    roomDescription: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    parentRoomId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'room',
        key: 'roomId'
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'room',
    timestamps: true,
    freezeTableName: true
  });

  Room.associate = function(models) {
    Room.hasMany(models.Subroom, {
      as: 'subRooms',
      foreignKey: 'roomId',
      sourceKey: 'roomId',
      onDelete: 'CASCADE'
    });

    Room.belongsTo(models.Building, {
      foreignKey: 'buildingId',
      targetKey: 'buildingId'
    });

    Room.belongsTo(models.Category, {
      foreignKey: 'categoryId',
      targetKey: 'categoryId'
    });

    Room.hasMany(models.Room, {
      as: 'childRooms',
      foreignKey: 'parentRoomId'
    });
    Room.belongsTo(models.Room, {
      as: 'parentRoom',
      foreignKey: 'parentRoomId'
    });
  };

  return Room;
};
