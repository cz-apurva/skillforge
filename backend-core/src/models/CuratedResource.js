const { query, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class CuratedResource {
  /**
   * Create a new curated resource
   */
  static async create({
    id,
    title,
    url,
    source = 'YouTube',
    description = '',
    relevance_score = 0.85,
    topic,
    subtopics = [],
    difficulty_fit = 'Appropriate',
    educational_usefulness = 'High',
    approved_status = 'PENDING',
    classroom_id = 'cls-mca-402',
    teacher_id = 'teacher-001-uuid',
    material_id = null,
    thumbnail_url = null,
    metadata = {},
  }) {
    const resourceId = id || `res-${uuidv4()}`;
    const now = new Date().toISOString();

    const resource = {
      id: resourceId,
      title: title || 'Curated Resource',
      url: url || '',
      source: source || 'External Provider',
      description: description || '',
      relevance_score: typeof relevance_score === 'number' ? relevance_score : 0.85,
      topic: topic || 'Academic Topic',
      subtopics: Array.isArray(subtopics) ? subtopics : [],
      difficulty_fit: difficulty_fit || 'Appropriate',
      educational_usefulness: educational_usefulness || 'High',
      approved_status: approved_status || 'PENDING', // PENDING, APPROVED, REJECTED
      classroom_id: classroom_id || 'cls-all',
      teacher_id: teacher_id || 'teacher-001-uuid',
      material_id: material_id || null,
      thumbnail_url: thumbnail_url || null,
      metadata: metadata || {},
      created_at: now,
      updated_at: now,
      approved_at: approved_status === 'APPROVED' ? now : null,
      approved_by: approved_status === 'APPROVED' ? teacher_id : null,
    };

    const res = await query(
      `INSERT INTO curated_resources 
       (id, title, url, source, description, relevance_score, topic, subtopics, difficulty_fit, educational_usefulness, approved_status, classroom_id, teacher_id, material_id, thumbnail_url, metadata, created_at, updated_at, approved_at, approved_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       RETURNING *`,
      [
        resource.id,
        resource.title,
        resource.url,
        resource.source,
        resource.description,
        resource.relevance_score,
        resource.topic,
        JSON.stringify(resource.subtopics),
        resource.difficulty_fit,
        resource.educational_usefulness,
        resource.approved_status,
        resource.classroom_id,
        resource.teacher_id,
        resource.material_id,
        resource.thumbnail_url,
        JSON.stringify(resource.metadata),
        resource.created_at,
        resource.updated_at,
        resource.approved_at,
        resource.approved_by,
      ]
    );

    if (res && res.rows && res.rows[0]) {
      return res.rows[0];
    }

    // Memory Store fallback
    if (!memoryStore.curated_resources) {
      memoryStore.curated_resources = new Map();
    }
    memoryStore.curated_resources.set(resource.id, resource);
    return resource;
  }

  /**
   * Find resource by ID
   */
  static async findById(id) {
    const res = await query('SELECT * FROM curated_resources WHERE id = $1', [id]);
    if (res && res.rows && res.rows[0]) {
      return res.rows[0];
    }

    if (!memoryStore.curated_resources) {
      memoryStore.curated_resources = new Map();
    }
    return memoryStore.curated_resources.get(id) || null;
  }

  /**
   * Find resources for Teacher with optional classroom/status filtering
   */
  static async findForTeacher({ teacherId, classroomId = null, status = null, topic = null }) {
    let sql = 'SELECT * FROM curated_resources WHERE 1=1';
    const params = [];

    if (teacherId) {
      params.push(teacherId);
      sql += ` AND teacher_id = $${params.length}`;
    }
    if (classroomId) {
      params.push(classroomId);
      sql += ` AND classroom_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND approved_status = $${params.length}`;
    }
    if (topic) {
      params.push(`%${topic}%`);
      sql += ` AND topic ILIKE $${params.length}`;
    }
    sql += ' ORDER BY created_at DESC';

    const res = await query(sql, params);
    if (res && res.rows) {
      return res.rows;
    }

    if (!memoryStore.curated_resources) {
      memoryStore.curated_resources = new Map();
    }

    return Array.from(memoryStore.curated_resources.values())
      .filter((r) => {
        if (teacherId && r.teacher_id !== teacherId) return false;
        if (classroomId && r.classroom_id !== classroomId) return false;
        if (status && r.approved_status !== status) return false;
        if (topic && !r.topic?.toLowerCase().includes(topic.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  /**
   * Find resources for Student (ONLY approved resources in student's enrolled classrooms)
   */
  static async findForStudent({ classroomIds = [] }) {
    if (!classroomIds || classroomIds.length === 0) {
      return [];
    }

    const res = await query(
      `SELECT * FROM curated_resources 
       WHERE approved_status = 'APPROVED' AND classroom_id = ANY($1::text[])
       ORDER BY relevance_score DESC, created_at DESC`,
      [classroomIds]
    );

    if (res && res.rows) {
      return res.rows;
    }

    if (!memoryStore.curated_resources) {
      memoryStore.curated_resources = new Map();
    }

    const classSet = new Set(classroomIds);
    return Array.from(memoryStore.curated_resources.values())
      .filter((r) => r.approved_status === 'APPROVED' && classSet.has(r.classroom_id))
      .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  }

  /**
   * Update approval status (APPROVED / REJECTED / PENDING)
   */
  static async updateStatus(id, { approved_status, approved_by }) {
    const now = new Date().toISOString();
    const approvedAt = approved_status === 'APPROVED' ? now : null;

    const res = await query(
      `UPDATE curated_resources 
       SET approved_status = $1, approved_by = $2, approved_at = $3, updated_at = $4
       WHERE id = $5
       RETURNING *`,
      [approved_status, approved_by, approvedAt, now, id]
    );

    if (res && res.rows && res.rows[0]) {
      return res.rows[0];
    }

    if (!memoryStore.curated_resources) {
      memoryStore.curated_resources = new Map();
    }

    const existing = memoryStore.curated_resources.get(id);
    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      approved_status,
      approved_by: approved_by || existing.approved_by,
      approved_at: approvedAt || existing.approved_at,
      updated_at: now,
    };
    memoryStore.curated_resources.set(id, updated);
    return updated;
  }

  /**
   * Delete a curated resource
   */
  static async delete(id) {
    await query('DELETE FROM curated_resources WHERE id = $1', [id]);
    if (memoryStore.curated_resources) {
      memoryStore.curated_resources.delete(id);
    }
    return { success: true, id };
  }
}

module.exports = CuratedResource;
