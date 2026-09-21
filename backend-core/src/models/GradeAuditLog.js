const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class GradeAuditLog {
  static async create(payload) {
    const id = payload.id || uuidv4();
    const actor = payload.actor || payload.performed_by || 'SYSTEM';
    const role = (payload.role || payload.performed_by_role || 'SYSTEM').toUpperCase();
    const action = payload.action || 'SYSTEM_ACTION';
    const target =
      payload.target ||
      (payload.written_submission_id ? `submission:${payload.written_submission_id}` : null) ||
      (payload.anonymous_submission_id ? `anon-submission:${payload.anonymous_submission_id}` : null) ||
      (payload.class_id ? `class:${payload.class_id}` : null) ||
      (payload.assessment_id ? `assessment:${payload.assessment_id}` : null) ||
      'system:platform';

    const old_value =
      payload.old_value !== undefined
        ? payload.old_value
        : payload.previous_state !== undefined
        ? payload.previous_state
        : null;

    const new_value =
      payload.new_value !== undefined
        ? payload.new_value
        : payload.new_state !== undefined
        ? payload.new_state
        : null;

    const reason =
      payload.reason ||
      (payload.new_state && payload.new_state.reason) ||
      (payload.previous_state && payload.previous_state.reason) ||
      '';

    const timestamp = payload.timestamp || payload.created_at || new Date().toISOString();
    const ip_address = payload.ip_address || '127.0.0.1';

    const logRecord = {
      id,
      actor,
      role,
      action,
      target,
      old_value,
      new_value,
      reason,
      timestamp,
      // Backward-compatible alias fields for legacy readers
      created_at: timestamp,
      performed_by: actor,
      performed_by_role: role,
      previous_state: old_value || {},
      new_state: new_value || {},
      written_submission_id: payload.written_submission_id || null,
      anonymous_submission_id: payload.anonymous_submission_id || null,
      class_id: payload.class_id || null,
      assessment_id: payload.assessment_id || null,
      teacher_id: payload.teacher_id || null,
      ip_address,
    };

    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      memoryStore.grade_audit_logs.set(id, logRecord);
      return logRecord;
    }

    try {
      const queryText = `
        INSERT INTO grade_audit_log (
          id, written_submission_id, anonymous_submission_id, action,
          performed_by, performed_by_role, previous_state, new_state, ip_address, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *;
      `;
      const values = [
        id,
        logRecord.written_submission_id,
        logRecord.anonymous_submission_id,
        action,
        actor,
        role,
        JSON.stringify(old_value || {}),
        JSON.stringify(new_value || {}),
        ip_address,
        timestamp,
      ];
      await pool.query(queryText, values);
    } catch {
      // Fallback in case PostgreSQL is offline or schema differs
      memoryStore.grade_audit_logs.set(id, logRecord);
    }

    return logRecord;
  }

  static async findAll({ search, action, role } = {}) {
    let logs = [];
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      logs = Array.from(memoryStore.grade_audit_logs.values());
    } else {
      try {
        const queryText = `SELECT * FROM grade_audit_log ORDER BY created_at DESC;`;
        const { rows } = await pool.query(queryText);
        logs = rows.map((r) => ({
          id: r.id,
          actor: r.performed_by || 'SYSTEM',
          role: r.performed_by_role || 'SYSTEM',
          action: r.action,
          target: r.written_submission_id ? `submission:${r.written_submission_id}` : 'system',
          old_value: r.previous_state,
          new_value: r.new_state,
          reason: r.new_state?.reason || '',
          timestamp: r.created_at,
          created_at: r.created_at,
          performed_by: r.performed_by,
          performed_by_role: r.performed_by_role,
          previous_state: r.previous_state,
          new_state: r.new_state,
          written_submission_id: r.written_submission_id,
          anonymous_submission_id: r.anonymous_submission_id,
        }));
      } catch {
        logs = Array.from(memoryStore.grade_audit_logs.values());
      }
    }

    // Sort descending by timestamp
    logs.sort((a, b) => new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at));

    if (action && action !== 'ALL') {
      logs = logs.filter((l) => l.action === action);
    }
    if (role && role !== 'ALL') {
      logs = logs.filter((l) => l.role === role.toUpperCase());
    }
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      logs = logs.filter(
        (l) =>
          (l.actor && l.actor.toLowerCase().includes(q)) ||
          (l.action && l.action.toLowerCase().includes(q)) ||
          (l.target && l.target.toLowerCase().includes(q)) ||
          (l.reason && l.reason.toLowerCase().includes(q)) ||
          (l.id && l.id.toLowerCase().includes(q))
      );
    }

    return logs;
  }

  /**
   * Filtered slice for teachers: only their own classes and assessments
   */
  static async findForTeacher({ teacherId, classIds = [], assessmentIds = [] }) {
    const allLogs = await this.findAll();

    const classSet = new Set((classIds || []).map((id) => String(id)));
    const assessmentSet = new Set((assessmentIds || []).map((id) => String(id)));

    return allLogs.filter((log) => {
      // Direct teacher actions or ownership
      if (log.teacher_id && log.teacher_id === teacherId) return true;
      if (log.actor && (log.actor === teacherId || log.actor.includes(teacherId))) return true;

      // Class-scoped actions
      if (log.class_id && classSet.has(String(log.class_id))) return true;
      if (log.target && Array.from(classSet).some((cId) => log.target.includes(cId))) return true;

      // Assessment-scoped actions
      if (log.assessment_id && assessmentSet.has(String(log.assessment_id))) return true;
      if (log.target && Array.from(assessmentSet).some((aId) => log.target.includes(aId))) return true;

      // Explicit teacher audit actions on submissions/rubrics in their scope
      if (
        (log.action === 'ASSESSMENT_CREATED' ||
          log.action === 'RUBRIC_MODIFIED' ||
          log.action === 'GRADE_GENERATED' ||
          log.action === 'GRADE_MODIFIED' ||
          log.action === 'GRADE_APPEALED' ||
          log.action === 'GRADE_REVIEWED' ||
          log.action === 'CLASS_CREATED') &&
        (log.performed_by === teacherId || (log.teacher_id && log.teacher_id === teacherId))
      ) {
        return true;
      }

      return false;
    });
  }
}

module.exports = GradeAuditLog;
