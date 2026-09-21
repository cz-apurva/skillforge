const GradeAppeal = require('../models/GradeAppeal');
const WrittenSubmission = require('../models/WrittenSubmission');
const AssessmentQuestion = require('../models/AssessmentQuestion');
const Rubric = require('../models/Rubric');
const FairGradeReport = require('../models/FairGradeReport');
const GradeAuditLog = require('../models/GradeAuditLog');
const StudentIdentityMap = require('../models/StudentIdentityMap');
const AnonymizerService = require('./anonymizer.service');
const FairgradeClientService = require('./fairgradeClient.service');

class AppealService {
  /**
   * Submit a student grade appeal
   */
  static async createAppeal({ writtenSubmissionId, studentId, appealReason }) {
    if (!writtenSubmissionId || !studentId || !appealReason || appealReason.trim() === '') {
      const error = new Error('writtenSubmissionId, studentId, and appealReason are required');
      error.statusCode = 400;
      throw error;
    }

    const writtenSub = await WrittenSubmission.findById(writtenSubmissionId);
    if (!writtenSub) {
      const error = new Error(`Written submission not found: ${writtenSubmissionId}`);
      error.statusCode = 404;
      throw error;
    }

    if (writtenSub.student_id !== studentId) {
      const error = new Error('Access denied: Cannot appeal another student submission');
      error.statusCode = 403;
      throw error;
    }

    // Find linked report
    let originalReport = null;
    for (const rep of (await require('../config/db').memoryStore.fairgrade_reports?.values() || [])) {
      originalReport = rep;
      break;
    }

    const appeal = await GradeAppeal.create({
      written_submission_id: writtenSubmissionId,
      student_id: studentId,
      report_id: originalReport?.id || null,
      appeal_reason: appealReason.trim(),
      status: 'open',
    });

    // Write to audit log
    await GradeAuditLog.create({
      actor: studentId,
      role: 'STUDENT',
      action: 'GRADE_APPEALED',
      target: `submission:${writtenSubmissionId}`,
      old_value: { status: writtenSub.status },
      new_value: { appeal_id: appeal.id, appeal_reason: appealReason.trim(), status: 'appealed' },
      reason: `Student filed grade appeal requesting blind rubric re-evaluation: "${appealReason.trim()}"`,
      written_submission_id: writtenSubmissionId,
      performed_by: studentId,
      performed_by_role: 'STUDENT',
      previous_state: { status: writtenSub.status },
      new_state: { appeal_id: appeal.id, appeal_reason: appealReason.trim(), status: 'appealed' },
    });

    await GradeAuditLog.create({
      written_submission_id: writtenSubmissionId,
      action: 'STUDENT_APPEAL_FILED',
      performed_by: studentId,
      performed_by_role: 'STUDENT',
      previous_state: { status: writtenSub.status },
      new_state: { appeal_id: appeal.id, appeal_reason: appealReason.trim(), status: 'appealed' },
    });

    // Notification Trigger: Teacher notified on new grade appeal
    try {
      const NotificationService = require('./notificationService');
      await NotificationService.notifyTeacherOnAppeal({
        appeal,
        submission: writtenSub,
        student: { id: studentId },
      });
    } catch (notifErr) {
      console.warn('[AppealService] Warning dispatching appeal notification:', notifErr.message);
    }

    return appeal;
  }

