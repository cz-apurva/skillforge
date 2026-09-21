const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class FairGradeCriterionScore {
  static async create({
    report_id,
    criterion_id,
    score_awarded,
    max_score,
    feedback,
    evidence_quotes = [],
    rubric_level_matched = null,
  }) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const critScore = {
        id: uuidv4(),
        report_id,
        criterion_id,
        score_awarded: Number(score_awarded),
        max_score: Number(max_score),
        feedback,
        evidence_quotes: Array.isArray(evidence_quotes) ? evidence_quotes : [evidence_quotes].filter(Boolean),
        rubric_level_matched,
        created_at: new Date().toISOString(),
      };
      memoryStore.fairgrade_criterion_scores.set(critScore.id, critScore);
      return critScore;
    }

    const queryText = `
      INSERT INTO fairgrade_criterion_score (
        report_id, criterion_id, score_awarded, max_score, feedback,
        evidence_quotes, rubric_level_matched
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [
      report_id,
      criterion_id,
      score_awarded,
      max_score,
      feedback,
      Array.isArray(evidence_quotes) ? evidence_quotes : [evidence_quotes].filter(Boolean),
      rubric_level_matched,
    ];
    const { rows } = await pool.query(queryText, values);
    return rows[0];
  }

  static async findByReportId(reportId) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const list = [];
      for (const cs of memoryStore.fairgrade_criterion_scores.values()) {
        if (cs.report_id === reportId) {
          list.push(cs);
        }
      }
      return list;
    }

    const queryText = `SELECT * FROM fairgrade_criterion_score WHERE report_id = $1;`;
    const { rows } = await pool.query(queryText, [reportId]);
    return rows;
  }
}

module.exports = FairGradeCriterionScore;
