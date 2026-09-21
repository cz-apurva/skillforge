const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class GradeAppeal {
  static async create({
    written_submission_id,
    student_id,
    report_id = null,
    appeal_reason,
    status = 'open',
  }) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const appeal = {
        id: uuidv4(),
        written_submission_id,
        student_id,
        report_id,
        appeal_reason,
        status,
        reviewer_id: null,
        reviewer_comments: null,
        revised_score: null,
        resolved_at: null,
        created_at: new Date().toISOString(),
      };
      memoryStore.grade_appeals.set(appeal.id, appeal);
      return appeal;
    }

    const queryText = `
      INSERT INTO grade_appeal (
        written_submission_id, student_id, report_id, appeal_reason, status
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [written_submission_id, student_id, report_id, appeal_reason, status];
    const { rows } = await pool.query(queryText, values);
    return rows[0];
  }

  static async findById(id) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return memoryStore.grade_appeals.get(id) || null;
    }

    const queryText = `SELECT * FROM grade_appeal WHERE id = $1;`;
    const { rows } = await pool.query(queryText, [id]);
    return rows[0] || null;
  }

  static async updateStatusAndScore(id, { status, revised_score = null, reviewer_comments = null, reviewer_id = null }) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const appeal = memoryStore.grade_appeals.get(id);
      if (!appeal) return null;
      appeal.status = status;
      if (revised_score !== null) appeal.revised_score = Number(revised_score);
      if (reviewer_comments !== null) appeal.reviewer_comments = reviewer_comments;
      if (reviewer_id !== null) appeal.reviewer_id = reviewer_id;
      appeal.resolved_at = new Date().toISOString();
      memoryStore.grade_appeals.set(id, appeal);
      return appeal;
    }

    const queryText = `
      UPDATE grade_appeal
      SET status = $2, revised_score = $3, reviewer_comments = $4, reviewer_id = $5, resolved_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const values = [id, status, revised_score, reviewer_comments, reviewer_id];
    const { rows } = await pool.query(queryText, values);
    return rows[0] || null;
  }
}

module.exports = GradeAppeal;
