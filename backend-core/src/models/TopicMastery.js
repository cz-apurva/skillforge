const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class TopicMastery {
  static async updateMastery({ student_id, classroom_id, topic, score }) {
    const id = uuidv4();
    const cleanScore = Math.max(0, Math.min(100, Number(score) || 0));

    if (process.env.USE_MEMORY_DB === 'true') {
      const key = `${student_id}_${classroom_id}_${topic}`;
      const existing = memoryStore.topic_mastery?.get(key) || {
        id,
        student_id,
        classroom_id,
        topic,
        mastery_score: cleanScore,
        total_evaluations: 0,
      };
      existing.total_evaluations += 1;
      // Exponential moving average update
      existing.mastery_score = Number(
        (existing.total_evaluations === 1 ? cleanScore : 0.4 * cleanScore + 0.6 * existing.mastery_score).toFixed(2)
      );
      existing.last_updated = new Date().toISOString();
      if (!memoryStore.topic_mastery) memoryStore.topic_mastery = new Map();
      memoryStore.topic_mastery.set(key, existing);
      return existing;
    }

    const queryText = `
      INSERT INTO topic_mastery (id, student_id, classroom_id, topic, mastery_score, total_evaluations, last_updated)
      VALUES ($1, $2, $3, $4, $5, 1, NOW())
      ON CONFLICT (student_id, classroom_id, topic)
      DO UPDATE SET
        mastery_score = ROUND(0.4 * EXCLUDED.mastery_score + 0.6 * topic_mastery.mastery_score, 2),
        total_evaluations = topic_mastery.total_evaluations + 1,
        last_updated = NOW()
      RETURNING *;
    `;
    const { rows } = await pool.query(queryText, [id, student_id, classroom_id, topic, cleanScore]);
    return rows[0];
  }

  static async findByStudent(student_id, classroom_id = null) {
    if (!student_id) return [];
    if (process.env.USE_MEMORY_DB === 'true') {
      return Array.from(memoryStore.topic_mastery?.values() || []).filter(
        (m) => m.student_id === student_id && (!classroom_id || m.classroom_id === classroom_id)
      );
    }
    let queryText = 'SELECT * FROM topic_mastery WHERE student_id = $1';
    const params = [student_id];
    if (classroom_id) {
      queryText += ' AND classroom_id = $2';
      params.push(classroom_id);
    }
    queryText += ' ORDER BY mastery_score ASC';
    const { rows } = await pool.query(queryText, params);
    return rows;
  }

  static async getCohortMastery(classroom_id) {
    if (!classroom_id) return [];
    if (process.env.USE_MEMORY_DB === 'true') {
      const records = Array.from(memoryStore.topic_mastery?.values() || []).filter(
        (m) => m.classroom_id === classroom_id
      );
      const grouped = {};
      for (const r of records) {
        if (!grouped[r.topic]) grouped[r.topic] = { total: 0, count: 0 };
        grouped[r.topic].total += Number(r.mastery_score);
        grouped[r.topic].count += 1;
      }
      return Object.entries(grouped).map(([topic, stat]) => ({
        topic,
        avg_mastery: Number((stat.total / stat.count).toFixed(2)),
        student_count: stat.count,
      }));
    }

    const queryText = `
      SELECT topic, 
        ROUND(AVG(mastery_score)::numeric, 2) as avg_mastery,
        COUNT(DISTINCT student_id)::int as student_count,
        MIN(mastery_score) as min_mastery,
        MAX(mastery_score) as max_mastery
      FROM topic_mastery
      WHERE classroom_id = $1
      GROUP BY topic
      ORDER BY avg_mastery ASC;
    `;
    const { rows } = await pool.query(queryText, [classroom_id]);
    return rows;
  }
}

module.exports = TopicMastery;
