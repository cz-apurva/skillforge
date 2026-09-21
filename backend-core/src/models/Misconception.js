const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Misconception {
  static async create({
    id = null,
    student_id,
    studentId,
    classroom_id,
    classroomId,
    concept_id,
    conceptId,
    title,
    description,
    status = 'POSSIBLE',
    confidence_score = 0.5,
    confidenceScore = 0.5,
    supporting_evidence = [],
    supportingEvidence = [],
  }) {
    const finalId = id || uuidv4();
    const finalStudentId = student_id || studentId;
    const finalClassroomId = classroom_id || classroomId;
    const finalConceptId = concept_id || conceptId;
    const finalConfidence = Number(confidence_score !== undefined ? confidence_score : confidenceScore) || 0.5;
    const finalEvidence = Array.isArray(supporting_evidence) && supporting_evidence.length > 0 ? supporting_evidence : (Array.isArray(supportingEvidence) ? supportingEvidence : []);

    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const newMisconception = {
        id: finalId,
        student_id: finalStudentId,
        classroom_id: finalClassroomId,
        concept_id: finalConceptId,
        title,
        description,
        status,
        confidence_score: finalConfidence,
        supporting_evidence: finalEvidence,
        detected_at: new Date().toISOString(),
        resolved_at: null,
        updated_at: new Date().toISOString(),
      };
      if (!memoryStore.misconceptions) memoryStore.misconceptions = new Map();
      memoryStore.misconceptions.set(newMisconception.id, newMisconception);
      return newMisconception;
    }

    const queryText = `
      INSERT INTO misconceptions (id, student_id, classroom_id, concept_id, title, description, status, confidence_score, supporting_evidence)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const values = [finalId, finalStudentId, finalClassroomId, finalConceptId, title, description, status, finalConfidence, JSON.stringify(finalEvidence)];
    const { rows } = await pool.query(queryText, values);
    return rows[0];
  }

  static async findById(id) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return memoryStore.misconceptions?.get(id) || null;
    }
    const { rows } = await pool.query(`SELECT * FROM misconceptions WHERE id = $1;`, [id]);
    return rows[0] || null;
  }

  static async findByStudent(studentId, classroomId = null) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return Array.from(memoryStore.misconceptions?.values() || []).filter(
        (m) => m.student_id === studentId && (!classroomId || m.classroom_id === classroomId)
      );
    }
    const queryText = classroomId
      ? `SELECT m.*, c.name as concept_name, c.topic 
         FROM misconceptions m 
         JOIN concepts c ON m.concept_id = c.id 
         WHERE m.student_id = $1 AND m.classroom_id = $2 
         ORDER BY m.detected_at DESC;`
      : `SELECT m.*, c.name as concept_name, c.topic 
         FROM misconceptions m 
         JOIN concepts c ON m.concept_id = c.id 
         WHERE m.student_id = $1 
         ORDER BY m.detected_at DESC;`;
    const params = classroomId ? [studentId, classroomId] : [studentId];
    const { rows } = await pool.query(queryText, params);
    return rows;
  }

  static async findByClassroom(classroomId) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return Array.from(memoryStore.misconceptions?.values() || []).filter(
        (m) => m.classroom_id === classroomId
      );
    }
    const { rows } = await pool.query(
      `SELECT m.*, c.name as concept_name, c.topic, u.name as student_name 
       FROM misconceptions m 
       JOIN concepts c ON m.concept_id = c.id 
       JOIN users u ON m.student_id = u.id 
       WHERE m.classroom_id = $1 
       ORDER BY m.detected_at DESC;`,
      [classroomId]
    );
    return rows;
  }

  static async updateStatus(id, status, resolved = false) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const item = memoryStore.misconceptions?.get(id);
      if (!item) return null;
      item.status = status;
      if (resolved) item.resolved_at = new Date().toISOString();
      item.updated_at = new Date().toISOString();
      memoryStore.misconceptions.set(id, item);
      return item;
    }
    const queryText = resolved
      ? `UPDATE misconceptions SET status = $2, resolved_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *;`
      : `UPDATE misconceptions SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *;`;
    const { rows } = await pool.query(queryText, [id, status]);
    return rows[0] || null;
  }
}

module.exports = Misconception;
