const express = require('express');
const multer = require('multer');
const TeacherService = require('../services/teacherService');
const { authenticateUser, authorizeRole } = require('../middleware/authMiddleware');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max file size
});

router.use(authenticateUser);
router.use(authorizeRole('TEACHER', 'ADMIN'));

/**
 * @route   GET /teacher/dashboard
 * @desc    Get dashboard metrics, classes, and Teacher Co-Pilot recommendation
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const data = await TeacherService.getDashboardData(req.user);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /teacher/classes
 * @desc    List all classes assigned to or created by teacher
 */
router.get('/classes', async (req, res, next) => {
  try {
    const classes = await TeacherService.getClasses(req.user);
    return res.status(200).json({
      success: true,
      data: classes,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /teacher/classes
 * @desc    Create a new classroom with auto-generated join code
 */
router.post('/classes', async (req, res, next) => {
  try {
    const newClass = await TeacherService.createClass(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: 'Classroom created successfully with unique join code',
      data: newClass,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /teacher/classes/:id
 * @desc    Get single classroom details, student roster, and feed
 */
router.get('/classes/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const classDetail = await TeacherService.getClassById(id, req.user);
    return res.status(200).json({
      success: true,
      data: classDetail,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /teacher/materials/analyze
 * @desc    Run real text extraction and Content Analyzer on uploaded PDF/PPTX/DOCX/TXT
 */
router.post('/materials/analyze', upload.single('file'), async (req, res, next) => {
  try {
    const payload = {
      ...req.body,
      buffer: req.file ? req.file.buffer : undefined,
      fileName: req.file ? req.file.originalname : (req.body.fileName || req.body.file_name),
      fileType: req.file ? req.file.originalname.split('.').pop() : (req.body.fileType || req.body.file_type),
    };

    const analysis = await TeacherService.analyzeMaterialContent(payload);
    return res.status(200).json({
      success: true,
      message: 'Content Analyzer successfully generated curriculum taxonomy',
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /teacher/materials
 * @desc    Publish reviewed learning material to classroom feed
 */
router.post('/materials', async (req, res, next) => {
  try {
    const published = await TeacherService.publishMaterial(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: 'Learning material published to class feed successfully',
      data: published,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /teacher/feed
 * @desc    Get class feed posts
 */
router.get('/feed', async (req, res, next) => {
  try {
    const { classroomId } = req.query;
    const posts = await TeacherService.getFeed(classroomId);
    return res.status(200).json({
      success: true,
      data: posts,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /teacher/feed
 * @desc    Create a new class feed post (Lesson/Announcement/Resource/Assignment)
 */
router.post('/feed', async (req, res, next) => {
  try {
    const post = await TeacherService.createFeedPost(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: 'Post published to classroom feed',
      data: post,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /teacher/assignments
 * @desc    List assignments
 */
router.get('/assignments', async (req, res, next) => {
  try {
    const assignments = await TeacherService.getAssignments(req.user);
    return res.status(200).json({
      success: true,
      data: assignments,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /teacher/assignments
 * @desc    Create Programming or Written Assignment
 */
router.post('/assignments', async (req, res, next) => {
  try {
    const assignment = await TeacherService.createAssignment(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: 'Assignment created and published successfully',
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /teacher/audit-logs
 * @desc    Get filtered audit logs relevant to teacher's classes and assessments
 */
router.get('/audit-logs', async (req, res, next) => {
  try {
    const GradeAuditLog = require('../models/GradeAuditLog');
    const { memoryStore } = require('../config/db');
    const Assessment = require('../models/Assessment');

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

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /teacher/resources/curate
 * @desc    Search and rank candidate educational resources with LLM Resource Curator
 */
router.post('/resources/curate', async (req, res, next) => {
  try {
    const result = await TeacherService.curateResources(req.body, req.user);
    return res.status(200).json({
      success: true,
      message: result.available
        ? `Successfully curated and ranked ${result.count || 0} candidate resources`
        : result.reason || 'Resource search unavailable',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /teacher/resources
 * @desc    Get curated resources for teacher review (filterable by classroom, status, topic)
 */
router.get('/resources', async (req, res, next) => {
  try {
    const { classroomId, status, topic } = req.query;
    const resources = await TeacherService.getCuratedResources(
      { classroomId, status, topic },
      req.user
    );
    return res.status(200).json({
      success: true,
      data: resources,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /teacher/resources/:id/status
 * @desc    Approve or reject a curated resource before students can view it
 */
router.patch('/resources/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await TeacherService.updateResourceStatus(id, status, req.user);
    return res.status(200).json({
      success: true,
      message: `Resource status updated to '${status}'`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /teacher/resources
 * @desc    Manually add an instructor-verified resource URL
 */
router.post('/resources', async (req, res, next) => {
  try {
    const created = await TeacherService.addTeacherResource(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: 'Teacher resource added and approved successfully',
      data: created,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /teacher/sandbox/generate
 * @desc    Generate problem, reference solution, and validate test cases via Judge0
 */
router.post('/sandbox/generate', async (req, res, next) => {
  try {
    const result = await TeacherService.generateSandboxAssignment(req.body, req.user);
    return res.status(200).json({
      success: true,
      message: `Sandbox problem generated and validated via Judge0 (${result.validation?.valid_count || 0}/${result.test_cases_count || 0} tests passed)`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /teacher/copilot/recommendations
 * @desc    Get all Co-Pilot recommendations with decision statuses
 */
router.get('/copilot/recommendations', async (req, res, next) => {
  try {
    const { classroomId, status } = req.query;
    const recommendations = await TeacherService.getCopilotRecommendations({ classroomId, status }, req.user);
    return res.status(200).json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /teacher/copilot/analyze
 * @desc    Trigger deterministic weak-topic detection + LLM recommendation synthesis
 */
router.post('/copilot/analyze', async (req, res, next) => {
  try {
    const result = await TeacherService.analyzeCohortDeficiencies(req.body, req.user);
    return res.status(200).json({
      success: true,
      message: 'Cohort deficiency analysis completed successfully from stored evaluation rows',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /teacher/copilot/recommendations/:id/decision
 * @desc    Record teacher Accept / Reject decision for a Co-Pilot recommendation
 */
router.patch('/copilot/recommendations/:id/decision', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, notes } = req.body;
    const updated = await TeacherService.recordCopilotDecision({ recommendationId: id, decision, notes }, req.user);
    return res.status(200).json({
      success: true,
      message: `Recommendation ${id} has been ${decision.toLowerCase()}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /teacher/interventions/overview
 * @desc    Get class concept health, priority concepts, misconception distribution, and recovery effectiveness
 */
router.get('/interventions/overview', async (req, res, next) => {
  try {
    const LearningIntelligenceService = require('../services/learningIntelligence.service');
    const { classroomId } = req.query;
    const data = await LearningIntelligenceService.getTeacherInterventionCenter(req.user, classroomId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /teacher/copilot/learning-query
 * @desc    Answer teacher queries on difficult concepts, student interventions, and recovery effectiveness using real DB numbers
 */
router.post('/copilot/learning-query', async (req, res, next) => {
  try {
    const CopilotService = require('../services/copilotService');
    const { query, classroomId } = req.body;
    const result = await CopilotService.answerLearningQuery({
      query,
      teacherUser: req.user,
      classroomId,
    });
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
