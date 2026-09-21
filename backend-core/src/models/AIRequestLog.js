const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class AIRequestLog {
  /**
   * Log an AI service invocation.
   * STRICT ZERO-PII RULE: Never accept or persist student identity, names, emails,
   * or raw student submission bodies in this table.
   */
  static async create({
    service,
    provider,
    model,
    prompt_version = 'v1.0.0',
    duration_ms = 0,
    status = 'SUCCESS',
    prompt_tokens = 0,
    completion_tokens = 0,
    total_tokens = 0,
    error_type = null,
    error_message = null,
    ai_mode = 'live',
    metadata = {},
  }) {
    const id = uuidv4();
    const created_at = new Date().toISOString();

    const record = {
      id,
      service: service || 'unknown_service',
      provider: provider || 'unknown_provider',
      model: model || 'unknown_model',
      prompt_version,
      duration_ms: Math.max(0, Number(duration_ms) || 0),
      status: String(status).toUpperCase(), // 'SUCCESS', 'ERROR', 'RATE_LIMITED', 'TIMEOUT', 'MOCK_SUCCESS'
      prompt_tokens: Math.max(0, Number(prompt_tokens) || 0),
      completion_tokens: Math.max(0, Number(completion_tokens) || 0),
      total_tokens: Math.max(0, Number(total_tokens) || (prompt_tokens + completion_tokens)),
      error_type: error_type || null,
      error_message: error_message ? String(error_message).slice(0, 500) : null,
      ai_mode: ai_mode || 'live',
      metadata: {
        ...metadata,
        // Enforce removal of any accidental PII keys
        student_id: undefined,
        studentId: undefined,
        student_name: undefined,
        studentName: undefined,
        email: undefined,
      },
      created_at,
    };

    // Store in-memory
    if (!memoryStore.ai_request_logs) {
      memoryStore.ai_request_logs = new Map();
    }
    memoryStore.ai_request_logs.set(id, record);

    // Persist to Postgres if available
    try {
      if (process.env.USE_MEMORY_DB !== 'true' && process.env.DATABASE_URL) {
        await pool.query(
          `INSERT INTO ai_request_logs (
            id, service, provider, model, prompt_version, duration_ms,
            status, prompt_tokens, completion_tokens, total_tokens,
            error_type, error_message, ai_mode, metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            record.id,
            record.service,
            record.provider,
            record.model,
            record.prompt_version,
            record.duration_ms,
            record.status,
            record.prompt_tokens,
            record.completion_tokens,
            record.total_tokens,
            record.error_type,
            record.error_message,
            record.ai_mode,
            JSON.stringify(record.metadata),
            record.created_at,
          ]
        );
      }
    } catch (err) {
      console.warn('[AIRequestLog] Postgres write warning (using memoryStore):', err.message);
    }

    return record;
  }

  /**
   * Retrieve AI invocation logs with optional filtering
   */
  static async findAll({ service, provider, status, limit = 50 } = {}) {
    if (!memoryStore.ai_request_logs) {
      memoryStore.ai_request_logs = new Map();
    }

    let logs = Array.from(memoryStore.ai_request_logs.values());

    if (service) {
      logs = logs.filter((l) => l.service === service);
    }
    if (provider) {
      logs = logs.filter((l) => l.provider === provider);
    }
    if (status) {
      logs = logs.filter((l) => l.status === status.toUpperCase());
    }

    // Sort newest first
    logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return logs.slice(0, limit);
  }

  /**
   * Get telemetry summary metrics for Admin AI Monitoring
   */
  static async getTelemetrySummary() {
    if (!memoryStore.ai_request_logs) {
      memoryStore.ai_request_logs = new Map();
    }

    const logs = Array.from(memoryStore.ai_request_logs.values());
    const serviceStats = {};

    for (const log of logs) {
      const s = log.service;
      if (!serviceStats[s]) {
        serviceStats[s] = {
          service: s,
          provider: log.provider,
          model: log.model,
          requests_count: 0,
          errors_count: 0,
          total_duration_ms: 0,
          total_tokens: 0,
          ai_mode: log.ai_mode,
        };
      }
      serviceStats[s].requests_count += 1;
      if (log.status === 'ERROR' || log.status === 'RATE_LIMITED' || log.status === 'TIMEOUT') {
        serviceStats[s].errors_count += 1;
      }
      serviceStats[s].total_duration_ms += log.duration_ms;
      serviceStats[s].total_tokens += log.total_tokens;
    }

    return Object.values(serviceStats).map((stat) => ({
      ...stat,
      avg_latency_ms: stat.requests_count > 0 ? Math.round(stat.total_duration_ms / stat.requests_count) : 0,
      error_rate: stat.requests_count > 0 ? `${((stat.errors_count / stat.requests_count) * 100).toFixed(2)}%` : '0.00%',
    }));
  }
}

module.exports = AIRequestLog;
