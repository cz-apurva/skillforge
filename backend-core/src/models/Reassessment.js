const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Reassessment {
  static async create({
    id = null,
    intervention_id,
    interventionId,
    student_id,
    studentId,
    concept_id,
    conceptId,
    assessment_id = null,
    assessmentId = null,
    programming_assignment_id = null,
    programmingAssignmentId = null,
    status = 'PENDING',
  }) {
    const finalId = id || uuidv4();
    const finalInterventionId = intervention_id || interventionId;
    const finalStudentId = student_id || studentId;
    const finalConceptId = concept_id || conceptId;
    const finalAssessmentId = assessment_id || assessmentId;
    const finalProgId = programming_assignment_id || programmingAssignmentId;

    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const item = {
        id: finalId,
        intervention_id: finalInterventionId,
        student_id: finalStudentId,
        concept_id: finalConceptId,
        assessment_id: finalAssessmentId,
        programming_assignment_id: finalProgId,
        status,
        created_at: new Date().toISOString(),
        completed_at: null,
      };
      if (!memoryStore.reassessments) memoryStore.reassessments = new Map();
      memoryStore.reassessments.set(item.id, item);
      return item;
    }

    const queryText = `
      INSERT INTO reassessments (id, intervention_id, student_id, concept_id, assessment_id, programming_assignment_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [finalId, finalInterventionId, finalStudentId, finalConceptId, finalAssessmentId, finalProgId, status];
    const { rows } = await pool.query(queryText, values);
    return rows[0];
  }

  static async findById(id) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return memoryStore.reassessments?.get(id) || null;
    }
    const { rows } = await pool.query(`SELECT * FROM reassessments WHERE id = $1;`, [id]);
    return rows[0] || null;
  }

  static async findByIntervention(interventionId) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return Array.from(memoryStore.reassessments?.values() || []).filter(
        (r) => r.intervention_id === interventionId
      );
    }
    const { rows } = await pool.query(`SELECT * FROM reassessments WHERE intervention_id = $1 ORDER BY created_at DESC;`, [interventionId]);
    return rows;
  }

  static async complete(id) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const item = memoryStore.reassessments?.get(id);
      if (!item) return null;
      item.status = 'COMPLETED';
      item.completed_at = new Date().toISOString();
      memoryStore.reassessments.set(id, item);
      return item;
    }
    const queryText = `UPDATE reassessments SET status = 'COMPLETED', completed_at = NOW() WHERE id = $1 RETURNING *;`;
    const { rows } = await pool.query(queryText, [id]);
    return rows[0] || null;
  }
}

module.exports = Reassessment;
