const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class WrittenSubmission {
  static async create({
    assessment_id,
    question_id,
    student_id,
    submission_text,
    word_count = null,
    status = 'submitted',
  }) {
    const computedWordCount = word_count || submission_text.trim().split(/\s+/).filter(Boolean).length;

    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const submission = {
        id: uuidv4(),
        assessment_id,
        question_id,
        student_id,
        submission_text,
        word_count: computedWordCount,
        status,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.written_submissions.set(submission.id, submission);
      return submission;
    }

    const queryText = `
      INSERT INTO written_submission (
        assessment_id, question_id, student_id, submission_text, word_count, status
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [assessment_id, question_id, student_id, submission_text, computedWordCount, status];
    const { rows } = await pool.query(queryText, values);
    return rows[0];
  }

  static async findById(id) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return memoryStore.written_submissions.get(id) || null;
    }

    const queryText = `SELECT * FROM written_submission WHERE id = $1;`;
    const { rows } = await pool.query(queryText, [id]);
    return rows[0] || null;
  }

  static async findAll() {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return Array.from(memoryStore.written_submissions.values());
    }

    const queryText = `SELECT * FROM written_submission ORDER BY submitted_at DESC;`;
    const { rows } = await pool.query(queryText);
    return rows;
  }

  static async findByStudentId(studentId) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return Array.from(memoryStore.written_submissions.values()).filter(
        (s) => s.student_id === studentId
      );
    }

    const queryText = `SELECT * FROM written_submission WHERE student_id = $1 ORDER BY submitted_at DESC;`;
    const { rows } = await pool.query(queryText, [studentId]);
    return rows;
  }

  static async findByAssessmentId(assessmentId) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return Array.from(memoryStore.written_submissions.values()).filter(
        (s) => s.assessment_id === assessmentId
      );
    }

    const queryText = `SELECT * FROM written_submission WHERE assessment_id = $1 ORDER BY submitted_at DESC;`;
    const { rows } = await pool.query(queryText, [assessmentId]);
    return rows;
  }
}

module.exports = WrittenSubmission;
