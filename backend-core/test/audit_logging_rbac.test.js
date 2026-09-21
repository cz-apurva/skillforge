const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const GradeAuditLog = require('../src/models/GradeAuditLog');
const User = require('../src/models/User');
const Assessment = require('../src/models/Assessment');
const { memoryStore } = require('../src/config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'skillforge-jwt-super-secret-key-2026';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role.toUpperCase() },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

test('Audit Logging & Role-Based Slice Isolation Tests', async (t) => {
  let server;
  let port;
  let baseUrl;

  const adminUser = { id: 'admin-audit-001', name: 'Admin Supreme', email: 'admin.audit@skillforge.ai', role: 'ADMIN' };
  const teacherA = { id: 'teacher-audit-A', name: 'Prof. Alice Teacher', email: 'prof.a@skillforge.ai', role: 'TEACHER' };
  const teacherB = { id: 'teacher-audit-B', name: 'Prof. Bob Teacher', email: 'prof.b@skillforge.ai', role: 'TEACHER' };
  const studentAlice = { id: 'student-audit-001', name: 'Student Alice', email: 'student.alice@skillforge.ai', role: 'STUDENT' };

  const adminToken = generateToken(adminUser);
  const teacherAToken = generateToken(teacherA);
  const teacherBToken = generateToken(teacherB);
  const studentToken = generateToken(studentAlice);

  t.before(async () => {
    // Start test server
    server = app.listen(0);
    port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    // Seed test users in memory
    memoryStore.users.set(adminUser.id, adminUser);
    memoryStore.users.set(teacherA.id, teacherA);
    memoryStore.users.set(teacherB.id, teacherB);
    memoryStore.users.set(studentAlice.id, studentAlice);
  });

  t.after(async () => {
    if (server) await server.close();
  });

  await t.test('1. Every required action produces an audit log with standard 9-field schema', async () => {
    const actions = [
      { action: 'USER_CREATED', target: 'user:usr-new', reason: 'New student onboarded' },
      { action: 'USER_DEACTIVATED', target: 'user:usr-old', reason: 'Account suspended' },
      { action: 'CLASS_CREATED', target: 'class:cls-os401', reason: 'Initialized OS Section A' },
      { action: 'ASSESSMENT_CREATED', target: 'assessment:asg-midterm', reason: 'Midterm exam draft' },
      { action: 'RUBRIC_MODIFIED', target: 'rubric:rub-001', reason: 'Updated concurrency criterion weight' },
      { action: 'SUBMISSION_CREATED', target: 'submission:sub-8812', reason: 'Student submitted written answer' },
      { action: 'GRADE_GENERATED', target: 'anon-sub:anon-8812', reason: 'Zero-PII evaluation completed' },
      { action: 'GRADE_MODIFIED', target: 'submission:sub-8812', reason: 'Teacher adjusted score by +1.0' },
      { action: 'GRADE_APPEALED', target: 'submission:sub-8812', reason: 'Student requested blind re-eval' },
      { action: 'GRADE_REVIEWED', target: 'anon-sub:anon-8812', reason: 'Blind re-evaluation matched original score' },
      { action: 'AI_SERVICE_ERROR', target: 'service:fairgrade-evaluator', reason: 'Network timeout; fallback engaged' },
    ];

    for (const item of actions) {
      const log = await GradeAuditLog.create({
        actor: 'Admin Supreme',
        role: 'ADMIN',
        action: item.action,
        target: item.target,
        old_value: { status: 'prior' },
        new_value: { status: 'current' },
        reason: item.reason,
      });

      assert.ok(log.id, `Log ID should be present for ${item.action}`);
      assert.equal(log.actor, 'Admin Supreme');
      assert.equal(log.role, 'ADMIN');
      assert.equal(log.action, item.action);
      assert.equal(log.target, item.target);
      assert.deepEqual(log.old_value, { status: 'prior' });
      assert.deepEqual(log.new_value, { status: 'current' });
      assert.equal(log.reason, item.reason);
      assert.ok(log.timestamp, 'Timestamp must be present');
    }
  });

  await t.test('2. Admin can fetch full platform audit logs via GET /admin/audit-logs', async () => {
    const res = await fetch(`${baseUrl}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length >= 11);
  });

  await t.test('3. Teacher A receives filtered slice for their own classes/assessments only', async () => {
    // Create audit log specific to Teacher A's class
    await GradeAuditLog.create({
      actor: teacherA.name,
      role: 'TEACHER',
      action: 'CLASS_CREATED',
      target: 'class:cls-teacher-a-only',
      old_value: null,
      new_value: { name: 'Teacher A Masterclass' },
      reason: 'Created specialized course',
      teacher_id: teacherA.id,
      class_id: 'cls-teacher-a-only',
    });

    // Create audit log specific to Teacher B's class
    await GradeAuditLog.create({
      actor: teacherB.name,
      role: 'TEACHER',
      action: 'CLASS_CREATED',
      target: 'class:cls-teacher-b-only',
      old_value: null,
      new_value: { name: 'Teacher B Cryptography' },
      reason: 'Created security class',
      teacher_id: teacherB.id,
      class_id: 'cls-teacher-b-only',
    });

    const res = await fetch(`${baseUrl}/teacher/audit-logs`, {
      headers: { Authorization: `Bearer ${teacherAToken}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));

    // Teacher A's slice must include Teacher A's log
    const hasTeacherALog = json.data.some((l) => l.target === 'class:cls-teacher-a-only' || l.actor === teacherA.name);
    assert.ok(hasTeacherALog, "Teacher A slice must contain Teacher A's own actions");

    // Teacher A's slice must NOT contain Teacher B's isolated log
    const hasTeacherBLog = json.data.some((l) => l.target === 'class:cls-teacher-b-only');
    assert.equal(hasTeacherBLog, false, "Teacher A slice must NEVER contain Teacher B's isolated class logs");
  });

  await t.test('4. Student token accessing GET /admin/audit-logs is rejected with 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    assert.equal(res.status, 403, 'Student must be rejected with 403 Forbidden from admin audit logs');
  });

  await t.test('5. Student token accessing GET /teacher/audit-logs is rejected with 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/teacher/audit-logs`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    assert.equal(res.status, 403, 'Student must be rejected with 403 Forbidden from teacher audit logs');
  });

  await t.test('6. Student token accessing GET /audit/logs is rejected with 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/audit/logs`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    assert.equal(res.status, 403, 'Student must be rejected with 403 Forbidden from general audit logs');
  });
});
