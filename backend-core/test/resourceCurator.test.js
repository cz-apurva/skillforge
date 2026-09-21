const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const jwt = require('jsonwebtoken');

process.env.USE_MEMORY_DB = 'true';
process.env.AI_MODE = 'mock';
delete process.env.YOUTUBE_API_KEY; // Ensure clean state for test

const app = require('../src/app');
const { memoryStore } = require('../src/config/db');
const ResourceCuratorService = require('../src/services/resourceCurator.service');
const CuratedResource = require('../src/models/CuratedResource');

let server;
let baseUrl;
const JWT_SECRET = process.env.JWT_SECRET || 'skillforge-jwt-super-secret-key-2026';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

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

test('Resource Curator Service & Teacher Approval Workflow Tests', async (t) => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });

  t.after(() => {
    if (server) server.close();
  });

  const teacherToken = generateToken({
    id: 'teacher-001-uuid',
    email: 'prof.anupam@skillforge.edu',
    role: 'TEACHER',
    name: 'Prof. A. Anupam',
  });

  const studentToken = generateToken({
    id: 'student-mca-402-alice',
    email: 'alice@skillforge.edu',
    role: 'STUDENT',
    name: 'Alice Johnson',
  });

  await t.test('1. Real source search without API key: Returns clear unavailable status (NEVER invents fake URLs)', async () => {
    const searchRes = await ResourceCuratorService.searchCandidates({
      topic: 'Distributed ACID & 2-Phase Commit',
      subtopics: ['2PC', 'Raft'],
    });

    assert.strictEqual(searchRes.available, false);
    assert.ok(searchRes.reason.includes('Resource search unavailable'));
    assert.strictEqual(searchRes.candidates.length, 0);
  });

  await t.test('2. Candidate ranking with LLM: Evaluates relevance, difficulty fit, and educational usefulness', async () => {
    const candidates = [
      {
        id: 'real-video-1',
        candidate_id: 'real-video-1',
        title: 'MIT 6.824 Lecture: Raft Consensus Protocol in Go',
        url: 'https://www.youtube.com/watch?v=R2-9bsKmEbo',
        source: 'YouTube',
        description: 'Detailed analysis of leader election, split-vote recovery, and state machine replication.',
      },
      {
        id: 'real-doc-2',
        candidate_id: 'real-doc-2',
        title: 'Etcd Raft Implementation Guide and Architecture',
        url: 'https://etcd.io/docs/v3.5/learning/raft/',
        source: 'Teacher Provided',
        description: 'Production implementation reference of raft consensus algorithms.',
      },
    ];

    const ranked = await ResourceCuratorService.rankCandidatesWithLLM({
      candidates,
      topic: 'Distributed ACID & Raft Consensus',
      subtopics: ['Raft', 'Leader Election', 'Log Replication'],
      difficulty: 'Advanced',
      learningObjectives: ['Understand Raft quorum safety'],
    });

    assert.strictEqual(ranked.length, 2);
    assert.ok(typeof ranked[0].relevance_score === 'number');
    assert.ok(ranked[0].relevance_score >= 0.7 && ranked[0].relevance_score <= 1.0);
    assert.ok(ranked[0].difficulty_fit);
    assert.ok(ranked[0].educational_usefulness);
    assert.strictEqual(ranked[0].url, 'https://www.youtube.com/watch?v=R2-9bsKmEbo');
    assert.strictEqual(ranked[1].url, 'https://etcd.io/docs/v3.5/learning/raft/');
  });

  let createdResourceId = '';

  await t.test('3. Curate & Store: Teacher triggers curation with real URLs -> Stored with PENDING status', async () => {
    const res = await request(
      'POST',
      '/api/teacher/resources/curate',
      {
        classroom_id: 'cls-mca-402',
        topic: 'Relational Database Schema Normalization & BCNF',
        subtopics: ['BCNF', '3NF', 'Chase Algorithm'],
        difficulty: 'Intermediate',
        teacher_urls: [
          {
            title: 'CMU 15-445: Database Normalization & Lossless Join Decomposition',
            url: 'https://www.youtube.com/watch?v=UrYLYV7WSHM',
            description: 'Prof. Andy Pavlo lecture on functional dependencies and minimal canonical covers.',
          },
        ],
      },
      { Authorization: `Bearer ${teacherToken}` }
    );

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.available, true);
    assert.ok(Array.isArray(res.body.data.resources));
    assert.ok(res.body.data.resources.length > 0);

    const first = res.body.data.resources[0];
    assert.strictEqual(first.approved_status, 'PENDING');
    assert.strictEqual(first.url, 'https://www.youtube.com/watch?v=UrYLYV7WSHM');
    assert.ok(first.relevance_score > 0.7);
    createdResourceId = first.id;
  });

  await t.test('4. Gating Check: Student CANNOT see PENDING curated resource', async () => {
    const res = await request('GET', '/api/student/materials', null, {
      Authorization: `Bearer ${studentToken}`,
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);

    const { curated_resources } = res.body.data;
    const foundPending = curated_resources.find((r) => r.id === createdResourceId);
    assert.strictEqual(foundPending, undefined, 'Pending resources MUST NOT be visible to students');
  });

  await t.test('5. Teacher Approval: Teacher approves resource -> Status changes to APPROVED', async () => {
    const res = await request(
      'PATCH',
      `/api/teacher/resources/${createdResourceId}/status`,
      { status: 'APPROVED' },
      { Authorization: `Bearer ${teacherToken}` }
    );

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.approved_status, 'APPROVED');
    assert.ok(res.body.data.approved_at);
  });

  await t.test('6. Visibility Check: Student CAN NOW see APPROVED resource in enrolled class', async () => {
    const res = await request('GET', '/api/student/materials', null, {
      Authorization: `Bearer ${studentToken}`,
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);

    const { curated_resources } = res.body.data;
    const foundApproved = curated_resources.find((r) => r.id === createdResourceId);
    assert.ok(foundApproved, 'Approved resource must now be visible to students in enrolled classroom');
    assert.strictEqual(foundApproved.url, 'https://www.youtube.com/watch?v=UrYLYV7WSHM');
    assert.strictEqual(foundApproved.approved_status, 'APPROVED');
  });

  await t.test('7. Teacher Manual URL addition: Auto-approved teacher resource is immediately stored & accessible', async () => {
    const res = await request(
      'POST',
      '/api/teacher/resources',
      {
        classroom_id: 'cls-mca-402',
        title: 'PostgreSQL Official Documentation: Multi-Version Concurrency Control (MVCC)',
        url: 'https://www.postgresql.org/docs/current/mvcc.html',
        description: 'Official architecture guide for PostgreSQL isolation levels, snapshot isolation, and row versioning.',
        topic: 'Database Engineering & Concurrency',
        subtopics: ['MVCC', 'Snapshot Isolation'],
        auto_approve: true,
      },
      { Authorization: `Bearer ${teacherToken}` }
    );

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.approved_status, 'APPROVED');
    assert.strictEqual(res.body.data.source, 'Teacher Provided');
    assert.strictEqual(res.body.data.url, 'https://www.postgresql.org/docs/current/mvcc.html');
  });

  await t.test('8. Teacher Rejection: Teacher rejects resource -> Student can no longer see it', async () => {
    const res = await request(
      'PATCH',
      `/api/teacher/resources/${createdResourceId}/status`,
      { status: 'REJECTED' },
      { Authorization: `Bearer ${teacherToken}` }
    );

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.approved_status, 'REJECTED');

    // Verify student cannot see rejected resource
    const studentRes = await request('GET', '/api/student/materials', null, {
      Authorization: `Bearer ${studentToken}`,
    });
    const { curated_resources } = studentRes.body.data;
    const found = curated_resources.find((r) => r.id === createdResourceId);
    assert.strictEqual(found, undefined, 'Rejected resource must be removed from student view');
  });

  await t.test('9. Content Analyzer Feed-Forward: Curate resources directly from Content Analyzer taxonomy output', async () => {
    const mockContentAnalysis = {
      title: 'Distributed State Machine Replication & Raft Leader Election',
      main_topic: 'Distributed Systems & Consensus',
      subtopics: ['Raft Election Timeout', 'Log Invariant Proofs', 'Heartbeat Propagation'],
      difficulty: 'Advanced',
      learning_objectives: [
        'Prove safety of log matching property in distributed state machines',
        'Analyze split-brain avoidance through majority quorum intersection',
      ],
    };

    const curation = await ResourceCuratorService.curateFromContentAnalysis({
      analysis: mockContentAnalysis,
      classroom_id: 'cls-mca-401',
      teacher_id: 'teacher-001-uuid',
      teacherUrls: [
        {
          title: 'Ongaro & Ousterhout Raft Paper (USENIX ATC)',
          url: 'https://raft.github.io/raft.pdf',
          description: 'Original Stanford consensus paper introducing the Raft algorithm.',
        },
      ],
    });

    assert.strictEqual(curation.available, true);
    assert.strictEqual(curation.topic, 'Distributed Systems & Consensus');
    assert.strictEqual(curation.count, 1);
    const stored = curation.resources[0];
    assert.strictEqual(stored.title, 'Ongaro & Ousterhout Raft Paper (USENIX ATC)');
    assert.strictEqual(stored.url, 'https://raft.github.io/raft.pdf');
    assert.strictEqual(stored.source, 'Teacher Provided');
    assert.ok(stored.description);
    assert.ok(typeof stored.relevance_score === 'number');
    assert.strictEqual(stored.topic, 'Distributed Systems & Consensus');
    assert.strictEqual(stored.approved_status, 'PENDING');
  });

  await t.test('10. API endpoint /api/teacher/resources/curate accepts direct analysis payload', async () => {
    const res = await request(
      'POST',
      '/api/teacher/resources/curate',
      {
        classroom_id: 'cls-mca-402',
        analysis: {
          main_topic: 'Database Schema Normalization & BCNF',
          subtopics: ['Armstrong Axioms', 'Canonical Cover'],
          difficulty: 'Intermediate',
          learning_objectives: ['Compute canonical cover of FDs'],
        },
        teacher_urls: [
          'https://www.cs.cmu.edu/~adamchik/15-121/lectures/Hashing/hashing.html',
        ],
      },
      { Authorization: `Bearer ${teacherToken}` }
    );

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.available, true);
    assert.strictEqual(res.body.data.resources[0].approved_status, 'PENDING');
  });
});
