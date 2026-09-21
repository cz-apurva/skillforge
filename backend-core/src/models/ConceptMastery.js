const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class ConceptMastery {
  static async upsert(params = {}) {
    const finalStudentId = params.student_id || params.studentId;
    const finalClassroomId = params.classroom_id || params.classroomId;
    const finalConceptId = params.concept_id || params.conceptId;
    const finalScore = Number(params.mastery_score !== undefined ? params.mastery_score : (params.masteryScore !== undefined ? params.masteryScore : 0.0));
    const finalConfidence = Number(params.confidence_score !== undefined ? params.confidence_score : (params.confidenceScore !== undefined ? params.confidenceScore : 0.0));
    const finalCount = Number(params.total_evidence_count !== undefined ? params.total_evidence_count : (params.totalEvidenceCount !== undefined ? params.totalEvidenceCount : 1));

    // Determine constructive status label based on score
    let calculatedStatus = params.status;
    if (!calculatedStatus) {
      if (finalScore >= 85) {
        calculatedStatus = 'MASTERED';
      } else if (finalScore >= 70) {
        calculatedStatus = 'PROFICIENT';
      } else if (finalScore >= 50) {
        calculatedStatus = 'DEVELOPING';
      } else if (finalScore >= 35) {
        calculatedStatus = 'NEEDS_ATTENTION';
      } else {
        calculatedStatus = 'REQUIRES_ADDITIONAL_SUPPORT';
      }
    }

    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const key = `${finalStudentId}_${finalClassroomId}_${finalConceptId}`;
      if (!memoryStore.concept_mastery) memoryStore.concept_mastery = new Map();
      const existing = memoryStore.concept_mastery.get(key);
      const updated = {
        id: existing ? existing.id : uuidv4(),
        student_id: finalStudentId,
        classroom_id: finalClassroomId,
        concept_id: finalConceptId,
        mastery_score: finalScore,
        confidence_score: finalConfidence,
        status: calculatedStatus,
        total_evidence_count: finalCount,
        last_evaluated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.concept_mastery.set(key, updated);
      return updated;
    }

    const queryText = `
      INSERT INTO concept_mastery (student_id, classroom_id, concept_id, mastery_score, confidence_score, status, total_evidence_count, last_evaluated_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (student_id, classroom_id, concept_id)
      DO UPDATE SET 
        mastery_score = EXCLUDED.mastery_score,
        confidence_score = EXCLUDED.confidence_score,
        status = EXCLUDED.status,
        total_evidence_count = EXCLUDED.total_evidence_count,
        last_evaluated_at = NOW(),
        updated_at = NOW()
      RETURNING *;
    `;
    const values = [finalStudentId, finalClassroomId, finalConceptId, finalScore, finalConfidence, calculatedStatus, finalCount];
    const { rows } = await pool.query(queryText, values);
    return rows[0];
  }

  static async findByStudentAndConcept(studentId, conceptId) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return Array.from(memoryStore.concept_mastery?.values() || []).find(
        (m) => m.student_id === studentId && m.concept_id === conceptId
      ) || null;
    }
    const { rows } = await pool.query(
      `SELECT * FROM concept_mastery WHERE student_id = $1 AND concept_id = $2;`,
      [studentId, conceptId]
    );
    return rows[0] || null;
  }

  static async findByStudent(studentId, classroomId = null) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return Array.from(memoryStore.concept_mastery?.values() || []).filter(
        (m) => m.student_id === studentId && (!classroomId || m.classroom_id === classroomId)
      );
    }
    const queryText = classroomId
      ? `SELECT cm.*, c.name as concept_name, c.topic, c.description 
         FROM concept_mastery cm 
         JOIN concepts c ON cm.concept_id = c.id 
         WHERE cm.student_id = $1 AND cm.classroom_id = $2 
         ORDER BY cm.mastery_score ASC;`
      : `SELECT cm.*, c.name as concept_name, c.topic, c.description 
         FROM concept_mastery cm 
         JOIN concepts c ON cm.concept_id = c.id 
         WHERE cm.student_id = $1 
         ORDER BY cm.mastery_score ASC;`;
    const params = classroomId ? [studentId, classroomId] : [studentId];
    const { rows } = await pool.query(queryText, params);
    return rows;
  }

  static async findByClassroom(classroomId) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return Array.from(memoryStore.concept_mastery?.values() || []).filter(
        (m) => m.classroom_id === classroomId
      );
    }
    const { rows } = await pool.query(
      `SELECT cm.*, c.name as concept_name, c.topic 
       FROM concept_mastery cm 
       JOIN concepts c ON cm.concept_id = c.id 
       WHERE cm.classroom_id = $1 
       ORDER BY c.topic, c.name;`,
      [classroomId]
    );
    return rows;
  }
}

module.exports = ConceptMastery;
