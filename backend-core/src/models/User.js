const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

class User {
  static async _initDemoUsersIfNeeded() {
    if (!memoryStore.users) memoryStore.users = new Map();
    if (memoryStore.users.size === 0) {
      const salt = bcrypt.genSaltSync(10);
      const defaultHash = bcrypt.hashSync('Password123!', salt);

      const demoUsers = [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'System Administrator',
          email: 'admin@skillforge.ai',
          password_hash: defaultHash,
          role: 'ADMIN',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Prof. A. Anupam',
          email: 'teacher@skillforge.ai',
          password_hash: defaultHash,
          role: 'TEACHER',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
        },
        {
          id: '33333333-3333-4333-8333-333333333331',
          name: 'Alice Smith',
          email: 'student@skillforge.ai',
          password_hash: defaultHash,
          role: 'STUDENT',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
        },
        {
          id: '33333333-3333-4333-8333-333333333332',
          name: 'Bob Johnson',
          email: 'bob@skillforge.ai',
          password_hash: defaultHash,
          role: 'STUDENT',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
        },
      ];

      for (const u of demoUsers) {
        memoryStore.users.set(u.id, u);
      }
    }
  }

  static async findByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();

    if (process.env.USE_MEMORY_DB === 'true') {
      await this._initDemoUsersIfNeeded();
      for (const u of memoryStore.users.values()) {
        if (u.email?.toLowerCase() === cleanEmail) {
          return { ...u };
        }
      }
      return null;
    }

    try {
      const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (res.rows.length > 0) return res.rows[0];
      return null;
    } catch {
      await this._initDemoUsersIfNeeded();
      for (const u of memoryStore.users.values()) {
        if (u.email?.toLowerCase() === cleanEmail) {
          return { ...u };
        }
      }
      return null;
    }
  }

  static async findById(id) {
    if (!id) return null;

    if (process.env.USE_MEMORY_DB === 'true') {
      await this._initDemoUsersIfNeeded();
      const user = memoryStore.users.get(id);
      return user ? { ...user } : null;
    }

    try {
      const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (res.rows.length > 0) return res.rows[0];
      return null;
    } catch {
      await this._initDemoUsersIfNeeded();
      const user = memoryStore.users.get(id);
      return user ? { ...user } : null;
    }
  }

  static async findByResetToken(token) {
    if (!token) return null;

    if (process.env.USE_MEMORY_DB === 'true') {
      await this._initDemoUsersIfNeeded();
      for (const u of memoryStore.users.values()) {
        if (u.reset_token === token) {
          return { ...u };
        }
      }
      return null;
    }

    try {
      const res = await pool.query(
        'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
        [token]
      );
      return res.rows[0] || null;
    } catch {
      return null;
    }
  }

  static async create({ name, email, password, role = 'STUDENT', status = 'ACTIVE' }) {
    const id = uuidv4();
    const cleanEmail = email.toLowerCase().trim();
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);
    const created_at = new Date().toISOString();

    const newUser = {
      id,
      name,
      email: cleanEmail,
      password_hash,
      role: role.toUpperCase(),
      status,
      created_at,
      updated_at: created_at,
    };

    if (process.env.USE_MEMORY_DB === 'true') {
      await this._initDemoUsersIfNeeded();
      memoryStore.users.set(id, newUser);
      return { ...newUser };
    }

    try {
      const queryText = `
        INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;
      const { rows } = await pool.query(queryText, [
        id,
        name,
        cleanEmail,
        password_hash,
        role.toUpperCase(),
        status,
        created_at,
        created_at,
      ]);
      return rows[0];
    } catch (err) {
      await this._initDemoUsersIfNeeded();
      memoryStore.users.set(id, newUser);
      return { ...newUser };
    }
  }

  static async update(id, data) {
    if (process.env.USE_MEMORY_DB === 'true') {
      await this._initDemoUsersIfNeeded();
      const user = memoryStore.users.get(id);
      if (!user) return null;
      Object.assign(user, data, { updated_at: new Date().toISOString() });
      memoryStore.users.set(id, user);
      return { ...user };
    }

    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, val] of Object.entries(data)) {
      fields.push(`${key} = $${idx}`);
      values.push(val);
      idx++;
    }
    fields.push(`updated_at = NOW()`);
    values.push(id);

    try {
      const queryText = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
      const { rows } = await pool.query(queryText, values);
      return rows[0] || null;
    } catch {
      return null;
    }
  }

  static async setResetToken(id, token, expiresAt) {
    return this.update(id, {
      reset_token: token,
      reset_token_expires: expiresAt,
    });
  }

  static async updateResetToken(id, token, expiresAt) {
    return this.setResetToken(id, token, expiresAt);
  }

  static async resetPassword(id, newPassword) {
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(newPassword, salt);
    return this.update(id, {
      password_hash,
      reset_token: null,
      reset_token_expires: null,
    });
  }

  static async updatePassword(id, newPassword) {
    return this.resetPassword(id, newPassword);
  }

  static async findAll() {
    if (process.env.USE_MEMORY_DB === 'true') {
      await this._initDemoUsersIfNeeded();
      return Array.from(memoryStore.users.values());
    }

    try {
      const res = await pool.query('SELECT id, email, role, name, status, created_at, updated_at FROM users ORDER BY created_at DESC');
      return res.rows;
    } catch {
      await this._initDemoUsersIfNeeded();
      return Array.from(memoryStore.users.values());
    }
  }

  static async delete(id) {
    if (process.env.USE_MEMORY_DB === 'true') {
      await this._initDemoUsersIfNeeded();
      return memoryStore.users.delete(id);
    }
    try {
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
      return true;
    } catch {
      return false;
    }
  }

  static async verifyPassword(user, plainPassword) {
    if (!user || !user.password_hash || !plainPassword) return false;
    return bcrypt.compare(plainPassword, user.password_hash);
  }
}

module.exports = User;
