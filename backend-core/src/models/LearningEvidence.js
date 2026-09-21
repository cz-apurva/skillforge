const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class LearningEvidence {
  static async create(params = {}) {
    const finalId = params.id || uuidv4();
    const finalStudentId = params.student_id || params.studentId;
    const finalClassroomId = params.classroom_id || params.classroomId;
    const finalConceptId = params.concept_id || params.conceptId;
    const finalSource = params.source || 'WRITTEN_ASSESSMENT';
    const finalReferenceId = params.reference_id || params.referenceId || null;
    const finalScore = Number(params.score_achieved !== undefined ? params.score_achieved : (params.scoreAchieved !== undefined ? params.scoreAchieved : 0.0));
    const finalMaxScore = Number(params.max_score !== undefined ? params.max_score : (params.maxScore !== undefined ? params.maxScore : 100.0));
    
    let rawSuccessRate = params.success_rate !== undefined ? params.success_rate : params.successRate;
    let finalSuccessRate = rawSuccessRate !== undefined && rawSuccessRate !== null ? Number(rawSuccessRate) : null;
    if (finalSuccessRate === null && finalMaxScore > 0) {
      finalSuccessRate = Number(((finalScore / finalMaxScore) * 100).toFixed(2));
    } else if (finalSuccessRate === null) {
      finalSuccessRate = 0.0;
    }

    const finalConfidence = Number(params.confidence_score !== undefined ? params.confidence_score : (params.confidenceScore !== undefined ? params.confidenceScore : 1.0));
    const finalPayload = params.evidence_payload || params.evidencePayload || {};

    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const newEvidence = {
        id: finalId,
        student_id: finalStudentId,
        classroom_id: finalClassroomId,
        concept_id: finalConceptId,
        source: finalSource,
        reference_id: finalReferenceId,
        score_achieved: finalScore,
        max_score: finalMaxScore,
        success_rate: finalSuccessRate,
        confidence_score: finalConfidence,
        evidence_payload: finalPayload,
        created_at: new Date().toISOString(),
      };
      if (!memoryStore.learning_evidence) memoryStore.learning_evidence = new Map();
      memoryStore.learning_evidence.set(newEvidence.id, newEvidence);
      return newEvidence;
    }

    const queryText = `
      INSERT INTO learning_evidence (id, student_id, classroom_id, concept_id, source, reference_id, score_achieved, max_score, success_rate, confidence_score, evidence_payload)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;
    const values = [
      finalId,
      finalStudentId,
      finalClassroomId,
      finalConceptId,
      finalSource,
      finalReferenceId,
      finalScore,
      finalMaxScore,
      finalSuccessRate,
      finalConfidence,
      JSON.stringify(finalPayload),
    ];
    const { rows } = await pool.query(queryText, values);
    return rows[0];
  }

  static async findByStudentAndConcept(studentId, conceptId) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return Array.from(memoryStore.learning_evidence?.values() || [])
        .filter((e) => e.student_id === studentId && e.concept_id === conceptId)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }
    const { rows } = await pool.query(
      `SELECT * FROM learning_evidence WHERE student_id = $1 AND concept_id = $2 ORDER BY created_at ASC;`,
      [studentId, conceptId]
    );
    return rows;
  }

  static async findByStudent(studentId, classroomId = null) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return Array.from(memoryStore.learning_evidence?.values() || [])
        .filter((e) => e.student_id === studentId && (!classroomId || e.classroom_id === classroomId))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    const queryText = classroomId
      ? `SELECT * FROM learning_evidence WHERE student_id = $1 AND classroom_id = $2 ORDER BY created_at DESC;`
      : `SELECT * FROM learning_evidence WHERE student_id = $1 ORDER BY created_at DESC;`;
    const params = classroomId ? [studentId, classroomId] : [studentId];
    const { rows } = await pool.query(queryText, params);
    return rows;
  }

  static async findByClassroom(classroomId) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return Array.from(memoryStore.learning_evidence?.values() || [])
        .filter((e) => e.classroom_id === classroomId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    const { rows } = await pool.query(
      `SELECT * FROM learning_evidence WHERE classroom_id = $1 ORDER BY created_at DESC;`,
      [classroomId]
    );
    return rows;
  }
}

module.exports = LearningEvidence;
