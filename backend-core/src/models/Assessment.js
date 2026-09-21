const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Assessment {
  static async create({ title, description, course_id, created_by, total_points = 0.00, status = 'draft' }) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const newAssessment = {
        id: uuidv4(),
        title,
        description: description || null,
        course_id: course_id || uuidv4(),
        created_by: created_by || uuidv4(),
        total_points: Number(total_points) || 0.00,
        status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.assessments.set(newAssessment.id, newAssessment);
      return newAssessment;
    }

    const queryText = `
      INSERT INTO assessment (title, description, course_id, created_by, total_points, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [title, description, course_id, created_by, total_points, status];
    const { rows } = await pool.query(queryText, values);
    return rows[0];
  }

  static async findById(id) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return memoryStore.assessments.get(id) || null;
    }

    const queryText = `SELECT * FROM assessment WHERE id = $1;`;
    const { rows } = await pool.query(queryText, [id]);
    return rows[0] || null;
  }

  static async findAll() {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return Array.from(memoryStore.assessments.values());
    }

    const queryText = `SELECT * FROM assessment ORDER BY created_at DESC;`;
    const { rows } = await pool.query(queryText);
    return rows;
  }

  static async updateStatus(id, status) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const assessment = memoryStore.assessments.get(id);
      if (!assessment) return null;
      assessment.status = status;
      assessment.updated_at = new Date().toISOString();
      memoryStore.assessments.set(id, assessment);
      return assessment;
    }

    const queryText = `
      UPDATE assessment
      SET status = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const { rows } = await pool.query(queryText, [id, status]);
    return rows[0] || null;
  }

  static async updateTotalPoints(id, totalPoints) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const assessment = memoryStore.assessments.get(id);
      if (!assessment) return null;
      assessment.total_points = Number(totalPoints);
      assessment.updated_at = new Date().toISOString();
      memoryStore.assessments.set(id, assessment);
      return assessment;
    }

    const queryText = `
      UPDATE assessment
      SET total_points = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const { rows } = await pool.query(queryText, [id, totalPoints]);
    return rows[0] || null;
  }
}

module.exports = Assessment;
