const { getLLMProvider } = require('./llmProvider');
const { loadPrompt } = require('./promptLoader');
const { getMockFixture } = require('./mockFixtures');
const AIRequestLog = require('../models/AIRequestLog');

class AIServiceUnavailableError extends Error {
  constructor(message, errorType = 'SERVICE_UNAVAILABLE', details = {}) {
    super(message || 'AI service temporarily unavailable, your data is safely stored.');
    this.name = 'AIServiceUnavailableError';
    this.isAiUnavailable = true;
    this.errorType = errorType;
    this.details = details;
  }
}

/**
 * Centralized AI Service Invocation Wrapper.
 * 
 * Guarantees:
 * 1. Automatic prompt versioning alongside every generated result.
 * 2. Zero-PII execution logging in AIRequestLog.
 * 3. Strict AI_MODE enforcement (live vs. mock - never mixed silently).
 * 4. Resilient failure handling (never crashes, never fabricates false outputs).
 */
async function executeAICall({
  service,
  promptName,
  userPrompt,
  schema = null,
  temperature = 0.1,
  maxTokens = 2048,
  model = null,
  provider = null,
  structured = true,
  timeoutMs = 30000,
  throwOnError = false,
}) {
  const startTime = Date.now();
  const aiMode = (process.env.AI_MODE || 'live').toLowerCase().trim();

  // 1. Load versioned prompt
  let promptObj = { version: 'v1.0.0', systemPrompt: '' };
  try {
    if (promptName) {
      promptObj = loadPrompt(promptName);
    }
  } catch (promptErr) {
    console.warn(`[AIWrapper] Warning loading prompt '${promptName}': ${promptErr.message}`);
  }

  const promptVersion = promptObj.version || 'v1.0.0';

  // 2. Handle MOCK mode
  if (aiMode === 'mock') {
    const durationMs = Date.now() - startTime;
    const mockData = getMockFixture(service);

    // Record mock log in AIRequestLog for audit tracking
    await AIRequestLog.create({
      service,
      provider: 'mock-provider',
      model: 'mock-fixture-engine',
      prompt_version: promptVersion,
      duration_ms: durationMs,
      status: 'MOCK_SUCCESS',
      prompt_tokens: 50,
      completion_tokens: 150,
      total_tokens: 200,
      ai_mode: 'mock',
    });

    return {
      success: true,
      data: mockData,
      prompt_version: promptVersion,
      ai_mode: 'mock',
      is_mock: true,
    };
  }

  // 3. Handle LIVE mode
  let activeProvider;
  let targetModel = model;

  try {
    activeProvider = getLLMProvider(provider);
    targetModel = model || activeProvider.defaultModel;

    let response;
    if (structured) {
      response = await activeProvider.generateStructured({
        systemPrompt: promptObj.systemPrompt,
        prompt: userPrompt,
        schema,
        temperature,
        maxTokens,
        model: targetModel,
        timeoutMs,
      });
    } else {
      response = await activeProvider.generate({
        systemPrompt: promptObj.systemPrompt,
        prompt: userPrompt,
        temperature,
        maxTokens,
        model: targetModel,
        timeoutMs,
      });
    }

    const durationMs = Date.now() - startTime;

    // Log successful live invocation without PII
    await AIRequestLog.create({
      service,
      provider: activeProvider.name,
      model: response.model || targetModel,
      prompt_version: promptVersion,
      duration_ms: durationMs,
      status: 'SUCCESS',
      prompt_tokens: response.usage?.promptTokens || 0,
      completion_tokens: response.usage?.completionTokens || 0,
      total_tokens: response.usage?.totalTokens || 0,
      ai_mode: 'live',
    });

    return {
      success: true,
      data: structured ? response.data : response.text,
      raw_text: response.rawText || response.text,
      prompt_version: promptVersion,
      model: response.model || targetModel,
      provider: activeProvider.name,
      ai_mode: 'live',
      is_mock: false,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorType = err.errorType || (err.code === 'TIMEOUT' ? 'TIMEOUT' : err.code === 'API_KEY_MISSING' ? 'AUTH_ERROR' : 'SERVICE_UNAVAILABLE');
    const status = err.statusCode === 429 ? 'RATE_LIMITED' : err.code === 'TIMEOUT' ? 'TIMEOUT' : 'ERROR';

    // Log failure in AIRequestLog
    await AIRequestLog.create({
      service,
      provider: activeProvider ? activeProvider.name : (process.env.LLM_PROVIDER || 'anthropic'),
      model: targetModel || 'unknown',
      prompt_version: promptVersion,
      duration_ms: durationMs,
      status,
      error_type: errorType,
      error_message: err.message,
      ai_mode: 'live',
    });

    // Notification Trigger: Admin notified on AI service degraded/unavailable
    try {
      const NotificationService = require('../services/notificationService');
      await NotificationService.notifyAdminOnServiceDegraded({
        serviceName: service,
        status: status === 'TIMEOUT' ? 'DEGRADED' : 'UNAVAILABLE',
        details: `${errorType}: ${err.message}`,
      });
    } catch {}

    const failureResponse = {
      success: false,
      is_available: false,
      error: 'AI_SERVICE_UNAVAILABLE',
      error_type: errorType,
      message: 'AI service temporarily unavailable, your data is safely stored.',
      service,
      prompt_version: promptVersion,
      ai_mode: 'live',
      requires_human_review: true,
      details: err.message,
    };

    if (throwOnError) {
      throw new AIServiceUnavailableError(
        'AI service temporarily unavailable, your data is safely stored.',
        errorType,
        failureResponse
      );
    }

    return failureResponse;
  }
}

module.exports = {
  executeAICall,
  AIServiceUnavailableError,
};
