const WrittenSubmission = require('../models/WrittenSubmission');
const Assessment = require('../models/Assessment');
const AssessmentQuestion = require('../models/AssessmentQuestion');
const Rubric = require('../models/Rubric');
const AnonymizerService = require('./anonymizer.service');
const FairgradeClientService = require('./fairgradeClient.service');
const { memoryStore } = require('../config/db');

class SubmissionService {
  /**
   * Submit a written subjective answer:
   * 1. Inserts into written_submission with student_id
   * 2. Runs anonymization pipeline via AnonymizerService
   * 3. Triggers FairGrade automated evaluation via FairgradeClientService
   * 4. Updates submission status and returns only anonymous_submission_id
   */
  static async submitWrittenAnswer({
    assessment_id,
    assessmentId,
    question_id,
    questionId,
    student_id,
    studentId,
    submission_text,
    submissionText,
    auto_grade = true,
    autoGrade = true,
    multi_pass = false,
    multiPass = false,
  }) {
    const finalAssessmentId = assessment_id || assessmentId;
    const finalQuestionId = question_id || questionId;
    const finalStudentId = student_id || studentId;
    const finalSubmissionText = submission_text || submissionText;
    const shouldAutoGrade = auto_grade !== false && autoGrade !== false;
    const useMultiPass = multi_pass || multiPass;

    if (!finalAssessmentId) {
      const error = new Error('assessment_id is required');
      error.statusCode = 400;
      throw error;
    }

    if (!finalQuestionId) {
      const error = new Error('question_id is required');
      error.statusCode = 400;
      throw error;
    }

    if (!finalStudentId) {
      const error = new Error('student_id is required');
      error.statusCode = 400;
      throw error;
    }

    if (!finalSubmissionText || typeof finalSubmissionText !== 'string' || finalSubmissionText.trim() === '') {
      const error = new Error('submission_text is required');
      error.statusCode = 400;
      throw error;
    }

    const assessment = await Assessment.findById(finalAssessmentId);
    if (!assessment) {
      const error = new Error(`Assessment not found with ID: ${finalAssessmentId}`);
      error.statusCode = 404;
      throw error;
    }

    const question = await AssessmentQuestion.findById(finalQuestionId);
    if (!question) {
      const error = new Error(`Question not found with ID: ${finalQuestionId}`);
      error.statusCode = 404;
      throw error;
    }

    // 1. Insert into written_submission (retains student_id securely in backend-core)
    const writtenSubmission = await WrittenSubmission.create({
      assessment_id: finalAssessmentId,
      question_id: finalQuestionId,
      student_id: finalStudentId,
      submission_text: finalSubmissionText,
      status: 'submitted',
    });

    // 2. Fetch associated rubric if available
    const rubric = await Rubric.findByQuestionId(finalQuestionId);

    // 3. Run anonymizer pipeline
    const anonymousRecord = await AnonymizerService.anonymizeSubmission({
      writtenSubmissionId: writtenSubmission.id,
      studentId: finalStudentId,
      assessmentId: finalAssessmentId,
      questionId: finalQuestionId,
      submissionText: finalSubmissionText,
      rubricId: rubric ? rubric.id : null,
    });

    try {
      const GradeAuditLog = require('../models/GradeAuditLog');
      await GradeAuditLog.create({
        actor: finalStudentId,
        role: 'STUDENT',
        action: 'SUBMISSION_CREATED',
        target: `submission:${writtenSubmission.id}`,
        old_value: null,
        new_value: { submission_id: writtenSubmission.id, assessment_id: finalAssessmentId, question_id: finalQuestionId },
        reason: 'Student submitted written answer for evaluation',
        written_submission_id: writtenSubmission.id,
        anonymous_submission_id: anonymousRecord.id,
        assessment_id: finalAssessmentId,
      });
    } catch {}

    // Notification Trigger: Teacher notified on new submission
    try {
      const NotificationService = require('./notificationService');
      await NotificationService.notifyTeacherOnNewSubmission({
        submission: writtenSubmission,
        assessment,
        student: { id: finalStudentId },
      });
    } catch (notifErr) {
      console.warn('[SubmissionService] Warning dispatching submission notification:', notifErr.message);
    }

    let gradeSummary = null;

    // 4. Trigger automated evaluation if requested
    if (shouldAutoGrade) {
      try {
        const evaluationResult = await FairgradeClientService.evaluateSubmission({
          anonymousSubmission: anonymousRecord,
          question,
          rubric,
          studentId: finalStudentId,
          writtenSubmissionId: writtenSubmission.id,
          multiPass: useMultiPass,
        });

        const newStatus = evaluationResult.requires_human_review ? 'flagged_for_review' : 'graded';
        writtenSubmission.status = newStatus;
        anonymousRecord.status = newStatus;

        gradeSummary = {
          total_score: evaluationResult.report.total_score,
          max_score: evaluationResult.report.max_possible_score,
          requires_human_review: evaluationResult.requires_human_review,
        };

        try {
          const GradeAuditLog = require('../models/GradeAuditLog');
          await GradeAuditLog.create({
            actor: 'fairgrade-service',
            role: 'SYSTEM',
            action: 'GRADE_GENERATED',
            target: `anon-submission:${anonymousRecord.id}`,
            old_value: { status: 'submitted' },
            new_value: {
              status: newStatus,
              score: gradeSummary.total_score,
              max_score: gradeSummary.max_score,
              requires_human_review: evaluationResult.requires_human_review,
            },
            reason: `Automated zero-identity multi-pass rubric evaluation completed (Status: ${newStatus})`,
            written_submission_id: writtenSubmission.id,
            anonymous_submission_id: anonymousRecord.id,
            assessment_id: finalAssessmentId,
          });
        } catch {}

        // Notification Triggers:
        try {
          const NotificationService = require('./notificationService');
          if (evaluationResult.requires_human_review) {
            // Teacher: FairGrade review required
            await NotificationService.notifyTeacherOnReviewRequired({
              submission: writtenSubmission,
              report: evaluationResult.report,
              assessment,
            });
          } else {
            // Student: Grade published & feedback available
            await NotificationService.notifyStudentOnGradePublished({
              submission: writtenSubmission,
              assessment,
              score: gradeSummary.total_score,
              maxScore: gradeSummary.max_score,
            });
            await NotificationService.notifyStudentOnFeedbackAvailable({
              submission: writtenSubmission,
              assessment,
              report: evaluationResult.report,
            });
          }
        } catch (notifErr) {
          console.warn('[SubmissionService] Warning dispatching evaluation notification:', notifErr.message);
        }

        // Emit Learning Evidence into Learning Intelligence Layer
        try {
          const LearningIntelligenceService = require('./learningIntelligence.service');
          const conceptTag = question.concept_id || question.concept_name || question.question_text?.slice(0, 50) || assessment.title;
          await LearningIntelligenceService.recordLearningEvidence({
            studentId: finalStudentId,
            classroomId: assessment.course_id || 'cls-mca-402',
            conceptName: conceptTag,
            topic: assessment.title || 'Database Systems & Engineering',
            source: 'FAIRGRADE_EVALUATION',
            referenceId: writtenSubmission.id,
            scoreAchieved: gradeSummary.total_score,
            maxScore: gradeSummary.max_score,
            confidenceScore: evaluationResult.report?.confidence_score || 0.95,
            evidencePayload: {
              question_id: finalQuestionId,
              strengths: evaluationResult.report?.strengths || [],
              areas_for_improvement: evaluationResult.report?.areas_for_improvement || [],
              missing_concepts: evaluationResult.report?.missing_concepts || [],
              feedback: evaluationResult.report?.overall_feedback,
            },
          });
        } catch (evidenceErr) {
          console.warn('[SubmissionService] Warning recording learning evidence:', evidenceErr.message);
        }
      } catch (gradeErr) {
        console.error('[SubmissionService] Auto-grading error:', gradeErr);
      }
    }

    // 5. Return sanitized response containing ONLY anonymous_submission_id
    return {
      anonymous_submission_id: anonymousRecord.id,
      status: anonymousRecord.status,
      submitted_at: writtenSubmission.submitted_at,
      grade_summary: gradeSummary,
    };
  }

