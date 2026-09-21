const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const jwt = require('jsonwebtoken');

process.env.AI_MODE = 'mock';
process.env.USE_MEMORY_DB = 'true';

const app = require('../src/app');
const { memoryStore } = require('../src/config/db');
const CopilotService = require('../src/services/copilotService');

let server;
let baseUrl;
const JWT_SECRET = process.env.JWT_SECRET || 'skillforge-jwt-super-secret-key-2026';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

function makeRequest(method, path, body = null, headers = {}) {
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
          status: res.statusCode,
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

describe('Teacher Co-Pilot: Deterministic Weak-Topic Aggregation & Actionable Recommendations', () => {
  let teacherToken;
  let testTeacher;

  before(async () => {
    testTeacher = {
      id: 'teacher-copilot-test-uuid',
      name: 'Prof. Donald Knuth',
      email: 'knuth@skillforge.ai',
      role: 'TEACHER',
    };
    teacherToken = generateToken(testTeacher);

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('1. Computes weak-topic deficiency percentages deterministically from stored FairGrade and Code Grader rows', async () => {
    // Populate test evaluation rows
    if (!memoryStore.fairgrade_reports) memoryStore.fairgrade_reports = new Map();
    if (!memoryStore.grading_evaluations) memoryStore.grading_evaluations = new Map();

    // 4 failing written reports out of 5 for "Relational Normalization & BCNF"
    for (let i = 1; i <= 5; i++) {
      const score = i === 5 ? 9.0 : 5.5; // 4 students fail (< 7.0 / 10), 1 passes
      memoryStore.fairgrade_reports.set(`rep-${i}`, {
        id: `rep-${i}`,
        assessment_id: 'asg-bcnf',
        total_score: score,
        max_possible_score: 10.0,
        missing_concepts: ['Armstrong Axioms', 'Determinant Superkey Rule'],
      });
    }

    if (!memoryStore.assessments) memoryStore.assessments = new Map();
    memoryStore.assessments.set('asg-bcnf', { id: 'asg-bcnf', title: 'Relational Schema Normalization & BCNF' });

    const evidence = await CopilotService.computeWeakTopicEvidence('cls-mca-401');

    assert.ok(evidence.length > 0);
    const bcnfStat = evidence.find((e) => e.topic.includes('Normalization'));
    assert.ok(bcnfStat, 'Must compute evidence for Normalization');
    assert.equal(bcnfStat.total_submissions, 5);
    assert.equal(bcnfStat.struggling_count, 4);
    assert.equal(bcnfStat.deficiency_percentage, '80%');
    assert.equal(bcnfStat.priority, 'HIGH');
    assert.ok(bcnfStat.summary.includes('80% of evaluated students (4/5) scored below 70%'));
  });

  test('2. Uses LLMProvider to generate natural-language recommendations with action types', async () => {
    const recs = await CopilotService.getTeacherRecommendations({ teacherUser: testTeacher });

    assert.ok(recs.top_weakness_concept);
    assert.ok(recs.computed_evidence_summary);
    assert.ok(recs.action_type);
    assert.ok(['REVISE_TOPIC', 'PUBLISH_EXAMPLE', 'GENERATE_REMEDIAL_ASSIGNMENT', 'RECOMMEND_RESOURCE'].includes(recs.action_type));
    assert.ok(recs.suggested_action);
    assert.ok(recs.suggested_discussion_starter);
    assert.ok(Array.isArray(recs.recommendations));
    assert.ok(recs.recommendations.length > 0);
    assert.equal(recs.recommendations[0].status, 'PENDING');
  });

  test('3. Teacher can accept a Co-Pilot recommendation and deploy to class feed', async () => {
    const recs = await CopilotService.listRecommendations({ teacherUser: testTeacher });
    const targetRec = recs[0];

    const decisionRes = await makeRequest(
      'PATCH',
      `/teacher/copilot/recommendations/${targetRec.id}/decision`,
      {
        decision: 'ACCEPTED',
        notes: 'Approved for in-class recitation',
      },
      { Authorization: `Bearer ${teacherToken}` }
    );

    assert.equal(decisionRes.status, 200);
    assert.equal(decisionRes.body.success, true);
    assert.equal(decisionRes.body.data.status, 'ACCEPTED');
    assert.equal(decisionRes.body.data.teacher_decision.decision, 'ACCEPTED');

    // Verify stored in memoryStore
    const stored = memoryStore.copilot_recommendations.get(targetRec.id);
    assert.equal(stored.status, 'ACCEPTED');

    // Verify posted to class feed
    const feedPosts = Array.from(memoryStore.class_feed.values());
    const matchedPost = feedPosts.find((p) => p.title.includes('Remediation Plan'));
    assert.ok(matchedPost, 'Accepting recommendation must publish announcement to class feed');
  });

  test('4. Teacher can reject/dismiss a Co-Pilot recommendation', async () => {
    const recs = await CopilotService.listRecommendations({ teacherUser: testTeacher });
    const targetRec = recs.length > 1 ? recs[1] : recs[0];

    const decisionRes = await makeRequest(
      'PATCH',
      `/teacher/copilot/recommendations/${targetRec.id}/decision`,
      {
        decision: 'REJECTED',
        notes: 'Class already reviewed this topic last week',
      },
      { Authorization: `Bearer ${teacherToken}` }
    );

    assert.equal(decisionRes.status, 200);
    assert.equal(decisionRes.body.success, true);
    assert.equal(decisionRes.body.data.status, 'REJECTED');
    assert.equal(decisionRes.body.data.teacher_decision.decision, 'REJECTED');

    const stored = memoryStore.copilot_recommendations.get(targetRec.id);
    assert.equal(stored.status, 'REJECTED');
  });

  test('5. GET /teacher/dashboard returns computed evidence summary from stored rows', async () => {
    const res = await makeRequest('GET', '/teacher/dashboard', null, {
      Authorization: `Bearer ${teacherToken}`,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.copilot);
    assert.ok(res.body.data.copilot.computed_evidence_summary);
    assert.ok(res.body.data.copilot.action_type);
    assert.ok(res.body.data.copilot.suggested_action);
  });
});
