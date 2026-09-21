const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/skillforge';
const isRemoteDb = connectionString.includes('supabase.co') || connectionString.includes('neon.tech') || connectionString.includes('pooler.supabase.com') || process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
});

// Fallback in-memory data store for isolated testing/development when Postgres is offline
const memoryStore = {
  assessments: new Map(),
  assessment_questions: new Map(),
  rubrics: new Map(),
  rubric_criteria: new Map(),
  written_submissions: new Map(),
  student_identity_maps: new Map(),
  anonymous_submissions: new Map(),
  fairgrade_reports: new Map(),
  fairgrade_criterion_scores: new Map(),
  grading_evaluations: new Map(),
  grade_appeals: new Map(),
  grade_audit_logs: new Map(),
  bias_check_logs: new Map(),
  users: new Map(),
  classrooms: new Map(),
  class_feed: new Map(),
  learning_materials: new Map(),
  assignments: new Map(),
  student_enrollments: new Map(),
  ai_request_logs: new Map(),
  vector_embeddings: new Map(),
  curated_resources: new Map(),
  concepts: new Map(),
  learning_evidence: new Map(),
  concept_mastery: new Map(),
  misconceptions: new Map(),
  interventions: new Map(),
  intervention_steps: new Map(),
  reassessments: new Map(),
  recovery_results: new Map(),
};

const query = async (text, params) => {
  if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
    return null; // Signals models to use memoryStore
  }
  return pool.query(text, params);
};

module.exports = {
  pool,
  query,
  memoryStore,
};
