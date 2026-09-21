const test = require('node:test');
const assert = require('node:assert');
const http = require('http');

process.env.USE_MEMORY_DB = 'true';
process.env.PORT = '0';

const app = require('../src/app');
const AnonymizerService = require('../src/services/anonymizer.service');
const { memoryStore } = require('../src/config/db');

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'skillforge-jwt-super-secret-key-2026';

let server;
let baseUrl;

const teacherToken = jwt.sign(
  { id: 't1t2t3t4-t5t6-t7t8-t9t0-t1t2t3t4t5t6', email: 'teacher@skillforge.ai', role: 'TEACHER' },
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

test('Written Submission & Anonymization Pipeline Tests', async (t) => {
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

  // Setup assessment & question first
  const assessmentRes = await request('POST', '/assessments', {
    title: 'Computer Networks - Congestion Control',
    courseId: 'c1c2c3c4-c5c6-c7c8-c9c0-c1c2c3c4c5c6',
    createdBy: 't1t2t3t4-t5t6-t7t8-t9t0-t1t2t3t4t5t6',
  });
  const assessmentId = assessmentRes.body.data.id;

  const questionRes = await request('POST', `/assessments/${assessmentId}/questions`, {
    questionNumber: 1,
    questionText: 'Explain TCP Tahoe vs TCP Reno Fast Recovery mechanism.',
    maxScore: 10,
  });
  const questionId = questionRes.body.data.id;

  const rubricRes = await request('POST', `/assessments/${assessmentId}/rubric`, {
    questionId,
    title: 'TCP Congestion Rubric',
    criteria: [
      {
        name: 'Fast Recovery Analysis',
        max_marks: 6,
        order_index: 0,
      },
      {
        name: 'Window Halving & Duplicate ACKs',
        max_marks: 4,
        order_index: 1,
      },
    ],
  });
  const rubric = rubricRes.body.data;

  const rawStudentId = 's1s2s3s4-s5s6-s7s8-s9s0-student12345';
  const studentToken = jwt.sign(
    { id: rawStudentId, email: 'alice@university.edu', role: 'STUDENT' },
    JWT_SECRET
  );
  let anonymousSubmissionId;

  await t.test('1. POST /submissions/written - Should record submission and return ONLY anonymous_submission_id', async () => {
    const rawAnswerText = 'Name: Alice Smith\nRoll No: MCA-2026-042\nEmail: alice@university.edu\n\nTCP Tahoe drops cwnd to 1 MSS on 3 dup ACKs, while Reno enters Fast Recovery and sets cwnd to ssthresh + 3 MSS.';

    const res = await request(
      'POST',
      '/submissions/written',
      {
        assessmentId,
        questionId,
        studentId: rawStudentId,
        submissionText: rawAnswerText,
      },
      {
        Authorization: `Bearer ${studentToken}`,
      }
    );

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.anonymous_submission_id);
    anonymousSubmissionId = res.body.data.anonymous_submission_id;

    // Caller response must NOT leak student identity
    assert.strictEqual(res.body.data.student_id, undefined);
    assert.strictEqual(res.body.data.studentId, undefined);
    assert.strictEqual(res.body.data.name, undefined);
    assert.strictEqual(res.body.data.email, undefined);
  });

  await t.test('2. Anonymization DB state check - verifies identity isolation across tables', async () => {
    // 1. written_submission contains student_id
    let writtenRecord = null;
    for (const w of memoryStore.written_submissions.values()) {
      if (w.student_id === rawStudentId) {
        writtenRecord = w;
        break;
      }
    }
    assert.ok(writtenRecord);
    assert.strictEqual(writtenRecord.student_id, rawStudentId);

    // 2. student_identity_map links student_id to anonymous_submission_id
    let mapRecord = null;
    for (const m of memoryStore.student_identity_maps.values()) {
      if (m.anonymous_submission_id === anonymousSubmissionId) {
        mapRecord = m;
        break;
      }
    }
    assert.ok(mapRecord);
    assert.strictEqual(mapRecord.student_id, rawStudentId);
    assert.strictEqual(mapRecord.written_submission_id, writtenRecord.id);

    // 3. anonymous_submission contains ONLY anonymousId and sanitized text
    const anonRecord = memoryStore.anonymous_submissions.get(anonymousSubmissionId);
    assert.ok(anonRecord);
    assert.strictEqual(anonRecord.id, anonymousSubmissionId);
    assert.strictEqual(anonRecord.student_id, undefined);
    assert.strictEqual(anonRecord.studentId, undefined);
    // Verified sanitized text stripped PII headers
    assert.ok(anonRecord.sanitized_text.includes('[REDACTED_NAME]'));
    assert.ok(anonRecord.sanitized_text.includes('[REDACTED_ID]'));
    assert.ok(anonRecord.sanitized_text.includes('[REDACTED_EMAIL]'));
  });

  await t.test('3. FairGrade-facing Payload Assertion - strictly no PII keys', async () => {
    const anonRecord = memoryStore.anonymous_submissions.get(anonymousSubmissionId);
    const question = memoryStore.assessment_questions.get(questionId);

    const fairgradePayload = AnonymizerService.buildFairGradePayload({
      anonymousSubmission: anonRecord,
      question,
      rubric,
    });

    // Check top-level and nested structure
    assert.strictEqual(fairgradePayload.anonymous_submission_id, anonymousSubmissionId);
    assert.strictEqual(fairgradePayload.student_id, undefined);
    assert.strictEqual(fairgradePayload.studentId, undefined);
    assert.strictEqual(fairgradePayload.name, undefined);
    assert.strictEqual(fairgradePayload.email, undefined);

    // Run security validator
    const isSafe = AnonymizerService.ensureFairgradePayloadIsAnonymous(fairgradePayload);
    assert.strictEqual(isSafe, true);

    // Ensure security validator catches any simulated identity leak attempt
    const compromisedPayload = {
      ...fairgradePayload,
      student_id: 'leaked-student-uuid',
    };

    assert.throws(
      () => {
        AnonymizerService.ensureFairgradePayloadIsAnonymous(compromisedPayload);
      },
      /Identity field 'student_id' detected/
    );
  });
});