  /**
   * Re-evaluate a submission blind and compare against original score.
   * Auto-escalates to human teacher review if difference exceeds threshold.
   */
  static async reEvaluateAppeal(appealId, { reevaluationThreshold = 0.10 } = {}) {
    const appeal = await GradeAppeal.findById(appealId);
    if (!appeal) {
      const error = new Error(`Grade appeal not found: ${appealId}`);
      error.statusCode = 404;
      throw error;
    }

    const writtenSub = await WrittenSubmission.findById(appeal.written_submission_id);
    if (!writtenSub) {
      const error = new Error('Associated written submission not found');
      error.statusCode = 404;
      throw error;
    }

    const question = await AssessmentQuestion.findById(writtenSub.question_id);
    const rubric = await Rubric.findByQuestionId(writtenSub.question_id);

    // 1. Generate a brand new, clean blind anonymous submission for fair re-grading
    const blindAnonSubmission = await AnonymizerService.anonymizeSubmission({
      writtenSubmissionId: writtenSub.id,
      studentId: writtenSub.student_id,
      assessmentId: writtenSub.assessment_id,
      questionId: writtenSub.question_id,
      submissionText: writtenSub.submission_text,
      rubricId: rubric?.id || null,
    });

    // 2. Run blind evaluation via FairGrade client (using multi_pass=true for increased rigor)
    const reevaluationResult = await FairgradeClientService.evaluateSubmission({
      anonymousSubmission: blindAnonSubmission,
      question,
      rubric,
      studentId: writtenSub.student_id,
      writtenSubmissionId: writtenSub.id,
      multiPass: true,
    });

    const newScore = reevaluationResult.report.total_score;
    const maxMarks = Number(question.max_score);

    // Find original score
    let originalScore = 0.0;
    for (const r of (require('../config/db').memoryStore.fairgrade_reports?.values() || [])) {
      if (r.id !== reevaluationResult.report.id) {
        originalScore = r.total_score;
        break;
      }
    }
    if (originalScore === 0.0) originalScore = Number(newScore);

    const scoreDifference = Number(Math.abs(newScore - originalScore).toFixed(2));
    const allowedVariance = Number((maxMarks * reevaluationThreshold).toFixed(2));
    const isEscalated = scoreDifference > allowedVariance;

    let updatedAppeal;
    if (isEscalated) {
      // Escalates to teacher review
      updatedAppeal = await GradeAppeal.updateStatusAndScore(appealId, {
        status: 'under_review',
        revised_score: null,
        reviewer_comments: `Score variance (${scoreDifference} marks) exceeded allowed threshold (${allowedVariance} marks). Escalated to instructor arbitration.`,
      });

      await GradeAuditLog.create({
        actor: 'fairgrade-service',
        role: 'SYSTEM',
        action: 'GRADE_REVIEWED',
        target: `anon-submission:${blindAnonSubmission.id}`,
        old_value: { original_score: originalScore, status: 'open' },
        new_value: {
          reevaluated_score: newScore,
          score_difference: scoreDifference,
          status: 'under_review',
        },
        reason: `Score delta (${scoreDifference}) > allowed threshold (${allowedVariance}). Escalated to instructor arbitration.`,
        written_submission_id: writtenSub.id,
        anonymous_submission_id: blindAnonSubmission.id,
        assessment_id: writtenSub.assessment_id,
        performed_by: 'fairgrade-service',
        performed_by_role: 'SYSTEM_FAIRGRADE',
        previous_state: { original_score: originalScore },
        new_state: {
          reevaluated_score: newScore,
          score_difference: scoreDifference,
          status: 'under_review',
          reason: `Score delta (${scoreDifference}) > allowed threshold (${allowedVariance}). Escalated to instructor.`,
        },
      });

      await GradeAuditLog.create({
        written_submission_id: writtenSub.id,
        anonymous_submission_id: blindAnonSubmission.id,
        action: 'APPEAL_REEVALUATION_ESCALATED',
        performed_by: 'fairgrade-service',
        performed_by_role: 'SYSTEM_FAIRGRADE',
        previous_state: { original_score: originalScore },
        new_state: {
          reevaluated_score: newScore,
          score_difference: scoreDifference,
          status: 'under_review',
          reason: `Score delta (${scoreDifference}) > allowed threshold (${allowedVariance}). Escalated to instructor.`,
        },
      });
    } else {
      // Score is confirmed consistent
      updatedAppeal = await GradeAppeal.updateStatusAndScore(appealId, {
        status: 'confirmed',
        revised_score: newScore,
        reviewer_comments: `Blind re-evaluation confirmed score consistency within tolerance (Delta: ${scoreDifference} <= ${allowedVariance}).`,
      });

      await GradeAuditLog.create({
        actor: 'fairgrade-service',
        role: 'SYSTEM',
        action: 'GRADE_REVIEWED',
        target: `anon-submission:${blindAnonSubmission.id}`,
        old_value: { original_score: originalScore, status: 'open' },
        new_value: {
          reevaluated_score: newScore,
          score_difference: scoreDifference,
          status: 'confirmed',
        },
        reason: `Blind re-evaluation verified consistent rubric score within allowable variance (Delta: ${scoreDifference} <= ${allowedVariance}).`,
        written_submission_id: writtenSub.id,
        anonymous_submission_id: blindAnonSubmission.id,
        assessment_id: writtenSub.assessment_id,
        performed_by: 'fairgrade-service',
        performed_by_role: 'SYSTEM_FAIRGRADE',
        previous_state: { original_score: originalScore },
        new_state: {
          reevaluated_score: newScore,
          score_difference: scoreDifference,
          status: 'confirmed',
          reason: `Re-evaluation verified consistent rubric score within allowable variance.`,
        },
      });

      await GradeAuditLog.create({
        written_submission_id: writtenSub.id,
        anonymous_submission_id: blindAnonSubmission.id,
        action: 'APPEAL_REEVALUATION_CONFIRMED',
        performed_by: 'fairgrade-service',
        performed_by_role: 'SYSTEM_FAIRGRADE',
        previous_state: { original_score: originalScore },
        new_state: {
          reevaluated_score: newScore,
          score_difference: scoreDifference,
          status: 'confirmed',
          reason: `Re-evaluation verified consistent rubric score within allowable variance.`,
        },
      });

      if (scoreDifference > 0) {
        await GradeAuditLog.create({
          actor: 'fairgrade-service',
          role: 'SYSTEM',
          action: 'GRADE_MODIFIED',
          target: `submission:${writtenSub.id}`,
          old_value: { score: originalScore },
          new_value: { score: newScore, difference: scoreDifference },
          reason: `Grade revised following blind re-evaluation verification (Delta: ${scoreDifference} marks)`,
          written_submission_id: writtenSub.id,
          anonymous_submission_id: blindAnonSubmission.id,
          assessment_id: writtenSub.assessment_id,
        });
      }
    }

    // Notification Trigger: Student notified on appeal re-evaluation result
    try {
      const NotificationService = require('./notificationService');
      await NotificationService.notifyStudentOnAppealResolved({
        appeal: updatedAppeal,
        submission: writtenSub,
        revisedScore: newScore,
        decision: updatedAppeal.status,
      });
    } catch (notifErr) {
      console.warn('[AppealService] Warning dispatching appeal resolved notification:', notifErr.message);
    }

    return {
      appeal: updatedAppeal,
      original_score: originalScore,
      reevaluated_score: newScore,
      score_difference: scoreDifference,
      allowed_variance: allowedVariance,
      escalated_to_teacher: isEscalated,
      reevaluation_report: reevaluationResult.report,
    };
  }

  /**
   * Fetch audit history strictly for student's own appeal
   */
  static async getAppealAuditHistory(appealId, studentId) {
    const appeal = await GradeAppeal.findById(appealId);
    if (!appeal) {
      const error = new Error(`Appeal not found: ${appealId}`);
      error.statusCode = 404;
      throw error;
    }

    if (studentId && appeal.student_id !== studentId) {
      const error = new Error('Access denied: You may only view audit history for your own appeal');
      error.statusCode = 403;
      throw error;
    }

    const logs = await GradeAuditLog.findAll();
    const appealLogs = logs.filter(
      (l) => l.written_submission_id === appeal.written_submission_id
    );

    return appealLogs;
  }
}

module.exports = AppealService;