  /**
   * Get student's own submissions.
   * Enforces that student only sees their own submissions.
   */
  static async getMySubmissions(user) {
    if (!user || !user.id) {
      const error = new Error('Authentication required');
      error.statusCode = 401;
      throw error;
    }
    const submissions = await WrittenSubmission.findByStudentId(user.id);
    return submissions;
  }

  /**
   * Get single submission by ID with strict ownership validation:
   * - STUDENT: can only read their OWN submission (submission.student_id === user.id)
   * - TEACHER: can only read submissions for assessments they own (assessment.created_by === user.id)
   * - ADMIN: can read any submission
   */
  static async getSubmissionById(submissionId, user) {
    const submission = await WrittenSubmission.findById(submissionId);
    if (!submission) {
      const error = new Error(`Submission not found with ID: ${submissionId}`);
      error.statusCode = 404;
      throw error;
    }

    if (!user) {
      const error = new Error('Authentication required');
      error.statusCode = 401;
      throw error;
    }

    const role = (user.role || 'STUDENT').toUpperCase();

    if (role === 'STUDENT') {
      if (submission.student_id !== user.id) {
        const error = new Error('Access denied: You can only view your own submissions');
        error.statusCode = 403;
        throw error;
      }
    } else if (role === 'TEACHER') {
      const assessment = await Assessment.findById(submission.assessment_id);
      if (assessment && assessment.created_by !== user.id) {
        const error = new Error('Access denied: You can only view submissions for your own assessments');
        error.statusCode = 403;
        throw error;
      }
    }

    return submission;
  }

  /**
   * Get all submissions for an assessment (Teacher owns assessment or Admin).
   */
  static async getSubmissionsByAssessment(assessmentId, user) {
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      const error = new Error(`Assessment not found with ID: ${assessmentId}`);
      error.statusCode = 404;
      throw error;
    }

    if (!user) {
      const error = new Error('Authentication required');
      error.statusCode = 401;
      throw error;
    }

    const role = (user.role || 'STUDENT').toUpperCase();
    if (role === 'STUDENT') {
      const error = new Error('Access denied: Students cannot list all cohort submissions');
      error.statusCode = 403;
      throw error;
    }

    if (role === 'TEACHER' && assessment.created_by !== user.id) {
      const error = new Error('Access denied: You can only view submissions for your own assessments');
      error.statusCode = 403;
      throw error;
    }

    return await WrittenSubmission.findByAssessmentId(assessmentId);
  }
}

module.exports = SubmissionService;
