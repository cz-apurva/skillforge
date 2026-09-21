const Assessment = require('../models/Assessment');
const AssessmentQuestion = require('../models/AssessmentQuestion');
const Rubric = require('../models/Rubric');

class AssessmentService {
  /**
   * Helper to verify that the requesting user owns the assessment or is an ADMIN.
   */
  static _verifyOwnership(assessment, user) {
    if (!user) return;
    if (user.role && user.role.toUpperCase() === 'ADMIN') return;
    if (assessment.created_by && user.id && assessment.created_by !== user.id) {
      const error = new Error('Access denied: You can only view or modify your own assessments');
      error.statusCode = 403;
      throw error;
    }
  }

  /**
   * Create a new assessment in draft status.
   */
  static async createAssessment(
    {
      title,
      description,
      course_id,
      courseId,
      created_by,
      createdBy,
      total_points = 0,
    },
    user = null
  ) {
    const finalCourseId = course_id || courseId;
    const finalCreatedBy = user ? user.id : (created_by || createdBy);

    if (!title || typeof title !== 'string' || title.trim() === '') {
      const error = new Error('Assessment title is required');
      error.statusCode = 400;
      throw error;
    }

    if (!finalCourseId) {
      const error = new Error('Course ID is required');
      error.statusCode = 400;
      throw error;
    }

    if (!finalCreatedBy) {
      const error = new Error('Creator (created_by) user ID is required');
      error.statusCode = 400;
      throw error;
    }

    const assessment = await Assessment.create({
      title: title.trim(),
      description: description ? description.trim() : null,
      course_id: finalCourseId,
      created_by: finalCreatedBy,
      total_points: Number(total_points) || 0.00,
      status: 'draft',
    });

    try {
      const GradeAuditLog = require('../models/GradeAuditLog');
      await GradeAuditLog.create({
        actor: user ? user.name || user.email || user.id : finalCreatedBy,
        role: user ? user.role : 'TEACHER',
        action: 'ASSESSMENT_CREATED',
        target: `assessment:${assessment.id}`,
        old_value: null,
        new_value: { id: assessment.id, title: assessment.title, course_id: finalCourseId, created_by: finalCreatedBy },
        reason: `Assessment draft created: ${assessment.title}`,
        assessment_id: assessment.id,
        class_id: finalCourseId,
        teacher_id: finalCreatedBy,
      });
    } catch {}

    return assessment;
  }

  /**
   * Add a question to an existing assessment and update the total points.
   */
  static async addQuestion(assessmentId, questionData, user = null) {
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      const error = new Error(`Assessment not found with ID: ${assessmentId}`);
      error.statusCode = 404;
      throw error;
    }

    this._verifyOwnership(assessment, user);

    if (assessment.status === 'published' || assessment.status === 'archived') {
      const error = new Error(`Cannot add questions to an assessment with status '${assessment.status}'`);
      error.statusCode = 400;
      throw error;
    }

    const {
      question_number,
      questionNumber,
      question_text,
      questionText,
      question_type = 'written',
      questionType = 'written',
      max_score,
      max_marks,
      maxScore,
      maxMarks,
      sample_solution,
      sampleSolution,
    } = questionData;

    const finalQuestionNumber = question_number ?? questionNumber;
    const finalQuestionText = question_text ?? questionText;
    const finalQuestionType = question_type ?? questionType;
    const finalMaxScore = Number(max_score ?? max_marks ?? maxScore ?? maxMarks);
    const finalSampleSolution = sample_solution ?? sampleSolution ?? null;

    if (!finalQuestionNumber || isNaN(finalQuestionNumber) || finalQuestionNumber <= 0) {
      const error = new Error('Valid positive question number is required');
      error.statusCode = 400;
      throw error;
    }

    if (!finalQuestionText || typeof finalQuestionText !== 'string' || finalQuestionText.trim() === '') {
      const error = new Error('Question text is required');
      error.statusCode = 400;
      throw error;
    }

