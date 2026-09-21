const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Subject {
  static async create({ code, name, department, description = null }) {
    const id = uuidv4();
    const created_at = new Date().toISOString();

    if (process.env.USE_MEMORY_DB === 'true') {
      const sub = { id, code, name, department, description, created_at };
      if (!memoryStore.subjects) memoryStore.subjects = new Map();
      memoryStore.subjects.set(id, sub);
      return sub;
    }

    const queryText = `
      INSERT INTO subjects (id, code, name, department, description, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const { rows } = await pool.query(queryText, [id, code, name, department, description, created_at]);
    return rows[0];
  }

  static async findAll() {
    if (process.env.USE_MEMORY_DB === 'true') {
      return Array.from(memoryStore.subjects?.values() || []);
    }
    const { rows } = await pool.query('SELECT * FROM subjects ORDER BY code ASC');
    return rows;
  }
}

module.exports = Subject;
