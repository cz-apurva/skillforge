const path = require('path');

// Support requiring dependencies installed in backend-core
if (!module.paths.includes(path.join(__dirname, '../backend-core/node_modules'))) {
  module.paths.unshift(path.join(__dirname, '../backend-core/node_modules'));
}

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../backend-core/.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/skillforge';

async function seedDatabase() {
  console.log('🌱 [SkillForge DB Seed] Seeding development environment data...');
  console.log('⚠️  NOTICE: This script is intended strictly for development / testing environments.');

  const isRemoteDb = connectionString.includes('supabase.co') || connectionString.includes('neon.tech') || connectionString.includes('pooler.supabase.com') || process.env.NODE_ENV === 'production';

  const pool = new Pool({
    connectionString,
    ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Password Hash for Dev Accounts
    const defaultPassword = 'Password123!';
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(defaultPassword, salt);

    // 2. Dev Users: 1 Admin, 1 Teacher, 3 Students
    const users = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        email: 'admin@skillforge.ai',
        role: 'ADMIN',
        name: 'System Administrator',
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        email: 'teacher@skillforge.ai',
        role: 'TEACHER',
        name: 'Prof. A. Anupam',
      },
      {
        id: '33333333-3333-4333-8333-333333333331',
        email: 'student@skillforge.ai',
        role: 'STUDENT',
        name: 'Alice Smith',
      },
      {
        id: '33333333-3333-4333-8333-333333333332',
        email: 'bob@skillforge.ai',
        role: 'STUDENT',
        name: 'Bob Johnson',
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        email: 'carol@skillforge.ai',
        role: 'STUDENT',
        name: 'Carol Davis',
      },
    ];

    for (const u of users) {
      await client.query(
        `INSERT INTO users (id, email, password_hash, role, name, status)
         VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name`,
        [u.id, u.email, passwordHash, u.role, u.name]
      );
    }
    console.log('✅ Seeded 5 Dev Users (Admin, Teacher, 3 Students)');

    // 3. Dev Subject
    const subjectId = '44444444-4444-4444-8444-444444444444';
    await client.query(
      `INSERT INTO subjects (id, code, name, department, description)
       VALUES ($1, 'MCA-402', 'Database Systems & Query Optimization', 'Master of Computer Applications', 'Advanced relational database design, query cost models, and normalization theory.')
       ON CONFLICT (code) DO NOTHING`,
      [subjectId]
    );

    // 4. Dev Classroom: MCA Section B
    const classId = '55555555-5555-4555-8555-555555555555';
    await client.query(
      `INSERT INTO classrooms (id, code, name, subject, description, semester, academic_year, join_code, created_by, student_count, status)
       VALUES ($1, 'MCA-402-2026', 'MCA Section B - Database Engineering & Distributed ACID', 'Database Systems', 'Relational design, normalization rigor (3NF/BCNF), Raft consensus, and transaction isolation levels.', 'Semester 4', '2026-2027', 'SF-MCA-402B', $2, 3, 'active')
       ON CONFLICT (join_code) DO NOTHING`,
      [classId, users[1].id]
    );
    console.log('✅ Seeded 1 Dev Classroom (MCA Section B)');

    // 5. Enroll Students
    for (let i = 2; i < users.length; i++) {
      await client.query(
        `INSERT INTO student_enrollments (classroom_id, student_id, status)
         VALUES ($1, $2, 'ACTIVE')
         ON CONFLICT (classroom_id, student_id) DO NOTHING`,
        [classId, users[i].id]
      );
    }
    console.log('✅ Enrolled 3 Students in Classroom');

    // 6. Dev Feed Post
    await client.query(
      `INSERT INTO class_feed_posts (classroom_id, author_id, type, title, content)
       VALUES ($1, $2, 'Announcement', 'Welcome to Database Engineering & FairGrade', 'Welcome students! All subjective assignments this semester will be evaluated anonymously via the SkillForge FairGrade engine.')
       ON CONFLICT DO NOTHING`,
      [classId, users[1].id]
    );

    // 7. Dev Learning Material (Relational Normalization)
    const materialId = '66666666-6666-4666-8666-666666666666';
    const sampleTaxonomy = {
      title: 'Relational Database Engineering & Normalization Rigor',
      main_topic: 'Database Systems & Normal Forms',
      subtopics: ['1NF / 2NF / 3NF Foundations', 'Boyce-Codd Normal Form (BCNF)', 'Lossless-Join Decomposition & Chase Test'],
      concepts: ['Armstrong Axioms', 'Transitive Dependency', 'Superkeys', 'Canonical Cover'],
      learning_objectives: [
        'Differentiate between 3NF and BCNF violations with formal mathematical proofs',
        'Compute minimal canonical cover of functional dependencies',
        'Execute Chase matrix synthesis algorithms for relational schemas',
      ],
      difficulty: 'Intermediate',
      key_terms: ['Determinant', 'Canonical Cover', 'Prime Attribute', 'Lossless Join'],
    };

    await client.query(
      `INSERT INTO learning_materials (id, classroom_id, title, topic, file_name, file_type, extracted_text, taxonomy, uploaded_by)
       VALUES ($1, $2, 'Relational Normalization & BCNF Proofs', 'Database Systems', 'relational_normalization.pdf', 'pdf', 'A relation R is in Boyce-Codd Normal Form (BCNF) if and only if for every functional dependency X -> Y, X is a superkey of R. Unlike 3NF, BCNF does not allow exemptions for prime attributes.', $3, $4)
       ON CONFLICT DO NOTHING`,
      [materialId, classId, JSON.stringify(sampleTaxonomy), users[1].id]
    );
    console.log('✅ Seeded Sample Learning Material with Extracted Taxonomy');

    // 8. Dev Written Assessment + Rubric
    const assessmentId = '77777777-7777-4777-8777-777777777777';
    await client.query(
      `INSERT INTO assessment (id, title, description, course_id, created_by, total_points, status)
       VALUES ($1, 'Midterm Written: Relational Schema BCNF Decomposition Proof', 'Subjective evaluation of functional dependencies, minimal cover calculation, and BCNF decomposition proofs.', $2, $3, 10.00, 'published')
       ON CONFLICT DO NOTHING`,
      [assessmentId, classId, users[1].id]
    );

    const questionId = '88888888-8888-4888-8888-888888888888';
    await client.query(
      `INSERT INTO assessment_question (id, assessment_id, question_number, question_text, question_type, max_score, sample_solution)
       VALUES ($1, $2, 1, 'Prove why Boyce-Codd Normal Form (BCNF) is strictly stronger than Third Normal Form (3NF). Under what condition does a 3NF relation violate BCNF?', 'written', 10.00, 'A relation is in 3NF if for every FD X -> Y, either X is a superkey OR Y is a prime attribute. BCNF strictly eliminates the prime attribute exemption, requiring X to be a superkey unconditionally.')
       ON CONFLICT DO NOTHING`,
      [questionId, assessmentId]
    );

    const rubricId = '99999999-9999-4999-8999-999999999999';
    await client.query(
      `INSERT INTO rubric (id, assessment_id, question_id, title, description, total_weight)
       VALUES ($1, $2, $3, 'BCNF Theory & Proof Rubric', 'Multi-dimensional evaluation criteria for relational schema normalization', 100.00)
       ON CONFLICT DO NOTHING`,
      [rubricId, assessmentId, questionId]
    );

    await client.query(
      `INSERT INTO rubric_criterion (rubric_id, criterion_name, description, max_points, weight, order_index)
       VALUES 
         ($1, 'Conceptual Definition & Form Distinction', 'Accurately defines 3NF and BCNF mathematical conditions and prime attribute exemption.', 5.00, 1.00, 1),
         ($1, 'Formal Proof Rigor & Counter-Example', 'Provides rigorous explanation of overlapping candidate keys where 3NF fails BCNF.', 5.00, 1.00, 2)
       ON CONFLICT DO NOTHING`,
      [rubricId]
    );
    console.log('✅ Seeded Sample Written Assessment, Question & Rubric Criteria');

    // 9. Dev Programming Assignment + Test Cases (Judge0)
    const progAssignmentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    await client.query(
      `INSERT INTO programming_assignments (id, classroom_id, title, description, language, starter_code, solution_code, cpu_time_limit, memory_limit, created_by)
       VALUES ($1, $2, 'Lab 01: Multi-Threaded Deadlock Detector (Python)', 'Implement cycle detection on a Resource Allocation Graph (RAG) using DFS to detect system deadlock.', 'Python', 'def detect_deadlock(num_processes, wait_edges):\n    # TODO: return "Deadlock Detected" or "No Deadlock"\n    pass\n', 'import sys\ndef detect_deadlock(n, edges):\n    adj = {i: [] for i in range(1, n + 1)}\n    for u, v in edges:\n        adj[u].append(v)\n    visited = [0] * (n + 1)\n    rec = [0] * (n + 1)\n    def dfs(u):\n        visited[u] = 1\n        rec[u] = 1\n        for v in adj[u]:\n            if not visited[v]:\n                if dfs(v): return True\n            elif rec[v]: return True\n        rec[u] = 0\n        return False\n    for i in range(1, n + 1):\n        if not visited[i]:\n            if dfs(i): return "Deadlock Detected"\n    return "No Deadlock"\n', 2.00, 128000, $3)
       ON CONFLICT DO NOTHING`,
      [progAssignmentId, classId, users[1].id]
    );

    await client.query(
      `INSERT INTO test_cases (assignment_id, name, input, expected_output, is_hidden, weight)
       VALUES 
         ($1, 'Sample Test 1: Simple Cycle', '3\n1 2\n2 3\n3 1', 'Deadlock Detected', false, 1.0),
         ($1, 'Sample Test 2: DAG with No Cycle', '3\n1 2\n2 3', 'No Deadlock', false, 1.0),
         ($1, 'Hidden Test 3: Disconnected Graph with Cycle', '4\n1 2\n3 4\n4 3', 'Deadlock Detected', true, 2.0)
       ON CONFLICT DO NOTHING`,
      [progAssignmentId]
    );
    console.log('✅ Seeded Sample Programming Assignment with Test Cases');

    await client.query('COMMIT');
    console.log('🎉 [SkillForge DB Seed] Database seeded successfully with dev data.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ [SkillForge DB Seed] Seeding failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