    if (isNaN(finalMaxScore) || finalMaxScore <= 0) {
      const error = new Error('Question max score/marks must be a positive number');
      error.statusCode = 400;
      throw error;
    }

    // Check duplicate question number in this assessment
    const existingQuestions = await AssessmentQuestion.findByAssessmentId(assessmentId);
    const duplicate = existingQuestions.find((q) => Number(q.question_number) === Number(finalQuestionNumber));
    if (duplicate) {
      const error = new Error(`Question number ${finalQuestionNumber} already exists in this assessment`);
      error.statusCode = 400;
      throw error;
    }

    const createdQuestion = await AssessmentQuestion.create({
      assessment_id: assessmentId,
      question_number: finalQuestionNumber,
      question_text: finalQuestionText.trim(),
      question_type: finalQuestionType,
      max_score: finalMaxScore,
      sample_solution: finalSampleSolution ? finalSampleSolution.trim() : null,
    });

    // Update assessment total points
    const allQuestions = await AssessmentQuestion.findByAssessmentId(assessmentId);
    const recalculatedTotal = allQuestions.reduce((sum, q) => sum + Number(q.max_score), 0);
    await Assessment.updateTotalPoints(assessmentId, recalculatedTotal);

    return createdQuestion;
  }

  /**
   * Save a rubric with criteria for an assessment question.
   * Validates: Criteria must be ordered, non-empty, and sum(criteria.max_marks) === question.max_marks.
   */
  static async saveRubric(assessmentId, rubricData, user = null) {
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      const error = new Error(`Assessment not found with ID: ${assessmentId}`);
      error.statusCode = 404;
      throw error;
    }

    this._verifyOwnership(assessment, user);

    const {
      question_id,
      questionId,
      title,
      description,
      total_weight = 100.00,
      criteria,
    } = rubricData;

    const finalQuestionId = question_id || questionId;

    if (!finalQuestionId) {
      const error = new Error('question_id is required to attach a rubric');
      error.statusCode = 400;
      throw error;
    }

    const question = await AssessmentQuestion.findById(finalQuestionId);
    if (!question) {
      const error = new Error(`Question not found with ID: ${finalQuestionId}`);
      error.statusCode = 404;
      throw error;
    }

    if (question.assessment_id !== assessmentId) {
      const error = new Error(`Question ${finalQuestionId} does not belong to Assessment ${assessmentId}`);
      error.statusCode = 400;
      throw error;
    }

    if (!Array.isArray(criteria) || criteria.length === 0) {
      const error = new Error('Rubric must contain at least one criterion');
      error.statusCode = 400;
      throw error;
    }

    // Validate criteria details and calculate sum of marks
    let criteriaTotalMarks = 0;
    const validatedCriteria = [];

    for (let i = 0; i < criteria.length; i++) {
      const c = criteria[i];
      const criterionName = c.criterion_name || c.name || c.title;
      const maxMarks = Number(c.max_points ?? c.max_marks ?? c.maxPoints ?? c.maxMarks);

      if (!criterionName || typeof criterionName !== 'string' || criterionName.trim() === '') {
        const error = new Error(`Criterion at index ${i} requires a valid name`);
        error.statusCode = 400;
        throw error;
      }

      if (isNaN(maxMarks) || maxMarks <= 0) {
        const error = new Error(`Criterion '${criterionName}' must have a positive max_marks / max_points`);
        error.statusCode = 400;
        throw error;
      }

      criteriaTotalMarks += maxMarks;

      validatedCriteria.push({
        criterion_name: criterionName.trim(),
        description: c.description ? c.description.trim() : '',
        max_points: maxMarks,
        weight: Number(c.weight || 1.00),
        scoring_levels: Array.isArray(c.scoring_levels || c.levels) ? (c.scoring_levels || c.levels) : [],
        order_index: c.order_index ?? c.orderIndex ?? i,
      });
    }

    // Crucial Rubric Validation Rule: sum(criteria.max_marks) === question.max_marks
    const expectedMaxScore = Number(question.max_score);
    const difference = Math.abs(criteriaTotalMarks - expectedMaxScore);

    if (difference > 0.001) {
      const error = new Error(
        `Rubric criteria total marks (${criteriaTotalMarks}) does not match question max marks (${expectedMaxScore})`
      );
      error.statusCode = 400;
      throw error;
    }

    const savedRubric = await Rubric.createWithCriteria({
      assessment_id: assessmentId,
      question_id: finalQuestionId,
      title: title ? title.trim() : `Rubric for Q${question.question_number}`,
      description: description ? description.trim() : null,
      total_weight: Number(total_weight),
      criteria: validatedCriteria,
    });

    try {
      const GradeAuditLog = require('../models/GradeAuditLog');
      await GradeAuditLog.create({
        actor: user ? user.name || user.email || user.id : 'Instructor',
        role: user ? user.role : 'TEACHER',
        action: 'RUBRIC_MODIFIED',
        target: `rubric:${savedRubric.id}`,
        old_value: null,
        new_value: { rubric_id: savedRubric.id, question_id: finalQuestionId, criteria_count: validatedCriteria.length, total_marks: criteriaTotalMarks },
        reason: `Rubric configuration updated with ${validatedCriteria.length} evaluation criteria totaling ${criteriaTotalMarks} marks`,
        assessment_id: assessmentId,
        teacher_id: user?.id,
      });
    } catch {}

    return savedRubric;
  }

  /**
   * Publish an assessment after verifying all questions and rubrics are complete.
   */
  static async publishAssessment(assessmentId, user = null) {
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      const error = new Error(`Assessment not found with ID: ${assessmentId}`);
      error.statusCode = 404;
      throw error;
    }

    this._verifyOwnership(assessment, user);

    if (assessment.status === 'published') {
      return assessment; // Idempotent publish
    }

    const questions = await AssessmentQuestion.findByAssessmentId(assessmentId);
    if (questions.length === 0) {
      const error = new Error('Cannot publish an assessment with no questions');
      error.statusCode = 400;
      throw error;
    }

    // Verify every question has an associated rubric with criteria
    for (const q of questions) {
      const rubric = await Rubric.findByQuestionId(q.id);
      if (!rubric || !rubric.criteria || rubric.criteria.length === 0) {
        const error = new Error(
          `Cannot publish: Question ${q.question_number} ('${q.question_text.slice(0, 30)}...') is missing a rubric or rubric criteria`
        );
        error.statusCode = 400;
        throw error;
      }
    }

    const published = await Assessment.updateStatus(assessmentId, 'published');

    // Notification Trigger: Students notified on new assignment published
    try {
      const NotificationService = require('./notificationService');
      await NotificationService.notifyStudentOnNewAssignment({
        assignment: published,
      });
    } catch (notifErr) {
      console.warn('[AssessmentService] Warning dispatching new assignment notification:', notifErr.message);
    }

    return published;
  }

  /**
   * Get all assessments accessible to the user:
   * ADMIN: sees all assessments.
   * TEACHER: sees only their own assessments (created_by === user.id).
   */
  static async getAssessments(user = null) {
    const all = await Assessment.findAll();
    if (!user || (user.role && user.role.toUpperCase() === 'ADMIN')) {
      return all;
    }
    return all.filter((a) => a.created_by === user.id);
  }

  /**
   * Get an assessment by ID with questions and rubrics.
   * Enforces ownership check: TEACHER can only access their own.
   */
  static async getAssessmentById(assessmentId, user = null) {
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      const error = new Error(`Assessment not found with ID: ${assessmentId}`);
      error.statusCode = 404;
      throw error;
    }

    this._verifyOwnership(assessment, user);

    const questions = await AssessmentQuestion.findByAssessmentId(assessmentId);
    const questionsWithRubrics = await Promise.all(
      questions.map(async (q) => {
        const rubric = await Rubric.findByQuestionId(q.id);
        return {
          ...q,
          rubric,
        };
      })
    );

    return {
      ...assessment,
      questions: questionsWithRubrics,
    };
  }
}

module.exports = AssessmentService;
