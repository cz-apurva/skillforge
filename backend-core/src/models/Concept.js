const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Concept {
  static async create({
    id = null,
    classroom_id,
    classroomId,
    material_id = null,
    materialId = null,
    topic,
    name,
    description = null,
    prerequisites = [],
    common_misconceptions = [],
  }) {
    const finalId = id || uuidv4();
    const finalClassroomId = classroom_id || classroomId;
    const finalMaterialId = material_id || materialId;
    const finalPrereqs = Array.isArray(prerequisites) ? prerequisites : [];
    const finalMisconceptions = Array.isArray(common_misconceptions) ? common_misconceptions : [];

    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const newConcept = {
        id: finalId,
        classroom_id: finalClassroomId,
        material_id: finalMaterialId,
        topic,
        name,
        description,
        prerequisites: finalPrereqs,
        common_misconceptions: finalMisconceptions,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (!memoryStore.concepts) memoryStore.concepts = new Map();
      memoryStore.concepts.set(newConcept.id, newConcept);
      return newConcept;
    }

    const queryText = `
      INSERT INTO concepts (id, classroom_id, material_id, topic, name, description, prerequisites, common_misconceptions)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (classroom_id, topic, name) 
      DO UPDATE SET description = EXCLUDED.description, prerequisites = EXCLUDED.prerequisites, common_misconceptions = EXCLUDED.common_misconceptions, updated_at = NOW()
      RETURNING *;
    `;
    const values = [finalId, finalClassroomId, finalMaterialId, topic, name, description, finalPrereqs, finalMisconceptions];
    const { rows } = await pool.query(queryText, values);
    return rows[0];
  }

  static async findById(id) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return memoryStore.concepts?.get(id) || null;
    }
    const { rows } = await pool.query(`SELECT * FROM concepts WHERE id = $1;`, [id]);
    return rows[0] || null;
  }

  static async findByClassroom(classroomId) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return Array.from(memoryStore.concepts?.values() || []).filter(
        (c) => c.classroom_id === classroomId
      );
    }
    const { rows } = await pool.query(`SELECT * FROM concepts WHERE classroom_id = $1 ORDER BY topic, name;`, [classroomId]);
    return rows;
  }

  static async findByTopic(classroomId, topic) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return Array.from(memoryStore.concepts?.values() || []).filter(
        (c) => (c.classroom_id === classroomId || !classroomId) && c.topic?.toLowerCase() === topic?.toLowerCase()
      );
    }
    const { rows } = await pool.query(`SELECT * FROM concepts WHERE (classroom_id = $1 OR $1 IS NULL) AND LOWER(topic) = LOWER($2) ORDER BY name;`, [classroomId, topic]);
    return rows;
  }

  static async findByName(classroomId, name) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return Array.from(memoryStore.concepts?.values() || []).find(
        (c) => (c.classroom_id === classroomId || !classroomId) && c.name?.toLowerCase() === name?.toLowerCase()
      ) || null;
    }
    const { rows } = await pool.query(`SELECT * FROM concepts WHERE (classroom_id = $1 OR $1 IS NULL) AND LOWER(name) = LOWER($2) LIMIT 1;`, [classroomId, name]);
    return rows[0] || null;
  }

  static async findAll() {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      return Array.from(memoryStore.concepts?.values() || []);
    }
    const { rows } = await pool.query(`SELECT * FROM concepts ORDER BY created_at DESC;`);
    return rows;
  }
}

module.exports = Concept;
