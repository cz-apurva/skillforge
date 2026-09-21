const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class RecoveryResult {
  static async create({
    id = null,
    intervention_id,
    interventionId,
    reassessment_id,
    reassessmentId,
    student_id,
    studentId,
    concept_id,
    conceptId,
    before_mastery,
    beforeMastery,
    after_mastery,
    afterMastery,
    improvement_delta = null,
    improvementDelta = null,
    status = 'RECOVERED',
  }) {
    const finalId = id || uuidv4();
    const finalInterventionId = intervention_id || interventionId;
    const finalReassessmentId = reassessment_id || reassessmentId;
    const finalStudentId = student_id || studentId;
    const finalConceptId = concept_id || conceptId;
    const finalBefore = Number(before_mastery !== undefined ? before_mastery : beforeMastery) || 0.0;
    const finalAfter = Number(after_mastery !== undefined ? after_mastery : afterMastery) || 0.0;
    const finalDelta = improvement_delta !== null && improvement_delta !== undefined
      ? Number(improvement_delta)
      : (improvementDelta !== null && improvementDelta !== undefined ? Number(improvementDelta) : Number((finalAfter - finalBefore).toFixed(2)));

    // Determine status if not explicitly passed
    let calculatedStatus = status;
    if (finalAfter >= 75 && finalDelta > 15) {
      calculatedStatus = 'RECOVERED';
    } else if (finalDelta > 0) {
      calculatedStatus = 'IN_PROGRESS';
    } else {
      calculatedStatus = 'NOT_RECOVERED';
    }

    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const item = {
        id: finalId,
        intervention_id: finalInterventionId,
        reassessment_id: finalReassessmentId,
        student_id: finalStudentId,
        concept_id: finalConceptId,
        before_mastery: finalBefore,
        after_mastery: finalAfter,
        improvement_delta: finalDelta,
        status: calculatedStatus,
        recorded_at: new Date().toISOString(),
      };
      if (!memoryStore.recovery_results) memoryStore.recovery_results = new Map();
      memoryStore.recovery_results.set(item.id, item);
      return item;
    }

    const queryText = `
      INSERT INTO recovery_results (id, intervention_id, reassessment_id, student_id, concept_id, before_mastery, after_mastery, improvement_delta, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const values = [finalId, finalInterventionId, finalReassessmentId, finalStudentId, finalConceptId, finalBefore, finalAfter, finalDelta, calculatedStatus];
    const { rows } = await pool.query(queryText, values);
    return rows[0];
  }

  static async findByStudent(studentId) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return Array.from(memoryStore.recovery_results?.values() || [])
        .filter((r) => r.student_id === studentId)
        .map((r) => {
          const concept = memoryStore.concepts?.get(r.concept_id);
          return {
            ...r,
            concept_name: concept ? concept.name : 'Target Concept',
            topic: concept ? concept.topic : 'General',
          };
        })
        .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
    }
    const { rows } = await pool.query(
      `SELECT rr.*, c.name as concept_name, c.topic 
       FROM recovery_results rr 
       JOIN concepts c ON rr.concept_id = c.id 
       WHERE rr.student_id = $1 
       ORDER BY rr.recorded_at DESC;`,
      [studentId]
    );
    return rows;
  }

  static async findByClassroom(classroomId) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return Array.from(memoryStore.recovery_results?.values() || []).map((r) => {
        const concept = memoryStore.concepts?.get(r.concept_id);
        const student = memoryStore.users?.get(r.student_id);
        return {
          ...r,
          concept_name: concept ? concept.name : 'Target Concept',
          topic: concept ? concept.topic : 'General',
          student_name: student ? student.name : 'Student',
        };
      });
    }
    const { rows } = await pool.query(
      `SELECT rr.*, c.name as concept_name, c.topic, u.name as student_name 
       FROM recovery_results rr 
       JOIN concepts c ON rr.concept_id = c.id 
       JOIN users u ON rr.student_id = u.id 
       WHERE c.classroom_id = $1 
       ORDER BY rr.recorded_at DESC;`,
      [classroomId]
    );
    return rows;
  }
}

module.exports = RecoveryResult;
