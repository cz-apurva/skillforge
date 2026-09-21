const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class CodeSubmission {
  static async create({
    assignment_id,
    student_id,
    source_code,
    language,
    status = 'SUBMITTED',
    execution_time = null,
    memory_used = null,
    passed_test_cases = 0,
    total_test_cases = 0,
    code_grade_score = 0.0,
    qualitative_review = {},
  }) {
    const id = uuidv4();
    const submitted_at = new Date().toISOString();

    if (process.env.USE_MEMORY_DB === 'true') {
      const sub = {
        id,
        assignment_id,
        student_id,
        source_code,
        language,
        status,
        execution_time,
        memory_used,
        passed_test_cases,
        total_test_cases,
        code_grade_score: Number(code_grade_score) || 0.0,
        qualitative_review,
        submitted_at,
      };
      if (!memoryStore.code_submissions) memoryStore.code_submissions = new Map();
      memoryStore.code_submissions.set(id, sub);
      return sub;
    }

    const queryText = `
      INSERT INTO code_submissions (
        id, assignment_id, student_id, source_code, language, status,
        execution_time, memory_used, passed_test_cases, total_test_cases,
        code_grade_score, qualitative_review, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;
    const { rows } = await pool.query(queryText, [
      id,
      assignment_id,
      student_id,
      source_code,
      language,
      status,
      execution_time,
      memory_used,
      passed_test_cases,
      total_test_cases,
      Number(code_grade_score) || 0.0,
      JSON.stringify(qualitative_review || {}),
      submitted_at,
    ]);
    return rows[0];
  }

  static async findById(id) {
    if (!id) return null;
    if (process.env.USE_MEMORY_DB === 'true') {
      return memoryStore.code_submissions?.get(id) || null;
    }
    const { rows } = await pool.query(
      `SELECT cs.*, pa.title as assignment_title, u.name as student_name, u.email as student_email
       FROM code_submissions cs
       JOIN programming_assignments pa ON pa.id = cs.assignment_id
       JOIN users u ON u.id = cs.student_id
       WHERE cs.id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  static async findByStudent(student_id) {
    if (!student_id) return [];
    if (process.env.USE_MEMORY_DB === 'true') {
      return Array.from(memoryStore.code_submissions?.values() || [])
        .filter((s) => s.student_id === student_id)
        .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    }
    const { rows } = await pool.query(
      `SELECT cs.*, pa.title as assignment_title, pa.language as assignment_language, c.name as classroom_name
       FROM code_submissions cs
       JOIN programming_assignments pa ON pa.id = cs.assignment_id
       JOIN classrooms c ON c.id = pa.classroom_id
       WHERE cs.student_id = $1
       ORDER BY cs.submitted_at DESC`,
      [student_id]
    );
    return rows;
  }

  static async findByAssignment(assignment_id) {
    if (!assignment_id) return [];
    if (process.env.USE_MEMORY_DB === 'true') {
      return Array.from(memoryStore.code_submissions?.values() || []).filter((s) => s.assignment_id === assignment_id);
    }
    const { rows } = await pool.query(
      `SELECT cs.*, u.name as student_name, u.email as student_email
       FROM code_submissions cs
       JOIN users u ON u.id = cs.student_id
       WHERE cs.assignment_id = $1
       ORDER BY cs.submitted_at DESC`,
      [assignment_id]
    );
    return rows;
  }

  static async update(id, data) {
    if (process.env.USE_MEMORY_DB === 'true') {
      const sub = memoryStore.code_submissions?.get(id);
      if (!sub) return null;
      Object.assign(sub, data);
      memoryStore.code_submissions.set(id, sub);
      return sub;
    }
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [k, v] of Object.entries(data)) {
      fields.push(`${k} = $${idx}`);
      values.push(typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
      idx++;
    }
    values.push(id);
    const queryText = `UPDATE code_submissions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const { rows } = await pool.query(queryText, values);
    return rows[0] || null;
  }
}

module.exports = CodeSubmission;
