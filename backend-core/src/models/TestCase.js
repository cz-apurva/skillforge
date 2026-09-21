const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class TestCase {
  static async create({
    assignment_id,
    name,
    input = '',
    expected_output,
    is_hidden = false,
    weight = 1.0,
    explanation = null,
  }) {
    const id = uuidv4();
    const created_at = new Date().toISOString();

    if (process.env.USE_MEMORY_DB === 'true') {
      const tc = {
        id,
        assignment_id,
        name,
        input,
        expected_output,
        is_hidden: Boolean(is_hidden),
        weight: Number(weight) || 1.0,
        explanation,
        created_at,
      };
      if (!memoryStore.test_cases) memoryStore.test_cases = new Map();
      memoryStore.test_cases.set(id, tc);
      return tc;
    }

    const queryText = `
      INSERT INTO test_cases (id, assignment_id, name, input, expected_output, is_hidden, weight, explanation, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const { rows } = await pool.query(queryText, [
      id,
      assignment_id,
      name,
      input,
      expected_output,
      Boolean(is_hidden),
      Number(weight) || 1.0,
      explanation,
      created_at,
    ]);
    return rows[0];
  }

  static async findByAssignment(assignment_id, includeHidden = false) {
    if (!assignment_id) return [];
    if (process.env.USE_MEMORY_DB === 'true') {
      return Array.from(memoryStore.test_cases?.values() || []).filter(
        (tc) => tc.assignment_id === assignment_id && (includeHidden || !tc.is_hidden)
      );
    }
    const queryText = includeHidden
      ? 'SELECT * FROM test_cases WHERE assignment_id = $1 ORDER BY is_hidden ASC, created_at ASC'
      : 'SELECT * FROM test_cases WHERE assignment_id = $1 AND is_hidden = false ORDER BY created_at ASC';
    const { rows } = await pool.query(queryText, [assignment_id]);
    return rows;
  }
}

module.exports = TestCase;
