const Notification = require('../models/Notification');

class NotificationService {
  /**
   * 1. TEACHER: New Submission Received
   */
  static async notifyTeacherOnNewSubmission({ submission, assessment = {}, student = {} }) {
    const submissionId = submission?.id || 'sub-unknown';
    const assessmentTitle = assessment?.title || submission?.assessment_title || 'Coursework Assignment';
    const assessmentId = assessment?.id || submission?.assessment_id || 'asm-unknown';
    const studentIdentifier = student?.name || submission?.student_id || 'Student';

    return await Notification.create({
      recipient_id: assessment?.teacher_id || null,
      recipient_role: 'TEACHER',
      type: 'NEW_SUBMISSION',
      title: '📥 New Submission Received',
      message: `New submission received for '${assessmentTitle}' (Submission #${submissionId}) from ${studentIdentifier}.`,
      record_type: 'submission',
      record_id: submissionId,
      metadata: {
        submission_id: submissionId,
        assessment_id: assessmentId,
        assessment_title: assessmentTitle,
        student_id: submission?.student_id,
        submitted_at: submission?.submitted_at || new Date().toISOString(),
      },
      priority: 'MEDIUM',
    });
  }

  /**
   * 2. TEACHER: FairGrade Review Required (low confidence / flagged)
   */
  static async notifyTeacherOnReviewRequired({ submission, report = {}, assessment = {} }) {
    const submissionId = submission?.id || report?.submission_id || 'sub-unknown';
    const assessmentTitle = assessment?.title || 'Subjective Evaluation';
    const confidencePct = report?.confidence_score ? `${Math.round(report.confidence_score * 100)}%` : 'Low';
    const reason = report?.flag_reason || report?.overall_feedback || 'Confidence threshold below automated approval boundary';

    return await Notification.create({
      recipient_id: assessment?.teacher_id || null,
      recipient_role: 'TEACHER',
      type: 'FAIRGRADE_REVIEW_REQUIRED',
      title: '⚠️ FairGrade Human Review Required',
      message: `Submission #${submissionId} for '${assessmentTitle}' flagged for instructor oversight (Confidence: ${confidencePct}): ${reason}`,
      record_type: 'submission',
      record_id: submissionId,
      metadata: {
        submission_id: submissionId,
        assessment_id: assessment?.id || submission?.assessment_id,
        confidence_score: report?.confidence_score,
        flag_reason: reason,
        total_score: report?.total_score || report?.total_marks,
      },
      priority: 'HIGH',
    });
  }

  /**
   * 3. TEACHER: Grade Appeal Filed
   */
  static async notifyTeacherOnAppeal({ appeal, submission = {}, student = {} }) {
    const appealId = appeal?.id || 'appeal-unknown';
    const submissionId = appeal?.submission_id || submission?.id || 'sub-unknown';
    const studentName = student?.name || appeal?.student_id || 'A student';
    const reasonText = appeal?.student_reason ? `"${appeal.student_reason.slice(0, 100)}..."` : 'Requested rubric re-evaluation';

    return await Notification.create({
      recipient_id: submission?.teacher_id || null,
      recipient_role: 'TEACHER',
      type: 'GRADE_APPEAL_FILED',
      title: '⚖️ Grade Appeal Filed',
      message: `${studentName} filed Appeal #${appealId} on Submission #${submissionId}: ${reasonText}`,
      record_type: 'appeal',
      record_id: appealId,
      metadata: {
        appeal_id: appealId,
        submission_id: submissionId,
        student_id: appeal?.student_id,
        student_reason: appeal?.student_reason,
        filed_at: appeal?.created_at || new Date().toISOString(),
      },
      priority: 'HIGH',
    });
  }

