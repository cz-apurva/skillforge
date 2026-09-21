const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class BiasCheckLog {
  static async create({
    anonymous_submission_id,
    check_type = 'DEMOGRAPHIC_LEAK_DETECTION',
    bias_detected = false,
    bias_score = 0.000,
    flagged_patterns = [],
    mitigation_applied = null,
  }) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const log = {
        id: uuidv4(),
        anonymous_submission_id,
        check_type,
        bias_detected: Boolean(bias_detected),
        bias_score: Number(bias_score),
        flagged_patterns: Array.isArray(flagged_patterns) ? flagged_patterns : [],
        mitigation_applied,
        created_at: new Date().toISOString(),
      };
      memoryStore.bias_check_logs.set(log.id, log);
      return log;
    }

    const queryText = `
      INSERT INTO bias_check_log (
        anonymous_submission_id, check_type, bias_detected, bias_score,
        flagged_patterns, mitigation_applied
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [
      anonymous_submission_id,
      check_type,
      bias_detected,
      bias_score,
      JSON.stringify(flagged_patterns),
      mitigation_applied,
    ];
    const { rows } = await pool.query(queryText, values);
    return rows[0];
  }

  static async findByAnonymousId(anonymousSubmissionId) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const list = [];
      for (const b of memoryStore.bias_check_logs.values()) {
        if (b.anonymous_submission_id === anonymousSubmissionId) {
          list.push(b);
        }
      }
      return list;
    }

    const queryText = `SELECT * FROM bias_check_log WHERE anonymous_submission_id = $1 ORDER BY created_at DESC;`;
    const { rows } = await pool.query(queryText, [anonymousSubmissionId]);
    return rows;
  }
}

module.exports = BiasCheckLog;
