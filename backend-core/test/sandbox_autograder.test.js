const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const jwt = require('jsonwebtoken');

process.env.AI_MODE = 'mock';
process.env.USE_MEMORY_DB = 'true';

const app = require('../src/app');
const { memoryStore } = require('../src/config/db');
const Judge0Service = require('../src/services/judge0.service');
const SandboxGeneratorService = require('../src/services/sandboxGenerator.service');
const CodeAutograderService = require('../src/services/codeAutograder.service');

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

describe('Sandbox Generator with Judge0 Validation & Hybrid Code Auto-Grader', () => {
  let teacherToken;
  let studentToken;
  let testTeacher;
  let testStudent;

  before(async () => {
    testTeacher = {
      id: 'teacher-linus-uuid',
      name: 'Prof. Linus Torvalds',
      email: 'linus@skillforge.ai',
      role: 'TEACHER',
    };
    teacherToken = generateToken(testTeacher);

    testStudent = {
      id: 'student-alice-uuid',
      name: 'Alice Johnson',
      email: 'alice.sandbox@skillforge.ai',
      role: 'STUDENT',
    };
    studentToken = generateToken(testStudent);

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

  describe('1. Judge0Service Code Execution & Validation', () => {
    test('Executes Python code submission with real execution timing and exact stdout', async () => {
      const code = `
import sys
lines = sys.stdin.read().strip().split()
if lines:
    n = int(lines[0])
    print(n * 2)
else:
    print(0)
`;
      const result = await Judge0Service.executeSubmission({
        sourceCode: code,
        language: 'Python',
        stdin: '21',
        expectedOutput: '42',
      });

      assert.equal(result.passed, true);
      assert.equal(result.status, 'Accepted');
      assert.equal(result.stdout.trim(), '42');
      assert.ok(result.time, 'Should contain authentic execution time string');
      assert.ok(result.memory, 'Should contain authentic memory measurement');
    });

    test('Detects Wrong Answer when stdout does not match expected output', async () => {
      const code = `print("Hello Wrong Output")`;
      const result = await Judge0Service.executeSubmission({
        sourceCode: code,
        language: 'Python',
        stdin: '',
        expectedOutput: 'Hello Correct Output',
      });

      assert.equal(result.passed, false);
      assert.equal(result.status, 'Wrong Answer');
    });

    test('Validates reference solution against candidate test cases via Judge0 before saving', async () => {
      const refSolution = `
import sys
lines = sys.stdin.read().strip().split('\\n')
if lines and lines[0].strip() == '3':
    print('Deadlock Detected')
else:
    print('No Deadlock')
`;
      const candidateCases = [
        { id: 1, name: 'Sample 1', input: '3\n1 2\n2 3\n3 1', expected_output: 'Deadlock Detected', is_hidden: false },
        { id: 2, name: 'Sample 2', input: '4\n1 2\n2 3', expected_output: 'No Deadlock', is_hidden: false },
      ];

      const validation = await Judge0Service.validateReferenceSolution({
        referenceSolution: refSolution,
        language: 'Python',
        candidateTestCases: candidateCases,
      });

      assert.equal(validation.validated, true);
      assert.equal(validation.valid_count, 2);
      assert.equal(validation.total_count, 2);
      assert.equal(validation.validated_test_cases[0].verified_by_reference, true);
      assert.equal(validation.validated_test_cases[0].expected_output, 'Deadlock Detected');
    });
  });

  describe('2. SandboxGeneratorService Problem Synthesis & Judge0 Validation', () => {
    test('Generates problem statement, constraints, starter code, and Judge0-validated test cases', async () => {
      const result = await SandboxGeneratorService.generateAndValidateSandbox({
        topic: 'Chandy-Misra-Haas Distributed Deadlock Detection',
        difficulty: 'Intermediate',
        language: 'Python',
        objective: 'Detect wait-for graph cycles in distributed systems',
        classroom_id: 'cls-mca-401',
        user: testTeacher,
        auto_save: true,
      });

      assert.ok(result.id, 'Should generate an assignment UUID');
      assert.ok(result.title, 'Should have problem title');
      assert.ok(result.problem_statement, 'Should have problem statement');
      assert.ok(result.starter_code, 'Should have starter code');
      assert.ok(result.reference_solution, 'Should have reference solution');
      assert.ok(result.test_cases && result.test_cases.length > 0, 'Should contain test cases');
      assert.ok(result.validation, 'Should contain Judge0 validation report');
      assert.equal(result.validation.valid_count > 0, true);

      // Verify stored in memoryStore
      const stored = memoryStore.assignments.get(result.id);
      assert.ok(stored, 'Assignment should be auto-saved in memoryStore');
      assert.equal(stored.title, result.title);
    });

    test('Rejects generation if topic is empty', async () => {
      await assert.rejects(
        async () => {
          await SandboxGeneratorService.generateAndValidateSandbox({
            topic: '',
            difficulty: 'Easy',
          });
        },
        { statusCode: 400 }
      );
    });
  });

  describe('3. CodeAutograderService Deterministic Scoring + Qualitative Review', () => {
    test('Runs sample tests in sandbox and returns authentic metrics', async () => {
      const code = `
import sys
raw = sys.stdin.read().strip()
if '1 2' in raw and '3 1' in raw:
    print('Deadlock Detected')
else:
    print('No Deadlock')
`;
      const result = await CodeAutograderService.runSampleTests({
        code,
        language: 'Python',
        sampleCases: [
          { id: 1, name: 'Sample 1', input: '3\n1 2\n2 3\n3 1', expected_output: 'Deadlock Detected' },
          { id: 2, name: 'Sample 2', input: '3\n1 2\n2 3', expected_output: 'No Deadlock' },
        ],
      });

      assert.equal(result.status, 'PASSED');
      assert.equal(result.passed_count, 2);
      assert.equal(result.total_count, 2);
      assert.ok(result.cases.length === 2);
      assert.ok(result.console_output.includes('Judge0 Sandbox Execution Engine'));
    });

    test('Computes marks deterministically in code (not LLM) and attaches LLM qualitative review', async () => {
      const studentCode = `
def detect_deadlock(n, edges):
    """
    Optimized cycle detection using recursion stack
    """
    adj = {i: [] for i in range(1, n + 1)}
    for u, v in edges:
        adj[u].append(v)
    return True
`;
      const testCases = [
        { id: 1, name: 'Case 1', input: '3\n1 2\n2 3\n3 1', expected_output: 'Deadlock Detected', weight: 50 },
        { id: 2, name: 'Case 2', input: '3\n1 2\n2 3', expected_output: 'No Deadlock', weight: 50 },
      ];

      const report = await CodeAutograderService.gradeSubmission({
        code: studentCode,
        language: 'Python',
        allTestCases: testCases,
        maxScore: 100,
        user: testStudent,
      });

      // Deterministic calculation verification
      assert.ok(report.id);
      assert.equal(typeof report.score, 'number');
      assert.equal(typeof report.passed_count, 'number');
      assert.equal(typeof report.total_count, 'number');
      assert.equal(report.score, Math.round((report.passed_count / report.total_count) * 100));

      // Qualitative LLM review verification
      assert.ok(report.qualitative_review, 'Should include qualitative review object');
      assert.ok(report.qualitative_review.readability_score > 0, 'Should have readability score');
      assert.ok(report.qualitative_review.naming_conventions_review, 'Should review naming conventions');
      assert.ok(report.qualitative_review.time_complexity_assessment, 'Should assess time complexity');
      assert.ok(Array.isArray(report.qualitative_review.constructive_suggestions), 'Should provide suggestions array');

      // Verify stored in grading_evaluations
      const stored = memoryStore.grading_evaluations.get(report.id);
      assert.ok(stored, 'Grade report must be persisted in data store');
      assert.equal(stored.score, report.score);
    });
  });

  describe('4. End-to-End HTTP API Endpoints', () => {
    test('POST /teacher/sandbox/generate generates and validates sandbox challenge for teacher', async () => {
      const res = await makeRequest(
        'POST',
        '/teacher/sandbox/generate',
        {
          topic: 'Byzantine Fault Tolerance & Raft Consensus',
          difficulty: 'Advanced',
          language: 'Python',
          objective: 'Simulate term elections and log quorum validation',
          classroomId: 'cls-mca-401',
        },
        { Authorization: `Bearer ${teacherToken}` }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.id);
      assert.ok(res.body.data.validation);
      assert.ok(res.body.data.reference_solution);
      assert.ok(res.body.data.test_cases.length > 0);
    });

    test('POST /student/sandbox/run executes sample testcases for student', async () => {
      const res = await makeRequest(
        'POST',
        '/student/sandbox/run',
        {
          code: `print("Deadlock Detected")`,
          language: 'Python',
        },
        { Authorization: `Bearer ${studentToken}` }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.status);
      assert.ok(res.body.data.cases);
      assert.ok(res.body.data.execution_time);
    });

    test('POST /student/sandbox/submit grades submission with deterministic score and qualitative AI review', async () => {
      const res = await makeRequest(
        'POST',
        '/student/sandbox/submit',
        {
          code: `
import sys
# Algorithmic DFS Solution
print("Deadlock Detected")
`,
          language: 'Python',
          maxScore: 100,
        },
        { Authorization: `Bearer ${studentToken}` }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(typeof res.body.data.score, 'number');
      assert.ok(res.body.data.qualitative_review);
      assert.ok(res.body.data.qualitative_review.readability_score);
    });

    test('POST /sandbox/run executes free practice code with custom stdin via Judge0', async () => {
      const res = await makeRequest(
        'POST',
        '/sandbox/run',
        {
          code: `name = input()\nprint(f"Hello {name}")`,
          language: 'Python',
          stdin: 'SkillForge Student',
        },
        { Authorization: `Bearer ${studentToken}` }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.mode, 'PRACTICE_RUN');
      assert.equal(res.body.data.status, 'Accepted');
      assert.equal(res.body.data.stdout.trim(), 'Hello SkillForge Student');
    });

    test('GET /sandbox/health returns reachable status and latency without exposing API key', async () => {
      const res = await makeRequest('GET', '/sandbox/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.service, 'judge0');
      assert.equal(res.body.reachable, true);
      assert.equal(res.body.status, 'Connected');
      assert.equal(res.body.api_key, undefined);
    });

    test('GET /sandbox/languages returns list of available languages', async () => {
      const res = await makeRequest('GET', '/sandbox/languages');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length > 0);
    });
  });

  describe('5. STAGE 7 — Real Judge0 Execution Verification Matrix', () => {
    test('Verification 1: print("Hello SkillForge") -> Accepted with exact stdout', async () => {
      const result = await Judge0Service.executeSubmission({
        sourceCode: 'print("Hello SkillForge")',
        language: 'Python',
      });
      assert.equal(result.status, 'Accepted');
      assert.equal(result.passed, true);
      assert.equal(result.stdout.trim(), 'Hello SkillForge');
    });

    test('Verification 2: print(10 + 20) -> Accepted with stdout 30', async () => {
      const result = await Judge0Service.executeSubmission({
        sourceCode: 'print(10 + 20)',
        language: 'Python',
      });
      assert.equal(result.status, 'Accepted');
      assert.equal(result.passed, true);
      assert.equal(result.stdout.trim(), '30');
    });

    test('Verification 3: print( (syntax error) -> Compilation / Syntax Error', async () => {
      const result = await Judge0Service.executeSubmission({
        sourceCode: 'print(',
        language: 'Python',
      });
      assert.equal(result.passed, false);
      const isError = result.status.includes('Compilation') || result.status.includes('Runtime') || result.stderr.includes('SyntaxError');
      assert.ok(isError, 'Syntax error must be identified as compilation/runtime error');
    });

    test('Verification 4: x = 10 / 0 -> Runtime Error (ZeroDivisionError)', async () => {
      const result = await Judge0Service.executeSubmission({
        sourceCode: 'x = 10 / 0',
        language: 'Python',
      });
      assert.equal(result.passed, false);
      assert.ok(result.status.includes('Runtime Error'), 'Status should be Runtime Error');
      assert.ok(result.stderr.includes('ZeroDivisionError'), 'Stderr should contain ZeroDivisionError');
    });

    test('Verification 5: Program reading stdin -> "Hello Apurva"', async () => {
      const result = await Judge0Service.executeSubmission({
        sourceCode: 'name = input()\nprint("Hello", name)',
        language: 'Python',
        stdin: 'Apurva',
      });
      assert.equal(result.status, 'Accepted');
      assert.equal(result.passed, true);
      assert.equal(result.stdout.trim(), 'Hello Apurva');
    });
  });
});

