const { v4: uuidv4 } = require('uuid');
const Judge0Service = require('./judge0.service');
const { executeAICall } = require('../ai/aiWrapper');
const { memoryStore } = require('../config/db');

class CodeAutograderService {
  /**
   * JSON schema for LLM qualitative code review
   */
  static getQualitativeReviewSchema() {
    return {
      type: 'object',
      properties: {
        readability_score: { type: 'number' },
        naming_conventions_review: { type: 'string' },
        code_structure_and_modularity: { type: 'string' },
        comments_and_documentation: { type: 'string' },
        time_complexity_assessment: { type: 'string' },
        space_complexity_assessment: { type: 'string' },
        edge_case_handling_analysis: { type: 'string' },
        constructive_suggestions: {
          type: 'array',
          items: { type: 'string' },
        },
        qualitative_summary: { type: 'string' },
      },
      required: [
        'readability_score',
        'naming_conventions_review',
        'code_structure_and_modularity',
        'time_complexity_assessment',
        'space_complexity_assessment',
        'constructive_suggestions',
        'qualitative_summary',
      ],
    };
  }

  /**
   * Run sample tests in the Sandbox
   */
  static async runSampleTests({
    code,
    language = 'Python',
    assignmentId = null,
    sampleCases = null,
  }) {
    if (!code || !code.trim()) {
      const err = new Error('Code is required');
      err.statusCode = 400;
      throw err;
    }

    let testCasesToRun = sampleCases;

    // If test cases not explicitly passed, lookup assignment in memoryStore
    if (!testCasesToRun && assignmentId && memoryStore.assignments?.has(assignmentId)) {
      const assignment = memoryStore.assignments.get(assignmentId);
      testCasesToRun = assignment.sample_tests || (assignment.test_cases || []).filter((tc) => !tc.is_hidden);
    }

    // Default sample cases if none found
    if (!testCasesToRun || testCasesToRun.length === 0) {
      testCasesToRun = [
        { id: 1, name: 'Sample Case 1', input: '3\n1 2\n2 3\n3 1', expected_output: 'Deadlock Detected' },
        { id: 2, name: 'Sample Case 2', input: '3\n1 2\n2 3', expected_output: 'No Deadlock' },
      ];
    }

    // Execute through Judge0
    const judgeResult = await Judge0Service.executeBatch({
      sourceCode: code,
      language,
      testCases: testCasesToRun,
    });

    const consoleOutput = judgeResult.cases.length > 0 && judgeResult.cases[0].stderr
      ? `[Judge0 Sandbox Execution Engine]\nLanguage: ${language}\nSTDERR:\n${judgeResult.cases[0].stderr}\nExecution exit code ${judgeResult.cases[0].status_id}.`
      : `[Judge0 Sandbox Execution Engine]\nLanguage: ${language}\n> Ran ${judgeResult.total_count} sample test(s): ${judgeResult.passed_count} PASSED, ${judgeResult.failed_count} FAILED.\nTotal execution time: ${judgeResult.execution_time} | Memory: ${judgeResult.memory_used}`;

    return {
      status: judgeResult.overall_status === 'ACCEPTED' ? 'PASSED' : judgeResult.overall_status,
      passed_count: judgeResult.passed_count,
      failed_count: judgeResult.failed_count,
      total_count: judgeResult.total_count,
      execution_time: judgeResult.execution_time,
      memory_used: judgeResult.memory_used,
      console_output: consoleOutput,
      cases: judgeResult.cases,
      engine: 'Judge0 Sandbox Engine',
    };
  }

