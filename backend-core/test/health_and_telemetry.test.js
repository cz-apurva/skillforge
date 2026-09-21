const { test } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../src/app');
const AIRequestLog = require('../src/models/AIRequestLog');
const AuthService = require('../src/services/authService');
const HealthService = require('../src/services/healthService');

let server;
let baseUrl;
let adminToken;
let studentToken;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

test('System Health & Admin AI Telemetry Integration Tests', async (t) => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });

  t.after(() => {
    server.close();
  });

  // 1. Authenticate admin and student
  const adminAuth = await AuthService.login({
    email: 'admin@skillforge.ai',
    password: 'Password123!',
  });
  adminToken = adminAuth.token;

  const studentAuth = await AuthService.login({
    email: 'student@skillforge.ai',
    password: 'Password123!',
  });
  studentToken = studentAuth.token;

  // 2. Seed some real AI invocation logs to test telemetry aggregation
  await AIRequestLog.create({
    service: 'fairGrade',
    provider: 'anthropic',
    model: 'claude-3-7-sonnet',
    prompt_version: 'v1.0.0',
    duration_ms: 540,
    status: 'SUCCESS',
    prompt_tokens: 120,
    completion_tokens: 280,
    total_tokens: 400,
    ai_mode: 'mock',
  });

  await AIRequestLog.create({
    service: 'fairGrade',
    provider: 'anthropic',
    model: 'claude-3-7-sonnet',
    prompt_version: 'v1.0.0',
    duration_ms: 610,
    status: 'SUCCESS',
    prompt_tokens: 110,
    completion_tokens: 290,
    total_tokens: 400,
    ai_mode: 'mock',
  });

  await AIRequestLog.create({
    service: 'codeGrader',
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    prompt_version: 'v1.0.0',
    duration_ms: 320,
    status: 'ERROR',
    error_type: 'RATE_LIMITED',
    error_message: 'Mock quota test',
    ai_mode: 'mock',
  });

  await t.test('1. HealthService: Performs real lightweight checks for all 6 infrastructure dependencies', async () => {
    const health = await HealthService.checkAllServices();

    assert.ok(health);
    assert.ok(['Connected', 'Degraded', 'Unavailable'].includes(health.status));
    assert.ok(health.ai_mode);
    assert.ok(health.timestamp);
    assert.ok(typeof health.uptime_seconds === 'number');

    const s = health.services;
    assert.ok(s.database, 'database health check must exist');
    assert.ok(['Connected', 'Degraded', 'Unavailable'].includes(s.database.status));

    assert.ok(s.llm_provider, 'llm_provider health check must exist');
    assert.ok(['Connected', 'Degraded', 'Unavailable'].includes(s.llm_provider.status));

    assert.ok(s.vector_db, 'vector_db health check must exist');
    assert.ok(['Connected', 'Degraded', 'Unavailable'].includes(s.vector_db.status));

    assert.ok(s.judge0, 'judge0 health check must exist');
    assert.ok(['Connected', 'Degraded', 'Unavailable'].includes(s.judge0.status));

    assert.ok(s.youtube_api, 'youtube_api health check must exist');
    assert.ok(['Connected', 'Degraded', 'Unavailable'].includes(s.youtube_api.status));

    assert.ok(s.storage, 'storage health check must exist');
    assert.ok(['Connected', 'Degraded', 'Unavailable'].includes(s.storage.status));
  });

  await t.test('2. GET /health and GET /api/health: Public health endpoints return structured per-service diagnostic data', async () => {
    const res1 = await request('GET', '/health');
    assert.strictEqual(res1.statusCode, 200);
    assert.strictEqual(res1.body.success, true);
    assert.ok(res1.body.services.database);
    assert.ok(res1.body.services.llm_provider);
    assert.ok(res1.body.services.vector_db);
    assert.ok(res1.body.services.judge0);
    assert.ok(res1.body.services.youtube_api);
    assert.ok(res1.body.services.storage);

    const res2 = await request('GET', '/api/health');
    assert.strictEqual(res2.statusCode, 200);
    assert.strictEqual(res2.body.success, true);
    assert.ok(res2.body.services.database);
  });

  await t.test('3. GET /admin/ai-services: Returns real telemetry from AIRequestLog and prominent AI_MODE', async () => {
    const res = await request('GET', '/admin/ai-services', null, adminToken);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    const data = res.body.data;

    assert.ok(data.ai_mode, 'ai_mode must be present');
    assert.ok(data.system_health, 'system_health must be present');
    assert.ok(Array.isArray(data.modules), 'modules must be an array');
    assert.ok(data.modules.length >= 8, 'must contain all 8 AI services');

    // Verify fairGrade has aggregated logged calls
    const fairgradeMod = data.modules.find((m) => m.service_key === 'fairGrade');
    assert.ok(fairgradeMod, 'fairGrade module must exist');
    assert.ok(fairgradeMod.requests_count >= 2, 'should reflect at least 2 logged calls');

    // Verify codeGrader has logged error
    const codeGraderMod = data.modules.find((m) => m.service_key === 'codeGrader');
    assert.ok(codeGraderMod, 'codeGrader module must exist');
    assert.ok(codeGraderMod.errors_count >= 1, 'should reflect logged error');

    // Verify telemetry summary
    assert.ok(data.telemetry_summary);
    assert.ok(data.telemetry_summary.total_requests >= 3);
  });

  await t.test('4. Security: Admin AI services response NEVER leaks API keys or secret substrings', async () => {
    const res = await request('GET', '/admin/ai-services', null, adminToken);
    const rawResponse = JSON.stringify(res.body);

    // Assert that no secret tokens or patterns exist
    assert.strictEqual(rawResponse.includes('sk-ant-'), false, 'Response must never contain Anthropic key fragments');
    assert.strictEqual(rawResponse.includes('AIzaSy'), false, 'Response must never contain Google API key fragments');
    assert.strictEqual(rawResponse.includes('sk-proj-'), false, 'Response must never contain OpenAI key fragments');
    assert.strictEqual(rawResponse.includes('••••••••'), false, 'Response must not contain fake masked key snippets');

    // Check credential status fields
    for (const mod of res.body.data.modules) {
      assert.ok(
        ['Configured & Protected', 'Not Configured (Fallback Active)', 'In-Memory Store Active', 'Local Sandbox Active', 'System Managed'].includes(mod.credentials_status)
      );
    }
  });

  await t.test('5. POST /admin/ai-services/diagnostics: Triggers live diagnostic probe sweep', async () => {
    const res = await request('POST', '/admin/ai-services/diagnostics', {}, adminToken);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.system_health.services.database);
    assert.ok(res.body.data.system_health.services.storage);
  });

  await t.test('6. RBAC Guard: Student cannot access /admin/ai-services', async () => {
    const res = await request('GET', '/admin/ai-services', null, studentToken);
    assert.strictEqual(res.statusCode, 403);
  });
});
