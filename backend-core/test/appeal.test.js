const test = require('node:test');
const assert = require('node:assert');
const http = require('http');

process.env.USE_MEMORY_DB = 'true';
process.env.PORT = '0';

const app = require('../src/app');
const { memoryStore } = require('../src/config/db');

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'skillforge-jwt-super-secret-key-2026';

let server;
let baseUrl;

const teacherToken = jwt.sign(
  { id: 'prof-dist-001', email: 'teacher@skillforge.ai', role: 'TEACHER' },
  JWT_SECRET
);

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
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

test('Grade Appeal & Blind Re-Evaluation Pipeline Tests', async (t) => {
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

  // 1. Setup Assessment, Question, Rubric, and Submission
  const assessmentRes = await request('POST', '/assessments', {
    title: 'Distributed Algorithms',
    courseId: 'course-dist-101',
    createdBy: 'prof-dist-001',
  });
  const assessmentId = assessmentRes.body.data.id;

  const questionRes = await request('POST', `/assessments/${assessmentId}/questions`, {
    questionNumber: 1,
    questionText: 'Explain Paxos Consensus vs Raft leader election.',
    maxScore: 10,
    sampleSolution: 'Paxos uses prepare/promise/accept; Raft uses term numbers, heartbeat timeouts, and leader election.',
  });
  const questionId = questionRes.body.data.id;

  await request('POST', `/assessments/${assessmentId}/rubric`, {
    questionId,
    title: 'Consensus Rubric',
    criteria: [
      { name: 'Paxos Protocol Mechanics', max_marks: 5, order_index: 0 },
      { name: 'Raft Protocol Structure', max_marks: 5, order_index: 1 },
    ],
  });

  const studentId = 'student-alice-appeal-test';
  const studentAliceToken = jwt.sign(
    { id: studentId, email: 'alice@skillforge.ai', role: 'STUDENT' },
    JWT_SECRET
  );

  const submissionRes = await request(
    'POST',
    '/submissions/written',
    {
      assessmentId,
      questionId,
      studentId,
      submissionText: 'Paxos uses Proposers, Acceptors, and Learners across two phases. Raft decomposes consensus into leader election, log replication, and safety.',
      autoGrade: true,
    },
    {
      Authorization: `Bearer ${studentAliceToken}`,
    }
  );

  const anonymousSubmissionId = submissionRes.body.data.anonymous_submission_id;

  // Retrieve written_submission id
  let writtenSubId = null;
  for (const w of memoryStore.written_submissions.values()) {
    if (w.student_id === studentId) {
      writtenSubId = w.id;
      break;
    }
  }
  assert.ok(writtenSubId);

  let appealId;

  await t.test('1. POST /grade-appeals - Submits appeal and creates audit trail', async () => {
    const res = await request(
      'POST',
      '/grade-appeals',
      {
        writtenSubmissionId: writtenSubId,
        studentId,
        appealReason: 'My explanation covered both phases of Paxos and Raft leader decomposition in depth.',
      },
      {
        Authorization: `Bearer ${studentAliceToken}`,
      }
    );

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'open');
    assert.strictEqual(res.body.data.student_id, studentId);
    appealId = res.body.data.id;
    assert.ok(appealId);
  });

  await t.test('2. POST /grade-appeals/:id/re-evaluate - Executes blind re-evaluation and logs comparison', async () => {
    const res = await request(
      'POST',
      `/grade-appeals/${appealId}/re-evaluate`,
      {
        threshold: 0.10, // 10% of 10 = 1.0 mark
      },
      {
        Authorization: `Bearer ${studentAliceToken}`,
      }
    );

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.reevaluated_score >= 0);
    assert.ok(res.body.data.appeal.status);
  });

  await t.test('3. GET /grade-appeals/:id/audit - Allows student to view audit history for own appeal', async () => {
    const res = await request('GET', `/grade-appeals/${appealId}/audit`, null, {
      Authorization: `Bearer ${studentAliceToken}`,
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 2);

    const actions = res.body.data.map((l) => l.action);
    assert.ok(actions.includes('STUDENT_APPEAL_FILED'));
    assert.ok(
      actions.includes('APPEAL_REEVALUATION_CONFIRMED') ||
      actions.includes('APPEAL_REEVALUATION_ESCALATED')
    );
  });

  await t.test('4. GET /grade-appeals/:id/audit - Rejects unauthorized student attempting to access another appeal', async () => {
    const intruderToken = jwt.sign(
      { id: 'unauthorized-intruder-student-id', email: 'intruder@skillforge.ai', role: 'STUDENT' },
      JWT_SECRET
    );
    const res = await request('GET', `/grade-appeals/${appealId}/audit`, null, {
      Authorization: `Bearer ${intruderToken}`,
    });

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.error.message, /Access denied/i);
  });
});
