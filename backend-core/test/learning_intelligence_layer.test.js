const test = require('node:test');
const assert = require('node:assert');
const http = require('http');

process.env.USE_MEMORY_DB = 'true';
process.env.AI_MODE = 'mock';
process.env.PORT = '0';

const app = require('../src/app');
const LearningIntelligenceService = require('../src/services/learningIntelligence.service');
const Concept = require('../src/models/Concept');
const LearningEvidence = require('../src/models/LearningEvidence');
const ConceptMastery = require('../src/models/ConceptMastery');
const Misconception = require('../src/models/Misconception');
const Intervention = require('../src/models/Intervention');
const Reassessment = require('../src/models/Reassessment');
const RecoveryResult = require('../src/models/RecoveryResult');
const GradeAuditLog = require('../src/models/GradeAuditLog');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'skillforge-jwt-super-secret-key-2026';

function generateToken(user) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
}

let server;
let baseUrl;

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

const testStudent = {
  id: 'student-test-uuid',
  name: 'Alice Johnson',
  email: 'alice.test@skillforge.ai',
  role: 'STUDENT',
};

const testTeacher = {
  id: 'teacher-test-uuid',
  name: 'Prof. A. Anupam',
  email: 'teacher.test@skillforge.ai',
  role: 'TEACHER',
};

