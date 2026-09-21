const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const StudentIdentityMap = require('../models/StudentIdentityMap');
const AnonymousSubmission = require('../models/AnonymousSubmission');

class AnonymizerService {
  /**
   * Sanitizes raw submission text by stripping out common PII markers
   * (e.g. Name signatures, Roll numbers, Emails, Student IDs).
   */
  static sanitizeText(rawText) {
    if (!rawText || typeof rawText !== 'string') return '';

    let sanitized = rawText;

    // Remove email addresses
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');

    // Remove common roll number / student ID header lines
    sanitized = sanitized.replace(/(?:roll\s*(?:no|number)?|reg(?:istration)?\s*no|student\s*id)\s*[:=-]\s*[\w\d-]+/gi, '[REDACTED_ID]');

    // Remove explicit self-identifying intros/outros (e.g., "Submitted by: John Doe", "Name: Apurva")
    sanitized = sanitized.replace(/(?:submitted\s+by|student\s+name|name)\s*[:=-]\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/gi, '[REDACTED_NAME]');

    return sanitized.trim();
  }

  /**
   * Encapsulates the complete anonymization pipeline:
   * 1. Generates a fresh anonymous_submission_id
   * 2. Inserts mapping into student_identity_map
   * 3. Sanitizes content and inserts into anonymous_submission
   */
  static async anonymizeSubmission({
    writtenSubmissionId,
    studentId,
    assessmentId,
    questionId,
    submissionText,
    rubricId = null,
  }) {
    if (!writtenSubmissionId || !studentId || !assessmentId || !questionId) {
      const error = new Error('Missing required parameters for submission anonymization');
      error.statusCode = 400;
      throw error;
    }

    const anonymousSubmissionId = uuidv4();
    const salt = crypto.randomBytes(16).toString('hex');

    // 1. Save identity mapping in backend-core owned table
    await StudentIdentityMap.create({
      student_id: studentId,
      written_submission_id: writtenSubmissionId,
      anonymous_submission_id: anonymousSubmissionId,
      salt,
    });

    // 2. Sanitize text and compute metadata
    const sanitizedText = this.sanitizeText(submissionText);
    const wordCount = sanitizedText.split(/\s+/).filter(Boolean).length;
    const metadata = {
      word_count: wordCount,
      character_count: sanitizedText.length,
      anonymized_at: new Date().toISOString(),
    };

    // 3. Save into anonymous_submission table
    const anonymousRecord = await AnonymousSubmission.create({
      id: anonymousSubmissionId,
      assessment_id: assessmentId,
      question_id: questionId,
      rubric_id: rubricId,
      sanitized_text: sanitizedText,
      metadata,
      status: 'pending',
    });

    return anonymousRecord;
  }

  /**
   * Constructs the external payload destined for fairgrade-service.
   * Strictly guarantees zero student identity fields are included.
   */
  static buildFairGradePayload({
    anonymousSubmission,
    question = null,
    rubric = null,
  }) {
    const payload = {
      anonymous_submission_id: anonymousSubmission.id,
      assessment_id: anonymousSubmission.assessment_id,
      question_id: anonymousSubmission.question_id,
      submission_text: anonymousSubmission.sanitized_text,
      metadata: anonymousSubmission.metadata || {},
    };

    if (question) {
      payload.question = {
        question_number: question.question_number,
        question_text: question.question_text,
        question_type: question.question_type,
        max_score: Number(question.max_score),
        sample_solution: question.sample_solution,
      };
    }

    if (rubric) {
      payload.rubric = {
        rubric_id: rubric.id,
        title: rubric.title,
        total_weight: Number(rubric.total_weight),
        criteria: (rubric.criteria || []).map((c) => ({
          criterion_id: c.id,
          criterion_name: c.criterion_name,
          description: c.description,
          max_points: Number(c.max_points),
          weight: Number(c.weight),
          scoring_levels: c.scoring_levels || [],
          order_index: c.order_index,
        })),
      };
    }

    // Run security assertion before returning
    this.ensureFairgradePayloadIsAnonymous(payload);

    return payload;
  }

  /**
   * Security Assertion Utility: Scans any object recursively to verify
   * that no student identity keys or forbidden PII markers are present.
   */
  static ensureFairgradePayloadIsAnonymous(obj) {
    const forbiddenKeys = new Set([
      'student_id',
      'studentid',
      'student_name',
      'studentname',
      'student_email',
      'studentemail',
      'name',
      'email',
      'roll_number',
      'rollnumber',
      'roll_no',
      'rollno',
      'user_id',
      'userid',
    ]);

    const checkObject = (target, path = '') => {
      if (!target || typeof target !== 'object') return;

      for (const [key, value] of Object.entries(target)) {
        const normalizedKey = key.toLowerCase().replace(/[-_]/g, '');
        if (forbiddenKeys.has(key.toLowerCase()) || forbiddenKeys.has(normalizedKey)) {
          throw new Error(
            `[Security Violation] Identity field '${key}' detected at '${path}.${key}' in FairGrade payload!`
          );
        }

        if (value && typeof value === 'object') {
          checkObject(value, path ? `${path}.${key}` : key);
        }
      }
    };

    checkObject(obj);
    return true;
  }
}

module.exports = AnonymizerService;