  /**
   * 4. TEACHER: Teacher Co-Pilot Weak Topic Detected
   */
  static async notifyTeacherOnWeakTopic({ recommendation = {}, primaryWeakness = {}, teacher_id = null }) {
    const topic = primaryWeakness?.topic || recommendation?.topic || 'Relational Schema Normalization';
    const deficiency = primaryWeakness?.deficiency_percentage || recommendation?.deficiency_percentage || '71.4%';
    const count = primaryWeakness?.struggling_count || recommendation?.student_deficiency_count || 5;
    const recId = recommendation?.id || 'rec-copilot-1';

    return await Notification.create({
      recipient_id: teacher_id,
      recipient_role: 'TEACHER',
      type: 'WEAK_TOPIC_DETECTED',
      title: '🎯 Co-Pilot Weak Topic Alert',
      message: `Co-Pilot detected ${deficiency} of evaluated students (${count} students) struggling on '${topic}' (Intervention #${recId}).`,
      record_type: 'copilot_recommendation',
      record_id: recId,
      metadata: {
        recommendation_id: recId,
        topic,
        deficiency_percentage: deficiency,
        struggling_count: count,
        suggested_action: recommendation?.suggested_action,
        action_type: recommendation?.action_type || 'REVISE_TOPIC',
      },
      priority: 'HIGH',
    });
  }

  /**
   * 5. STUDENT: New Assignment Published
   */
  static async notifyStudentOnNewAssignment({ assignment, student_id = null }) {
    const asmId = assignment?.id || 'asm-unknown';
    const title = assignment?.title || 'New Coursework Module';
    const dueDate = assignment?.due_date || assignment?.deadline || 'Upcoming';
    const isSandbox = assignment?.type === 'SANDBOX' || assignment?.type === 'CODE';

    return await Notification.create({
      recipient_id: student_id,
      recipient_role: 'STUDENT',
      type: 'NEW_ASSIGNMENT_PUBLISHED',
      title: isSandbox ? '💻 New Coding Sandbox Published' : '📝 New Assessment Published',
      message: `New assignment '${title}' has been published (Due Date: ${dueDate}, Assignment #${asmId}).`,
      record_type: 'assessment',
      record_id: asmId,
      metadata: {
        assessment_id: asmId,
        title,
        due_date: dueDate,
        total_marks: assignment?.total_marks || assignment?.max_score,
      },
      priority: 'MEDIUM',
    });
  }

  /**
   * 6. STUDENT: Grade Published
   */
  static async notifyStudentOnGradePublished({ submission, assessment = {}, score, maxScore = 10 }) {
    const submissionId = submission?.id || 'sub-unknown';
    const assessmentTitle = assessment?.title || submission?.assessment_title || 'Assessment';
    const calculatedScore = score !== undefined ? score : (submission?.total_score || 0);
    const calculatedMax = maxScore || submission?.max_possible_score || 10;
    const pct = calculatedMax > 0 ? Math.round((calculatedScore / calculatedMax) * 100) : 0;

    return await Notification.create({
      recipient_id: submission?.student_id || null,
      recipient_role: 'STUDENT',
      type: 'GRADE_PUBLISHED',
      title: '📊 Grade Report Finalized',
      message: `Your score for '${assessmentTitle}' is ${calculatedScore}/${calculatedMax} (${pct}%) (Submission #${submissionId}).`,
      record_type: 'submission',
      record_id: submissionId,
      metadata: {
        submission_id: submissionId,
        assessment_id: assessment?.id || submission?.assessment_id,
        assessment_title: assessmentTitle,
        score: calculatedScore,
        max_score: calculatedMax,
        percentage: `${pct}%`,
      },
      priority: 'HIGH',
    });
  }

  /**
   * 7. STUDENT: Feedback Available
   */
  static async notifyStudentOnFeedbackAvailable({ submission, assessment = {}, report = {} }) {
    const submissionId = submission?.id || report?.submission_id || 'sub-unknown';
    const assessmentTitle = assessment?.title || 'Coursework Assignment';
    const strengthsCount = Array.isArray(report?.strengths) ? report.strengths.length : 0;
    const missingCount = Array.isArray(report?.missing_concepts) ? report.missing_concepts.length : 0;

    return await Notification.create({
      recipient_id: submission?.student_id || null,
      recipient_role: 'STUDENT',
      type: 'FEEDBACK_AVAILABLE',
      title: '💡 FairGrade Rubric Feedback Ready',
      message: `Detailed rubric breakdown is available for '${assessmentTitle}' (${strengthsCount} strengths identified, ${missingCount} areas for mastery) (Submission #${submissionId}).`,
      record_type: 'submission',
      record_id: submissionId,
      metadata: {
        submission_id: submissionId,
        assessment_id: assessment?.id || submission?.assessment_id,
        assessment_title: assessmentTitle,
        strengths: report?.strengths || [],
        missing_concepts: report?.missing_concepts || [],
      },
      priority: 'MEDIUM',
    });
  }

