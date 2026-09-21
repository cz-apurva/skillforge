const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class LearningMaterial {
  static async create({
    classroom_id,
    title,
    topic,
    file_name,
    file_type,
    extracted_text,
    taxonomy = {},
    uploaded_by,
  }) {
    const id = uuidv4();
    const created_at = new Date().toISOString();

    if (process.env.USE_MEMORY_DB === 'true') {
      const mat = {
        id,
        classroom_id,
        title,
        topic,
        file_name,
        file_type,
        extracted_text,
        taxonomy,
        uploaded_by,
        created_at,
      };
      if (!memoryStore.learning_materials) memoryStore.learning_materials = new Map();
      memoryStore.learning_materials.set(id, mat);
      return mat;
    }

    const queryText = `
      INSERT INTO learning_materials (
        id, classroom_id, title, topic, file_name, file_type,
        extracted_text, taxonomy, uploaded_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    const { rows } = await pool.query(queryText, [
      id,
      classroom_id,
      title,
      topic,
      file_name,
      file_type,
      extracted_text,
      JSON.stringify(taxonomy || {}),
      uploaded_by,
      created_at,
    ]);
    return rows[0];
  }

  static async findById(id) {
    if (!id) return null;
    if (process.env.USE_MEMORY_DB === 'true') {
      return memoryStore.learning_materials?.get(id) || null;
    }
    const { rows } = await pool.query('SELECT * FROM learning_materials WHERE id = $1', [id]);
    return rows[0] || null;
  }

  static async findByClassroom(classroom_id) {
    if (!classroom_id) return [];
    if (process.env.USE_MEMORY_DB === 'true') {
      return Array.from(memoryStore.learning_materials?.values() || [])
        .filter((m) => m.classroom_id === classroom_id || classroom_id === 'all')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    const { rows } = await pool.query(
      `SELECT m.*, u.name as uploader_name
       FROM learning_materials m
       LEFT JOIN users u ON u.id = m.uploaded_by
       WHERE m.classroom_id = $1
       ORDER BY m.created_at DESC`,
      [classroom_id]
    );
    return rows;
  }

  static async findAll() {
    if (process.env.USE_MEMORY_DB === 'true') {
      return Array.from(memoryStore.learning_materials?.values() || []);
    }
    const { rows } = await pool.query(
      `SELECT m.*, c.name as classroom_name, u.name as uploader_name
       FROM learning_materials m
       JOIN classrooms c ON c.id = m.classroom_id
       LEFT JOIN users u ON u.id = m.uploaded_by
       ORDER BY m.created_at DESC`
    );
    return rows;
  }

  static async delete(id) {
    if (process.env.USE_MEMORY_DB === 'true') {
      return memoryStore.learning_materials?.delete(id);
    }
    await pool.query('DELETE FROM learning_materials WHERE id = $1', [id]);
    return true;
  }
}

module.exports = LearningMaterial;
