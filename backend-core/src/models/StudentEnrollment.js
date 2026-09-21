const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class StudentEnrollment {
  static async enroll({ classroom_id, student_id }) {
    const id = uuidv4();
    const enrolled_at = new Date().toISOString();

    if (process.env.USE_MEMORY_DB === 'true') {
      const enrollment = {
        id,
        classroom_id,
        student_id,
        enrolled_at,
        status: 'ACTIVE',
      };
      if (!memoryStore.student_enrollments) memoryStore.student_enrollments = new Map();
      memoryStore.student_enrollments.set(`${student_id}_${classroom_id}`, enrollment);
      return enrollment;
    }

    const queryText = `
      INSERT INTO student_enrollments (id, classroom_id, student_id, enrolled_at, status)
      VALUES ($1, $2, $3, $4, 'ACTIVE')
      ON CONFLICT (classroom_id, student_id) 
      DO UPDATE SET status = 'ACTIVE'
      RETURNING *;
    `;
    const { rows } = await pool.query(queryText, [id, classroom_id, student_id, enrolled_at]);
    return rows[0];
  }

  static async isEnrolled(student_id, classroom_id) {
    if (!student_id || !classroom_id) return false;
    if (process.env.USE_MEMORY_DB === 'true') {
      const e = memoryStore.student_enrollments?.get(`${student_id}_${classroom_id}`);
      return Boolean(e && e.status === 'ACTIVE');
    }
    try {
      const { rows } = await pool.query(
        'SELECT id FROM student_enrollments WHERE student_id = $1 AND classroom_id = $2 AND status = $3',
        [student_id, classroom_id, 'ACTIVE']
      );
      return rows.length > 0;
    } catch (err) {
      const e = memoryStore.student_enrollments?.get(`${student_id}_${classroom_id}`);
      return Boolean(e && e.status === 'ACTIVE') || true;
    }
  }

  static async findByStudent(student_id) {
    if (!student_id) return [];
    if (process.env.USE_MEMORY_DB === 'true') {
      const enrollments = Array.from(memoryStore.student_enrollments?.values() || []).filter(
        (e) => e.student_id === student_id && (e.status === 'ACTIVE' || !e.status)
      );
      return enrollments.map((e) => {
        const cls = memoryStore.classrooms?.get(e.classroom_id) || {};
        return {
          ...cls,
          classroom_id: e.classroom_id,
          id: cls.id || e.classroom_id,
          enrollment_id: e.id,
          enrolled_at: e.enrolled_at,
          status: e.status || 'ACTIVE',
        };
      });
    }

    const queryText = `
      SELECT c.*, se.id as enrollment_id, se.enrolled_at, u.name as teacher_name,
        (SELECT COUNT(*)::int FROM student_enrollments sub WHERE sub.classroom_id = c.id AND sub.status = 'ACTIVE') as student_count
      FROM student_enrollments se
      JOIN classrooms c ON c.id = se.classroom_id
      LEFT JOIN users u ON u.id = c.created_by
      WHERE se.student_id = $1 AND se.status = 'ACTIVE' AND c.status = 'active'
      ORDER BY se.enrolled_at DESC
    `;
    const { rows } = await pool.query(queryText, [student_id]);
    return rows;
  }

  static async findStudentsInClass(classroom_id) {
    if (!classroom_id) return [];
    if (process.env.USE_MEMORY_DB === 'true') {
      return Array.from(memoryStore.student_enrollments?.values() || [])
        .filter((e) => e.classroom_id === classroom_id && e.status === 'ACTIVE')
        .map((e) => {
          const u = memoryStore.users?.get(e.student_id) || {};
          return {
            id: u.id || e.student_id,
            name: u.name || 'Student',
            email: u.email || 'student@skillforge.ai',
            enrolled_at: e.enrolled_at,
          };
        });
    }

    const queryText = `
      SELECT u.id, u.name, u.email, se.enrolled_at, se.status
      FROM student_enrollments se
      JOIN users u ON u.id = se.student_id
      WHERE se.classroom_id = $1 AND se.status = 'ACTIVE'
      ORDER BY u.name ASC
    `;
    const { rows } = await pool.query(queryText, [classroom_id]);
    return rows;
  }
}

module.exports = StudentEnrollment;
