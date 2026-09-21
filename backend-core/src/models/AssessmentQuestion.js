const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class AssessmentQuestion {
  static async create({
    assessment_id,
    question_number,
    question_text,
    question_type = 'written',
    max_score = 10.00,
    sample_solution = null,
  }) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const newQuestion = {
        id: uuidv4(),
        assessment_id,
        question_number: Number(question_number),
        question_text,
        question_type,
        max_score: Number(max_score),
        sample_solution,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.assessment_questions.set(newQuestion.id, newQuestion);
      return newQuestion;
    }

    const queryText = `
      INSERT INTO assessment_question (
        assessment_id, question_number, question_text, question_type, max_score, sample_solution
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [assessment_id, question_number, question_text, question_type, max_score, sample_solution];
    const { rows } = await pool.query(queryText, values);
    return rows[0];
  }

  static async findById(id) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return memoryStore.assessment_questions.get(id) || null;
    }

    const queryText = `SELECT * FROM assessment_question WHERE id = $1;`;
    const { rows } = await pool.query(queryText, [id]);
    return rows[0] || null;
  }

  static async findByAssessmentId(assessmentId) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const list = [];
      for (const q of memoryStore.assessment_questions.values()) {
        if (q.assessment_id === assessmentId) {
          list.push(q);
        }
      }
      return list.sort((a, b) => a.question_number - b.question_number);
    }

    const queryText = `
      SELECT * FROM assessment_question 
      WHERE assessment_id = $1 
      ORDER BY question_number ASC;
    `;
    const { rows } = await pool.query(queryText, [assessmentId]);
    return rows;
  }
}

module.exports = AssessmentQuestion;
