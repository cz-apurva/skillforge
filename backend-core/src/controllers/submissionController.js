const SubmissionService = require('../services/submissionService');

class SubmissionController {
  /**
   * POST /submissions/written
   * Receives student written answer, persists real submission,
   * generates anonymous mapping, and responds with only anonymous_submission_id.
   */
  static async submitWritten(req, res, next) {
    try {
      const studentId = req.user ? req.user.id : (req.body.student_id || req.body.studentId);
      const submissionPayload = {
        ...req.body,
        student_id: studentId,
        studentId: studentId,
      };
      const result = await SubmissionService.submitWrittenAnswer(submissionPayload);
      return res.status(201).json({
        success: true,
        message: 'Written submission recorded and anonymized successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /submissions/my
   * Returns current authenticated student's submissions
   */
  static async getMySubmissions(req, res, next) {
    try {
      const submissions = await SubmissionService.getMySubmissions(req.user);
      return res.status(200).json({
        success: true,
        data: submissions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /submissions/:id
   * Returns submission with role and ownership verification
   */
  static async getSubmissionById(req, res, next) {
    try {
      const { id } = req.params;
      const submission = await SubmissionService.getSubmissionById(id, req.user);
      return res.status(200).json({
        success: true,
        data: submission,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /submissions/assessment/:assessmentId
   * Returns assessment submissions for teacher who created assessment or admin
   */
  static async getAssessmentSubmissions(req, res, next) {
    try {
      const { assessmentId } = req.params;
      const submissions = await SubmissionService.getSubmissionsByAssessment(assessmentId, req.user);
      return res.status(200).json({
        success: true,
        data: submissions,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SubmissionController;
