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
      type: DataTypes.STRING(255), // Changed to STRING to match nvarchar(255)
      field: 'roomId',
      allowNull: true
    },
    userId: {
      type: DataTypes.INTEGER, // BIGINT in DB is mapped to INTEGER in Sequelize
      allowNull: true,
      references: {
        model: 'Users',
        key: 'userId'
      }
    },
    firstName: {
      type: DataTypes.STRING(100), // Matches nvarchar(100)
      field: 'firstName',
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING(100), // Matches nvarchar(100)
      field: 'lastName',
      allowNull: false
    },
    department: {
      type: DataTypes.STRING(100), // Matches nvarchar(100)
      field: 'department', 
      allowNull: true
    },
    title: {
      type: DataTypes.STRING(255), // Matches nvarchar(255)
      field: 'title',
      allowNull: true
    },
    categoryId: {
      type: DataTypes.INTEGER, // Matches int
      field: 'categoryId',
      allowNull: true
    },
    buildingId: {
      type: DataTypes.STRING(255), // Changed to STRING to match nvarchar(255)
      field: 'buildingId',
      allowNull: true
    },
    bookingCapacity: {
      type: DataTypes.INTEGER, // Matches int
      field: 'bookingCapacity',
      allowNull: true,
      defaultValue: 1
    },
    date: {
      type: DataTypes.DATEONLY, // Matches date
      field: 'date',
      allowNull: false
    },
    startTime: {
      type: DataTypes.TIME, // Matches time(7)
      field: 'startTime',
      allowNull: false
    },
    endTime: {
      type: DataTypes.TIME, // Matches time(7)
      field: 'endTime',
      allowNull: false
    },
    notes: {
      type: DataTypes.STRING(255), // Matches nvarchar(255)
      field: 'notes',
      allowNull: true
    },
    isRecurring: {
      type: DataTypes.BOOLEAN, // Matches bit
      field: 'isRecurring',
      allowNull: true,
      defaultValue: false
    },
    isMealRoom: {
      type: DataTypes.BOOLEAN, // Matches bit
      field: 'isMealRoom',
      allowNull: true,
      defaultValue: false
    },
    isBreakRoom: {
      type: DataTypes.BOOLEAN, // Matches bit
      field: 'isBreakRoom',
      allowNull: true,
      defaultValue: false
    },
    recurrenceEndDate: {
      type: DataTypes.DATEONLY, // Matches date
      field: 'recurrenceEndDate',
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'declined'),
      field: 'status',
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'confirmed', 'declined']]
      }
    },
    timeSubmitted: {
      type: DataTypes.DATE, // Matches datetime
      field: 'timeSubmitted',
      allowNull: true,
      defaultValue: DataTypes.NOW
    },
    remarks: {
      type: DataTypes.STRING(255), // Matches nvarchar(255)
      field: 'remarks',
      allowNull: true
    },
    changedBy: {
      type: DataTypes.STRING(255), // Matches nvarchar(255)
      field: 'changedBy',
      allowNull: true
    }
  }, {
    tableName: 'bookings',
    schema: 'dbo',
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
  };

  return Booking;
};