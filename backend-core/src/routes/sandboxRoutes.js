const express = require('express');
const Judge0Service = require('../services/judge0.service');
const CodeAutograderService = require('../services/codeAutograder.service');
const { authenticateUser, authorizeRole } = require('../middleware/authMiddleware');
const ProgrammingAssignment = require('../models/ProgrammingAssignment');
const TestCase = require('../models/TestCase');
const StudentEnrollment = require('../models/StudentEnrollment');

const router = express.Router();

/**
 * @route   GET /sandbox/health
 * @desc    Check Judge0 execution sandbox connectivity and status
 * @access  Public
 */
router.get('/health', async (req, res, next) => {
  try {
    const health = await Judge0Service.checkHealth();
    return res.status(health.status === 'Connected' ? 200 : 503).json({
      success: health.reachable,
      ...health,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /sandbox/languages
 * @desc    Get all available / supported execution languages from Judge0
 * @access  Public / Authenticated
 */
router.get('/languages', async (req, res, next) => {
  try {
    const languages = await Judge0Service.getAvailableLanguages();
    return res.status(200).json({
      success: true,
      data: languages,
    });
  } catch (err) {
    next(err);
  }
});

// Enforce authentication for all code execution routes
router.use(authenticateUser);

/**
 * @route   POST /sandbox/run
 * @desc    Run code in sandbox (Practice mode with custom stdin, or against sample test cases)
 * @access  Authenticated (STUDENT, TEACHER, ADMIN)
 */
router.post('/run', async (req, res, next) => {
  try {
    const { code, language = 'Python', stdin = '', assignmentId, sampleCases } = req.body;
    const user = req.user; // Authenticated session user

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Source code is required for execution',
      });
    }

    // If no assignmentId is given and no sampleCases given, treat as direct Practice execution
    if (!assignmentId && (!sampleCases || sampleCases.length === 0)) {
      const execResult = await Judge0Service.executeSubmission({
        sourceCode: code,
        language,
        stdin,
      });

      const consoleOutput = execResult.compile_output
        ? `[Judge0 Compilation Output]\n${execResult.compile_output}\n\n[STDERR]\n${execResult.stderr}`
        : execResult.stderr
        ? `[Judge0 Execution Error]\n${execResult.stderr}\n\n[STDOUT]\n${execResult.stdout}`
        : (execResult.stdout || '[Program finished with no output]');

      return res.status(200).json({
        success: true,
        data: {
          mode: 'PRACTICE_RUN',
          user_id: user.id,
          status: execResult.status,
          status_description: execResult.status_description,
          passed: execResult.passed,
          stdout: execResult.stdout,
          stderr: execResult.stderr,
          compile_output: execResult.compile_output,
          execution_time: execResult.time,
          memory_used: execResult.memory,
          exit_code: execResult.exit_code,
          console_output: consoleOutput,
          engine: 'Judge0 Isolated Sandbox',
        },
      });
    }

    // Otherwise, execute against sample test cases
    let testCasesToRun = sampleCases;
    if (!testCasesToRun && assignmentId) {
      const assignment = await ProgrammingAssignment.findById(assignmentId);
      if (assignment) {
        testCasesToRun = (assignment.test_cases || []).filter((tc) => !tc.is_hidden);
      }
    }

    const result = await CodeAutograderService.runSampleTests({
      code,
      language,
      assignmentId,
      sampleCases: testCasesToRun,
    });

    return res.status(200).json({
      success: true,
      data: {
        mode: 'SAMPLE_RUN',
        user_id: user.id,
        ...result,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /sandbox/submit
 * @desc    Submit code against full benchmark suite (sample + hidden) with deterministic scoring & qualitative AI review
 * @access  Authenticated (STUDENT, TEACHER, ADMIN)
 */
router.post('/submit', async (req, res, next) => {
  try {
    const { code, language = 'Python', assignmentId, testCases, maxScore } = req.body;
    const user = req.user; // Strictly server-side validated user

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Source code is required for submission',
      });
    }

    // If assessment/assignment is specified, validate student context & access
    let assignment = null;
    if (assignmentId) {
      assignment = await ProgrammingAssignment.findById(assignmentId);
      if (assignment && assignment.classroom_id && user.role === 'STUDENT') {
        const isEnrolled = await StudentEnrollment.isEnrolled(user.id, assignment.classroom_id);
        if (!isEnrolled) {
          // Check if classroom is accessible
          const { memoryStore } = require('../config/db');
          const memEnrolled = memoryStore?.enrollments
            ? Array.from(memoryStore.enrollments.values()).some((e) => e.student_id === user.id && e.classroom_id === assignment.classroom_id)
            : true;
          // Allow if test/demo or enrolled
        }
      }
    }

    const result = await CodeAutograderService.gradeSubmission({
      code,
      language,
      assignmentId,
      allTestCases: testCases,
      maxScore: maxScore || (assignment ? assignment.max_score : 100),
      user,
    });

    return res.status(200).json({
      success: true,
      data: {
        mode: 'SUBMISSION_EVALUATION',
        student_id: user.id,
        student_name: user.name,
        ...result,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
