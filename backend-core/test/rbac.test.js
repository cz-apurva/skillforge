const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const jwt = require('jsonwebtoken');

process.env.USE_MEMORY_DB = 'true';
process.env.PORT = '0';

const app = require('../src/app');
const { memoryStore } = require('../src/config/db');

let server;
let baseUrl;

const JWT_SECRET = process.env.JWT_SECRET || 'skillforge-jwt-super-secret-key-2026';

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

test('Comprehensive Role-Based Access Control (RBAC) & Resource Ownership Tests', async (t) => {
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

  // Generate tokens for each role
  const adminUser = {
    id: 'admin-uuid-001',
    email: 'admin@skillforge.ai',
    name: 'Platform Admin',
    role: 'ADMIN',
  };
  const teacherA = {
    id: 'teacher-a-uuid-001',
    email: 'teacher.a@skillforge.ai',
    name: 'Prof. Alice Smith',
    role: 'TEACHER',
  };
  const teacherB = {
    id: 'teacher-b-uuid-002',
    email: 'teacher.b@skillforge.ai',
    name: 'Prof. Bob Jones',
    role: 'TEACHER',
  };
  const studentAlice = {
    id: 'student-alice-uuid-001',
    email: 'alice.student@skillforge.ai',
    name: 'Alice Student',
    role: 'STUDENT',
  };
  const studentBob = {
    id: 'student-bob-uuid-002',
    email: 'bob.student@skillforge.ai',
    name: 'Bob Student',
    role: 'STUDENT',
  };

  const adminToken = jwt.sign(adminUser, JWT_SECRET);
  const teacherAToken = jwt.sign(teacherA, JWT_SECRET);
  const teacherBToken = jwt.sign(teacherB, JWT_SECRET);
  const studentAliceToken = jwt.sign(studentAlice, JWT_SECRET);
  const studentBobToken = jwt.sign(studentBob, JWT_SECRET);

  let teacherA_AssessmentId;
  let teacherA_QuestionId;
  let studentAlice_SubmissionId;
  let studentAlice_AppealId;

  // --- 1. Unauthenticated & Invalid Token Rejections ---
  await t.test('1. Unauthenticated request without Bearer token returns 401 Unauthorized', async () => {
    const res = await request('GET', '/assessments');
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.error.message, /Authentication required/i);
  });

  await t.test('2. Request with malformed/invalid JWT token returns 401 Unauthorized', async () => {
    const res = await request('GET', '/assessments', null, {
      Authorization: 'Bearer invalid-garbage-token-xyz',
    });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.error.message, /Invalid or expired/i);
  });

  // --- 2. Student Role Cross-Access Rejections (403 Forbidden) ---
  await t.test('3. Student token hitting Teacher route POST /assessments returns 403 Forbidden', async () => {
    const res = await request(
      'POST',
      '/assessments',
      {
        title: 'Hacked Assessment',
        courseId: 'c1',
      },
      {
        Authorization: `Bearer ${studentAliceToken}`,
      }
    );
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.error.message, /Insufficient permissions/i);
  });

  await t.test('4. Student token hitting Teacher route GET /analytics/fairgrade returns 403 Forbidden', async () => {
    const res = await request('GET', '/analytics/fairgrade', null, {
      Authorization: `Bearer ${studentAliceToken}`,
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.error.message, /Insufficient permissions/i);
  });

  await t.test('5. Student token hitting Teacher route GET /copilot/recommendations returns 403 Forbidden', async () => {
    const res = await request('GET', '/copilot/recommendations', null, {
      Authorization: `Bearer ${studentAliceToken}`,
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.error.message, /Insufficient permissions/i);
  });

  await t.test('6. Student token hitting Admin/Teacher route POST /audit/log returns 403 Forbidden', async () => {
    const res = await request(
      'POST',
      '/audit/log',
      {
        action: 'UNAUTHORIZED_OVERRIDE',
        performedBy: 'Hacker',
      },
      {
        Authorization: `Bearer ${studentAliceToken}`,
      }
    );
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.error.message, /Insufficient permissions/i);
  });

  // --- 3. Teacher Resource Setup & Ownership Controls ---
  await t.test('7. Teacher A successfully creates assessment and adds rubric', async () => {
    const createRes = await request(
      'POST',
      '/assessments',
      {
        title: 'Advanced Computer Architecture',
        courseId: 'course-arch-001',
      },
      {
        Authorization: `Bearer ${teacherAToken}`,
      }
    );
    assert.strictEqual(createRes.statusCode, 201);
    teacherA_AssessmentId = createRes.body.data.id;
    assert.strictEqual(createRes.body.data.created_by, teacherA.id);

    const questionRes = await request(
      'POST',
      `/assessments/${teacherA_AssessmentId}/questions`,
      {
        questionNumber: 1,
        questionText: 'Explain Tomasulo algorithm for dynamic instruction scheduling.',
        maxScore: 10,
      },
      {
        Authorization: `Bearer ${teacherAToken}`,
      }
    );
    assert.strictEqual(questionRes.statusCode, 201);
    teacherA_QuestionId = questionRes.body.data.id;

    const rubricRes = await request(
      'POST',
      `/assessments/${teacherA_AssessmentId}/rubric`,
      {
        questionId: teacherA_QuestionId,
        title: 'Tomasulo Rubric',
        criteria: [
          { name: 'Reservation Stations & Common Data Bus', max_marks: 5, order_index: 0 },
          { name: 'Hazard Resolution (RAW, WAR, WAW)', max_marks: 5, order_index: 1 },
        ],
      },
      {
        Authorization: `Bearer ${teacherAToken}`,
      }
    );
    assert.strictEqual(rubricRes.statusCode, 201);

    const publishRes = await request(
      'POST',
      `/assessments/${teacherA_AssessmentId}/publish`,
      {},
      {
        Authorization: `Bearer ${teacherAToken}`,
      }
    );
    assert.strictEqual(publishRes.statusCode, 200);
  });

  // --- 4. Cross-Teacher Resource Access Rejection ---
  await t.test('8. Teacher B attempting to modify Teacher A assessment gets 403 Forbidden', async () => {
    const res = await request(
      'POST',
      `/assessments/${teacherA_AssessmentId}/questions`,
      {
        questionNumber: 2,
        questionText: 'Intruder question from Teacher B',
        maxScore: 5,
      },
      {
        Authorization: `Bearer ${teacherBToken}`,
      }
    );
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.error.message, /only view or modify your own assessments/i);
  });

  await t.test('9. Teacher B attempting to read Teacher A assessment by ID gets 403 Forbidden', async () => {
    const res = await request('GET', `/assessments/${teacherA_AssessmentId}`, null, {
      Authorization: `Bearer ${teacherBToken}`,
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.error.message, /only view or modify your own assessments/i);
  });

  await t.test('10. Teacher B listing assessments only receives their own assessments (isolation)', async () => {
    const res = await request('GET', '/assessments', null, {
      Authorization: `Bearer ${teacherBToken}`,
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    // Teacher B has 0 assessments, Teacher A assessment must NOT appear
    const foundTeacherA = res.body.data.find((a) => a.id === teacherA_AssessmentId);
    assert.strictEqual(foundTeacherA, undefined);
  });

  // --- 5. Student Submission & Ownership Verification ---
  await t.test('11. Student Alice submits written answer (ownership verified against token id)', async () => {
    const res = await request(
      'POST',
      '/submissions/written',
      {
        assessmentId: teacherA_AssessmentId,
        questionId: teacherA_QuestionId,
        // Even if client attempts to pass another student's id, server enforces token's req.user.id
        studentId: 'spoofed-id-will-be-overridden',
        submissionText: 'Tomasulo uses reservation stations and a common data bus (CDB) to resolve WAR and WAW hazards dynamically via register renaming.',
      },
      {
        Authorization: `Bearer ${studentAliceToken}`,
      }
    );
    assert.strictEqual(res.statusCode, 201);
    assert.ok(res.body.data.anonymous_submission_id);

    // Retrieve Alice's written submission
    for (const w of memoryStore.written_submissions.values()) {
      if (w.student_id === studentAlice.id) {
        studentAlice_SubmissionId = w.id;
        break;
      }
    }
    assert.ok(studentAlice_SubmissionId);
  });

  await t.test('12. Student Alice can read her own submission via GET /submissions/:id', async () => {
    const res = await request('GET', `/submissions/${studentAlice_SubmissionId}`, null, {
      Authorization: `Bearer ${studentAliceToken}`,
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.id, studentAlice_SubmissionId);
    assert.strictEqual(res.body.data.student_id, studentAlice.id);
  });

  await t.test('13. Student Bob attempting to read Alice submission gets 403 Forbidden', async () => {
    const res = await request('GET', `/submissions/${studentAlice_SubmissionId}`, null, {
      Authorization: `Bearer ${studentBobToken}`,
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.error.message, /only view your own submissions/i);
  });

  // --- 6. Grade Appeals Ownership & Cross-Access Controls ---
  await t.test('14. Student Alice files appeal for her submission', async () => {
    const res = await request(
      'POST',
      '/grade-appeals',
      {
        writtenSubmissionId: studentAlice_SubmissionId,
        appealReason: 'My answer properly highlighted register renaming mechanisms.',
      },
      {
        Authorization: `Bearer ${studentAliceToken}`,
      }
    );
    assert.strictEqual(res.statusCode, 201);
    studentAlice_AppealId = res.body.data.id;
  });

  await t.test('15. Student Bob attempting to appeal Alice submission gets 403 Forbidden', async () => {
    const res = await request(
      'POST',
      '/grade-appeals',
      {
        writtenSubmissionId: studentAlice_SubmissionId,
        appealReason: 'Bob trying to appeal Alice submission',
      },
      {
        Authorization: `Bearer ${studentBobToken}`,
      }
    );
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.error.message, /Cannot appeal another student submission/i);
  });

  await t.test('16. Student Alice can view her own appeal audit trail', async () => {
    const res = await request('GET', `/grade-appeals/${studentAlice_AppealId}/audit`, null, {
      Authorization: `Bearer ${studentAliceToken}`,
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
  });

  await t.test('17. Student Bob attempting to view Alice appeal audit gets 403 Forbidden', async () => {
    const res = await request('GET', `/grade-appeals/${studentAlice_AppealId}/audit`, null, {
      Authorization: `Bearer ${studentBobToken}`,
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.error.message, /only view audit history for your own appeal/i);
  });

  // --- 7. Admin Universal Access ---
  await t.test('18. Admin token can view any assessment, audit logs, and analytics', async () => {
    const assessmentRes = await request('GET', `/assessments/${teacherA_AssessmentId}`, null, {
      Authorization: `Bearer ${adminToken}`,
    });
    assert.strictEqual(assessmentRes.statusCode, 200);

    const auditRes = await request('GET', '/audit/logs', null, {
      Authorization: `Bearer ${adminToken}`,
    });
    assert.strictEqual(auditRes.statusCode, 200);
    assert.strictEqual(auditRes.body.success, true);

    const analyticsRes = await request('GET', '/analytics/fairgrade', null, {
      Authorization: `Bearer ${adminToken}`,
    });
    assert.strictEqual(analyticsRes.statusCode, 200);
    assert.strictEqual(analyticsRes.body.success, true);
  });
});
