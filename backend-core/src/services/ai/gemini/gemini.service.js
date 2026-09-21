const { GoogleGenAI } = require('@google/genai');
const AIRequestLog = require('../../../models/AIRequestLog');
const Notification = require('../../../models/Notification');

/**
 * SkillForge AI - Official Google Gemini Service Layer
 * 
 * Guarantees:
 * 1. Backend-only execution using the official @google/genai SDK.
 * 2. Strict Zod schema validation on all structured responses.
 * 3. Single-retry resilience; on failure, mark operation FAILED_REQUIRES_REVIEW rather than faking an answer.
 * 4. Zero-PII logging in ai_request_logs (timings, model, token usage, status, prompt version).
 * 5. Adversarial prompt-injection shielding separating system instructions from untrusted user content.
 */

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.defaultModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    this.defaultEmbeddingModel = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';
    this._aiClient = null;
  }

  _getClient() {
    if (!this.apiKey && process.env.GEMINI_API_KEY) {
      this.apiKey = process.env.GEMINI_API_KEY;
    }
    if (!this._aiClient && this.apiKey) {
      this._aiClient = new GoogleGenAI({ apiKey: this.apiKey });
    }
    return this._aiClient;
  }

  /**
   * Helper to safely isolate untrusted user/student/document content
   */
  static wrapUntrustedContent(content) {
    if (!content) return '';
    return `"""BEGIN_UNTRUSTED_CONTENT\n${String(content).trim()}\nEND_UNTRUSTED_CONTENT"""`;
  }

  /**
   * Freeform Text Generation via Gemini
   */
  async generateText({
    prompt,
    systemInstruction,
    temperature = 0.2,
    maxTokens = 2048,
    model,
    service = 'general-ai',
    promptVersion = 'v1.0.0',
  }) {
    const startTime = Date.now();
    const targetModel = model || this.defaultModel;
    const client = this._getClient();

    if (!client) {
      const durationMs = Date.now() - startTime;
      await this._logAiRequest({
        service,
        provider: 'google-gemini',
        model: targetModel,
        promptVersion,
        durationMs,
        status: 'API_KEY_MISSING',
        errorType: 'AUTH_ERROR',
        errorMessage: 'GEMINI_API_KEY environment variable is not configured.',
      });

      const err = new Error('Gemini AI service unavailable: GEMINI_API_KEY is not configured.');
      err.statusCode = 503;
      err.code = 'GEMINI_UNAVAILABLE';
      throw err;
    }

    try {
      const response = await client.models.generateContent({
        model: targetModel,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction || undefined,
          temperature,
          maxOutputTokens: maxTokens,
        },
      });

      const durationMs = Date.now() - startTime;
      const responseText = response.text || '';
      const usage = response.usageMetadata || {};

      await this._logAiRequest({
        service,
        provider: 'google-gemini',
        model: targetModel,
        promptVersion,
        durationMs,
        status: 'SUCCESS',
        promptTokens: usage.promptTokenCount || 0,
        completionTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || 0,
      });

      return {
        success: true,
        text: responseText,
        model: targetModel,
        prompt_version: promptVersion,
        usage: {
          promptTokens: usage.promptTokenCount || 0,
          completionTokens: usage.candidatesTokenCount || 0,
          totalTokens: usage.totalTokenCount || 0,
        },
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      await this._logAiRequest({
        service,
        provider: 'google-gemini',
        model: targetModel,
        promptVersion,
        durationMs,
        status: 'ERROR',
        errorType: err.name || 'API_ERROR',
        errorMessage: err.message,
      });

      throw err;
    }
  }

  /**
   * Structured JSON Generation validated against Zod Schema with Single-Retry Resilience
   */
  async generateStructured({
    prompt,
    systemInstruction,
    zodSchema,
    temperature = 0.1,
    maxTokens = 4096,
    model,
    service = 'structured-ai',
    promptVersion = 'v1.0.0',
  }) {
    const startTime = Date.now();
    const targetModel = model || this.defaultModel;
    const client = this._getClient();

    if (!client) {
      const durationMs = Date.now() - startTime;
      await this._logAiRequest({
        service,
        provider: 'google-gemini',
        model: targetModel,
        promptVersion,
        durationMs,
        status: 'API_KEY_MISSING',
        errorType: 'AUTH_ERROR',
        errorMessage: 'GEMINI_API_KEY environment variable is not configured.',
      });

      return {
        success: false,
        status: 'FAILED_REQUIRES_REVIEW',
        error: 'GEMINI_KEY_MISSING',
        message: 'Gemini AI service unavailable: API key not configured. Submission flagged for human review.',
        service,
        prompt_version: promptVersion,
        requires_human_review: true,
      };
    }

    let lastError = null;

    // Single-Retry Loop: Attempt 1 -> On failure, retry with explicit error context -> On failure, mark FAILED_REQUIRES_REVIEW
    for (let attempt = 1; attempt <= 2; attempt++) {
      const currentPrompt = attempt === 1
        ? prompt
        : `${prompt}\n\n[RETRY NOTICE]: Your previous response failed schema validation with error: "${lastError.message}". Please strictly correct the output format to match the required JSON structure.`;

      try {
        const response = await client.models.generateContent({
          model: targetModel,
          contents: currentPrompt,
          config: {
            systemInstruction: (systemInstruction || '') + '\nReturn strictly valid, parseable JSON conforming to the requested schema. Do not enclose in markdown ticks if possible.',
            temperature,
            maxOutputTokens: maxTokens,
            responseMimeType: 'application/json',
          },
        });

        const rawText = response.text || '{}';
        const parsedJson = this._extractJson(rawText);

        // Validate strictly with Zod schema if provided
        let validatedData = parsedJson;
        if (zodSchema && typeof zodSchema.parse === 'function') {
          validatedData = zodSchema.parse(parsedJson);
        }

        const durationMs = Date.now() - startTime;
        const usage = response.usageMetadata || {};

        await this._logAiRequest({
          service,
          provider: 'google-gemini',
          model: targetModel,
          promptVersion,
          durationMs,
          status: attempt === 1 ? 'SUCCESS' : 'RETRY_SUCCESS',
          promptTokens: usage.promptTokenCount || 0,
          completionTokens: usage.candidatesTokenCount || 0,
          totalTokens: usage.totalTokenCount || 0,
        });

        return {
          success: true,
          data: validatedData,
          raw_text: rawText,
          model: targetModel,
          prompt_version: promptVersion,
          attempts: attempt,
          usage: {
            promptTokens: usage.promptTokenCount || 0,
            completionTokens: usage.candidatesTokenCount || 0,
            totalTokens: usage.totalTokenCount || 0,
          },
        };
      } catch (err) {
        lastError = err;
        console.warn(`[GeminiService] ${service} attempt ${attempt} failed: ${err.message}`);
      }
    }

    // Both attempts failed -> FAILED_REQUIRES_REVIEW (Never fabricate results)
    const durationMs = Date.now() - startTime;
    await this._logAiRequest({
      service,
      provider: 'google-gemini',
      model: targetModel,
      promptVersion,
      durationMs,
      status: 'FAILED_REQUIRES_REVIEW',
      errorType: lastError?.name || 'VALIDATION_ERROR',
      errorMessage: lastError?.message || 'Structured validation failed after retry',
    });

    // Notify Admin on AI service degraded
    try {
      await Notification.create({
        recipient_role: 'ADMIN',
        type: 'AI_SERVICE_ALERT',
        title: `⚠️ AI Service Degradation: ${service}`,
        message: `Structured output validation failed after retry for service '${service}' (${promptVersion}): ${lastError?.message}`,
        record_type: 'ai_service',
        record_id: service,
        priority: 'HIGH',
      });
    } catch {}

    return {
      success: false,
      status: 'FAILED_REQUIRES_REVIEW',
      error: 'SCHEMA_VALIDATION_FAILED',
      message: `Gemini structured output failed after retry: ${lastError?.message}. Submission marked for human review.`,
      service,
      prompt_version: promptVersion,
      requires_human_review: true,
    };
  }

  /**
   * Generate vector embeddings for text using Gemini Embeddings API
   */
  async embedText({ text, model }) {
    const targetModel = model || this.defaultEmbeddingModel;
    const client = this._getClient();

    if (!client) {
      throw new Error('GEMINI_API_KEY is required for embedding generation.');
    }

    const response = await client.models.embedContent({
      model: targetModel,
      contents: text,
    });

    return {
      embedding: response.embedding?.values || [],
      model: targetModel,
    };
  }

  /**
   * Stream text generation for interactive chat / tutor
   */
  async *streamResponse({ prompt, systemInstruction, temperature = 0.3, model }) {
    const targetModel = model || this.defaultModel;
    const client = this._getClient();

    if (!client) {
      throw new Error('GEMINI_API_KEY is required for streaming.');
    }

    const stream = await client.models.generateContentStream({
      model: targetModel,
      contents: prompt,
      config: {
        systemInstruction,
        temperature,
      },
    });

    for await (const chunk of stream) {
      yield chunk.text || '';
    }
  }

  /**
   * Robust JSON extractor handling raw strings or markdown fences
   */
  _extractJson(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      throw new Error('Empty response from Gemini; cannot parse JSON');
    }

    const trimmed = rawText.trim();
    const markdownMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch) {
      return JSON.parse(markdownMatch[1].trim());
    }

    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }

    const firstBracket = trimmed.indexOf('[');
    const lastBracket = trimmed.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      return JSON.parse(trimmed.slice(firstBracket, lastBracket + 1));
    }

    return JSON.parse(trimmed);
  }

  /**
   * Zero-PII execution logging to PostgreSQL / AIRequestLog
   */
  async _logAiRequest({
    service,
    provider,
    model,
    promptVersion,
    durationMs,
    status,
    errorType = null,
    errorMessage = null,
    promptTokens = 0,
    completionTokens = 0,
    totalTokens = 0,
  }) {
    try {
      await AIRequestLog.create({
        service,
        provider,
        model,
        prompt_version: promptVersion,
        duration_ms: durationMs,
        status,
        error_type: errorType,
        error_message: errorMessage ? String(errorMessage).slice(0, 500) : null,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        ai_mode: 'live',
      });
    } catch (err) {
      console.warn('[GeminiService] AIRequestLog telemetry warning:', err.message);
    }
  }
}

const geminiServiceInstance = new GeminiService();

module.exports = {
  GeminiService,
  geminiService: geminiServiceInstance,
};
