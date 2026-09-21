const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Classroom {
  static async create({
    code,
    name,
    subject,
    description,
    semester = 'Semester 4',
    academic_year = '2026-2027',
    join_code,
    created_by,
  }) {
    const id = uuidv4();
    const cleanJoinCode = (join_code || `SF-${code.replace(/[^A-Z0-9]/gi, '').toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`).trim();

    if (process.env.USE_MEMORY_DB === 'true') {
      const cls = {
        id,
        code,
        name,
        subject,
        description: description || null,
        semester,
        academic_year,
        join_code: cleanJoinCode,
        created_by,
        student_count: 0,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (!memoryStore.classrooms) memoryStore.classrooms = new Map();
      memoryStore.classrooms.set(id, cls);
      return cls;
    }

    const queryText = `
      INSERT INTO classrooms (id, code, name, subject, description, semester, academic_year, join_code, created_by, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
      RETURNING *;
    `;
    const { rows } = await pool.query(queryText, [
      id,
      code,
      name,
      subject,
      description,
      semester,
      academic_year,
      cleanJoinCode,
      created_by,
    ]);
    return rows[0];
  }

  static async findById(id) {
    if (!id) return null;
    if (process.env.USE_MEMORY_DB === 'true') {
      return memoryStore.classrooms?.get(id) || null;
    }
    const { rows } = await pool.query('SELECT * FROM classrooms WHERE id = $1', [id]);
    return rows[0] || null;
  }

  static async findByJoinCode(joinCode) {
    if (!joinCode) return null;
    const clean = joinCode.toUpperCase().trim();
    if (process.env.USE_MEMORY_DB === 'true') {
      for (const c of (memoryStore.classrooms?.values() || [])) {
        if (c.join_code?.toUpperCase() === clean) return { ...c };
      }
      return null;
    }
    const { rows } = await pool.query('SELECT * FROM classrooms WHERE UPPER(join_code) = $1', [clean]);
    return rows[0] || null;
  }

  static async findByTeacher(teacherId) {
    if (process.env.USE_MEMORY_DB === 'true') {
      return Array.from(memoryStore.classrooms?.values() || []).filter(
        (c) => c.created_by === teacherId || !teacherId
      );
    }
    const { rows } = await pool.query(
      `SELECT c.*, u.name as teacher_name,
        (SELECT COUNT(*)::int FROM student_enrollments se WHERE se.classroom_id = c.id AND se.status = 'ACTIVE') as student_count
       FROM classrooms c
       LEFT JOIN users u ON u.id = c.created_by
       WHERE c.created_by = $1
       ORDER BY c.created_at DESC`,
      [teacherId]
    );
    return rows;
  }

  static async findAll() {
    if (process.env.USE_MEMORY_DB === 'true') {
      return Array.from(memoryStore.classrooms?.values() || []);
    }
    const { rows } = await pool.query(
      `SELECT c.*, u.name as teacher_name,
        (SELECT COUNT(*)::int FROM student_enrollments se WHERE se.classroom_id = c.id AND se.status = 'ACTIVE') as student_count
       FROM classrooms c
       LEFT JOIN users u ON u.id = c.created_by
       ORDER BY c.created_at DESC`
    );
    return rows;
  }

  static async update(id, data) {
    if (process.env.USE_MEMORY_DB === 'true') {
      const cls = memoryStore.classrooms?.get(id);
      if (!cls) return null;
      Object.assign(cls, data, { updated_at: new Date().toISOString() });
      memoryStore.classrooms.set(id, cls);
      return cls;
    }

    const fields = [];
    const values = [];
    let idx = 1;
    for (const [k, v] of Object.entries(data)) {
      fields.push(`${k} = $${idx}`);
      values.push(v);
      idx++;
    }
    fields.push(`updated_at = NOW()`);
    values.push(id);

    const queryText = `UPDATE classrooms SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const { rows } = await pool.query(queryText, values);
    return rows[0] || null;
  }
}

module.exports = Classroom;
