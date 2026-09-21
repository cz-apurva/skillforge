const express = require('express');
const AppealService = require('../services/appealService');
const { authenticateUser, authorizeRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateUser);

/**
 * @route   POST /grade-appeals
 * @desc    Submit a grade appeal for a written submission
 */
router.post('/', authorizeRole('STUDENT', 'ADMIN', 'TEACHER'), async (req, res, next) => {
  try {
    const studentId = req.user && req.user.role === 'STUDENT' ? req.user.id : (req.body.student_id || req.body.studentId);
    const appealData = {
      ...req.body,
      student_id: studentId,
      studentId: studentId,
    };
    const appeal = await AppealService.createAppeal(appealData);
    return res.status(201).json({
      success: true,
      message: 'Grade appeal submitted successfully',
      data: appeal,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /grade-appeals/:id/re-evaluate
 * @desc    Execute blind re-evaluation and auto-escalate if score variance > threshold
 */
router.post('/:id/re-evaluate', authorizeRole('STUDENT', 'TEACHER', 'ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { threshold } = req.body;
    const result = await AppealService.reEvaluateAppeal(id, {
      reevaluationThreshold: threshold ? parseFloat(threshold) : 0.10,
    });
    return res.status(200).json({
      success: true,
      message: result.escalated_to_teacher
        ? 'Re-evaluation completed: Significant score delta detected and escalated to instructor'
        : 'Re-evaluation completed: Score verified and confirmed',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /grade-appeals/:id/audit
 * @desc    View read-only audit history for student's own appeal
 */
router.get('/:id/audit', async (req, res, next) => {
  try {
    const { id } = req.params;
    const studentId = req.user ? req.user.id : (req.query.studentId || req.headers['x-student-id']);
    const auditLogs = await AppealService.getAppealAuditHistory(id, studentId);
    return res.status(200).json({
      success: true,
      data: auditLogs,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
