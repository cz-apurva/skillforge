const AssessmentService = require('../services/assessmentService');

class AssessmentController {
  /**
   * POST /assessments
   * Creates a new assessment
   */
  static async createAssessment(req, res, next) {
    try {
      const assessment = await AssessmentService.createAssessment(req.body, req.user);
      return res.status(201).json({
        success: true,
        message: 'Assessment created successfully',
        data: assessment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /assessments/:id/questions
   * Adds a question to the assessment
   */
  static async addQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const question = await AssessmentService.addQuestion(id, req.body, req.user);
      return res.status(201).json({
        success: true,
        message: 'Question added to assessment successfully',
        data: question,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /assessments/:id/rubric
   * Attaches a rubric with criteria to an assessment question
   */
  static async saveRubric(req, res, next) {
    try {
      const { id } = req.params;
      const rubric = await AssessmentService.saveRubric(id, req.body, req.user);
      return res.status(201).json({
        success: true,
        message: 'Rubric saved and attached to question successfully',
        data: rubric,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /assessments/:id/publish
   * Publishes the assessment after validating completeness
   */
  static async publishAssessment(req, res, next) {
    try {
      const { id } = req.params;
      const publishedAssessment = await AssessmentService.publishAssessment(id, req.user);
      return res.status(200).json({
        success: true,
        message: 'Assessment published successfully',
        data: publishedAssessment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /assessments
   * Returns list of assessments (filtered by teacher ownership or all for admin)
   */
  static async getAssessments(req, res, next) {
    try {
      const assessments = await AssessmentService.getAssessments(req.user);
      return res.status(200).json({
        success: true,
        data: assessments,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /assessments/:id
   * Returns specific assessment with questions and rubrics (verifies ownership)
   */
  static async getAssessmentById(req, res, next) {
    try {
      const { id } = req.params;
      const assessment = await AssessmentService.getAssessmentById(id, req.user);
      return res.status(200).json({
        success: true,
        data: assessment,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AssessmentController;
