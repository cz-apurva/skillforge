const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class FairGradeReport {
  static async create({
    anonymous_submission_id,
    rubric_id = null,
    total_score,
    max_possible_score,
    confidence_score = 1.000,
    requires_human_review = false,
    status = 'evaluated',
    overall_feedback,
    strengths = [],
    areas_for_improvement = [],
    model_version = 'claude-sonnet-4-6',
    grading_duration_ms = null,
  }) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const report = {
        id: uuidv4(),
        anonymous_submission_id,
        rubric_id,
        total_score: Number(total_score),
        max_possible_score: Number(max_possible_score),
        percentage_score: max_possible_score > 0 ? (total_score / max_possible_score) * 100 : 0,
        confidence_score: Number(confidence_score),
        requires_human_review: Boolean(requires_human_review),
        status,
        overall_feedback,
        strengths: Array.isArray(strengths) ? strengths : [],
        areas_for_improvement: Array.isArray(areas_for_improvement) ? areas_for_improvement : [],
        model_version,
        grading_duration_ms,
        created_at: new Date().toISOString(),
      };
      memoryStore.fairgrade_reports.set(report.id, report);
      return report;
    }

    const queryText = `
      INSERT INTO fairgrade_report (
        anonymous_submission_id, rubric_id, total_score, max_possible_score,
        confidence_score, overall_feedback, strengths, areas_for_improvement,
        model_version, grading_duration_ms
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    const values = [
      anonymous_submission_id,
      rubric_id,
      total_score,
      max_possible_score,
      confidence_score,
      overall_feedback,
      strengths,
      areas_for_improvement,
      model_version,
      grading_duration_ms,
    ];
    const { rows } = await pool.query(queryText, values);
    return rows[0];
  }

  static async findByAnonymousId(anonymousSubmissionId) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      for (const r of memoryStore.fairgrade_reports.values()) {
        if (r.anonymous_submission_id === anonymousSubmissionId) {
          return r;
        }
      }
      return null;
    }

    const queryText = `SELECT * FROM fairgrade_report WHERE anonymous_submission_id = $1;`;
    const { rows } = await pool.query(queryText, [anonymousSubmissionId]);
    return rows[0] || null;
  }
}

module.exports = FairGradeReport;
