const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class ChatSession {
  static async create({ user_id, classroom_id = null, assignment_id = null, title = 'Socratic Discussion' }) {
    const id = uuidv4();
    const created_at = new Date().toISOString();

    if (process.env.USE_MEMORY_DB === 'true') {
      const session = {
        id,
        user_id,
        classroom_id,
        assignment_id,
        title,
        created_at,
        updated_at: created_at,
      };
      if (!memoryStore.chat_sessions) memoryStore.chat_sessions = new Map();
      memoryStore.chat_sessions.set(id, session);
      return session;
    }

    const queryText = `
      INSERT INTO chat_sessions (id, user_id, classroom_id, assignment_id, title, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const { rows } = await pool.query(queryText, [
      id,
      user_id,
      classroom_id,
      assignment_id,
      title,
      created_at,
      created_at,
    ]);
    return rows[0];
  }

  static async findByUser(user_id) {
    if (!user_id) return [];
    if (process.env.USE_MEMORY_DB === 'true') {
      return Array.from(memoryStore.chat_sessions?.values() || [])
        .filter((s) => s.user_id === user_id)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    }
    const { rows } = await pool.query(
      'SELECT * FROM chat_sessions WHERE user_id = $1 ORDER BY updated_at DESC',
      [user_id]
    );
    return rows;
  }

  static async findById(id) {
    if (!id) return null;
    if (process.env.USE_MEMORY_DB === 'true') {
      return memoryStore.chat_sessions?.get(id) || null;
    }
    const { rows } = await pool.query('SELECT * FROM chat_sessions WHERE id = $1', [id]);
    return rows[0] || null;
  }
}

class ChatMessage {
  static async create({ session_id, role, message_text, sources = [], guardrail_triggered = false }) {
    const id = uuidv4();
    const created_at = new Date().toISOString();

    if (process.env.USE_MEMORY_DB === 'true') {
      const msg = {
        id,
        session_id,
        role: role.toUpperCase(),
        message_text,
        sources,
        guardrail_triggered: Boolean(guardrail_triggered),
        created_at,
      };
      if (!memoryStore.chat_messages) memoryStore.chat_messages = new Map();
      memoryStore.chat_messages.set(id, msg);
      return msg;
    }

    const queryText = `
      INSERT INTO chat_messages (id, session_id, role, message_text, sources, guardrail_triggered, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const { rows } = await pool.query(queryText, [
      id,
      session_id,
      role.toUpperCase(),
      message_text,
      JSON.stringify(sources || []),
      Boolean(guardrail_triggered),
      created_at,
    ]);

    // Update session timestamp
    await pool.query('UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1', [session_id]).catch(() => {});

    return rows[0];
  }

  static async findBySession(session_id) {
    if (!session_id) return [];
    if (process.env.USE_MEMORY_DB === 'true') {
      return Array.from(memoryStore.chat_messages?.values() || [])
        .filter((m) => m.session_id === session_id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }
    const { rows } = await pool.query(
      'SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
      [session_id]
    );
    return rows;
  }
}

module.exports = {
  ChatSession,
  ChatMessage,
};
