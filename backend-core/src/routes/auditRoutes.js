const express = require('express');
const GradeAuditLog = require('../models/GradeAuditLog');
const { memoryStore } = require('../config/db');
const Assessment = require('../models/Assessment');
const { authenticateUser, authorizeRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateUser);

// Record human review / grade revision in audit log (Teachers & Admins)
router.post('/log', authorizeRole('TEACHER', 'ADMIN'), async (req, res, next) => {
  try {
    const {
      writtenSubmissionId,
      anonymousSubmissionId,
      action = 'GRADE_REVIEWED',
      performedBy,
      performedByRole,
      previousState,
      newState,
      reason,
      target,
    } = req.body;

    const actor = req.user ? req.user.name || req.user.email : performedBy;
    const actorRole = req.user ? req.user.role : (performedByRole || 'TEACHER');

    if (!action || !actor) {
      return res.status(400).json({
        success: false,
        error: { message: 'action and performedBy are required for grade audit logs' },
      });
    }

    const log = await GradeAuditLog.create({
      actor,
      role: actorRole,
      action,
      target: target || (writtenSubmissionId ? `submission:${writtenSubmissionId}` : 'grade:evaluation'),
      old_value: previousState || null,
      new_value: newState || null,
      reason: reason || (newState && newState.reason) || 'Grade adjusted by instructor review',
      written_submission_id: writtenSubmissionId || null,
      anonymous_submission_id: anonymousSubmissionId || null,
      performed_by: actor,
      performed_by_role: actorRole,
      previous_state: previousState || {},
      new_state: newState || {},
    });

    return res.status(201).json({
      success: true,
      message: 'Grade audit log recorded successfully',
      data: log,
    });
  } catch (error) {
    next(error);
  }
});

// Fetch audit logs: Admin receives all, Teachers receive filtered slice for their own classes/assessments, Students blocked (403)
router.get('/logs', authorizeRole('ADMIN', 'TEACHER'), async (req, res, next) => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    const { search, action, role } = req.query;

    if (userRole === 'ADMIN') {
      const logs = await GradeAuditLog.findAll({ search, action, role });
      return res.json({
        success: true,
        data: logs,
      });
    }

    // TEACHER: Filter to their own classrooms and assessments
    const teacherId = req.user?.id || 'teacher-001-uuid';
    const classrooms = Array.from(memoryStore.classrooms?.values() || []).filter(
      (c) => c.created_by === teacherId
    );
    const classIds = classrooms.map((c) => c.id);

    const assessments = await Assessment.findAll();
    const teacherAssessments = assessments.filter((a) => a.created_by === teacherId);
    const assessmentIds = teacherAssessments.map((a) => a.id);

    const logs = await GradeAuditLog.findForTeacher({
      teacherId,
      classIds,
      assessmentIds,
    });

    return res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
