const express = require('express');
const AnalyticsService = require('../services/analyticsService');
const CopilotService = require('../services/copilotService');
const { authenticateUser, authorizeRole } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @route   GET /analytics/teacher
 * @desc    Teacher Analytics: class performance, topic mastery, assignment difficulty,
 *          submission trends, hint usage, confidence distribution, human-review rate, appeal rate, delta
 */
router.get('/teacher', authenticateUser, authorizeRole('TEACHER', 'ADMIN'), async (req, res, next) => {
  try {
    const { assessmentId } = req.query;
    const data = await AnalyticsService.getTeacherAnalytics(req.user, assessmentId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /analytics/student
 * @desc    Student Analytics: my progress, my mastery per topic, weak/strong topics,
 *          my completion rate, my grade history (strictly own data only)
 */
router.get('/student', authenticateUser, authorizeRole('STUDENT', 'TEACHER', 'ADMIN'), async (req, res, next) => {
  try {
    const data = await AnalyticsService.getStudentAnalytics(req.user);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /analytics/admin
 * @desc    Admin Analytics: Platform-level institutional metrics only (no student academic drill-down)
 */
router.get('/admin', authenticateUser, authorizeRole('ADMIN'), async (req, res, next) => {
  try {
    const data = await AnalyticsService.getAdminAnalytics();
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// Legacy FairGrade Analytics endpoint
router.get('/fairgrade', authenticateUser, authorizeRole('TEACHER', 'ADMIN'), async (req, res, next) => {
  try {
    const { assessmentId } = req.query;
    const data = await AnalyticsService.getFairgradeAnalytics(assessmentId);
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// GET /copilot/recommendations
router.get('/copilot/recommendations', authenticateUser, authorizeRole('TEACHER', 'ADMIN'), async (req, res, next) => {
  try {
    const { assessmentId } = req.query;
    const data = await CopilotService.getTeacherRecommendations(assessmentId);
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// GET /analytics/concepts/mastery
router.get('/concepts/mastery', authenticateUser, authorizeRole('TEACHER', 'ADMIN', 'STUDENT'), async (req, res, next) => {
  try {
    const LearningIntelligenceService = require('../services/learningIntelligence.service');
    const { classroomId, studentId } = req.query;
    const targetStudentId = req.user.role === 'STUDENT' ? req.user.id : (studentId || req.user.id);
    const masteryList = await require('../models/ConceptMastery').findByStudent(targetStudentId, classroomId);
    return res.json({
      success: true,
      data: masteryList,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