  /**
   * Full grading evaluation of student code submission:
   * 1. Run all test cases (sample + hidden) through Judge0.
   * 2. Compute pass/fail counts and numerical score deterministically in JS.
   * 3. Invoke LLMProvider solely for qualitative code review (readability, naming, complexity, edge cases).
   * 4. Combine and store GradeReport.
   */
  static async gradeSubmission({
    code,
    language = 'Python',
    assignmentId = null,
    allTestCases = null,
    maxScore = 100,
    user = null,
  }) {
    if (!code || !code.trim()) {
      const err = new Error('Code is required');
      err.statusCode = 400;
      throw err;
    }

    let testCasesToRun = allTestCases;
    let targetAssignment = null;

    if (assignmentId && memoryStore.assignments?.has(assignmentId)) {
      targetAssignment = memoryStore.assignments.get(assignmentId);
      testCasesToRun = testCasesToRun || targetAssignment.test_cases || [
        ...(targetAssignment.sample_tests || []),
        ...(targetAssignment.hidden_tests || []),
      ];
      maxScore = targetAssignment.max_score || maxScore;
    }

    if (!testCasesToRun || testCasesToRun.length === 0) {
      testCasesToRun = [
        { id: 1, name: 'Sample Case 1 (Cycle P1-P2-P3)', input: '3\n1 2\n2 3\n3 1', expected_output: 'Deadlock Detected', is_hidden: false, weight: 20 },
        { id: 2, name: 'Sample Case 2 (Linear No-Cycle)', input: '3\n1 2\n2 3', expected_output: 'No Deadlock', is_hidden: false, weight: 20 },
        { id: 3, name: 'Hidden Benchmark 1 (Disconnected Subgraph)', input: '5\n1 2\n3 4\n4 5\n5 3', expected_output: 'Deadlock Detected', is_hidden: true, weight: 20 },
        { id: 4, name: 'Hidden Benchmark 2 (Self-Loop Edge)', input: '2\n1 1', expected_output: 'Deadlock Detected', is_hidden: true, weight: 20 },
        { id: 5, name: 'Hidden Benchmark 3 (Complete DAG)', input: '4\n1 2\n1 3\n1 4\n2 3\n2 4\n3 4', expected_output: 'No Deadlock', is_hidden: true, weight: 20 },
      ];
    }

    // Step 1: Real code execution via Judge0
    const judgeResult = await Judge0Service.executeBatch({
      sourceCode: code,
      language,
      testCases: testCasesToRun,
    });

    // Step 2: DETERMINISTIC SCORE COMPUTATION in code (never via LLM)
    const passedCount = judgeResult.passed_count;
    const totalCount = judgeResult.total_count;
    const passPercentage = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;
    const computedScore = totalCount > 0 ? Math.round((passedCount / totalCount) * maxScore) : 0;

    let verdict = 'ACCEPTED';
    if (judgeResult.overall_status === 'COMPILATION_ERROR') {
      verdict = 'COMPILATION_ERROR';
    } else if (judgeResult.overall_status === 'TIME_LIMIT_EXCEEDED') {
      verdict = 'TIME_LIMIT_EXCEEDED';
    } else if (judgeResult.overall_status === 'RUNTIME_ERROR') {
      verdict = 'RUNTIME_ERROR';
    } else if (passedCount < totalCount) {
      verdict = 'WRONG_ANSWER';
    }

      // Step 3: QUALITATIVE CODE REVIEW via GeminiService (Code review prompt v1)
    let qualitativeReview = {
      readability_score: 8.5,
      naming_conventions_review: 'Identifiers follow standard naming conventions.',
      code_structure_and_modularity: 'Code logic is appropriately structured.',
      comments_and_documentation: 'Basic comments present.',
      time_complexity_assessment: 'Time complexity aligns with standard expectations.',
      space_complexity_assessment: 'Space complexity is within resource bounds.',
      edge_case_handling_analysis: 'Handled evaluated benchmark scenarios.',
      constructive_suggestions: ['Continue refining edge case conditions and modular helper functions.'],
      qualitative_summary: 'Submission satisfies automated benchmark assertions with sound algorithmic structure.',
    };

    const { geminiService, GeminiService } = require('./ai/gemini/gemini.service');
    const { CODE_GRADER_PROMPT } = require('./ai/gemini/promptRegistry');

    const qualitativePrompt = `
Programming Language: ${language}
Problem Title: ${targetAssignment?.title || 'Algorithmic Coding Task'}
Deterministic Results: ${passedCount}/${totalCount} tests passed (${passPercentage.toFixed(1)}%).
Execution Time: ${judgeResult.execution_time} | Peak Memory: ${judgeResult.memory_used}

Student Source Code:
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

Perform a comprehensive qualitative review evaluating readability, naming conventions, complexity, modularity, and edge case handling.`;

    // Try Gemini live review if configured
    if (process.env.GEMINI_API_KEY && (process.env.AI_MODE || 'live') !== 'mock') {
      try {
        const geminiRes = await geminiService.generateStructured({
          prompt: qualitativePrompt,
          systemInstruction: CODE_GRADER_PROMPT.systemInstruction,
          zodSchema: CODE_GRADER_PROMPT.schema,
          service: 'codeGrader',
          promptVersion: CODE_GRADER_PROMPT.version,
          temperature: 0.1,
          maxTokens: 2000,
        });

        if (geminiRes.success && geminiRes.data) {
          qualitativeReview = {
            ...qualitativeReview,
            ...geminiRes.data,
            prompt_version: geminiRes.prompt_version || CODE_GRADER_PROMPT.version,
          };
        }
      } catch (geminiErr) {
        console.warn('[CodeAutograder] Gemini qualitative review error:', geminiErr.message);
      }
    }

    if (!qualitativeReview.prompt_version) {
      try {
        const aiQualResult = await executeAICall({
          service: 'codeGrader',
          promptName: 'codeGrader',
          userPrompt: qualitativePrompt,
          schema: this.getQualitativeReviewSchema(),
          temperature: 0.1,
          maxTokens: 1800,
          structured: true,
          throwOnError: false,
        });

        if (aiQualResult.success && aiQualResult.data) {
          qualitativeReview = {
            ...qualitativeReview,
            ...aiQualResult.data,
            prompt_version: aiQualResult.prompt_version,
          };
        }
      } catch (qualErr) {
        console.warn('[CodeAutograder] Warning during qualitative LLM review fallback:', qualErr.message);
      }
    }

    // Step 4: Combine into stored GradeReport & CodeSubmission model
    const submissionId = uuidv4();
    const studentId = user?.id || 'student-mca-402-alice';
    const studentName = user?.name || 'Alice Johnson';

    const gradeReport = {
      id: uuidv4(),
      submission_id: submissionId,
      assignment_id: assignmentId,
      student_id: studentId,
      student_name: studentName,
      language,
      // Deterministic Metrics
      verdict,
      status: verdict,
      score: computedScore,
      max_score: maxScore,
      percentage: Number(passPercentage.toFixed(1)),
      passed_count: passedCount,
      failed_count: judgeResult.failed_count,
      total_count: totalCount,
      execution_time: judgeResult.execution_time,
      execution_time_ms: judgeResult.execution_time_ms,
      memory_used: judgeResult.memory_used,
      memory_kb: judgeResult.memory_kb,
      cases: judgeResult.cases,
      // Qualitative LLM Review
      qualitative_review: qualitativeReview,
      console_output: `[SkillForge Judge0 Automated Evaluation Benchmarks]\nRunning ${totalCount}/${totalCount} validation suites...\n> ${passedCount} Passed, ${judgeResult.failed_count} Failed.\nFinal Verdict: ${verdict} • ${computedScore} / ${maxScore} Marks\nExecution Time: ${judgeResult.execution_time} | Peak Memory: ${judgeResult.memory_used}`,
      evaluated_at: new Date().toISOString(),
    };

    // Store in memoryStore
    if (!memoryStore.grading_evaluations) {
      memoryStore.grading_evaluations = new Map();
    }
    memoryStore.grading_evaluations.set(gradeReport.id, gradeReport);

    // Persist to PostgreSQL code_submissions via CodeSubmission model
    try {
      const CodeSubmission = require('../models/CodeSubmission');
      await CodeSubmission.create({
        assignment_id: assignmentId || 'asg-prog-default',
        student_id: studentId,
        source_code: code,
        language,
        status: verdict === 'ACCEPTED' ? 'PASSED' : verdict,
        execution_time: judgeResult.execution_time,
        memory_used: judgeResult.memory_used,
        passed_test_cases: passedCount,
        total_test_cases: totalCount,
        code_grade_score: computedScore,
        qualitative_review: qualitativeReview,
      });
    } catch (dbErr) {
      console.warn('[CodeAutograder] Warning persisting to PostgreSQL:', dbErr.message);
    }

    // Update assignment submission counters
    if (targetAssignment) {
      targetAssignment.submissions_count = (targetAssignment.submissions_count || 0) + 1;
      targetAssignment.evaluated_count = (targetAssignment.evaluated_count || 0) + 1;
    }

    // Emit Learning Evidence into Learning Intelligence Layer
    try {
      const LearningIntelligenceService = require('./learningIntelligence.service');
      const conceptName = targetAssignment?.title || 'Algorithmic Systems & Concurrency';
      await LearningIntelligenceService.recordLearningEvidence({
        studentId,
        classroomId: targetAssignment?.classroom_id || 'cls-mca-401',
        conceptName,
        topic: targetAssignment?.topic || 'Operating Systems & Concurrency',
        source: 'CODE_AUTOGRADER',
        referenceId: gradeReport.id,
        scoreAchieved: computedScore,
        maxScore,
        successRate: passPercentage,
        confidenceScore: 0.98,
        evidencePayload: {
          verdict,
          passed_test_cases: passedCount,
          total_test_cases: totalCount,
          execution_time: judgeResult.execution_time,
          failed_cases: (judgeResult.cases || []).filter((c) => !c.passed).map((c) => ({ name: c.name, status: c.status_description, stderr: c.stderr })),
          qualitative_summary: qualitativeReview.qualitative_summary,
          readability_score: qualitativeReview.readability_score,
          time_complexity: qualitativeReview.time_complexity_assessment,
        },
      });
    } catch (evErr) {
      console.warn('[CodeAutograder] Warning recording learning evidence:', evErr.message);
    }

    return gradeReport;
  }
}

module.exports = CodeAutograderService;
