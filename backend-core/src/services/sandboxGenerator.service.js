const { v4: uuidv4 } = require('uuid');
const { executeAICall } = require('../ai/aiWrapper');
const Judge0Service = require('./judge0.service');
const { memoryStore } = require('../config/db');

class SandboxGeneratorService {
  /**
   * JSON schema for structured sandbox problem synthesis
   */
  static getSandboxSchema() {
    return {
      type: 'object',
      properties: {
        title: { type: 'string' },
        problem_statement: { type: 'string' },
        difficulty: { type: 'string', enum: ['Easy', 'Intermediate', 'Advanced', 'Hard'] },
        language: { type: 'string' },
        constraints: { type: 'string' },
        input_format: { type: 'string' },
        output_format: { type: 'string' },
        starter_code: { type: 'string' },
        reference_solution: { type: 'string' },
        examples: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              input: { type: 'string' },
              output: { type: 'string' },
              explanation: { type: 'string' },
            },
            required: ['input', 'output'],
          },
        },
        candidate_test_cases: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              input: { type: 'string' },
              expected_output: { type: 'string' },
              is_hidden: { type: 'boolean' },
              weight: { type: 'number' },
              explanation: { type: 'string' },
            },
            required: ['input', 'expected_output', 'is_hidden'],
          },
        },
      },
      required: [
        'title',
        'problem_statement',
        'difficulty',
        'language',
        'constraints',
        'input_format',
        'output_format',
        'starter_code',
        'reference_solution',
        'candidate_test_cases',
      ],
    };
  }

  /**
   * Generate an academic programming challenge, starter code, reference solution,
   * and validate all candidate test cases using Judge0.
   */
  static async generateAndValidateSandbox({
    topic,
    difficulty = 'Intermediate',
    language = 'Python',
    objective = '',
    learning_objectives = [],
    classroom_id = 'cls-mca-401',
    user = null,
    auto_save = true,
  }) {
    if (!topic || !topic.trim()) {
      const err = new Error('Topic is required for Sandbox problem generation');
      err.statusCode = 400;
      throw err;
    }

    const objectivesList = Array.isArray(learning_objectives) && learning_objectives.length > 0
      ? learning_objectives.join('; ')
      : objective || `Master algorithmic concepts and practical implementation of ${topic}`;

    const userPrompt = `
Topic: ${topic}
Target Difficulty: ${difficulty}
Programming Language: ${language}
Learning Objectives: ${objectivesList}
Classroom Context: ${classroom_id}

Instructions:
Generate a rigorous algorithmic challenge for students. 
Ensure the starter code contains function stubs, docstrings, and a standard I/O driver matching the input/output format.
The reference solution MUST be complete, fully working, and adhere to optimal time complexity.
Generate at least 2 sample test cases and 3 hidden benchmark test cases (covering edge cases, boundary limits, and typical scenarios).
`;

    // 1. Invoke LLMProvider via centralized AI wrapper
    const aiResult = await executeAICall({
      service: 'sandboxGenerator',
      promptName: 'sandboxGenerator',
      userPrompt,
      schema: this.getSandboxSchema(),
      temperature: 0.15,
      maxTokens: 2500,
      structured: true,
      throwOnError: false,
    });

    if (!aiResult.success) {
      const err = new Error(aiResult.message || 'AI service temporarily unavailable');
      err.statusCode = 503;
      err.details = aiResult;
      throw err;
    }

    const problemData = aiResult.data || {};
    const candidateCases = Array.isArray(problemData.candidate_test_cases) ? problemData.candidate_test_cases : [];
    const referenceSolution = problemData.reference_solution || '';

    // 2. Actually validate generated test cases by running reference solution through Judge0
    const validationResult = await Judge0Service.validateReferenceSolution({
      referenceSolution,
      language: problemData.language || language,
      candidateTestCases: candidateCases,
    });

    const validatedTestCases = validationResult.validated_test_cases || candidateCases;
    const validCount = validationResult.valid_count || validatedTestCases.length;

    // Separate into sample tests and hidden benchmark tests
    const sampleTests = validatedTestCases.filter((tc) => !tc.is_hidden);
    const hiddenTests = validatedTestCases.filter((tc) => tc.is_hidden);

    const generatedSandbox = {
      id: uuidv4(),
      classroom_id,
      topic,
      title: problemData.title || `Programming Challenge: ${topic}`,
      problem_statement: problemData.problem_statement || '',
      description: problemData.problem_statement || '',
      difficulty: problemData.difficulty || difficulty,
      language: problemData.language || language,
      constraints: problemData.constraints || 'Time Limit: 2.0s | Memory Limit: 256MB',
      input_format: problemData.input_format || '',
      output_format: problemData.output_format || '',
      starter_code: problemData.starter_code || '',
      reference_solution: referenceSolution,
      examples: problemData.examples || [],
      test_cases: validatedTestCases,
      sample_tests: sampleTests,
      hidden_tests: hiddenTests,
      test_cases_count: validatedTestCases.length,
      sample_tests_count: sampleTests.length,
      hidden_tests_count: hiddenTests.length,
      validation: {
        all_passed: validationResult.validated,
        valid_count: validCount,
        total_count: validatedTestCases.length,
        engine: 'Judge0 Reference Validation Engine',
        execution_time: validationResult.execution_time,
        validated_at: new Date().toISOString(),
      },
      metadata: {
        prompt_version: aiResult.prompt_version || 'v1.0.0',
        ai_mode: aiResult.ai_mode || 'live',
        is_mock: Boolean(aiResult.is_mock),
      },
      created_by: user?.id || 'teacher-001-uuid',
      created_at: new Date().toISOString(),
    };

    // 3. Store in memoryStore if auto_save is enabled
    if (auto_save) {
      if (!memoryStore.assignments) {
        memoryStore.assignments = new Map();
      }

      const assignmentRecord = {
        ...generatedSandbox,
        assignment_type: 'programming',
        max_score: 100,
        status: 'published',
        submissions_count: 0,
        evaluated_count: 0,
        flagged_count: 0,
      };

      memoryStore.assignments.set(assignmentRecord.id, assignmentRecord);

      // Record in GradeAuditLog
      try {
        const GradeAuditLog = require('../models/GradeAuditLog');
        await GradeAuditLog.create({
          actor: user?.name || 'Prof. A. Anupam',
          role: 'TEACHER',
          action: 'SANDBOX_ASSIGNMENT_GENERATED',
          target: `assignment:${assignmentRecord.id}`,
          old_value: null,
          new_value: {
            title: assignmentRecord.title,
            language: assignmentRecord.language,
            test_cases_count: assignmentRecord.test_cases_count,
            validation: assignmentRecord.validation,
          },
          reason: `Generated AI Sandbox problem '${assignmentRecord.title}' with Judge0 reference validation (${validCount}/${validatedTestCases.length} tests validated).`,
          class_id: classroom_id,
          teacher_id: user?.id || 'teacher-001-uuid',
        });
      } catch (auditErr) {
        console.warn('[SandboxGenerator] Warning writing audit log:', auditErr.message);
      }
    }

    return generatedSandbox;
  }
}

module.exports = SandboxGeneratorService;
