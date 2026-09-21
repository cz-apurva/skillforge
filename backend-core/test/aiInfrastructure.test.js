const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getLLMProvider,
  loadPrompt,
  executeAICall,
  AIServiceUnavailableError,
  getMockFixture,
  OpenAIProvider,
  AnthropicProvider,
} = require('../src/ai');
const AIRequestLog = require('../src/models/AIRequestLog');
const { memoryStore } = require('../src/config/db');

test('AI Infrastructure Suite', async (t) => {
  await t.test('1. Provider Factory & Interface', () => {
    process.env.LLM_PROVIDER = 'anthropic';
    const anthropicP = getLLMProvider();
    assert.equal(anthropicP.name, 'anthropic');
    assert.ok(anthropicP instanceof AnthropicProvider);

    process.env.LLM_PROVIDER = 'openai';
    const openAiP = getLLMProvider();
    assert.equal(openAiP.name, 'openai');
    assert.ok(openAiP instanceof OpenAIProvider);

    assert.throws(() => getLLMProvider('invalid_provider'), /Unsupported LLM_PROVIDER/);
  });

  await t.test('2. Versioned Prompts Loading', () => {
    const promptNames = [
      'contentAnalyzer',
      'resourceCurator',
      'tutor',
      'fairGrade',
      'codeGrader',
      'teacherCopilot',
    ];

    for (const name of promptNames) {
      const p = loadPrompt(name);
      assert.ok(p.version, `Prompt ${name} must have a version`);
      assert.equal(p.version, 'v1.0.0');
      assert.ok(p.systemPrompt.length > 50, `Prompt ${name} must have non-empty system prompt`);
      assert.equal(p.module, name);
    }
  });

  await t.test('3. AI_MODE=mock returns labeled mock data and logs to AIRequestLog', async () => {
    process.env.AI_MODE = 'mock';
    memoryStore.ai_request_logs.clear();

    const result = await executeAICall({
      service: 'contentAnalyzer',
      promptName: 'contentAnalyzer',
      userPrompt: 'Analyze this lecture on Database Normalization',
    });

    assert.equal(result.success, true);
    assert.equal(result.ai_mode, 'mock');
    assert.equal(result.is_mock, true);
    assert.equal(result.prompt_version, 'v1.0.0');
    assert.ok(result.data.topic);

    // Verify AIRequestLog recorded MOCK_SUCCESS without PII
    const logs = await AIRequestLog.findAll({ service: 'contentAnalyzer' });
    assert.equal(logs.length, 1);
    assert.equal(logs[0].status, 'MOCK_SUCCESS');
    assert.equal(logs[0].prompt_version, 'v1.0.0');
    assert.equal(logs[0].ai_mode, 'mock');
    assert.equal(logs[0].student_id, undefined);
    assert.equal(logs[0].metadata?.student_id, undefined);
  });

  await t.test('4. AI_MODE=live centralized failure handling (never crashes, logs failure)', async () => {
    process.env.AI_MODE = 'live';
    process.env.LLM_PROVIDER = 'anthropic';
    delete process.env.ANTHROPIC_API_KEY; // Simulate missing credentials
    memoryStore.ai_request_logs.clear();

    const result = await executeAICall({
      service: 'tutor',
      promptName: 'tutor',
      userPrompt: 'Explain 3NF vs BCNF Socratically',
      throwOnError: false,
    });

    assert.equal(result.success, false);
    assert.equal(result.is_available, false);
    assert.equal(result.error, 'AI_SERVICE_UNAVAILABLE');
    assert.equal(result.message, 'AI service temporarily unavailable, your data is safely stored.');
    assert.equal(result.requires_human_review, true);
    assert.equal(result.prompt_version, 'v1.0.0');

    // Verify AIRequestLog recorded failure with exact error type
    const logs = await AIRequestLog.findAll({ service: 'tutor' });
    assert.equal(logs.length, 1);
    assert.equal(logs[0].status, 'ERROR');
    assert.equal(logs[0].error_type, 'AUTH_ERROR');
    assert.ok(logs[0].error_message.includes('ANTHROPIC_API_KEY'));
  });

  await t.test('5. Zero-PII Guarantee in AIRequestLog', async () => {
    memoryStore.ai_request_logs.clear();

    await AIRequestLog.create({
      service: 'fairGrade',
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      prompt_version: 'v1.0.0',
      duration_ms: 450,
      status: 'SUCCESS',
      prompt_tokens: 400,
      completion_tokens: 150,
      metadata: {
        // Attempting to pass PII should be stripped
        student_id: 'student-1234',
        studentName: 'Alice Johnson',
        assessment_type: 'subjective',
      },
    });

    const logs = await AIRequestLog.findAll({ service: 'fairGrade' });
    assert.equal(logs.length, 1);
    const log = logs[0];
    assert.equal(log.student_id, undefined);
    assert.equal(log.studentName, undefined);
    assert.equal(log.metadata.student_id, undefined);
    assert.equal(log.metadata.studentName, undefined);
    assert.equal(log.metadata.assessment_type, 'subjective');
  });

  await t.test('6. Telemetry aggregation calculations', async () => {
    const telemetry = await AIRequestLog.getTelemetrySummary();
    assert.ok(Array.isArray(telemetry));
    const fairgradeStat = telemetry.find((t) => t.service === 'fairGrade');
    assert.ok(fairgradeStat);
    assert.equal(fairgradeStat.requests_count, 1);
    assert.equal(fairgradeStat.errors_count, 0);
    assert.equal(fairgradeStat.error_rate, '0.00%');
  });
});
