const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const jwt = require('jsonwebtoken');

process.env.USE_MEMORY_DB = 'true';
process.env.AI_MODE = 'mock';

const app = require('../src/app');
const { memoryStore } = require('../src/config/db');

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

test('End-to-End AI Modules Integration & RAG Grounding Pipeline Tests', async (t) => {
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

  const teacherToken = generateToken({
    id: 'teacher-001-uuid',
    email: 'teacher@skillforge.ai',
    role: 'TEACHER',
    name: 'Prof. A. Anupam',
  });

  const studentToken = generateToken({
    id: 'student-mca-402-alice',
    email: 'alice@skillforge.ai',
    role: 'STUDENT',
    name: 'Alice Johnson',
  });

  await t.test('1. Content Analyzer: Teacher uploads lecture document -> extracts topic, subtopics & learning outcomes', async () => {
    const res = await request(
      'POST',
      '/api/teacher/materials/analyze',
      {
        title: 'Distributed 2-Phase Commit & Raft Consensus Protocols',
        file_name: 'Lecture_08_Distributed_Transactions.pdf',
        file_type: 'PDF',
        rawContent: 'Comprehensive guide to distributed transactions, two-phase commit (2PC) coordinator failure modes, Raft state machine replication, and strict 2PL serializability.',
      },
      { Authorization: `Bearer ${teacherToken}` }
    );

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.topic);
    assert.ok(Array.isArray(res.body.data.subtopics));
    assert.ok(res.body.data.subtopics.length > 0);
    assert.ok(Array.isArray(res.body.data.learning_outcomes));
    assert.ok(res.body.data.learning_outcomes.length > 0);
    assert.ok(res.body.data.difficulty);
  });

  let publishedMaterialId = '';

  await t.test('2. Teacher reviews and publishes analyzed material -> Stored & posted to class feed', async () => {
    const res = await request(
      'POST',
      '/api/teacher/materials',
      {
        classroom_id: 'cls-mca-402',
        title: 'Distributed Raft Consensus & 2-Phase Commit',
        topic: 'Distributed ACID & Fault Tolerance',
        difficulty: 'Advanced',
        file_name: 'Lecture_08_Distributed_Transactions.pdf',
        file_type: 'PDF',
        content_text: 'Two-phase commit coordinator failure modes, Raft leader election, and distributed deadlock detection.',
        subtopics: ['2PC Coordinator Protocol', 'Raft Leader Quorum', 'Distributed Deadlock'],
        learning_outcomes: ['Understand coordinator recovery', 'Trace Raft log replication'],
        reference_concepts: ['2PC', 'Raft', 'ACID', 'Quorum'],
      },
      { Authorization: `Bearer ${teacherToken}` }
    );

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.id);
    publishedMaterialId = res.body.data.id;
  });

  await t.test('3. Resource Curator: Student calls GET /api/student/materials -> sees published material AND auto-curated companion sandbox', async () => {
    const res = await request('GET', '/api/student/materials', null, { Authorization: `Bearer ${studentToken}` });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    const { materials, curated_resources } = res.body.data;
    assert.ok(Array.isArray(materials));
    assert.ok(Array.isArray(curated_resources));

    // Verify teacher material appears
    const foundMat = materials.find((m) => m.id === publishedMaterialId || m.title.includes('Raft'));
    assert.ok(foundMat, 'Newly published material must be present for enrolled students');

    // Verify Resource Curator generated companion resources
    const foundCurated = curated_resources.find((r) => r.title.includes('Raft') || r.title.includes('Normalization'));
    assert.ok(foundCurated, 'Resource Curator must supply interactive sandboxes and cheat sheets');
  });

  await t.test('4. Socratic AI Tutor + RAG: Grounded query returns Socratic hint and courseware source citation', async () => {
    const res = await request(
      'POST',
      '/api/student/tutor/chat',
      {
        message: 'How do I check if a schema decomposition satisfies BCNF?',
      },
      { Authorization: `Bearer ${studentToken}` }
    );

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.is_covered, true);
    assert.strictEqual(res.body.data.socratic_hint_mode, true);
    assert.ok(res.body.data.reply.includes('functional dependency') || res.body.data.reply.includes('determinant') || res.body.data.reply.includes('Socratically'));
    assert.ok(Array.isArray(res.body.data.grounded_sources));
    assert.ok(res.body.data.grounded_sources.length > 0, 'Must cite grounded courseware');
  });

  await t.test('5. Anti-Hallucination Guardrail: Uncovered topic strictly responds with fallback message (no fabricated facts)', async () => {
    const res = await request(
      'POST',
      '/api/student/tutor/chat',
      {
        message: 'Explain French baroque poetry and botanical taxonomy in medieval Paris',
      },
      { Authorization: `Bearer ${studentToken}` }
    );

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.is_covered, false);
    assert.ok(res.body.data.reply.includes('This topic is not covered in the available class material'));
  });

  await t.test('6. Sandbox Generator & Judge0 Automated Grader: Run sample tests and submit benchmark verification', async () => {
    const deadlockDetectorCode = `
import sys
raw = sys.stdin.read().strip()
if '1 2' in raw and '3 1' in raw:
    print('Deadlock Detected')
elif '1 1' in raw or '5 3' in raw:
    print('Deadlock Detected')
else:
    print('No Deadlock')
`;

    // Run sample testbench
    const runRes = await request(
      'POST',
      '/api/student/sandbox/run',
      {
        code: deadlockDetectorCode,
        language: 'Python',
        assignmentId: 'asg-001',
      },
      { Authorization: `Bearer ${studentToken}` }
    );

    assert.strictEqual(runRes.statusCode, 200);
    assert.strictEqual(runRes.body.data.status, 'PASSED');
    assert.strictEqual(runRes.body.data.passed_count, 2);

    // Submit for grading
    const submitRes = await request(
      'POST',
      '/api/student/sandbox/submit',
      {
        code: deadlockDetectorCode,
        language: 'Python',
        assignmentId: 'asg-001',
      },
      { Authorization: `Bearer ${studentToken}` }
    );

    assert.strictEqual(submitRes.statusCode, 200);
    assert.strictEqual(submitRes.body.data.status, 'ACCEPTED');
    assert.strictEqual(submitRes.body.data.score, 100);
    assert.strictEqual(submitRes.body.data.passed_count, 5);
  });

  await t.test('7. Teacher Co-Pilot: Aggregates missing concepts and generates pedagogical interventions', async () => {
    const res = await request('GET', '/api/teacher/dashboard', null, { Authorization: `Bearer ${teacherToken}` });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.copilot);
    assert.ok(res.body.data.copilot.top_weakness_concept);
    assert.ok(res.body.data.copilot.suggested_action);
    assert.ok(res.body.data.copilot.suggested_discussion_starter);
  });
});
