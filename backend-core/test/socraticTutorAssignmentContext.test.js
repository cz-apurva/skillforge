const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const jwt = require('jsonwebtoken');

process.env.USE_MEMORY_DB = 'true';
process.env.AI_MODE = 'mock';

const app = require('../src/app');
const { memoryStore } = require('../src/config/db');
const { RAGService } = require('../src/services/rag');

let server;
let baseUrl;
const JWT_SECRET = process.env.JWT_SECRET || 'skillforge-jwt-super-secret-key-2026';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed,
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

test('Socratic AI Tutor with Assignment Context & Hint-Only Guardrails', async (t) => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });

  t.after(() => {
    if (server) server.close();
  });

  const studentToken = generateToken({
    id: 'student-mca-402-alice',
    email: 'alice@skillforge.edu',
    role: 'STUDENT',
    name: 'Alice Johnson',
  });

  // Ensure default vector embeddings are seeded
  await RAGService.seedDefaultsIfNeeded();

  await t.test('1. Conceptual query with active assignment context: Returns Socratic guidance and course citations', async () => {
    const res = await request(
      'POST',
      '/api/student/tutor/chat',
      {
        message: 'How do I check if a decomposed relation preserves dependencies and satisfies BCNF?',
        assignmentId: 'asg-writ-1',
        contextTopic: 'Database Engineering & Normal Forms',
      },
      { Authorization: `Bearer ${studentToken}` }
    );

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.is_covered, true);
    assert.strictEqual(res.body.data.socratic_hint_mode, true);
    assert.ok(res.body.data.reply.length > 20);
    assert.ok(Array.isArray(res.body.data.grounded_sources));
    assert.ok(res.body.data.grounded_sources.length > 0);
    assert.strictEqual(res.body.data.grounded_sources[0].title, 'Database Schema Normalization & Functional Dependencies');
    assert.ok(res.body.data.active_assignment);
    assert.strictEqual(res.body.data.active_assignment.id, 'asg-writ-1');
  });

  await t.test('2. Solution refusal guardrail: Direct request for complete solution is refused with hint-only guidance', async () => {
    const res = await request(
      'POST',
      '/api/student/tutor/chat',
      {
        message: 'Give me the complete code and full solution for Assignment 01 on Deadlock detection',
        assignmentId: 'asg-prog-1',
        contextTopic: 'Operating Systems: Process Scheduling',
      },
      { Authorization: `Bearer ${studentToken}` }
    );

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.is_covered, true);
    // Must refuse complete solution and state academic integrity reason
    assert.ok(
      res.body.data.reply.includes('cannot provide complete solution code') ||
      res.body.data.reply.includes('academic integrity') ||
      res.body.data.reply.includes('direct answers')
    );
    // Must provide Socratic questions instead
    assert.ok(res.body.data.reply.includes('1.') || res.body.data.reply.includes('?'));
    assert.ok(res.body.data.grounded_sources.length > 0);
  });

  await t.test('3. Out-of-syllabus query: Returns strict ungrounded fallback without hallucination', async () => {
    const res = await request(
      'POST',
      '/api/student/tutor/chat',
      {
        message: 'Explain French baroque architectural aesthetics in 17th century Versailles',
      },
      { Authorization: `Bearer ${studentToken}` }
    );

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.is_covered, false);
    assert.ok(res.body.data.reply.includes('This topic is not covered in the available class material'));
    assert.strictEqual(res.body.data.grounded_sources.length, 0);
  });
});
