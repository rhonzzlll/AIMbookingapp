module.exports = (sequelize, DataTypes) => {
  const Subroom = sequelize.define('Subroom', {
    subroomId: {
      type: DataTypes.STRING(255), // Change from INTEGER to STRING(255)
      primaryKey: true,
      allowNull: false,
      field: 'subroomId'
    },
    roomId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      references: {
        model: 'room',
        key: 'roomId'
      },
      field: 'roomId'
    },
    subRoomName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'subRoomName'
    },
    subRoomCapacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'subRoomCapacity'
    },
    subRoomDescription: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'subRoomDescription'
    },
    subRoomImage: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'subRoomImage'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updatedAt'
    }
  }, {
    tableName: 'subroom',
    schema: 'dbo',
    timestamps: true,
    freezeTableName: true
  });

  Subroom.associate = function(models) {
    Subroom.belongsTo(models.Room, {
      foreignKey: 'roomId',
      targetKey: 'roomId',
      onDelete: 'CASCADE'
    });
  };

  return Subroom;
};