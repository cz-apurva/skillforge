const express = require('express');
const AdminService = require('../services/adminService');
const AssessmentService = require('../services/assessmentService');
const GradeAuditLog = require('../models/GradeAuditLog');
const { authenticateUser, authorizeRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Strict RBAC: All Admin routes require valid JWT token with ADMIN role
router.use(authenticateUser);
router.use(authorizeRole('ADMIN'));

/**
 * @route   GET /admin/stats
 * @desc    Get system-wide KPI metrics and recent audit events
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await AdminService.getDashboardStats();
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /admin/users
 * @desc    List and search platform users (teachers, students, admins)
 */
router.get('/users', async (req, res, next) => {
  try {
    const { role, search, status } = req.query;
    const users = await AdminService.getUsers({ role, search, status });
    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /admin/users
 * @desc    Create new platform user (Teacher or Student)
 */
router.post('/users', async (req, res, next) => {
  try {
    const newUser = await AdminService.createUser(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: `User account created successfully for '${newUser.email}'`,
      data: newUser,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /admin/users/:id/status
 * @desc    Activate or deactivate a user account
 */
router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await AdminService.toggleUserStatus(id, req.user);
    return res.status(200).json({
      success: true,
      message: `User account status updated to '${updated.status}'`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /admin/classes
 * @desc    Get classrooms list with teacher and student count
 */
router.get('/classes', async (req, res, next) => {
  try {
    const classrooms = await AdminService.getClassrooms();
    return res.status(200).json({
      success: true,
      data: classrooms,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /admin/classes/:id/status
 * @desc    Activate or archive a classroom
 */
router.patch('/classes/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await AdminService.toggleClassroomStatus(id, req.user);
    return res.status(200).json({
      success: true,
      message: `Classroom status updated to '${updated.status}'`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /admin/ai-services
 * @desc    Get status and telemetry for all AI modules (API keys never exposed)
 */
router.get('/ai-services', async (req, res, next) => {
  try {
    const services = await AdminService.getAiServicesStatus();
    return res.status(200).json({
      success: true,
      data: services,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /admin/ai-services/diagnostics
 * @desc    Trigger real-time diagnostic health probes across all services
 */
router.post('/ai-services/diagnostics', async (req, res, next) => {
  try {
    const services = await AdminService.getAiServicesStatus();
    return res.status(200).json({
      success: true,
      message: 'System diagnostics completed successfully',
      data: services,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /admin/audit-logs
 * @desc    Get platform audit logs with filtering
 */
router.get('/audit-logs', async (req, res, next) => {
  try {
    const { role, action, search } = req.query;
    let logs = await GradeAuditLog.findAll();

    if (role && role !== 'ALL') {
      logs = logs.filter((l) => (l.performed_by_role || '').toUpperCase() === role.toUpperCase());
    }

    if (action && action !== 'ALL') {
      logs = logs.filter((l) => (l.action || '').toUpperCase() === action.toUpperCase());
    }

    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      logs = logs.filter(
        (l) =>
          (l.action || '').toLowerCase().includes(q) ||
          (l.performed_by || '').toLowerCase().includes(q) ||
          JSON.stringify(l.new_state || {}).toLowerCase().includes(q) ||
          JSON.stringify(l.previous_state || {}).toLowerCase().includes(q)
      );
    }

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /admin/subjects
 * @desc    Get subjects curriculum registry
 */
router.get('/subjects', async (req, res, next) => {
  try {
    const subjects = await AdminService.getSubjects();
    return res.status(200).json({
      success: true,
      data: subjects,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /admin/assessments
 * @desc    Read-only oversight of all platform assessments (no grade editing)
 */
router.get('/assessments', async (req, res, next) => {
  try {
    const assessments = await AssessmentService.getAssessments(req.user);
    return res.status(200).json({
      success: true,
      data: assessments,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
