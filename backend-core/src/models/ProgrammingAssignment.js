const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class ProgrammingAssignment {
  static async create({
    classroom_id,
    title,
    description,
    language = 'Python',
    starter_code = '',
    solution_code = null,
    cpu_time_limit = 2.0,
    memory_limit = 128000,
    due_date = null,
    created_by,
  }) {
    const id = uuidv4();
    const created_at = new Date().toISOString();

    if (process.env.USE_MEMORY_DB === 'true') {
      const assignment = {
        id,
        classroom_id,
        title,
        description,
        language,
        starter_code,
        solution_code,
        cpu_time_limit,
        memory_limit,
        due_date,
        created_by,
        created_at,
        updated_at: created_at,
      };
      if (!memoryStore.assignments) memoryStore.assignments = new Map();
      memoryStore.assignments.set(id, assignment);
      return assignment;
    }

    const queryText = `
      INSERT INTO programming_assignments (
        id, classroom_id, title, description, language, starter_code,
        solution_code, cpu_time_limit, memory_limit, due_date, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;
    const { rows } = await pool.query(queryText, [
      id,
      classroom_id,
      title,
      description,
      language,
      starter_code,
      solution_code,
      cpu_time_limit,
      memory_limit,
      due_date,
      created_by,
    ]);
    return rows[0];
  }

  static async findById(id) {
    if (!id) return null;
    if (process.env.USE_MEMORY_DB === 'true') {
      const a = memoryStore.assignments?.get(id);
      if (!a) return null;
      const testCases = Array.from(memoryStore.test_cases?.values() || []).filter((tc) => tc.assignment_id === id);
      return { ...a, test_cases: testCases };
    }
    try {
      const { rows } = await pool.query('SELECT * FROM programming_assignments WHERE id = $1', [id]);
      if (rows.length === 0) {
        const a = memoryStore.assignments?.get(id);
        if (!a) return null;
        const testCases = Array.from(memoryStore.test_cases?.values() || []).filter((tc) => tc.assignment_id === id);
        return { ...a, test_cases: testCases };
      }
      const assignment = rows[0];
      const { rows: testCases } = await pool.query(
        'SELECT * FROM test_cases WHERE assignment_id = $1 ORDER BY is_hidden ASC, created_at ASC',
        [id]
      );
      assignment.test_cases = testCases;
      return assignment;
    } catch (err) {
      const a = memoryStore.assignments?.get(id);
      if (a) {
        const testCases = Array.from(memoryStore.test_cases?.values() || []).filter((tc) => tc.assignment_id === id);
        return { ...a, test_cases: testCases };
      }
      return null;
    }
  }

  static async findByClassroom(classroom_id) {
    if (!classroom_id) return [];
    if (process.env.USE_MEMORY_DB === 'true') {
      return Array.from(memoryStore.assignments?.values() || []).filter((a) => a.classroom_id === classroom_id);
    }
    try {
      const { rows } = await pool.query(
        `SELECT pa.*, 
          (SELECT COUNT(*)::int FROM test_cases tc WHERE tc.assignment_id = pa.id) as test_case_count,
          (SELECT COUNT(*)::int FROM code_submissions cs WHERE cs.assignment_id = pa.id) as submission_count
         FROM programming_assignments pa
         WHERE pa.classroom_id = $1
         ORDER BY pa.created_at DESC`,
        [classroom_id]
      );
      return rows;
    } catch (err) {
      return Array.from(memoryStore.assignments?.values() || []).filter((a) => a.classroom_id === classroom_id);
    }
  }

  static async findAll() {
    if (process.env.USE_MEMORY_DB === 'true') {
      return Array.from(memoryStore.assignments?.values() || []);
    }
    try {
      const { rows } = await pool.query(
        `SELECT pa.*, c.name as classroom_name, u.name as teacher_name
         FROM programming_assignments pa
         JOIN classrooms c ON c.id = pa.classroom_id
         LEFT JOIN users u ON u.id = pa.created_by
         ORDER BY pa.created_at DESC`
      );
      return rows;
    } catch (err) {
      return Array.from(memoryStore.assignments?.values() || []);
    }
  }
}

module.exports = ProgrammingAssignment;
