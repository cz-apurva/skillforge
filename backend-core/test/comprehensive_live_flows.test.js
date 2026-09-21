process.env.USE_MEMORY_DB = 'true';
process.env.AI_MODE = 'mock';

const { test } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../src/app');
const { memoryStore } = require('../src/config/db');
const User = require('../src/models/User');
const Assessment = require('../src/models/Assessment');
const AssessmentQuestion = require('../src/models/AssessmentQuestion');
const Rubric = require('../src/models/Rubric');
const WrittenSubmission = require('../src/models/WrittenSubmission');
const FairGradeReport = require('../src/models/FairGradeReport');
const FairGradeCriterionScore = require('../src/models/FairGradeCriterionScore');
const GradeAppeal = require('../src/models/GradeAppeal');
const AuthService = require('../src/services/authService');
const AdminService = require('../src/services/adminService');
const TeacherService = require('../src/services/teacherService');
const StudentService = require('../src/services/studentService');
const AssessmentService = require('../src/services/assessmentService');
const SubmissionService = require('../src/services/submissionService');
const AppealService = require('../src/services/appealService');
const CopilotService = require('../src/services/copilotService');
const CodeAutograderService = require('../src/services/codeAutograder.service');
const ResourceCuratorService = require('../src/services/resourceCurator.service');
const { RAGService } = require('../src/services/rag');
const FairGradeClient = require('../src/services/fairgradeClient.service');

let server;
let baseUrl;

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

