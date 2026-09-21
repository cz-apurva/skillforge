const { test } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../src/app');
const Notification = require('../src/models/Notification');
const NotificationService = require('../src/services/notificationService');
const AuthService = require('../src/services/authService');
const AssessmentService = require('../src/services/assessmentService');
const SubmissionService = require('../src/services/submissionService');
const AppealService = require('../src/services/appealService');
const CopilotService = require('../src/services/copilotService');
const AdminService = require('../src/services/adminService');
const { executeAICall } = require('../src/ai');
const { memoryStore } = require('../src/config/db');

let server;
let baseUrl;
let teacherToken;
let studentToken;
let adminToken;
let teacherUser;
let studentUser;
let adminUser;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

test('Real-Trigger Notification System Integration Tests', async (t) => {
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

  // Authenticate demo users
  const teacherAuth = await AuthService.login({
    email: 'teacher@skillforge.ai',
    password: 'Password123!',
  });
  teacherToken = teacherAuth.token;
  teacherUser = teacherAuth.user;

  const studentAuth = await AuthService.login({
    email: 'student@skillforge.ai',
    password: 'Password123!',
  });
  studentToken = studentAuth.token;
  studentUser = studentAuth.user;

  const adminAuth = await AuthService.login({
    email: 'admin@skillforge.ai',
    password: 'Password123!',
  });
  adminToken = adminAuth.token;
  adminUser = adminAuth.user;

  let createdAssessment;
  let createdQuestion;
  let createdSubmission;
  let createdAppeal;

  await t.test('1. Setup Assessment and Rubric for Real Trigger Testing', async () => {
    createdAssessment = await AssessmentService.createAssessment({
      title: 'Database Normalization & BCNF Exam',
      description: 'Formal decomposition and functional dependency validation',
      subject: 'Database Systems',
      course_id: 'CS-401',
      created_by: teacherUser.id,
      due_date: '2026-10-15',
    }, teacherUser);

    createdQuestion = await AssessmentService.addQuestion(createdAssessment.id, {
      question_number: 1,
      question_text: 'Prove that any relational schema with two attributes is in BCNF.',
      question_type: 'subjective',
      max_score: 10.0,
      order_index: 1,
    }, teacherUser);

    await AssessmentService.saveRubric(createdAssessment.id, {
      question_id: createdQuestion.id,
      criteria: [
        {
          name: 'BCNF Definition',
          max_marks: 5.0,
          description: 'Determinant superkey condition',
        },
        {
          name: 'Two-Attribute Proof',
          max_marks: 5.0,
          description: 'Case analysis of non-trivial functional dependencies',
        },
      ],
    }, teacherUser);

    assert.ok(createdAssessment);
    assert.ok(createdQuestion);
  });

  await t.test('2. Student Notification Trigger: New Assignment Published', async () => {
    await Notification._resetForTesting();

    await AssessmentService.publishAssessment(createdAssessment.id, teacherUser);

    const studentNotifs = await Notification.findForUser({ role: 'STUDENT' });
    assert.ok(studentNotifs.length >= 1, 'Student should receive notification when assignment is published');

    const notif = studentNotifs.find((n) => n.type === 'NEW_ASSIGNMENT_PUBLISHED');
    assert.ok(notif, 'Notification type must be NEW_ASSIGNMENT_PUBLISHED');
    assert.strictEqual(notif.record_id, createdAssessment.id);
    assert.ok(notif.message.includes(createdAssessment.title));
    assert.ok(notif.message.includes(createdAssessment.id));
  });

  await t.test('3. Teacher & Student Notification Triggers: New Submission + Grade Published + Feedback Available', async () => {
    await Notification._resetForTesting();

    const subRes = await SubmissionService.submitWrittenAnswer({
      assessment_id: createdAssessment.id,
      question_id: createdQuestion.id,
      student_id: studentUser.id,
      submission_text: 'For any relation R(A, B), the only non-trivial functional dependencies are A->B or B->A, both making the determinant a superkey.',
      auto_grade: true,
    });

    createdSubmission = Array.from(memoryStore.written_submissions.values()).find(
      (s) => s.assessment_id === createdAssessment.id
    );
    assert.ok(createdSubmission, 'Written submission must exist');

    // Check Teacher received NEW_SUBMISSION notification with real submission_id
    const teacherNotifs = await Notification.findForUser({ role: 'TEACHER' });
    const subNotif = teacherNotifs.find((n) => n.type === 'NEW_SUBMISSION');
    assert.ok(subNotif, 'Teacher should receive NEW_SUBMISSION notification');
    assert.strictEqual(subNotif.record_id, createdSubmission.id);
    assert.ok(subNotif.message.includes(createdSubmission.id));

    // Check Student received GRADE_PUBLISHED & FEEDBACK_AVAILABLE
    const studentNotifs = await Notification.findForUser({ user_id: studentUser.id });
    const gradeNotif = studentNotifs.find((n) => n.type === 'GRADE_PUBLISHED');
    assert.ok(gradeNotif, 'Student should receive GRADE_PUBLISHED notification');
    assert.strictEqual(gradeNotif.record_id, createdSubmission.id);
    assert.ok(gradeNotif.message.includes(createdSubmission.id));

    const feedbackNotif = studentNotifs.find((n) => n.type === 'FEEDBACK_AVAILABLE');
    assert.ok(feedbackNotif, 'Student should receive FEEDBACK_AVAILABLE notification');
    assert.strictEqual(feedbackNotif.record_id, createdSubmission.id);
  });

  await t.test('4. Teacher Notification Trigger: FairGrade Review Required on Low Confidence', async () => {
    const lowConfReport = {
      submission_id: createdSubmission.id,
      total_score: 4.5,
      confidence_score: 0.62,
      flag_reason: 'Ambiguous dependency notation requires human verification',
    };

    const reviewNotif = await NotificationService.notifyTeacherOnReviewRequired({
      submission: createdSubmission,
      report: lowConfReport,
      assessment: createdAssessment,
    });

    assert.ok(reviewNotif);
    assert.strictEqual(reviewNotif.type, 'FAIRGRADE_REVIEW_REQUIRED');
    assert.strictEqual(reviewNotif.record_id, createdSubmission.id);
    assert.ok(reviewNotif.message.includes(createdSubmission.id));
    assert.ok(reviewNotif.message.includes('62%'));
  });

  await t.test('5. Teacher & Student Notification Triggers: Grade Appeal Filed & Re-Evaluation Result Finalized', async () => {
    // 1. Student files grade appeal
    createdAppeal = await AppealService.createAppeal({
      writtenSubmissionId: createdSubmission.id,
      studentId: studentUser.id,
      appealReason: 'The answer covers all 2-attribute cases rigorously including trivial dependencies.',
    });

    // Verify Teacher received GRADE_APPEAL_FILED notification
    const teacherNotifs = await Notification.findForUser({ role: 'TEACHER' });
    const appealNotif = teacherNotifs.find((n) => n.type === 'GRADE_APPEAL_FILED');
    assert.ok(appealNotif, 'Teacher should receive GRADE_APPEAL_FILED notification');
    assert.strictEqual(appealNotif.record_id, createdAppeal.id);
    assert.ok(appealNotif.message.includes(createdAppeal.id));
    assert.ok(appealNotif.message.includes(createdSubmission.id));

    // 2. Resolve appeal with re-evaluation
    const appealRes = await AppealService.reEvaluateAppeal(createdAppeal.id);

    // Verify Student received APPEAL_RESOLVED notification
    const studentNotifs = await Notification.findForUser({ user_id: studentUser.id });
    const resolvedNotif = studentNotifs.find((n) => n.type === 'APPEAL_RESOLVED');
    assert.ok(resolvedNotif, 'Student should receive APPEAL_RESOLVED notification');
    assert.strictEqual(resolvedNotif.record_id, createdAppeal.id);
    assert.ok(resolvedNotif.message.includes(createdAppeal.id));
    assert.ok(resolvedNotif.message.includes(createdSubmission.id));
  });

  await t.test('6. Teacher Notification Trigger: Teacher Co-Pilot Weak Topic Detected', async () => {
    const copilotRes = await CopilotService.getTeacherRecommendations({
      teacherUser,
      forceRefresh: true,
    });

    const teacherNotifs = await Notification.findForUser({ role: 'TEACHER' });
    const weakTopicNotif = teacherNotifs.find((n) => n.type === 'WEAK_TOPIC_DETECTED');
    assert.ok(weakTopicNotif, 'Teacher should receive WEAK_TOPIC_DETECTED notification');
    assert.ok(weakTopicNotif.record_id.startsWith('rec-copilot-'));
    assert.ok(weakTopicNotif.message.includes(copilotRes.top_weakness_concept || 'Normalization'));
  });

  await t.test('7. Admin Notification Triggers: AI Service Degraded & Security Events', async () => {
    // 1. AI Service Degraded trigger
    await NotificationService.notifyAdminOnServiceDegraded({
      serviceName: 'judge0',
      status: 'DEGRADED',
      details: 'Judge0 connection timeout, fallback local sandbox active',
    });

    // 2. Security Event trigger via unauthorized student access attempt
    await request('GET', '/admin/users', null, studentToken);
    await new Promise((r) => setTimeout(r, 50));

    const adminNotifs = await Notification.findForUser({ role: 'ADMIN' });

    const aiAlert = adminNotifs.find((n) => n.type === 'AI_SERVICE_DEGRADED');
    assert.ok(aiAlert, 'Admin should receive AI_SERVICE_DEGRADED notification');
    assert.strictEqual(aiAlert.record_id, 'judge0');
    assert.ok(aiAlert.message.includes('judge0'));

    const secAlert = adminNotifs.find((n) => n.type === 'SECURITY_EVENT');
    assert.ok(secAlert, 'Admin should receive SECURITY_EVENT notification');
    assert.ok(secAlert.title.includes('RBAC_ACCESS_DENIED') || secAlert.metadata?.action === 'RBAC_ACCESS_DENIED');
  });

  await t.test('8. REST Endpoints: GET /notifications, PATCH /:id/read, POST /mark-all-read', async () => {
    // 1. GET /notifications
    const getRes = await request('GET', '/notifications', null, teacherToken);
    assert.strictEqual(getRes.statusCode, 200);
    assert.strictEqual(getRes.body.success, true);
    assert.ok(Array.isArray(getRes.body.data.notifications));
    assert.ok(getRes.body.data.notifications.length > 0);

    const targetNotif = getRes.body.data.notifications[0];

    // 2. PATCH /notifications/:id/read
    const patchRes = await request('PATCH', `/notifications/${targetNotif.id}/read`, {}, teacherToken);
    assert.strictEqual(patchRes.statusCode, 200);
    assert.strictEqual(patchRes.body.data.is_read, true);

    // 3. POST /notifications/mark-all-read
    const markAllRes = await request('POST', '/notifications/mark-all-read', {}, teacherToken);
    assert.strictEqual(markAllRes.statusCode, 200);
    assert.ok(markAllRes.body.data.updated_count >= 0);

    // Verify all now read
    const verifyRes = await request('GET', '/notifications?is_read=false', null, teacherToken);
    assert.strictEqual(verifyRes.body.data.notifications.length, 0);
  });
});
