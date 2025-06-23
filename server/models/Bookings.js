const Sequelize = require('sequelize');
const { Op, literal } = Sequelize;

module.exports = (sequelize, DataTypes) => {
  const Booking = sequelize.define('Booking', {
    bookingId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true, 
      field: 'bookingId',
      allowNull: false
    },
    roomId: {
      type: DataTypes.STRING(255),
      field: 'roomId',
      allowNull: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'userId'
      }
    },
    firstName: {
      type: DataTypes.STRING(100),
      field: 'firstName',
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING(100),
      field: 'lastName',
      allowNull: false
    },
    department: {
      type: DataTypes.STRING(100),
      field: 'department', 
      allowNull: true
    },
    costCenterCharging: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Cost center or department charged',
    },
    title: {
      type: DataTypes.STRING(255),
      field: 'title',
      allowNull: true
    },
    declineReason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    numberOfPaxBreakRoom: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    startTimeBreakRoom: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    endTimeBreakRoom: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      field: 'categoryId',
      allowNull: true     
    },
    buildingId: {
      type: DataTypes.STRING(255),
      field: 'buildingId',
      allowNull: true
    },
    bookingCapacity: {
      type: DataTypes.INTEGER,
      field: 'bookingCapacity',
      allowNull: true,
      defaultValue: 1
    },
    date: {
      type: DataTypes.DATEONLY,
      field: 'date',
      allowNull: false
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false
    },
    notes: {
      type: DataTypes.STRING(255),
      field: 'notes',
      allowNull: true
    },
    isRecurring: {
      type: DataTypes.BOOLEAN,
      field: 'isRecurring',
      allowNull: true,
      defaultValue: false
    },
    isMealRoom: {
      type: DataTypes.BOOLEAN,
      field: 'isMealRoom',
      allowNull: true,
      defaultValue: false
    },
    isBreakRoom: {
      type: DataTypes.BOOLEAN,
      field: 'isBreakRoom',
      allowNull: true,
      defaultValue: false
    },
    recurrenceEndDate: {
      type: DataTypes.DATEONLY,
      field: 'recurrenceEndDate',
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'declined', 'cancelled'),
      field: 'status',
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'confirmed', 'declined', 'cancelled']]
      }
    },
    timeSubmitted: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('UTC_TIMESTAMP()'),
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
    },
    cancelReason: {
      type: DataTypes.STRING, 
      allowNull: true,
    },
    recurrencePattern: {
      type: DataTypes.ENUM('Daily', 'Weekly', 'Monthly'),
      field: 'recurrencePattern',
      allowNull: true
    },
    recurringGroupId: {
      type: DataTypes.STRING(64),
      field: 'recurringGroupId',
      allowNull: true
    }
  }, {
    tableName: 'bookings',
    timestamps: false
  });

  // Define associations
  Booking.associate = (models) => {
    if (models.Room) {
      Booking.belongsTo(models.Room, {
        foreignKey: 'roomId',
        targetKey: 'roomId'
      });
    }
    if (models.User) {
      Booking.belongsTo(models.User, {
        foreignKey: 'userId',
        targetKey: 'userId'
      });
    }
    if (models.Building) {
      Booking.belongsTo(models.Building, {
        foreignKey: 'buildingId',
        targetKey: 'buildingId'
      });
    }
    if (models.Category) {
      Booking.belongsTo(models.Category, {
        foreignKey: 'categoryId',
        targetKey: 'categoryId'
      });
    }
    // Add this association for AuditLog
    if (models.AuditLog) {
      Booking.hasMany(models.AuditLog, {
        foreignKey: 'bookingId',
        sourceKey: 'bookingId'
      });
    }
  };

  return Booking;
};