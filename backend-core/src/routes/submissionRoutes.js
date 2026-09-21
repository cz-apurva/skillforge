const express = require('express');
const SubmissionController = require('../controllers/submissionController');
const { authenticateUser, authorizeRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateUser);

/**
 * @route   GET /submissions/my
 * @desc    Get student's own submissions
 */
router.get(
  '/my',
  authorizeRole('STUDENT', 'TEACHER', 'ADMIN'),
  SubmissionController.getMySubmissions
);

/**
 * @route   GET /submissions/assessment/:assessmentId
 * @desc    Get all submissions for an assessment (Teacher / Admin)
 */
router.get(
  '/assessment/:assessmentId',
  authorizeRole('TEACHER', 'ADMIN'),
  SubmissionController.getAssessmentSubmissions
);

/**
 * @route   GET /submissions/:id
 * @desc    Get submission by ID with ownership verification
 */
router.get(
  '/:id',
  authorizeRole('STUDENT', 'TEACHER', 'ADMIN'),
  SubmissionController.getSubmissionById
);

/**
 * @route   POST /submissions/written
 * @desc    Submit student written answer (records real submission, returns anonymous ID)
 */
router.post(
  '/written',
  authorizeRole('STUDENT', 'TEACHER', 'ADMIN'),
  SubmissionController.submitWritten
);

module.exports = router;
