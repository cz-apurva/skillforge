const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class StudentIdentityMap {
  static async create({
    student_id,
    written_submission_id,
    anonymous_submission_id,
    salt = null,
  }) {
    const finalSalt = salt || crypto.randomBytes(16).toString('hex');

    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const mapping = {
        id: uuidv4(),
        student_id,
        written_submission_id,
        anonymous_submission_id,
        salt: finalSalt,
        created_at: new Date().toISOString(),
      };
      memoryStore.student_identity_maps.set(mapping.id, mapping);
      return mapping;
    }

    const queryText = `
      INSERT INTO student_identity_map (
        student_id, written_submission_id, anonymous_submission_id, salt
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [student_id, written_submission_id, anonymous_submission_id, finalSalt];
    const { rows } = await pool.query(queryText, values);
    return rows[0];
  }

  static async findByAnonymousId(anonymousSubmissionId) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      for (const m of memoryStore.student_identity_maps.values()) {
        if (m.anonymous_submission_id === anonymousSubmissionId) {
          return m;
        }
      }
      return null;
    }

    const queryText = `SELECT * FROM student_identity_map WHERE anonymous_submission_id = $1;`;
    const { rows } = await pool.query(queryText, [anonymousSubmissionId]);
    return rows[0] || null;
  }
}

module.exports = StudentIdentityMap;