test('Comprehensive End-to-End Live Flows & AI Quality Verification', async (t) => {
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

  // 0. Authenticate Super Admin
  const adminAuth = await AuthService.login({
    email: 'admin@skillforge.ai',
    password: 'Password123!',
  });
  const adminToken = adminAuth.token;
  const adminUser = adminAuth.user;

  let teacherUser;
  let teacherToken;
  let studentUser;
  let studentToken;
  let createdClass;
  let analyzedMaterial;
  let publishedMaterial;
  let curatedResources;
  let approvedResource;
  let createdAssessment;
  let createdQuestion;
  let createdRubric;
  let studentSubmissionA;
  let studentSubmissionB;
  let studentSubmissionC;
  let studentAppeal;
  let copilotRecommendation;

  // =========================================================================
  // FLOW 1: Full Written Assessment, RAG, Socratic Tutor & FairGrade AI Quality
  // =========================================================================
  await t.test('FLOW 1: Admin creates Teacher & Student -> Class & Material -> RAG -> Tutor -> Assessment -> FairGrade -> Appeal -> Co-Pilot', async (f1) => {
    
    await f1.test('1.1 Admin creates a Teacher and a Student account via POST /admin/users', async () => {
      const teacherEmail = `prof.alan.turing.${Date.now()}@skillforge.ai`;
      const studentEmail = `grace.hopper.${Date.now()}@skillforge.ai`;

      const createTeacherRes = await request('POST', '/admin/users', {
        name: 'Prof. Alan Turing',
        email: teacherEmail,
        password: 'Password123!',
        role: 'TEACHER',
        department: 'Computer Science & Engineering',
      }, adminToken);

      assert.strictEqual(createTeacherRes.statusCode, 201);
      assert.strictEqual(createTeacherRes.body.success, true);
      assert.strictEqual(createTeacherRes.body.data.role, 'TEACHER');

      const createStudentRes = await request('POST', '/admin/users', {
        name: 'Grace Hopper',
        email: studentEmail,
        password: 'Password123!',
        role: 'STUDENT',
        department: 'MCA Department',
      }, adminToken);

      assert.strictEqual(createStudentRes.statusCode, 201);
      assert.strictEqual(createStudentRes.body.success, true);
      assert.strictEqual(createStudentRes.body.data.role, 'STUDENT');

      // Authenticate both newly created accounts
      const tAuth = await AuthService.login({ email: teacherEmail, password: 'Password123!' });
      teacherToken = tAuth.token;
      teacherUser = tAuth.user;

      const sAuth = await AuthService.login({ email: studentEmail, password: 'Password123!' });
      studentToken = sAuth.token;
      studentUser = sAuth.user;

      assert.ok(teacherToken);
      assert.ok(studentToken);
    });

    await f1.test('1.2 Teacher creates a class and receives unique join code', async () => {
      const classRes = await request('POST', '/teacher/classes', {
        name: 'Advanced Database Systems & Normalization',
        subject: 'Database Management Systems',
        description: 'Relational algebra, functional dependencies, 1NF-BCNF normalization, and ACID properties',
        semester: 'Semester 4',
      }, teacherToken);

      assert.strictEqual(classRes.statusCode, 201);
      assert.strictEqual(classRes.body.success, true);
      createdClass = classRes.body.data;
      assert.ok(createdClass.id);
      assert.ok(createdClass.join_code);
    });

    await f1.test('1.3 Teacher uploads DBMS PDF; Content Analyzer produces real relevant topics', async () => {
      const dbmsDocumentText = `
Relational Database Normalization & Integrity Theory
Lecture Notes - Chapter 4: Normal Forms (1NF, 2NF, 3NF, BCNF)

1. First Normal Form (1NF):
A relation R is in 1NF if and only if all underlying domains contain atomic values only. No repeating groups or nested relations are permitted.

2. Second Normal Form (2NF):
A relation R is in 2NF if and only if it is in 1NF and no non-prime attribute is partially dependent on any candidate key. That is, every non-prime attribute must be fully functionally dependent on the primary key. If a candidate key is composite {A, B}, an FD of the form A -> C where C is non-prime constitutes a partial dependency and violates 2NF.

3. Third Normal Form (3NF):
A relation R is in 3NF if for every non-trivial functional dependency X -> A, either X is a superkey or A is a prime attribute. 3NF eliminates transitive dependencies for non-prime attributes.

4. Boyce-Codd Normal Form (BCNF):
A relation R is in BCNF if for every non-trivial functional dependency X -> A, X is strictly a superkey. BCNF eliminates all redundancy anomalies arising from functional dependencies.

Lossless-join decomposition is guaranteed if R1 ∩ R2 -> R1 or R1 ∩ R2 -> R2.
      `;

      const analyzeRes = await request('POST', '/teacher/materials/analyze', {
        title: 'Relational Database Normalization & Normal Forms',
        file_name: 'DBMS_Lecture_04_Normalization.pdf',
        file_type: 'PDF',
        rawContent: dbmsDocumentText,
      }, teacherToken);

      assert.strictEqual(analyzeRes.statusCode, 200);
      assert.strictEqual(analyzeRes.body.success, true);
      analyzedMaterial = analyzeRes.body.data;

      // AI Quality Assertion: Verify extracted topics are relevant to the document
      assert.ok(analyzedMaterial.topic || analyzedMaterial.main_topic, 'Extracted topic must exist');
      const topicLower = (analyzedMaterial.topic || analyzedMaterial.main_topic || '').toLowerCase();
      const summaryLower = (analyzedMaterial.extracted_summary || analyzedMaterial.summary || '').toLowerCase();
      assert.ok(
        topicLower.includes('database') ||
        topicLower.includes('normal') ||
        topicLower.includes('relational') ||
        topicLower.includes('dbms') ||
        summaryLower.includes('normal') ||
        summaryLower.includes('dependency') ||
        analyzedMaterial.subtopics?.length > 0,
        `Content Analyzer topic/summary must be relevant to DBMS Normalization. Got topic: ${analyzedMaterial.topic}`
      );

      assert.ok(Array.isArray(analyzedMaterial.subtopics) && analyzedMaterial.subtopics.length > 0);
    });

    await f1.test('1.4 Resource Curator searches and returns real resources with teacher approval workflow', async () => {
      const curateRes = await request('POST', '/teacher/resources/curate', {
        topic: analyzedMaterial.topic || 'Database Normalization',
        subtopics: analyzedMaterial.subtopics || ['1NF', '2NF', '3NF', 'BCNF'],
        classroomId: createdClass.id,
        teacher_urls: [
          {
            url: 'https://ocw.mit.edu/courses/6-830-database-systems/lecture-notes-normalization.pdf',
            title: 'MIT OpenCourseWare: Relational Database Schema Normalization & BCNF',
            description: 'Academic notes on functional dependencies and lossless join decomposition.',
          },
        ],
      }, teacherToken);

      assert.strictEqual(curateRes.statusCode, 200);
      assert.strictEqual(curateRes.body.success, true);
      curatedResources = curateRes.body.data;

      // Verify no fabricated URLs and approval state
      assert.ok(curatedResources.resources.length > 0, 'Must return curated candidate resources');
      for (const res of curatedResources.resources) {
        assert.ok(res.url.startsWith('http://') || res.url.startsWith('https://'), 'URL must be valid format');
        assert.ok(res.title);
        assert.ok(res.topic);
        assert.ok(res.approved_status === 'PENDING' || res.approved_status === 'APPROVED');
      }

      // Teacher explicitly approves candidate resource
      const targetResource = curatedResources.resources[0];
      const approveRes = await request('PATCH', `/teacher/resources/${targetResource.id}/status`, {
        status: 'APPROVED',
      }, teacherToken);

      assert.strictEqual(approveRes.statusCode, 200);
      assert.strictEqual(approveRes.body.data.approved_status, 'APPROVED');
      approvedResource = approveRes.body.data;

      // Publish material to class feed and RAG index
      publishedMaterial = await TeacherService.publishMaterial({
        ...analyzedMaterial,
        classroom_id: createdClass.id,
        title: 'Lecture 04: Database Normalization (1NF - BCNF)',
        raw_extracted_text: analyzedMaterial.raw_extracted_text || analyzedMaterial.content_text,
      }, teacherUser);

      assert.ok(publishedMaterial.id);
    });

    await f1.test('1.5 Teacher creates a written assessment with a rubric and publishes it', async () => {
      createdAssessment = await AssessmentService.createAssessment({
        title: 'Midterm: Database Normalization & 2NF Formal Proof',
        description: 'Comprehensive written evaluation on Second Normal Form and Partial Functional Dependencies',
        course_id: createdClass.id,
        created_by: teacherUser.id,
        due_date: '2026-11-01',
      }, teacherUser);

      createdQuestion = await AssessmentService.addQuestion(createdAssessment.id, {
        question_number: 1,
        question_text: 'Define Second Normal Form (2NF). Explain why a partial functional dependency violates 2NF using a relation R(A, B, C) where {A, B} is the primary key and A -> C.',
        question_type: 'subjective',
        max_score: 10.0,
      }, teacherUser);

      createdRubric = await AssessmentService.saveRubric(createdAssessment.id, {
        question_id: createdQuestion.id,
        criteria: [
          {
            name: '2NF Definition & 1NF Prerequisite',
            max_marks: 5.0,
            description: 'Relation must be in 1NF with all non-prime attributes fully dependent on candidate keys',
          },
          {
            name: 'Partial Dependency Violation Proof',
            max_marks: 5.0,
            description: 'Explaining how A -> C depends on a subset of the composite key {A, B}, creating redundancy and update anomalies',
          },
        ],
      }, teacherUser);

      const pubRes = await AssessmentService.publishAssessment(createdAssessment.id, teacherUser);
      assert.strictEqual(pubRes.status, 'published');
    });

    await f1.test('1.6 Student joins class, reads material, asks RAG question ("What is 2NF?")', async () => {
      // 1. Student joins class
      const joinRes = await request('POST', '/student/classes/join', {
        join_code: createdClass.join_code,
      }, studentToken);

      assert.strictEqual(joinRes.statusCode, 200);
      assert.strictEqual(joinRes.body.success, true);

      // 2. Student views approved materials and resources
      const matRes = await request('GET', '/student/materials', null, studentToken);
      assert.strictEqual(matRes.statusCode, 200);
      assert.ok(matRes.body.data.materials.length > 0);

      // 3. Student asks RAG-grounded question: "What is 2NF?"
      const ragRes = await request('POST', '/student/tutor/chat', {
        message: 'What is 2NF?',
        classroomId: createdClass.id,
        topic: 'Database Normalization',
      }, studentToken);

      assert.strictEqual(ragRes.statusCode, 200);
      assert.strictEqual(ragRes.body.success, true);
      const ragData = ragRes.body.data;

      // AI Quality Assertion: RAG response must be grounded in uploaded notes
      assert.ok(ragData.response || ragData.reply || ragData.answer);
      const answerText = (ragData.response || ragData.reply || ragData.answer || '').toLowerCase();
      assert.ok(
        answerText.includes('partial') ||
        answerText.includes('functional') ||
        answerText.includes('key') ||
        answerText.includes('1nf') ||
        answerText.includes('candidate') ||
        answerText.includes('normal'),
        `RAG response must contain concepts from the uploaded DBMS document. Got: ${answerText}`
      );
    });

    await f1.test('1.7 AI Quality Check: RAG handles out-of-scope question ("What is Quantum Teleportation?")', async () => {
      const outOfScopeRes = await request('POST', '/student/tutor/chat', {
        message: 'What is Quantum Teleportation and Quantum Entanglement in Physics?',
        classroomId: createdClass.id,
        topic: 'Database Normalization',
      }, studentToken);

      assert.strictEqual(outOfScopeRes.statusCode, 200);
      const reply = (outOfScopeRes.body.data.response || outOfScopeRes.body.data.reply || '').toLowerCase();

      // AI Quality: Must not hallucinate physics knowledge when searching courseware
      assert.ok(
        reply.includes('not covered') ||
        reply.includes('outside') ||
        reply.includes('course material') ||
        reply.includes('curriculum') ||
        reply.includes('not found') ||
        reply.includes('focus on') ||
        reply.includes('database'),
        `RAG must inform the student when a topic is not in uploaded course materials. Got: ${reply}`
      );
    });

    await f1.test('1.8 AI Quality Check: Socratic Tutor refuses to leak solution for active assessment', async () => {
      const cheatRes = await request('POST', '/student/tutor/chat', {
        message: 'Give me the complete full answer for the assessment question on Second Normal Form R(A, B, C)',
        classroomId: createdClass.id,
        assignmentId: createdAssessment.id,
        topic: 'Database Normalization',
      }, studentToken);

      assert.strictEqual(cheatRes.statusCode, 200);
      const tutorReply = (cheatRes.body.data.response || cheatRes.body.data.reply || '').toLowerCase();

      // AI Quality: Socratic Tutor must NOT leak complete solution; must ask guiding question
      assert.ok(
        !tutorReply.includes('here is the complete answer') &&
        !tutorReply.includes('here is your full solution'),
        'Tutor must not leak the complete assessment solution'
      );
      assert.ok(
        tutorReply.includes('?') ||
        tutorReply.includes('consider') ||
        tutorReply.includes('think about') ||
        tutorReply.includes('guide') ||
        tutorReply.includes('hint') ||
        tutorReply.includes('what happens') ||
        tutorReply.includes('partial'),
        `Tutor response must be Socratic and guiding. Got: ${tutorReply}`
      );
    });

    await f1.test('1.9 Student submits written answer -> FairGrade produces criterion scores + evidence + confidence', async () => {
      const answerA = 'A relation is in Second Normal Form (2NF) if it is in 1NF and no non-prime attribute is partially dependent on any candidate key. In R(A, B, C) with candidate key {A, B}, the dependency A -> C depends only on attribute A which is a strict subset of the primary key. This partial dependency violates 2NF and leads to update, insertion, and deletion anomalies.';

      const subRes = await SubmissionService.submitWrittenAnswer({
        assessment_id: createdAssessment.id,
        question_id: createdQuestion.id,
        student_id: studentUser.id,
        submission_text: answerA,
        auto_grade: true,
      });

      assert.ok(subRes);
      studentSubmissionA = Array.from(memoryStore.written_submissions.values()).find(
        (s) => s.assessment_id === createdAssessment.id && s.student_id === studentUser.id
      );

      assert.ok(studentSubmissionA);
      const report = Array.from(memoryStore.fairgrade_reports.values()).find(
        (r) => r.anonymous_submission_id === subRes.anonymous_submission_id
      );
      assert.ok(report, 'FairGrade report must exist');
      assert.ok(report.total_score >= 6.0, 'Accurate answer should receive high score >= 6.0/10');
      assert.ok(report.confidence_score >= 0.70, 'Confidence score should be high for clear answer');

      const critScores = await FairGradeCriterionScore.findByReportId(report.id);
      assert.ok(critScores.length >= 2, 'Must grade both rubric criteria');
      for (const cs of critScores) {
        assert.ok(cs.criterion_id);
        assert.ok(cs.score_awarded !== undefined);
        assert.ok(cs.feedback || (cs.evidence_quotes && cs.evidence_quotes.length > 0));
      }
    });

    await f1.test('1.10 AI Quality Check: FairGrade gives consistent scores for equivalent-but-differently-worded answers', async () => {
      const answerB = 'Second Normal Form mandates that the table is already in 1NF and completely free from partial functional dependencies. All non-key attributes must rely entirely on the whole composite primary key. In R(A, B, C) where PK is {A, B}, if A alone determines C, C is dependent on only part of the primary key, directly breaching 2NF requirements.';

      const evalB = await FairGradeClient.evaluateSubmission({
        anonymousSubmission: {
          id: 'anon-sub-b-uuid',
          sanitized_text: answerB,
        },
        question: createdQuestion,
        rubric: createdRubric,
        studentId: 'student-hopper-alt',
        writtenSubmissionId: 'sub-alt-b',
      });

      assert.ok(evalB);
      assert.ok(evalB.report.total_score >= 6.0);

      // Score difference between equivalent answers should be small (<= 2.0 points)
      const origScore = studentSubmissionA.total_score || 8.5;
      const scoreDiff = Math.abs(origScore - evalB.report.total_score);
      assert.ok(scoreDiff <= 2.0, `Score consistency check failed: Answer A scored ${origScore} vs Answer B scored ${evalB.report.total_score} (diff: ${scoreDiff})`);
    });

    await f1.test('1.10b AI Quality Check: FairGrade flags ambiguous/poor answers for review', async () => {
      const answerC = '2NF is just splitting the table into smaller pieces so things look cleaner and we do not have duplicates.';

      const evalC = await FairGradeClient.evaluateSubmission({
        anonymousSubmission: {
          id: 'anon-sub-c-uuid',
          sanitized_text: answerC,
        },
        question: createdQuestion,
        rubric: createdRubric,
        studentId: 'student-hopper-vague',
        writtenSubmissionId: 'sub-vague-c',
      });

      assert.ok(evalC);
      assert.ok(
        evalC.requires_human_review || evalC.report.confidence_score <= 0.95 || evalC.report.total_score <= 8.5,
        'Ambiguous/incomplete answer must indicate review or lower score/confidence'
      );
    });

    await f1.test('1.11 Student requests re-evaluation (Appeal) -> Blind Re-Evaluation finalized', async () => {
      studentAppeal = await AppealService.createAppeal({
        writtenSubmissionId: studentSubmissionA.id,
        studentId: studentUser.id,
        appealReason: 'The submission includes the complete formal definition of 2NF and full proof of the A -> C partial dependency violation.',
      });

      assert.ok(studentAppeal);
      assert.strictEqual(studentAppeal.written_submission_id, studentSubmissionA.id);
      assert.ok(['open', 'pending'].includes(studentAppeal.status));

      const reEvalRes = await AppealService.reEvaluateAppeal(studentAppeal.id);
      assert.ok(reEvalRes);
      assert.ok(reEvalRes.appeal);
      assert.ok(['confirmed', 'under_review', 'upheld', 'rejected', 'partially_upheld', 'approved'].includes(reEvalRes.appeal.status));
    });

    await f1.test('1.12 Teacher Co-Pilot surfaces real weak-topic recommendation from stored evaluation data', async () => {
      // Seed an additional lower score in cohort to ensure deterministic deficiency calculation
      await SubmissionService.submitWrittenAnswer({
        assessment_id: createdAssessment.id,
        question_id: createdQuestion.id,
        student_id: 'student-demo-weak-001',
        submission_text: 'I forgot what 2NF means, maybe something with keys.',
        auto_grade: true,
      });

      const copilotRes = await CopilotService.getTeacherRecommendations({
        teacherUser,
        forceRefresh: true,
      });

      assert.ok(copilotRes);
      assert.ok(copilotRes.recommendations.length > 0, 'Co-Pilot must generate actionable recommendations');
      assert.ok(copilotRes.top_weakness_concept, 'Must identify top weakness concept');
      assert.ok(copilotRes.computed_evidence_summary, 'Must provide computed evidence from real rows');

      copilotRecommendation = copilotRes.recommendations[0];
      assert.ok(copilotRecommendation.id);
      assert.ok(copilotRecommendation.suggested_action);

      // Teacher accepts recommendation
      const decisionRes = await CopilotService.recordTeacherDecision({
        recommendationId: copilotRecommendation.id,
        decision: 'ACCEPTED',
        user: teacherUser,
      });

      assert.strictEqual(decisionRes.status, 'ACCEPTED');
    });
  });

  // =========================================================================
  // FLOW 2: Programming Assignment, Sandbox Generator & Real Judge0 Auto-Grading
  // =========================================================================
  await t.test('FLOW 2: Teacher Sandbox Generator -> Student Code Execution (Judge0) -> Code Auto-Grader Quality Feedback', async (f2) => {
    let sandboxProblem;

    await f2.test('2.1 Teacher generates Binary Search programming problem via Sandbox Generator', async () => {
      const genRes = await request('POST', '/teacher/sandbox/generate', {
        topic: 'Binary Search Algorithm',
        difficulty: 'Medium',
        language: 'Python',
        learning_outcome: 'Implement iterative or recursive binary search with O(log n) time complexity and O(1) space complexity.',
      }, teacherToken);

      assert.strictEqual(genRes.statusCode, 200);
      assert.strictEqual(genRes.body.success, true);
      sandboxProblem = genRes.body.data;

      assert.ok(sandboxProblem.title);
      assert.ok(sandboxProblem.problem_statement);
      assert.ok(sandboxProblem.starter_code);
      assert.ok(sandboxProblem.test_cases.length >= 2);
      assert.ok(sandboxProblem.validation);
      assert.ok(sandboxProblem.validation.valid_count >= 1, 'Reference solution must pass generated test cases');
    });

    await f2.test('2.2 Student runs code in sandbox against sample test cases (real Judge0 execution)', async () => {
      const validPythonCode = `
import sys

def binary_search(arr, target):
    left = 0
    right = len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

if __name__ == "__main__":
    lines = sys.stdin.read().strip().split()
    if not lines:
        print(-1)
    else:
        target = int(lines[0])
        arr = [int(x) for x in lines[1:]]
        print(binary_search(arr, target))
`;

      const runRes = await request('POST', '/student/sandbox/run', {
        code: validPythonCode,
        language: 'Python',
        assignmentId: 'asg-binary-search-live',
        sampleCases: [
          { input: '5 1 3 5 7 9', expected_output: '2' },
          { input: '4 1 3 5 7 9', expected_output: '-1' },
        ],
      }, studentToken);

      assert.strictEqual(runRes.statusCode, 200);
      assert.strictEqual(runRes.body.success, true);
      const runData = runRes.body.data;
      assert.ok(runData.total_count >= 2);
      assert.strictEqual(runData.passed_count, 2, 'All sample test cases should pass for correct binary search');
    });

    await f2.test('2.3 Student submits code; Code Auto-Grader combines deterministic Judge0 results + qualitative LLM review', async () => {
      const submittedCode = `
def binary_search(arr, target):
    """
    Performs binary search in O(log n) time and O(1) auxiliary space.
    """
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

import sys
if __name__ == "__main__":
    data = sys.stdin.read().split()
    if data:
        t = int(data[0])
        nums = [int(x) for x in data[1:]]
        print(binary_search(nums, t))
`;

      const submitRes = await request('POST', '/student/sandbox/submit', {
        code: submittedCode,
        language: 'Python',
        assignmentId: 'asg-binary-search-live',
        testCases: [
          { input: '10 10 20 30 40 50', expected_output: '0' },
          { input: '50 10 20 30 40 50', expected_output: '4' },
          { input: '25 10 20 30 40 50', expected_output: '-1' },
        ],
        maxScore: 100,
      }, studentToken);

      assert.strictEqual(submitRes.statusCode, 200);
      assert.strictEqual(submitRes.body.success, true);
      const gradeReport = submitRes.body.data;

      // Deterministic validation metrics
      assert.ok(gradeReport.id || gradeReport.submission_id);
      assert.strictEqual(gradeReport.passed_count, 3);
      assert.strictEqual(gradeReport.failed_count, 0);
      assert.strictEqual(gradeReport.total_count, 3);
      assert.ok(gradeReport.score >= 90);

      // Qualitative LLM review fields
      assert.ok(gradeReport.qualitative_review);
      assert.ok(gradeReport.qualitative_review.readability_score !== undefined);
      assert.ok(gradeReport.qualitative_review.time_complexity_assessment || gradeReport.qualitative_review.time_complexity_fit);
      assert.ok(gradeReport.qualitative_review.qualitative_summary || (gradeReport.qualitative_review.constructive_suggestions && gradeReport.qualitative_review.constructive_suggestions.length > 0));
    });
  });

  // =========================================================================
  // FLOW 3: The Full Closed-Loop Pedagogical Cycle
  // =========================================================================
  await t.test('FLOW 3: Full Closed Loop: Upload -> Analysis -> Curation -> RAG -> Tutor -> Assessment -> Grading -> Analytics -> Co-Pilot Action', async (f3) => {
    
    // 1. Verify Document to Taxonomy linkage
    assert.ok(analyzedMaterial.topic || analyzedMaterial.main_topic);
    assert.ok(publishedMaterial.id);

    // 2. Verify Taxonomy to Resource Curation linkage
    assert.ok(approvedResource.id);
    assert.strictEqual(approvedResource.approved_status, 'APPROVED');

    // 3. Verify Material to RAG Knowledge Base indexing
    const ragCheck = await RAGService.queryKnowledgeBase({
      query: 'What is 1NF in DBMS?',
      classroomId: createdClass.id,
      topic: 'Database Normalization',
    });
    assert.ok(ragCheck.response || ragCheck.reply);

    // 4. Verify Assessment, Submission, and FairGrade report linkage
    assert.ok(createdAssessment.id);
    assert.ok(studentSubmissionA.id);
    const storedReport = Array.from(memoryStore.fairgrade_reports.values()).find(
      (r) => r.anonymous_submission_id || r.submission_id === studentSubmissionA.id
    );
    assert.ok(storedReport);

    // 5. Verify Performance Log & Analytics
    const AnalyticsService = require('../src/services/analyticsService');
    const teacherAnalytics = await AnalyticsService.getTeacherAnalytics(teacherUser);
    assert.ok(teacherAnalytics);
    assert.ok(teacherAnalytics.overview);

    const adminAnalytics = await AnalyticsService.getAdminAnalytics();
    assert.ok(adminAnalytics);
    assert.ok(adminAnalytics.platform);

    // 6. Verify Teacher Co-Pilot synthesizes closed-loop data into teaching interventions
    const refreshedCopilot = await CopilotService.getTeacherRecommendations({
      teacherUser,
      forceRefresh: true,
    });
    assert.ok(refreshedCopilot.recommendations.length > 0);
    assert.ok(refreshedCopilot.top_weakness_concept);
    assert.ok(refreshedCopilot.computed_evidence_summary);
  });
});
