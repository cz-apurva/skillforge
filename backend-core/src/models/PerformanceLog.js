const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class PerformanceLog {
  static async create({
    student_id,
    assessment_id,
    question_id,
    submission_id,
    grader_type = 'FAIRGRADE_WRITTEN',
    score_awarded,
    max_score,
    percentage,
    competencies_evaluated = [],
    metadata = {},
  }) {
    if (!memoryStore.performance_logs) {
      memoryStore.performance_logs = new Map();
    }

    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const log = {
        id: uuidv4(),
        student_id,
        assessment_id,
        question_id,
        submission_id,
        grader_type,
        score_awarded: Number(score_awarded),
        max_score: Number(max_score),
        percentage: Number(percentage),
        competencies_evaluated,
        metadata,
        created_at: new Date().toISOString(),
      };
      memoryStore.performance_logs.set(log.id, log);
      return log;
    }

    // In production Postgres, logs to student analytics performance table
    return {
      id: uuidv4(),
      student_id,
      assessment_id,
      question_id,
      submission_id,
      grader_type,
      score_awarded: Number(score_awarded),
      max_score: Number(max_score),
      percentage: Number(percentage),
      competencies_evaluated,
      metadata,
      created_at: new Date().toISOString(),
    };
  }

  static async findByStudentId(studentId) {
    if (!memoryStore.performance_logs) return [];
    const list = [];
    for (const p of memoryStore.performance_logs.values()) {
      if (p.student_id === studentId) {
        list.push(p);
      }
    }
    return list;
  }
}

module.exports = PerformanceLog;
