const express = require('express');
const NotificationService = require('../services/notificationService');
const { authenticateUser } = require('../middleware/authMiddleware');

const router = express.Router();

// Require authentication for notification endpoints
router.use(authenticateUser);

/**
 * @route   GET /notifications
 * @desc    Get real-event notifications for the current authenticated user/role
 */
router.get('/', async (req, res, next) => {
  try {
    const { is_read, type, limit } = req.query;
    const notifications = await NotificationService.getNotificationsForUser(req.user, {
      is_read,
      type,
      limit: limit ? parseInt(limit, 10) : 50,
    });

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return res.status(200).json({
      success: true,
      data: {
        notifications,
        unread_count: unreadCount,
        total_count: notifications.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /notifications/:id/read
 * @desc    Mark a single notification as read
 */
router.patch('/:id/read', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await NotificationService.markAsRead(id, req.user);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /notifications/mark-all-read
 * @desc    Mark all notifications as read for current user
 */
router.post('/mark-all-read', async (req, res, next) => {
  try {
    const result = await NotificationService.markAllAsRead(req.user);
    return res.status(200).json({
      success: true,
      message: `Marked ${result.updated_count} notifications as read`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
