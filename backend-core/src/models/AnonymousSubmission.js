const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class AnonymousSubmission {
  static async create({
    id = null,
    assessment_id,
    question_id,
    rubric_id = null,
    sanitized_text,
    metadata = {},
    status = 'pending',
  }) {
    const anonymousId = id || uuidv4();

    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const anonSubmission = {
        id: anonymousId,
        assessment_id,
        question_id,
        rubric_id,
        sanitized_text,
        metadata: { ...metadata },
        status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.anonymous_submissions.set(anonSubmission.id, anonSubmission);
      return anonSubmission;
    }

    const queryText = `
      INSERT INTO anonymous_submission (
        id, assessment_id, question_id, rubric_id, sanitized_text, metadata, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [
      anonymousId,
      assessment_id,
      question_id,
      rubric_id,
      sanitized_text,
      JSON.stringify(metadata),
      status,
    ];
    const { rows } = await pool.query(queryText, values);
    return rows[0];
  }

  static async findById(id) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return memoryStore.anonymous_submissions.get(id) || null;
    }

    const queryText = `SELECT * FROM anonymous_submission WHERE id = $1;`;
    const { rows } = await pool.query(queryText, [id]);
    return rows[0] || null;
  }
}

module.exports = AnonymousSubmission;