  /**
   * 8. STUDENT: Re-evaluation Result Finalized (Appeal Resolved)
   */
  static async notifyStudentOnAppealResolved({ appeal, submission = {}, revisedScore, decision }) {
    const appealId = appeal?.id || 'appeal-unknown';
    const submissionId = appeal?.submission_id || submission?.id || 'sub-unknown';
    const oldScore = appeal?.original_score !== undefined ? appeal.original_score : (submission?.total_score || 0);
    const newScore = revisedScore !== undefined ? revisedScore : (appeal?.revised_score || appeal?.new_score || oldScore);
    const decisionText = decision || appeal?.status || 'RESOLVED';

    return await Notification.create({
      recipient_id: appeal?.student_id || submission?.student_id || null,
      recipient_role: 'STUDENT',
      type: 'APPEAL_RESOLVED',
      title: '⚖️ Re-Evaluation Appeal Finalized',
      message: `Appeal #${appealId} on Submission #${submissionId} resolved (${decisionText.toUpperCase()}): Score updated from ${oldScore} to ${newScore}.`,
      record_type: 'appeal',
      record_id: appealId,
      metadata: {
        appeal_id: appealId,
        submission_id: submissionId,
        previous_score: oldScore,
        revised_score: newScore,
        decision: decisionText,
        reviewed_by: appeal?.reviewed_by || 'Blind Re-Evaluation Engine',
      },
      priority: 'HIGH',
    });
  }

  /**
   * 9. ADMIN: AI Service Degraded / Unavailable
   */
  static async notifyAdminOnServiceDegraded({ serviceName, status, details = '' }) {
    const normStatus = String(status).toUpperCase();
    return await Notification.create({
      recipient_role: 'ADMIN',
      type: normStatus === 'UNAVAILABLE' ? 'AI_SERVICE_UNAVAILABLE' : 'AI_SERVICE_DEGRADED',
      title: `🚨 AI Service Alert: ${serviceName} is ${normStatus}`,
      message: `System diagnostic report: AI module '${serviceName}' status is ${normStatus}. Details: ${details || 'Probe failed or connection degraded.'}`,
      record_type: 'ai_service',
      record_id: serviceName,
      metadata: {
        service_name: serviceName,
        status: normStatus,
        details,
        timestamp: new Date().toISOString(),
      },
      priority: normStatus === 'UNAVAILABLE' ? 'URGENT' : 'HIGH',
    });
  }

  /**
   * 10. ADMIN: Security Event
   */
  static async notifyAdminOnSecurityEvent({ action, actor = 'System', target = 'system', reason = '', role = 'UNKNOWN' }) {
    return await Notification.create({
      recipient_role: 'ADMIN',
      type: 'SECURITY_EVENT',
      title: `🛡️ Security Alert: ${action}`,
      message: `Security audit event triggered by ${actor} (${role}) on target '${target}': ${reason}`,
      record_type: 'security_log',
      record_id: String(target),
      metadata: {
        action,
        actor,
        role,
        target,
        reason,
        timestamp: new Date().toISOString(),
      },
      priority: 'HIGH',
    });
  }

  /**
   * Query notifications for the authenticated user
   */
  static async getNotificationsForUser(user, { is_read, type, limit } = {}) {
    if (!user) return [];
    return await Notification.findForUser({
      user_id: user.id,
      role: user.role,
      is_read,
      type,
      limit,
    });
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(id, user) {
    return await Notification.markAsRead(id, user?.id);
  }

  /**
   * Mark all notifications as read for current user
   */
  static async markAllAsRead(user) {
    if (!user) return { updated_count: 0 };
    return await Notification.markAllAsRead({
      user_id: user.id,
      role: user.role,
    });
  }
}

module.exports = NotificationService;
