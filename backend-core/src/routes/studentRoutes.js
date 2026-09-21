const express = require('express');
const StudentService = require('../services/studentService');
const { authenticateUser, authorizeRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateUser);
router.use(authorizeRole('STUDENT', 'TEACHER', 'ADMIN'));

/**
 * @route   GET /student/dashboard
 * @desc    Get student dashboard metrics, upcoming assessments, mastery %
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const data = await StudentService.getDashboardData(req.user);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /student/classes
 * @desc    Get enrolled classes
 */
router.get('/classes', async (req, res, next) => {
  try {
    const classes = await StudentService.getClasses(req.user);
    return res.status(200).json({
      success: true,
      data: classes,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /student/classes/join
 * @desc    Join a class with join code (e.g. SF-MCA-401A)
 */
router.post('/classes/join', async (req, res, next) => {
  try {
    const { join_code } = req.body;
    const result = await StudentService.joinClassByCode(join_code, req.user);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /student/classes/:id
 * @desc    Get single classroom details, posts, materials, assignments
 */
router.get('/classes/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const classDetail = await StudentService.getClassById(id, req.user);
    return res.status(200).json({
      success: true,
      data: classDetail,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /student/materials
 * @desc    Get teacher uploaded materials and approved AI curated resources
 */
router.get('/materials', async (req, res, next) => {
  try {
    const data = await StudentService.getMaterialsAndResources(req.user);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /student/resources
 * @desc    Get strictly approved curated educational resources
 */
router.get('/resources', async (req, res, next) => {
  try {
    const data = await StudentService.getCuratedResources(req.user);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /student/tutor/chat
 * @desc    Socratic Tutor chat + RAG grounding in teacher material
 */
router.post('/tutor/chat', async (req, res, next) => {
  try {
    const result = await StudentService.handleTutorChat(req.body, req.user);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /student/sandbox/run
 * @desc    Run code in sandbox against sample test cases (Judge0)
 */
router.post('/sandbox/run', async (req, res, next) => {
  try {
    const result = await StudentService.runSandboxCode(req.body);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /student/sandbox/submit
 * @desc    Submit code in sandbox against hidden validation benchmarks (Judge0)
 */
router.post('/sandbox/submit', async (req, res, next) => {
  try {
    const result = await StudentService.submitSandboxCode(req.body, req.user);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /student/learning/overview
 * @desc    Get student's concept mastery breakdown, constructive status labels, recovery plans, and results
 */
router.get('/learning/overview', async (req, res, next) => {
  try {
    const LearningIntelligenceService = require('../services/learningIntelligence.service');
    const data = await LearningIntelligenceService.getStudentLearningOverview(req.user);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /student/learning/interventions/:stepId/complete
 * @desc    Mark an intervention step completed and advance recovery progression
 */
router.post('/learning/interventions/:stepId/complete', async (req, res, next) => {
  try {
    const LearningIntelligenceService = require('../services/learningIntelligence.service');
    const { stepId } = req.params;
    const data = await LearningIntelligenceService.completeInterventionStep(stepId, req.user);
    return res.status(200).json({
      success: true,
      message: 'Intervention step marked completed',
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /student/learning/reassess
 * @desc    Record student reassessment completion and compute before/after mastery recovery delta
 */
router.post('/learning/reassess', async (req, res, next) => {
  try {
    const LearningIntelligenceService = require('../services/learningIntelligence.service');
    const data = await LearningIntelligenceService.recordReassessmentCompletion({
      ...req.body,
      studentId: req.user.id,
    });
    return res.status(200).json({
      success: true,
      message: `Reassessment completed (${data.status}) with ${data.improvement_delta > 0 ? '+' : ''}${data.improvement_delta}% delta`,
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /student/learning/resources
 * @desc    Get curated resources ranked specifically by student's diagnosed concept gap
 */
router.get('/learning/resources', async (req, res, next) => {
  try {
    const ResourceCuratorService = require('../services/resourceCurator.service');
    const { concept, topic } = req.query;
    const data = await ResourceCuratorService.getResourcesForIntervention({
      conceptName: concept,
      topic,
      user: req.user,
    });
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
