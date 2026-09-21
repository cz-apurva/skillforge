const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Notification {
  static async create({
    recipient_id = null,
    recipient_role,
    type,
    title,
    message,
    record_type = 'general',
    record_id = null,
    metadata = {},
    priority = 'MEDIUM',
  }) {
    if (!recipient_role) {
      throw new Error('recipient_role is required for notification dispatch');
    }
    if (!title || !message) {
      throw new Error('title and message are required for notification dispatch');
    }

    const id = uuidv4();
    const created_at = new Date().toISOString();

    const record = {
      id,
      recipient_id: recipient_id || null,
      recipient_role: recipient_role.toUpperCase(),
      type: type || 'GENERAL_NOTIFICATION',
      title,
      message,
      record_type,
      record_id: record_id ? String(record_id) : null,
      metadata: metadata || {},
      priority: priority.toUpperCase(),
      is_read: false,
      read_at: null,
      created_at,
    };

    if (process.env.USE_MEMORY_DB === 'true') {
      if (!memoryStore.notifications) memoryStore.notifications = new Map();
      memoryStore.notifications.set(id, record);
      return record;
    }

    try {
      const queryText = `
        INSERT INTO notifications (
          id, recipient_id, recipient_role, type, title, message,
          record_type, record_id, metadata, priority, is_read, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *;
      `;
      const { rows } = await pool.query(queryText, [
        record.id,
        record.recipient_id,
        record.recipient_role,
        record.type,
        record.title,
        record.message,
        record.record_type,
        record.record_id,
        JSON.stringify(record.metadata),
        record.priority,
        record.is_read,
        record.created_at,
      ]);
      return rows[0] || record;
    } catch (err) {
      if (!memoryStore.notifications) memoryStore.notifications = new Map();
      memoryStore.notifications.set(id, record);
      return record;
    }
  }

  static _filterInMemory({ user_id, role, is_read, type, limit = 50 }) {
    if (!memoryStore.notifications) memoryStore.notifications = new Map();
    let all = Array.from(memoryStore.notifications.values());
    if (role && user_id) {
      all = all.filter(
        (n) =>
          n.recipient_id === user_id ||
          (n.recipient_role === role.toUpperCase() && (!n.recipient_id || n.recipient_id === 'all' || n.recipient_id === user_id))
      );
    } else if (user_id) {
      all = all.filter((n) => n.recipient_id === user_id || !n.recipient_id);
    } else if (role) {
      all = all.filter((n) => n.recipient_role === role.toUpperCase());
    }
    if (is_read !== null && is_read !== undefined && is_read !== '') {
      const readBool = String(is_read) === 'true';
      all = all.filter((n) => Boolean(n.is_read) === readBool);
    }
    if (type && type !== 'ALL') {
      all = all.filter((n) => n.type === type.toUpperCase());
    }
    all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return all.slice(0, limit);
  }

  static async findForUser({ user_id = null, role = null, is_read = null, type = null, limit = 50 } = {}) {
    if (process.env.USE_MEMORY_DB === 'true') {
      return this._filterInMemory({ user_id, role, is_read, type, limit });
    }

    try {
      let queryText = 'SELECT * FROM notifications WHERE 1=1';
      const params = [];
      let idx = 1;

      if (user_id && role) {
        queryText += ` AND (recipient_id = $${idx} OR (recipient_role = $${idx + 1} AND recipient_id IS NULL))`;
        params.push(user_id, role.toUpperCase());
        idx += 2;
      } else if (user_id) {
        queryText += ` AND (recipient_id = $${idx} OR recipient_id IS NULL)`;
        params.push(user_id);
        idx++;
      } else if (role) {
        queryText += ` AND recipient_role = $${idx}`;
        params.push(role.toUpperCase());
        idx++;
      }

      if (is_read !== null && is_read !== undefined && is_read !== '') {
        queryText += ` AND is_read = $${idx}`;
        params.push(String(is_read) === 'true');
        idx++;
      }

      if (type && type !== 'ALL') {
        queryText += ` AND type = $${idx}`;
        params.push(type.toUpperCase());
        idx++;
      }

      queryText += ` ORDER BY created_at DESC LIMIT $${idx}`;
      params.push(Number(limit) || 50);

      const { rows } = await pool.query(queryText, params);
      return rows;
    } catch {
      return this._filterInMemory({ user_id, role, is_read, type, limit });
    }
  }

  static async markAsRead(id, user_id = null) {
    if (process.env.USE_MEMORY_DB === 'true') {
      if (!memoryStore.notifications) memoryStore.notifications = new Map();
      const notif = memoryStore.notifications.get(id);
      if (!notif) return null;
      notif.is_read = true;
      notif.read_at = new Date().toISOString();
      memoryStore.notifications.set(id, notif);
      return notif;
    }

    try {
      const { rows } = await pool.query(
        'UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 RETURNING *',
        [id]
      );
      if (rows && rows.length > 0) return rows[0];
      if (!memoryStore.notifications) memoryStore.notifications = new Map();
      const notif = memoryStore.notifications.get(id);
      if (notif) {
        notif.is_read = true;
        notif.read_at = new Date().toISOString();
        memoryStore.notifications.set(id, notif);
        return notif;
      }
      return null;
    } catch {
      if (!memoryStore.notifications) memoryStore.notifications = new Map();
      const notif = memoryStore.notifications.get(id);
      if (!notif) return null;
      notif.is_read = true;
      notif.read_at = new Date().toISOString();
      memoryStore.notifications.set(id, notif);
      return notif;
    }
  }

  static async markAllAsRead({ user_id = null, role = null } = {}) {
    if (process.env.USE_MEMORY_DB === 'true') {
      if (!memoryStore.notifications) memoryStore.notifications = new Map();
      let updatedCount = 0;
      const now = new Date().toISOString();
      for (const [id, notif] of memoryStore.notifications.entries()) {
        let matches = false;
        if (user_id && notif.recipient_id === user_id) matches = true;
        if (role && notif.recipient_role === role.toUpperCase() && (!notif.recipient_id || notif.recipient_id === 'all' || notif.recipient_id === user_id)) matches = true;
        if (matches && !notif.is_read) {
          notif.is_read = true;
          notif.read_at = now;
          memoryStore.notifications.set(id, notif);
          updatedCount++;
        }
      }
      return { updated_count: updatedCount };
    }

    try {
      let queryText = 'UPDATE notifications SET is_read = true, read_at = NOW() WHERE is_read = false';
      const params = [];
      let idx = 1;
      if (user_id && role) {
        queryText += ` AND (recipient_id = $${idx} OR (recipient_role = $${idx + 1} AND recipient_id IS NULL))`;
        params.push(user_id, role.toUpperCase());
        idx += 2;
      } else if (user_id) {
        queryText += ` AND (recipient_id = $${idx} OR recipient_id IS NULL)`;
        params.push(user_id);
        idx++;
      } else if (role) {
        queryText += ` AND recipient_role = $${idx}`;
        params.push(role.toUpperCase());
      }
      const { rowCount } = await pool.query(queryText, params);
      return { updated_count: rowCount };
    } catch {
      if (!memoryStore.notifications) memoryStore.notifications = new Map();
      let updatedCount = 0;
      const now = new Date().toISOString();
      for (const [id, notif] of memoryStore.notifications.entries()) {
        let matches = false;
        if (user_id && notif.recipient_id === user_id) matches = true;
        if (role && notif.recipient_role === role.toUpperCase() && (!notif.recipient_id || notif.recipient_id === 'all' || notif.recipient_id === user_id)) matches = true;
        if (matches && !notif.is_read) {
          notif.is_read = true;
          notif.read_at = now;
          memoryStore.notifications.set(id, notif);
          updatedCount++;
        }
      }
      return { updated_count: updatedCount };
    }
  }

  static async _resetForTesting() {
    if (memoryStore.notifications) {
      memoryStore.notifications.clear();
    }
  }
}

module.exports = Notification;