test('🧠 SkillForge AI - Learning Intelligence Layer Full Test Suite', async (t) => {
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

  const studentToken = generateToken(testStudent);
  const teacherToken = generateToken(testTeacher);

  await t.test('Phase 1: Concept Taxonomy & Model Verification', async () => {
    const concept = await Concept.create({
      classroom_id: 'cls-mca-402',
      topic: 'Database Engineering',
      name: 'Entropy & Information Gain',
      description: 'Quantifying uncertainty reduction in recursive partition decision trees.',
      prerequisites: ['Probability', 'Logarithms'],
      common_misconceptions: ['Confusing Gini impurity with Shannon entropy formulas'],
    });

    assert.ok(concept, 'Concept should be defined');
    assert.ok(concept.id, 'Concept ID should be defined');
    assert.strictEqual(concept.name, 'Entropy & Information Gain');
    assert.ok(concept.prerequisites.includes('Probability'));

    const found = await Concept.findById(concept.id);
    assert.strictEqual(found.topic, 'Database Engineering');
  });

  await t.test('Phase 2 & 3: LearningEvidence Emission & Deterministic Concept Mastery', async () => {
    // 1. Initial attempt: score 4/10 (40%)
    const res1 = await LearningIntelligenceService.recordLearningEvidence({
      studentId: testStudent.id,
      classroomId: 'cls-mca-402',
      conceptName: 'Boyce-Codd Normal Form (BCNF) Decomposition',
      topic: 'Database Engineering & Normal Forms',
      source: 'WRITTEN_ASSESSMENT',
      scoreAchieved: 4.0,
      maxScore: 10.0,
      confidenceScore: 0.90,
      evidencePayload: { note: 'Incomplete determinant extraction' },
    });

    assert.ok(res1.evidence, 'Evidence should be recorded');
    assert.strictEqual(res1.mastery.mastery_score, 40.0);
    assert.strictEqual(res1.mastery.status, 'NEEDS_ATTENTION');

    // 2. Second attempt: score 7/10 (70%)
    const res2 = await LearningIntelligenceService.recordLearningEvidence({
      studentId: testStudent.id,
      classroomId: 'cls-mca-402',
      conceptName: 'Boyce-Codd Normal Form (BCNF) Decomposition',
      topic: 'Database Engineering & Normal Forms',
      source: 'TUTOR_INTERACTION',
      scoreAchieved: 7.0,
      maxScore: 10.0,
      confidenceScore: 0.85,
      evidencePayload: { query: 'How to verify lossless join in BCNF?' },
    });

    assert.ok(res2.mastery.mastery_score > 40.0, 'Mastery score should increase with positive performance');
    assert.strictEqual(res2.mastery.total_evidence_count, 2);
  });

  await t.test('Phase 4 & 5: Misconception Detection & Learning Recovery Planner', async () => {
    const concept = await Concept.create({
      classroom_id: 'cls-mca-402',
      topic: 'Database Systems',
      name: 'Chase Matrix Algorithm',
      description: 'Tableau matrix proof technique',
    });

    await LearningEvidence.create({
      student_id: testStudent.id,
      classroom_id: 'cls-mca-402',
      concept_id: concept.id,
      source: 'WRITTEN_ASSESSMENT',
      score_achieved: 3.0,
      max_score: 10.0,
      success_rate: 30.0,
      confidence_score: 0.92,
      evidence_payload: { error: 'Subscript row mismatch' },
    });

    await LearningEvidence.create({
      student_id: testStudent.id,
      classroom_id: 'cls-mca-402',
      concept_id: concept.id,
      source: 'WRITTEN_ASSESSMENT',
      score_achieved: 4.0,
      max_score: 10.0,
      success_rate: 40.0,
      confidence_score: 0.90,
      evidence_payload: { error: 'Incorrect tableau column replacement' },
    });

    const misconception = await LearningIntelligenceService.detectMisconception({
      studentId: testStudent.id,
      classroomId: 'cls-mca-402',
      conceptId: concept.id,
    });

    assert.ok(misconception, 'Misconception should be generated');
    assert.ok(['LIKELY', 'CONFIRMED', 'POSSIBLE', 'INSUFFICIENT_EVIDENCE'].includes(misconception.status));
    assert.ok(misconception.confidence_score >= 0.0 && misconception.confidence_score <= 1.0);

    const interventions = await Intervention.findByStudent(testStudent.id, 'cls-mca-402');
    const active = interventions.find((i) => i.concept_id === concept.id);
    assert.ok(active, 'Active intervention should be created');
    assert.ok(active.steps.length >= 2, 'Should contain multi-step recovery plan');
  });

  await t.test('Phase 6: Reassessment & Recovery Result Tracking', async () => {
    const concept = await Concept.create({
      classroom_id: 'cls-mca-402',
      topic: 'Operating Systems',
      name: 'CFS vruntime Dynamics',
    });

    const intervention = await Intervention.create({
      student_id: testStudent.id,
      classroom_id: 'cls-mca-402',
      concept_id: concept.id,
      initial_mastery: 40.0,
      target_mastery: 80.0,
    });

    const reassessment = await Reassessment.create({
      intervention_id: intervention.id,
      student_id: testStudent.id,
      concept_id: concept.id,
    });

    const completion = await LearningIntelligenceService.recordReassessmentCompletion({
      reassessmentId: reassessment.id,
      interventionId: intervention.id,
      studentId: testStudent.id,
      conceptId: concept.id,
      score_achieved: 9.0,
      max_score: 10.0,
    });

    assert.strictEqual(completion.before_mastery, 40.0);
    assert.ok(completion.after_mastery > 70.0);
    assert.ok(completion.improvement_delta > 15.0);
    assert.strictEqual(completion.status, 'RECOVERED');
  });

  await t.test('Phase 7: Teacher & Student Endpoints Integration', async () => {
    const studentRes = await request('GET', '/api/student/learning/overview', null, {
      Authorization: `Bearer ${studentToken}`,
    });

    assert.strictEqual(studentRes.statusCode, 200);
    assert.strictEqual(studentRes.body.success, true);
    assert.ok(studentRes.body.data.overview);
    assert.ok(Array.isArray(studentRes.body.data.concept_mastery));

    const teacherRes = await request('GET', '/api/teacher/interventions/overview', null, {
      Authorization: `Bearer ${teacherToken}`,
    });

    assert.strictEqual(teacherRes.statusCode, 200);
    assert.strictEqual(teacherRes.body.success, true);
    assert.ok(teacherRes.body.data.overview);
    assert.ok(Array.isArray(teacherRes.body.data.priority_concepts));

    const copilotRes = await request('POST', '/api/teacher/copilot/learning-query', {
      query: 'Which concepts are causing the most difficulty in the class?',
    }, {
      Authorization: `Bearer ${teacherToken}`,
    });

    assert.strictEqual(copilotRes.statusCode, 200);
    assert.strictEqual(copilotRes.body.success, true);
    assert.ok(copilotRes.body.data.response);
    assert.ok(copilotRes.body.data.factual_data);
  });

  await t.test('Phase 8: Audit Logging & RBAC Verification', async () => {
    const logs = await GradeAuditLog.findAll();
    const actions = logs.map((l) => l.action);

    assert.ok(actions.includes('MASTERY_UPDATED'));

    const unauthRes = await request('GET', '/api/student/learning/overview');
    assert.strictEqual(unauthRes.statusCode, 401);
  });
});
