const { Op } = require('sequelize');
const db = require('../models');
const AuditLog = db.AuditLog;
const User = db.User;

exports.getAuditTrail = async (req, res) => {
  try {
    const logs = await AuditLog.findAll({
      where: {
        action: {
          [Op.in]: ['GET', 'POST', 'DELETE', 'UPDATE'] // Correct way to filter
        }
      },
      include: [
        {
          model: User,
          attributes: ['firstName', 'lastName', 'role', 'userId'],
        },
      ],
      order: [['timestamp', 'DESC']],
    });
    console.log(JSON.stringify(logs, null, 2)); // <-- Add this line

    // Format the response for the frontend
    const auditData = logs.map((log) => ({
      id: log.id,
      timestamp: log.timestamp,
      full_name: log.User
        ? `${log.User.firstName} ${log.User.lastName}`
        : 'Unknown',
      role: log.User?.role || 'Unknown',
      user_id: log.userId, // Always show the userId from the log, even if User is null
      action: log.action,
      object_affected: `Booking ID: ${log.bookingId}`,
      old_value: log.oldValue,
      new_value: log.newValue,
    }));

    res.json(auditData);
  } catch (err) {
    console.error('Audit trail fetch error:', err); // Add this for debugging
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
};