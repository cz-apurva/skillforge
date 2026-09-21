const express = require('express');
const AssessmentController = require('../controllers/assessmentController');
const { authenticateUser, authorizeRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Enforce authentication & teacher/admin RBAC role authorization on all assessment modification routes
router.use(authenticateUser);
router.use(authorizeRole('TEACHER', 'ADMIN'));

/**
 * @route   GET /assessments
 * @desc    Get all assessments (Teacher only sees own; Admin sees all)
 */
router.get('/', AssessmentController.getAssessments);

/**
 * @route   GET /assessments/:id
 * @desc    Get assessment by ID with questions and rubrics (verifies ownership)
 */
router.get('/:id', AssessmentController.getAssessmentById);

/**
 * @route   POST /assessments
 * @desc    Create a new assessment
 */
router.post('/', AssessmentController.createAssessment);

/**
 * @route   POST /assessments/:id/questions
 * @desc    Add a question to an assessment
 */
router.post('/:id/questions', AssessmentController.addQuestion);

/**
 * @route   POST /assessments/:id/rubric
 * @desc    Attach a rubric with criteria to an assessment question
 */
router.post('/:id/rubric', AssessmentController.saveRubric);

/**
 * @route   POST /assessments/:id/publish
 * @desc    Publish an assessment
 */
router.post('/:id/publish', AssessmentController.publishAssessment);

module.exports = router;
