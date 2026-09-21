const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class ClassFeedPost {
  static async create({
    classroom_id,
    author_id,
    type = 'Announcement',
    title,
    content,
    attachments = [],
  }) {
    const id = uuidv4();
    const created_at = new Date().toISOString();

    if (process.env.USE_MEMORY_DB === 'true') {
      const post = {
        id,
        classroom_id,
        author_id,
        type,
        title,
        content,
        attachments,
        created_at,
      };
      if (!memoryStore.class_feed) memoryStore.class_feed = new Map();
      memoryStore.class_feed.set(id, post);
      return post;
    }

    const queryText = `
      INSERT INTO class_feed_posts (id, classroom_id, author_id, type, title, content, attachments, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const { rows } = await pool.query(queryText, [
      id,
      classroom_id,
      author_id,
      type,
      title,
      content,
      JSON.stringify(attachments || []),
      created_at,
    ]);
    return rows[0];
  }

  static async findByClassroom(classroom_id) {
    if (!classroom_id) return [];
    if (process.env.USE_MEMORY_DB === 'true') {
      return Array.from(memoryStore.class_feed?.values() || [])
        .filter((p) => p.classroom_id === classroom_id)
        .map((p) => {
          const author = memoryStore.users?.get(p.author_id) || {};
          return {
            ...p,
            author_name: author.name || 'Instructor',
            author_role: author.role || 'TEACHER',
          };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const queryText = `
      SELECT p.*, u.name as author_name, u.role as author_role
      FROM class_feed_posts p
      LEFT JOIN users u ON u.id = p.author_id
      WHERE p.classroom_id = $1
      ORDER BY p.created_at DESC
    `;
    const { rows } = await pool.query(queryText, [classroom_id]);
    return rows;
  }
}

module.exports = ClassFeedPost;
