module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bookingId: { type: DataTypes.INTEGER },
    userId: { type: DataTypes.INTEGER },
    action: { type: DataTypes.STRING },
    oldValue: { type: DataTypes.JSON },
    newValue: { type: DataTypes.JSON },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'audit_logs',
    timestamps: false
  });

  AuditLog.associate = function(models) {
    AuditLog.belongsTo(models.User, {
      foreignKey: 'userId',
      targetKey: 'userId'
    });
  };

  return AuditLog;
};