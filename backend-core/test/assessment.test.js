const test = require('node:test');
const assert = require('node:assert');
const http = require('http');

// Force memory DB mode for isolated test execution
process.env.USE_MEMORY_DB = 'true';
process.env.PORT = '0'; // random port

const app = require('../src/app');

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'skillforge-jwt-super-secret-key-2026';

let server;
let baseUrl;

const teacherToken = jwt.sign(
  { id: 'f1e2d3c4-b5a6-7890-1234-56789abcdef0', email: 'teacher@skillforge.ai', role: 'TEACHER' },
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

test('Assessment & Rubric Workflow API Tests', async (t) => {
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

  let assessmentId;
  let questionId;

  await t.test('1. POST /assessments - Should create a new assessment in draft status', async () => {
    const res = await request('POST', '/assessments', {
      title: 'Operating Systems - Process Scheduling',
      description: 'MCA Sem 4 written evaluation on deadlock and scheduling algorithms',
      courseId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      createdBy: 'f1e2d3c4-b5a6-7890-1234-56789abcdef0',
    });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'draft');
    assert.strictEqual(res.body.data.title, 'Operating Systems - Process Scheduling');
    assessmentId = res.body.data.id;
    assert.ok(assessmentId);
  });

  await t.test('2. POST /assessments/:id/questions - Should add a question to the assessment', async () => {
    const res = await request('POST', `/assessments/${assessmentId}/questions`, {
      questionNumber: 1,
      questionText: 'Explain the difference between Preemptive and Non-Preemptive Scheduling with examples.',
      questionType: 'written',
      maxScore: 10,
      sampleSolution: 'Preemptive allows task preemption (e.g., Round Robin), while non-preemptive runs to completion (e.g., FCFS).',
    });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.question_number, 1);
    assert.strictEqual(res.body.data.max_score, 10);
    questionId = res.body.data.id;
    assert.ok(questionId);
  });

  await t.test('3. POST /assessments/:id/rubric - Should REJECT when criteria sum DOES NOT equal question max score', async () => {
    // Question maxScore is 10, but criteria sum is 4 + 3 = 7
    const res = await request('POST', `/assessments/${assessmentId}/rubric`, {
      questionId,
      title: 'Q1 Grading Rubric',
      criteria: [
        {
          name: 'Concept Understanding',
          description: 'Defines preemptive vs non-preemptive clearly',
          max_marks: 4,
          order_index: 0,
        },
        {
          name: 'Algorithm Examples',
          description: 'Provides accurate real-world examples',
          max_marks: 3, // Mismatch: 4 + 3 = 7 !== 10
          order_index: 1,
        },
      ],
    });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.error.message, /does not match question max marks/i);
  });

  await t.test('4. POST /assessments/:id/rubric - Should ACCEPT when criteria sum matches question max score', async () => {
    // Question maxScore is 10, criteria sum is 5 + 3 + 2 = 10
    const res = await request('POST', `/assessments/${assessmentId}/rubric`, {
      questionId,
      title: 'Q1 FairGrade Rubric',
      criteria: [
        {
          name: 'Conceptual Clarity & Definition',
          description: 'Clearly contrasts scheduling behaviors',
          max_marks: 5,
          order_index: 0,
        },
        {
          name: 'Algorithm Illustration & Context',
          description: 'Accurate algorithmic examples (RR, SRTF vs FCFS)',
          max_marks: 3,
          order_index: 1,
        },
        {
          name: 'Trade-off & Overhead Analysis',
          description: 'Discusses context switching overhead and responsiveness',
          max_marks: 2,
          order_index: 2,
        },
      ],
    });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.criteria.length, 3);
  });

  await t.test('5. POST /assessments/:id/publish - Should publish when all questions have valid rubrics', async () => {
    const res = await request('POST', `/assessments/${assessmentId}/publish`, {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'published');
  });
});
