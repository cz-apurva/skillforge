const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class TeacherRecommendation {
  static async create({
    teacher_id,
    classroom_id,
    topic,
    priority = 'MEDIUM',
    action_type,
    title,
    suggested_action,
    suggested_discussion_starter = null,
    recommended_remedy = {},
  }) {
    const id = uuidv4();
    const created_at = new Date().toISOString();

    if (process.env.USE_MEMORY_DB === 'true') {
      const rec = {
        id,
        teacher_id,
        classroom_id,
        topic,
        priority: priority.toUpperCase(),
        action_type: action_type.toUpperCase(),
        title,
        suggested_action,
        suggested_discussion_starter,
        recommended_remedy,
        status: 'PENDING',
        created_at,
        updated_at: created_at,
      };
      if (!memoryStore.teacher_recommendations) memoryStore.teacher_recommendations = new Map();
      memoryStore.teacher_recommendations.set(id, rec);
      return rec;
    }

    const queryText = `
      INSERT INTO teacher_recommendations (
        id, teacher_id, classroom_id, topic, priority, action_type,
        title, suggested_action, suggested_discussion_starter, recommended_remedy, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', $11, $11)
      RETURNING *;
    `;
    const { rows } = await pool.query(queryText, [
      id,
      teacher_id,
      classroom_id,
      topic,
      priority.toUpperCase(),
      action_type.toUpperCase(),
      title,
      suggested_action,
      suggested_discussion_starter,
      JSON.stringify(recommended_remedy || {}),
      created_at,
    ]);
    return rows[0];
  }

  static async findByTeacher(teacher_id, classroom_id = null) {
    if (!teacher_id) return [];
    if (process.env.USE_MEMORY_DB === 'true') {
      return Array.from(memoryStore.teacher_recommendations?.values() || [])
        .filter((r) => r.teacher_id === teacher_id && (!classroom_id || r.classroom_id === classroom_id))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    let queryText = 'SELECT * FROM teacher_recommendations WHERE teacher_id = $1';
    const params = [teacher_id];
    if (classroom_id) {
      queryText += ' AND classroom_id = $2';
      params.push(classroom_id);
    }
    queryText += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(queryText, params);
    return rows;
  }

  static async updateStatus(id, status) {
    if (process.env.USE_MEMORY_DB === 'true') {
      const r = memoryStore.teacher_recommendations?.get(id);
      if (!r) return null;
      r.status = status;
      r.updated_at = new Date().toISOString();
      memoryStore.teacher_recommendations.set(id, r);
      return r;
    }
    const { rows } = await pool.query(
      'UPDATE teacher_recommendations SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );
    return rows[0] || null;
  }
}

module.exports = TeacherRecommendation;
