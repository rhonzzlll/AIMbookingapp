const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    userId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    firstName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    profileImage: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    birthdate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    department: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    role: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isIn: [['SuperAdmin', 'Admin', 'User']]
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    }
  }, {
    tableName: 'users',
    timestamps: false,
    hooks: {
      // Hash password before saving
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      }
    },
    // Scopes for commonly used queries
    scopes: {
      withoutPassword: {
        attributes: { exclude: ['password'] }
      },
      activeOnly: {
        where: { isActive: true }
      }
    }
  });

  // Method to generate JWT token
  User.prototype.generateAuthToken = function () {
    return jwt.sign(
      { id: this.userId, email: this.email, role: this.role?.toLowerCase() },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  };

  // Method to verify password
  User.prototype.verifyPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
  };

  // Define associations here
  User.associate = function(models) {
    User.hasMany(models.Booking, {
      foreignKey: 'userId',
      sourceKey: 'userId'
    });
  };

  return User;
};