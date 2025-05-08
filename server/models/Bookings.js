module.exports = (sequelize, DataTypes) => {
  const Booking = sequelize.define('Booking', {
    bookingId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      field: 'bookingId',
      allowNull: false
    },
    roomId: {
      type: DataTypes.INTEGER,
      field: 'roomId',
      allowNull: true
    },
    userId: {
      type: DataTypes.BIGINT,
      field: 'userId',
      allowNull: true
    },
    title: {
      type: DataTypes.STRING(255),
      field: 'title',
      allowNull: true
    },
    bookingCapacity: {
      type: DataTypes.INTEGER,
      field: 'bookingCapacity',
      allowNull: true
    },
    date: {
      type: DataTypes.DATEONLY,
      field: 'date',
      allowNull: true
    },
    startTime: {
      type: DataTypes.TIME,
      field: 'startTime',
      allowNull: true
    },
    endTime: {
      type: DataTypes.TIME,
      field: 'endTime',
      allowNull: true
    },
    notes: {
      type: DataTypes.STRING(255),
      field: 'notes',
      allowNull: true
    },
    isRecurring: {
      type: DataTypes.BOOLEAN,
      field: 'isRecurring',
      allowNull: true
    },
    isMealRoom: {
      type: DataTypes.BOOLEAN,
      field: 'isMealRoom',
      allowNull: true
    },
    isBreakRoom: {
      type: DataTypes.BOOLEAN,
      field: 'isBreakRoom',
      allowNull: true
    },
    recurrenceEndDate: {
      type: DataTypes.DATEONLY,
      field: 'recurrenceEndDate',
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(50),
      field: 'status',
      allowNull: true
    },
    timeSubmitted: {
      type: DataTypes.TIME,
      field: 'timeSubmitted',
      allowNull: true
    },
    remarks: {
      type: DataTypes.STRING(255),
      field: 'remarks',
      allowNull: true
    },
    changedBy: {
      type: DataTypes.STRING(255),
      field: 'changedBy',
      allowNull: true
    }
  }, {
    tableName: 'bookings',  // Note: Your table is named 'bookings' (plural)
    schema: 'dbo',
    timestamps: false
  });

  // Define associations
  Booking.associate = (models) => {
    // Association with Room model
    if (models.Room) {
      Booking.belongsTo(models.Room, {
        foreignKey: 'roomId',
        targetKey: 'roomId'
      });
    }
    
    // Association with User model
    if (models.User) {
      Booking.belongsTo(models.User, {
        foreignKey: 'userId',
        targetKey: 'userId'
      });
    }
  };

  return Booking;
};