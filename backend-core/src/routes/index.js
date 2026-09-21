const express = require('express');
const authRoutes = require('./authRoutes');
const assessmentRoutes = require('./assessmentRoutes');
const submissionRoutes = require('./submissionRoutes');
const auditRoutes = require('./auditRoutes');
const appealRoutes = require('./appealRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const adminRoutes = require('./adminRoutes');
const teacherRoutes = require('./teacherRoutes');
const studentRoutes = require('./studentRoutes');
const notificationRoutes = require('./notificationRoutes');
const sandboxRoutes = require('./sandboxRoutes');

const router = express.Router();

const HealthService = require('../services/healthService');

// System & Per-Service Health Diagnostics
router.get('/health', async (req, res, next) => {
  try {
    const health = await HealthService.checkAllServices();
    const statusCode = health.status === 'Unavailable' ? 503 : 200;
    return res.status(statusCode).json({
      success: true,
      service: 'backend-core',
      ...health,
    });
  } catch (err) {
    next(err);
  }
});

// Route Modules
router.use('/auth', authRoutes);
router.use('/', authRoutes); // Exposes /login, /forgot-password, /reset-password, /me directly
router.use('/admin', adminRoutes);
router.use('/teacher', teacherRoutes);
router.use('/student', studentRoutes);
router.use('/assessments', assessmentRoutes);
router.use('/submissions', submissionRoutes);
router.use('/audit', auditRoutes);
router.use('/grade-appeals', appealRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/', analyticsRoutes); // Mounts /copilot/recommendations
router.use('/sandbox', sandboxRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
