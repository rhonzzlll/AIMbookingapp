const { Op } = require('sequelize');
const db = require('../models');
const AuditLog = db.AuditLog;
const User = db.User;
const Booking = db.Booking;

exports.getAuditTrail = async (req, res) => {
  try {
    const logs = await AuditLog.findAll({
      order: [['timestamp', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['firstName', 'lastName', 'role', 'userId', 'email'],
        },
        {
          model: Booking,
          attributes: ['changedBy'],
        }
      ],
    });

    // Format the response for the frontend
    const auditData = logs.map((log) => {
      // Determine module and object_affected
      let module = log.module || (log.bookingId ? 'Booking' : 'User');
      let object_affected = log.objectAffected;

      // Fallbacks for legacy logs
      if (!object_affected) {
        if (module === 'Booking') {
          object_affected = `Booking ID: ${log.bookingId}`;
        } else if (module === 'User') {
          object_affected = log.User?.email || `User ID: ${log.userId}`;
        }
      }

      return {
        id: log.id,
        timestamp: log.timestamp,
        full_name: log.User
          ? `${log.User.firstName || ''} ${log.User.lastName || ''}`.trim() || 'Unknown'
          : (log.Booking?.changedBy || 'Unknown'),
        role: log.User?.role || 'Unknown',
        user_id: log.User?.userId || log.userId || 'Unknown',
        action: log.action,
        module,
        object_affected,
        old_value: log.oldValue,
        new_value: log.newValue,
      };
    });

    res.json(auditData);
  } catch (err) {
    console.error('Audit trail fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
};