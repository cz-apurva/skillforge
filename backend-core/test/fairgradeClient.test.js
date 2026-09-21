const test = require('node:test');
const assert = require('node:assert');
const http = require('http');

process.env.USE_MEMORY_DB = 'true';
process.env.PORT = '0';

const app = require('../src/app');
const FairgradeClientService = require('../src/services/fairgradeClient.service');
const { memoryStore } = require('../src/config/db');

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'skillforge-jwt-super-secret-key-2026';

let server;
let baseUrl;

const teacherToken = jwt.sign(
  { id: 'teacher-uuid-001', email: 'teacher@skillforge.ai', role: 'TEACHER' },
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

test('FairGrade Client Integration & Performance Logging Tests', async (t) => {
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

  // 1. Setup Assessment, Question, and Rubric
  const assessmentRes = await request('POST', '/assessments', {
    title: 'Database Management Systems - Normalization',
    courseId: 'db-course-uuid-001',
    createdBy: 'teacher-uuid-001',
  });
  const assessmentId = assessmentRes.body.data.id;

  const questionRes = await request('POST', `/assessments/${assessmentId}/questions`, {
    questionNumber: 1,
    questionText: 'Explain 3NF vs BCNF with functional dependency examples.',
    maxScore: 10,
    sampleSolution: '3NF allows A->B if B is prime, BCNF strictly requires A to be superkey.',
  });
  const questionId = questionRes.body.data.id;

  const rubricRes = await request('POST', `/assessments/${assessmentId}/rubric`, {
    questionId,
    title: 'Normalization Rubric',
    criteria: [
      {
        name: '3NF Definition and Superkey Condition',
        max_marks: 5,
        order_index: 0,
      },
      {
        name: 'BCNF Functional Dependency Rigor',
        max_marks: 5,
        order_index: 1,
      },
    ],
  });
  const rubric = rubricRes.body.data;

  const studentId = 'student-alice-uuid-999';
  const studentToken = jwt.sign(
    { id: studentId, email: 'alice@skillforge.ai', role: 'STUDENT' },
    JWT_SECRET
  );
  let anonymousSubmissionId;

  await t.test('1. POST /submissions/written triggers auto-grading and persists report, criteria, bias log, and performance log', async () => {
    const submissionText = 'In 3NF, for every non-trivial FD X->Y, X is a superkey or Y is a prime attribute. BCNF strictly mandates that X must be a superkey for every non-trivial dependency.';

    const res = await request(
      'POST',
      '/submissions/written',
      {
        assessmentId,
        questionId,
        studentId,
        submissionText,
        autoGrade: true,
      },
      {
        Authorization: `Bearer ${studentToken}`,
      }
    );

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.anonymous_submission_id);
    anonymousSubmissionId = res.body.data.anonymous_submission_id;

    // Response must NEVER leak student_id
    assert.strictEqual(res.body.data.student_id, undefined);
    assert.strictEqual(res.body.data.studentId, undefined);

    // Verify fairgrade_report was created
    let savedReport = null;
    for (const rep of memoryStore.fairgrade_reports.values()) {
      if (rep.anonymous_submission_id === anonymousSubmissionId) {
        savedReport = rep;
        break;
      }
    }
    assert.ok(savedReport);
    assert.strictEqual(savedReport.max_possible_score, 10);
    assert.ok(savedReport.total_score > 0);
    assert.ok(savedReport.overall_feedback);

    // Verify fairgrade_criterion_score rows were created
    let criteriaScores = [];
    for (const cs of memoryStore.fairgrade_criterion_scores.values()) {
      if (cs.report_id === savedReport.id) {
        criteriaScores.push(cs);
      }
    }
    assert.strictEqual(criteriaScores.length, 2);
    assert.ok(criteriaScores[0].score_awarded > 0);
    assert.ok(criteriaScores[0].feedback);

    // Verify bias_check_log was created confirming identity neutrality
    let biasLogs = [];
    for (const b of memoryStore.bias_check_logs.values()) {
      if (b.anonymous_submission_id === anonymousSubmissionId) {
        biasLogs.push(b);
      }
    }
    assert.strictEqual(biasLogs.length, 1);
    assert.strictEqual(biasLogs[0].check_type, 'DEMOGRAPHIC_LEAK_DETECTION');
    assert.strictEqual(biasLogs[0].bias_detected, false);

    // Verify PerformanceLog was updated for student analytics
    let perfLogs = [];
    for (const p of memoryStore.performance_logs.values()) {
      if (p.student_id === studentId) {
        perfLogs.push(p);
      }
    }
    assert.strictEqual(perfLogs.length, 1);
    assert.strictEqual(perfLogs[0].grader_type, 'FAIRGRADE_WRITTEN');
    assert.strictEqual(perfLogs[0].student_id, studentId);
    assert.strictEqual(perfLogs[0].score_awarded, savedReport.total_score);
  });
});
