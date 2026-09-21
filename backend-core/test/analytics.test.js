const test = require('node:test');
const assert = require('node:assert');
const http = require('http');

process.env.USE_MEMORY_DB = 'true';
process.env.PORT = '0';

const app = require('../src/app');
const { memoryStore } = require('../src/config/db');
const FairGradeReport = require('../src/models/FairGradeReport');
const FairGradeCriterionScore = require('../src/models/FairGradeCriterionScore');

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'skillforge-jwt-super-secret-key-2026';

let server;
let baseUrl;

const teacherToken = jwt.sign(
  { id: 'teacher-analytics-uuid-001', email: 'teacher@skillforge.ai', role: 'TEACHER' },
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
    req.end();
  });
}

test('FairGrade Analytics & Teacher Co-Pilot Integration Tests', async (t) => {
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

  // Seed mock evaluation reports with known criteria and missing concepts
  const report1 = await FairGradeReport.create({
    anonymous_submission_id: 'anon-analytics-01',
    total_score: 9.0,
    max_possible_score: 10.0,
    confidence_score: 0.95,
    overall_feedback: 'Strong answer',
    areas_for_improvement: ['Context switching overhead in high frequency preemption'],
  });

  const report2 = await FairGradeReport.create({
    anonymous_submission_id: 'anon-analytics-02',
    total_score: 8.0,
    max_possible_score: 10.0,
    confidence_score: 0.90,
    overall_feedback: 'Good answer',
    areas_for_improvement: [
      'Context switching overhead in high frequency preemption',
      'Convoy effect in FCFS',
    ],
  });

  await FairGradeCriterionScore.create({
    report_id: report1.id,
    criterion_id: 'crit-01',
    score_awarded: 4.5,
    max_score: 5.0,
    feedback: 'Good definition',
  });

  await FairGradeCriterionScore.create({
    report_id: report2.id,
    criterion_id: 'crit-01',
    score_awarded: 4.0,
    max_score: 5.0,
    feedback: 'Adequate definition',
  });

  await t.test('1. GET /analytics/fairgrade - Returns accurate cohort metrics and criterion performance', async () => {
    const res = await request('GET', '/analytics/fairgrade');

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    const data = res.body.data;

    assert.ok(data.total_submissions >= 2);
    assert.ok(data.average_marks > 0);
    assert.ok(data.grading_consistency_rate >= 0);
    assert.ok(data.average_confidence >= 0);
    assert.ok(Array.isArray(data.criterion_performance));
    assert.ok(Array.isArray(data.aggregated_missing_concepts));

    // Verify top aggregated missing concept
    const topConcept = data.aggregated_missing_concepts[0];
    assert.ok(topConcept);
    assert.ok(topConcept.concept.includes('Context switching overhead'));
    assert.ok(topConcept.frequency >= 1);
  });

  await t.test('2. GET /copilot/recommendations - Generates teaching interventions from aggregated missing concepts', async () => {
    const res = await request('GET', '/copilot/recommendations');

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    const data = res.body.data;

    assert.ok(Array.isArray(data.recommendations));
    assert.ok(data.recommendations.length > 0);

    const firstRec = data.recommendations[0];
    assert.ok(firstRec.topic.includes('Context switching overhead'));
    assert.ok(firstRec.suggested_action);
    assert.ok(firstRec.suggested_discussion_starter);
    assert.ok(Array.isArray(firstRec.recommended_resources));
  });

  await t.test('3. GET /analytics/teacher - Returns teacher role metrics (performance, topics, difficulty, trends, hints, FairGrade delta)', async () => {
    const res = await request('GET', '/analytics/teacher');

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    const data = res.body.data;

    assert.ok(data.overview);
    assert.ok(data.overview.total_submissions >= 2);
    assert.ok(data.overview.average_marks !== undefined);
    assert.ok(data.overview.human_review_rate !== undefined);
    assert.ok(data.overview.appeal_rate !== undefined);
    assert.ok(data.overview.ai_vs_teacher_score_difference !== undefined);
    assert.ok(data.confidence_distribution);
    assert.ok(data.confidence_distribution.high !== undefined);
    assert.ok(Array.isArray(data.topic_mastery));
    assert.ok(Array.isArray(data.assignment_difficulty));
    assert.ok(Array.isArray(data.submission_trends));
    assert.ok(data.hint_usage);
    assert.ok(data.hint_usage.total_hints_requested !== undefined);
    assert.ok(Array.isArray(data.class_performance));
  });

  await t.test('4. GET /analytics/student - Returns student own data only (progress, topic mastery, weak/strong, grade history)', async () => {
    const studentToken = jwt.sign(
      { id: 'student-analytics-001', email: 'student@skillforge.ai', role: 'STUDENT' },
      JWT_SECRET
    );

    const res = await request('GET', '/analytics/student', null, {
      Authorization: `Bearer ${studentToken}`,
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    const data = res.body.data;

    assert.ok(data.progress);
    assert.ok(data.progress.cumulative_mastery !== undefined);
    assert.ok(data.progress.completion_rate !== undefined);
    assert.ok(data.progress.learning_streak_days !== undefined);
    assert.ok(Array.isArray(data.topic_mastery));
    assert.ok(Array.isArray(data.strong_topics));
    assert.ok(Array.isArray(data.weak_topics));
    assert.ok(Array.isArray(data.grade_history));
  });

  await t.test('5. GET /analytics/admin - Returns platform-level metrics only (no per-student academic records)', async () => {
    const adminToken = jwt.sign(
      { id: 'admin-analytics-001', email: 'admin@skillforge.ai', role: 'ADMIN' },
      JWT_SECRET
    );

    const res = await request('GET', '/analytics/admin', null, {
      Authorization: `Bearer ${adminToken}`,
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    const data = res.body.data;

    assert.ok(data.platform);
    assert.ok(data.platform.total_students !== undefined);
    assert.ok(data.platform.total_teachers !== undefined);
    assert.ok(data.platform.active_cohorts !== undefined);
    assert.ok(data.platform.total_evaluations !== undefined);
    assert.ok(data.platform.zero_pii_compliance_rate !== undefined);
    assert.ok(Array.isArray(data.department_breakdown));
    assert.ok(data.ai_throughput_telemetry);
    // Crucially confirm no student-level personal identification or submissions in admin metrics
    assert.strictEqual(data.students, undefined);
    assert.strictEqual(data.submissions, undefined);
  });

  await t.test('6. RBAC Guard - Student attempting to access /analytics/teacher and /analytics/admin gets 403 Forbidden', async () => {
    const studentToken = jwt.sign(
      { id: 'student-intruder', email: 'intruder@skillforge.ai', role: 'STUDENT' },
      JWT_SECRET
    );

    const resTeacher = await request('GET', '/analytics/teacher', null, {
      Authorization: `Bearer ${studentToken}`,
    });
    assert.strictEqual(resTeacher.statusCode, 403);

    const resAdmin = await request('GET', '/analytics/admin', null, {
      Authorization: `Bearer ${studentToken}`,
    });
    assert.strictEqual(resAdmin.statusCode, 403);
  });

  await t.test('7. RBAC Guard - Teacher attempting to access /analytics/admin gets 403 Forbidden', async () => {
    const resAdmin = await request('GET', '/analytics/admin');
    assert.strictEqual(resAdmin.statusCode, 403);
  });
});
