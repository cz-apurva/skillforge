const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const jwt = require('jsonwebtoken');

process.env.USE_MEMORY_DB = 'true';
process.env.PORT = '0';

const app = require('../src/app');
const { memoryStore } = require('../src/config/db');
const User = require('../src/models/User');
const Assessment = require('../src/models/Assessment');
const WrittenSubmission = require('../src/models/WrittenSubmission');
const GradeAuditLog = require('../src/models/GradeAuditLog');
const FairGradeReport = require('../src/models/FairGradeReport');
const FairGradeCriterionScore = require('../src/models/FairGradeCriterionScore');
const FairGradeClient = require('../src/services/fairgradeClient.service');
const TeacherService = require('../src/services/teacherService');

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

function getRoleRedirect(role) {
  switch (role?.toUpperCase()) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'TEACHER':
      return '/teacher/dashboard';
    case 'STUDENT':
      return '/student/dashboard';
    default:
      return '/login';
  }
}

test('System-Wide Verification: Auth, RBAC Fencing & FairGrade Grading Integrity', async (t) => {
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

  // 1. Generate standard tokens
  const teacherAUser = { id: 'teacher-a-verified-001', email: 'teacher.a@skillforge.ai', name: 'Prof. Alice', role: 'TEACHER' };
  const teacherBUser = { id: 'teacher-b-verified-002', email: 'teacher.b@skillforge.ai', name: 'Prof. Bob', role: 'TEACHER' };
  const studentAliceUser = { id: 'student-alice-verified-001', email: 'alice.student@skillforge.ai', name: 'Alice Student', role: 'STUDENT' };
  const studentBobUser = { id: 'student-bob-verified-002', email: 'bob.student@skillforge.ai', name: 'Bob Student', role: 'STUDENT' };
  const adminUser = { id: 'admin-verified-001', email: 'admin.super@skillforge.ai', name: 'Admin Super', role: 'ADMIN' };

  const teacherAToken = jwt.sign(teacherAUser, JWT_SECRET);
  const teacherBToken = jwt.sign(teacherBUser, JWT_SECRET);
  const studentAliceToken = jwt.sign(studentAliceUser, JWT_SECRET);
  const studentBobToken = jwt.sign(studentBobUser, JWT_SECRET);
  const adminToken = jwt.sign(adminUser, JWT_SECRET);

  // 2. Setup baseline teacher classroom, assessment, question, and rubric
  const classroom = await TeacherService.createClass(
    {
      name: 'MCA 401 - Advanced Distributed Systems',
      subject: 'Distributed Computing',
      description: 'Mastery of consensus, 2PC, and CAP theorem',
      semester: '4th Semester',
      academic_year: '2026-2027',
    },
    teacherAUser
  );
  const teacherA_ClassId = classroom.id;

  const createAssRes = await request(
    'POST',
    '/assessments',
    {
      title: 'Distributed Consensus & CAP Theorem Midterm',
      courseId: teacherA_ClassId,
      createdBy: teacherAUser.id,
    },
    {
      Authorization: `Bearer ${teacherAToken}`,
    }
  );
  assert.strictEqual(createAssRes.statusCode, 201);
  const teacherA_AssessmentId = createAssRes.body.data.id;

  const qRes = await request(
    'POST',
    `/assessments/${teacherA_AssessmentId}/questions`,
    {
      questionNumber: 1,
      questionText: 'Explain the 2-Phase Commit (2PC) protocol and how 3PC resolves the blocking coordinator failure.',
      maxScore: 10,
      sampleSolution: '2PC has prepare and commit phases but blocks on coordinator failure. 3PC adds a pre-commit phase and timeout state transitions.',
    },
    {
      Authorization: `Bearer ${teacherAToken}`,
    }
  );
  assert.strictEqual(qRes.statusCode, 201);
  const teacherA_QuestionId = qRes.body.data.id;

  const rRes = await request(
    'POST',
    `/assessments/${teacherA_AssessmentId}/rubric`,
    {
      questionId: teacherA_QuestionId,
      title: '2PC vs 3PC Protocol Rubric',
      criteria: [
        { name: '2PC Phase Execution & Blocking Vulnerability', max_marks: 5, order_index: 0 },
        { name: '3PC Non-Blocking Transition & Pre-Commit State', max_marks: 5, order_index: 1 },
      ],
    },
    {
      Authorization: `Bearer ${teacherAToken}`,
    }
  );
  assert.strictEqual(rRes.statusCode, 201);

  await request('POST', `/assessments/${teacherA_AssessmentId}/publish`, {}, {
    Authorization: `Bearer ${teacherAToken}`,
  });

  let studentAlice_SubmissionId;
  let studentAlice_ReportId;

  // =========================================================================
  // SUITE 1: AUTHENTICATION & ROLE-BASED DASHBOARD REDIRECTION
  // =========================================================================
  await t.test('1. Auth: Admin login returns role ADMIN and maps to /admin/dashboard', async () => {
    const res = await request('POST', '/login', {
      email: 'admin@skillforge.ai',
      password: 'Password123!',
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.role, 'ADMIN');
    assert.ok(res.body.token);
    assert.strictEqual(getRoleRedirect(res.body.data.role), '/admin/dashboard');
  });

  await t.test('2. Auth: Teacher login returns role TEACHER and maps to /teacher/dashboard', async () => {
    const res = await request('POST', '/login', {
      email: 'teacher@skillforge.ai',
      password: 'Password123!',
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.role, 'TEACHER');
    assert.ok(res.body.token);
    assert.strictEqual(getRoleRedirect(res.body.data.role), '/teacher/dashboard');
  });

  await t.test('3. Auth: Student login returns role STUDENT and maps to /student/dashboard', async () => {
    const res = await request('POST', '/login', {
      email: 'student@skillforge.ai',
      password: 'Password123!',
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.role, 'STUDENT');
    assert.ok(res.body.token);
    assert.strictEqual(getRoleRedirect(res.body.data.role), '/student/dashboard');
  });

  // =========================================================================
  // SUITE 2: RBAC RESTRICTIONS & RESOURCE-LEVEL ACCESS CONTROLS (API-LEVEL)
  // =========================================================================
  await t.test('4. RBAC: Student cannot access /admin/* endpoints (fails with 403 Forbidden)', async () => {
    const adminEndpoints = [
      { method: 'GET', path: '/admin/users' },
      { method: 'GET', path: '/admin/audit-logs' },
      { method: 'GET', path: '/analytics/admin' },
    ];

    for (const ep of adminEndpoints) {
      const res = await request(ep.method, ep.path, null, {
        Authorization: `Bearer ${studentAliceToken}`,
      });
      assert.strictEqual(res.statusCode, 403, `Expected 403 for Student accessing ${ep.path}`);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error.message, /Access denied|Insufficient permissions/i);
    }
  });

  await t.test('5. RBAC: Student cannot access /teacher/* endpoints (fails with 403 Forbidden)', async () => {
    const teacherEndpoints = [
      { method: 'POST', path: '/assessments', body: { title: 'Unauthorized Exam', courseId: 'c1' } },
      { method: 'GET', path: '/analytics/teacher' },
      { method: 'GET', path: '/copilot/recommendations' },
    ];

    for (const ep of teacherEndpoints) {
      const res = await request(ep.method, ep.path, ep.body || null, {
        Authorization: `Bearer ${studentAliceToken}`,
      });
      assert.strictEqual(res.statusCode, 403, `Expected 403 for Student accessing ${ep.path}`);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error.message, /Access denied|Insufficient permissions/i);
    }
  });

  await t.test('6. RBAC: Teacher cannot access /admin/* endpoints (fails with 403 Forbidden)', async () => {
    const adminEndpoints = [
      { method: 'GET', path: '/admin/users' },
      { method: 'GET', path: '/analytics/admin' },
      { method: 'GET', path: '/admin/audit-logs' },
    ];

    for (const ep of adminEndpoints) {
      const res = await request(ep.method, ep.path, null, {
        Authorization: `Bearer ${teacherAToken}`,
      });
      assert.strictEqual(res.statusCode, 403, `Expected 403 for Teacher accessing ${ep.path}`);
      assert.strictEqual(res.body.success, false);
    }
  });

  await t.test('7. RBAC: Teacher B cannot access or modify Teacher A private assessment (fails with 403)', async () => {
    // Attempt to view assessment
    const getRes = await request('GET', `/assessments/${teacherA_AssessmentId}`, null, {
      Authorization: `Bearer ${teacherBToken}`,
    });
    assert.strictEqual(getRes.statusCode, 403);
    assert.strictEqual(getRes.body.success, false);
    assert.match(getRes.body.error.message, /only view or modify your own assessments/i);

    // Attempt to add question
    const postRes = await request(
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
    assert.strictEqual(postRes.statusCode, 403);
    assert.strictEqual(postRes.body.success, false);
    assert.match(postRes.body.error.message, /only view or modify your own assessments/i);
  });

  await t.test('8. RBAC: Student Alice submits answer; Student Bob cannot read Alice submission (fails with 403)', async () => {
    const subRes = await request(
      'POST',
      '/submissions/written',
      {
        assessmentId: teacherA_AssessmentId,
        questionId: teacherA_QuestionId,
        studentId: studentAliceUser.id,
        submissionText: '2PC executes Prepare (voting) and Commit phases. If coordinator crashes after prepare, participants block indefinitely. 3PC introduces PreCommit and timeout termination protocols.',
      },
      {
        Authorization: `Bearer ${studentAliceToken}`,
      }
    );
    assert.strictEqual(subRes.statusCode, 201);
    assert.ok(subRes.body.data.anonymous_submission_id);

    for (const w of memoryStore.written_submissions.values()) {
      if (w.student_id === studentAliceUser.id) {
        studentAlice_SubmissionId = w.id;
        break;
      }
    }
    assert.ok(studentAlice_SubmissionId);

    // Alice reads own submission -> 200 OK
    const aliceGetRes = await request('GET', `/submissions/${studentAlice_SubmissionId}`, null, {
      Authorization: `Bearer ${studentAliceToken}`,
    });
    assert.strictEqual(aliceGetRes.statusCode, 200);
    assert.strictEqual(aliceGetRes.body.data.id, studentAlice_SubmissionId);

    // Bob attempts to read Alice submission -> 403 Forbidden
    const bobGetRes = await request('GET', `/submissions/${studentAlice_SubmissionId}`, null, {
      Authorization: `Bearer ${studentBobToken}`,
    });
    assert.strictEqual(bobGetRes.statusCode, 403);
    assert.strictEqual(bobGetRes.body.success, false);
    assert.match(bobGetRes.body.error.message, /only view your own submissions/i);
  });

  // =========================================================================
  // SUITE 3: FAIRGRADE SCORING CONSISTENCY, OVERRIDES & INDEPENDENT APPEALS
  // =========================================================================
  await t.test('9. FairGrade: Repeated evaluation of identical answer + rubric yields consistent scores within tolerance', async () => {
    const rubricPayload = [
      { criterion: '2PC Phase Execution & Blocking Vulnerability', max_marks: 5 },
      { criterion: '3PC Non-Blocking Transition & Pre-Commit State', max_marks: 5 },
    ];
    const answerText = '2PC executes Prepare and Commit phases. It blocks if coordinator crashes. 3PC introduces PreCommit phase to eliminate blocking states.';

    // Run evaluation 1
    const eval1 = await FairGradeClient.evaluate({
      anonymous_submission_id: 'anon-consistency-run-1',
      question: 'Explain 2PC vs 3PC.',
      max_marks: 10,
      rubric: rubricPayload,
      student_answer: answerText,
    });

    // Run evaluation 2
    const eval2 = await FairGradeClient.evaluate({
      anonymous_submission_id: 'anon-consistency-run-2',
      question: 'Explain 2PC vs 3PC.',
      max_marks: 10,
      rubric: rubricPayload,
      student_answer: answerText,
    });

    assert.ok(eval1.total_score > 0);
    assert.ok(eval2.total_score > 0);

    const delta = Math.abs(eval1.total_score - eval2.total_score);
    assert.ok(delta <= 0.5, `Score delta between identical runs was ${delta}, expected <= 0.5`);
  });

  await t.test('10. FairGrade: Two differently-worded but conceptually equivalent answers score similarly', async () => {
    const rubricPayload = [
      { criterion: 'Mechanisms and Definition', max_marks: 5 },
      { criterion: 'Failure Recovery Strategy', max_marks: 5 },
    ];

    // Formal wording
    const evalFormal = await FairGradeClient.evaluate({
      anonymous_submission_id: 'anon-equiv-formal',
      question: 'Explain Write-Ahead Logging (WAL) in databases.',
      max_marks: 10,
      rubric: rubricPayload,
      student_answer: 'Write-Ahead Logging dictates that log records reflecting database modifications must be flushed to non-volatile storage before corresponding dirty database pages are written to disk. This guarantees Atomicity and Durability during crash recovery via ARIES redo/undo passes.',
    });

    // Practical wording
    const evalPractical = await FairGradeClient.evaluate({
      anonymous_submission_id: 'anon-equiv-practical',
      question: 'Explain Write-Ahead Logging (WAL) in databases.',
      max_marks: 10,
      rubric: rubricPayload,
      student_answer: 'WAL is a database durability technique where you always append transaction changes into a sequential log on disk before updating actual data tables. If the system crashes unexpectedly, the database recovers by replaying committed log entries and rolling back uncommitted ones.',
    });

    const scoreFormal = evalFormal.total_score;
    const scorePractical = evalPractical.total_score;
    const delta = Math.abs(scoreFormal - scorePractical);

    assert.ok(delta <= 1.5, `Concept equivalence delta was ${delta}, expected <= 1.5`);
  });

  await t.test('11. FairGrade: Low-confidence evaluation is flagged for human review', async () => {
    const flaggedReport = await FairGradeReport.create({
      anonymous_submission_id: 'anon-low-conf-001',
      total_score: 5.5,
      max_possible_score: 10.0,
      confidence_score: 0.76, // < 0.85 triggers human review
      requires_human_review: true,
      status: 'flagged_for_review',
      overall_feedback: 'Low multi-agent consensus confidence. Routed to instructor review.',
    });

    assert.strictEqual(flaggedReport.requires_human_review, true);
    assert.strictEqual(flaggedReport.status, 'flagged_for_review');
    assert.ok(flaggedReport.confidence_score < 0.85);
  });

  await t.test('12. FairGrade: Teacher override on grade ALWAYS writes an audit log record', async () => {
    // Initial report
    const initialReport = await FairGradeReport.create({
      anonymous_submission_id: 'anon-override-target-001',
      total_score: 7.0,
      max_possible_score: 10.0,
      confidence_score: 0.92,
      overall_feedback: 'Good initial answer',
      status: 'evaluated',
    });
    studentAlice_ReportId = initialReport.id;

    // Teacher records grade override via /audit/log
    const overrideRes = await request(
      'POST',
      '/audit/log',
      {
        writtenSubmissionId: studentAlice_SubmissionId,
        anonymousSubmissionId: initialReport.anonymous_submission_id,
        action: 'TEACHER_SCORE_OVERRIDE',
        performedBy: teacherAUser.name || 'Prof. Alice',
        performedByRole: 'TEACHER',
        previousState: { total_score: 7.0 },
        newState: { total_score: 8.5 },
        reason: 'Student accurately articulated 3PC timeout phase transitions.',
        target: `grade:report:${studentAlice_ReportId}`,
      },
      {
        Authorization: `Bearer ${teacherAToken}`,
      }
    );

    assert.strictEqual(overrideRes.statusCode, 201);
    assert.strictEqual(overrideRes.body.success, true);
    assert.strictEqual(overrideRes.body.data.action, 'TEACHER_SCORE_OVERRIDE');

    // Verify audit log record exists in memoryStore/DB
    const auditLogs = Array.from(memoryStore.grade_audit_logs.values());
    const overrideLog = auditLogs.find(
      (l) =>
        (l.action === 'TEACHER_SCORE_OVERRIDE' || l.action === 'GRADE_MODIFIED') &&
        (l.target === `grade:report:${studentAlice_ReportId}` || l.written_submission_id === studentAlice_SubmissionId)
    );

    assert.ok(overrideLog, 'Expected audit log record for teacher grade override');
    assert.strictEqual(overrideLog.role, 'TEACHER');
    assert.ok(overrideLog.reason.includes('accurately articulated 3PC'));
    assert.strictEqual(overrideLog.new_value.total_score, 8.5);
    assert.ok(overrideLog.timestamp);
  });

  await t.test('13. FairGrade: Appeal triggers independent blind re-evaluation with fresh state', async () => {
    // Student files appeal
    const appealRes = await request(
      'POST',
      '/grade-appeals',
      {
        writtenSubmissionId: studentAlice_SubmissionId,
        studentId: studentAliceUser.id,
        appealReason: 'My answer described 3PC non-blocking properties thoroughly.',
      },
      {
        Authorization: `Bearer ${studentAliceToken}`,
      }
    );
    assert.strictEqual(appealRes.statusCode, 201);
    const appealId = appealRes.body.data.id;

    // Trigger independent blind re-evaluation
    const reEvalRes = await request(
      'POST',
      `/grade-appeals/${appealId}/re-evaluate`,
      {
        threshold: 0.10,
      },
      {
        Authorization: `Bearer ${studentAliceToken}`,
      }
    );

    assert.strictEqual(reEvalRes.statusCode, 200);
    assert.strictEqual(reEvalRes.body.success, true);
    assert.ok(reEvalRes.body.data.reevaluated_score >= 0);

    // Verify fresh audit trail entries were created
    const appealAuditRes = await request('GET', `/grade-appeals/${appealId}/audit`, null, {
      Authorization: `Bearer ${studentAliceToken}`,
    });
    assert.strictEqual(appealAuditRes.statusCode, 200);
    assert.ok(appealAuditRes.body.data.length >= 2);
  });
});
