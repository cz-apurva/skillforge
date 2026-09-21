/**
 * SkillForge AI - Core LLM Provider Interface and Concrete Implementations
 * Supports OpenAI and Anthropic with unified generate, generateStructured, and embed methods.
 */

class LLMProvider {
  constructor(name) {
    if (new.target === LLMProvider) {
      throw new TypeError('Cannot construct LLMProvider abstract class directly');
    }
    this.name = name;
  }

  /**
   * Freeform text generation
   * @param {Object} options
   * @param {string} options.systemPrompt
   * @param {string} options.prompt
   * @param {number} [options.temperature=0.2]
   * @param {number} [options.maxTokens=2048]
   * @param {string} [options.model]
   * @param {number} [options.timeoutMs=30000]
   * @returns {Promise<{ text: string, usage: { promptTokens: number, completionTokens: number, totalTokens: number }, model: string, provider: string }>}
   */
  async generate(options) {
    throw new Error('generate() must be implemented by subclass');
  }

  /**
   * Structured JSON generation conforming to schema or JSON instruction
   * @param {Object} options
   * @param {string} options.systemPrompt
   * @param {string} options.prompt
   * @param {Object} [options.schema]
   * @param {number} [options.temperature=0.1]
   * @param {number} [options.maxTokens=2048]
   * @param {string} [options.model]
   * @param {number} [options.timeoutMs=30000]
   * @returns {Promise<{ data: Object, rawText: string, usage: { promptTokens: number, completionTokens: number, totalTokens: number }, model: string, provider: string }>}
   */
  async generateStructured(options) {
    throw new Error('generateStructured() must be implemented by subclass');
  }

  /**
   * Generate vector embeddings for text
   * @param {Object} options
   * @param {string} options.text
   * @param {string} [options.model]
   * @param {number} [options.timeoutMs=15000]
   * @returns {Promise<{ embedding: number[], usage: { totalTokens: number }, model: string, provider: string }>}
   */
  async embed(options) {
    throw new Error('embed() must be implemented by subclass');
  }
}

/**
 * Robust JSON parser for LLM responses (extracts from ```json blocks or outermost braces)
 */
function extractJsonFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty response from LLM; cannot parse JSON');
  }

  const trimmed = rawText.trim();

  // Try extracting from ```json ... ``` markdown fence
  const markdownMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (markdownMatch) {
    return JSON.parse(markdownMatch[1].trim());
  }

  // Try finding the outermost JSON object { ... } or array [ ... ]
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

  // Direct parse attempt
  return JSON.parse(trimmed);
}

/**
 * OpenAI Provider Implementation
 */
class OpenAIProvider extends LLMProvider {
  constructor() {
    super('openai');
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    this.defaultModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.defaultEmbeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
  }

  _checkApiKey() {
    if (!this.apiKey) {
      const err = new Error('OPENAI_API_KEY environment variable is not set');
      err.code = 'API_KEY_MISSING';
      err.errorType = 'AUTH_ERROR';
      throw err;
    }
  }

  async generate({
    systemPrompt,
    prompt,
    temperature = 0.2,
    maxTokens = 2048,
    model,
    timeoutMs = 30000,
  }) {
    this._checkApiKey();
    const targetModel = model || this.defaultModel;

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: targetModel,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        const err = new Error(`OpenAI HTTP ${response.status}: ${errorBody}`);
        err.statusCode = response.status;
        err.errorType = response.status === 429 ? 'RATE_LIMIT' : response.status === 401 ? 'AUTH_ERROR' : 'API_ERROR';
        throw err;
      }

      const json = await response.json();
      const choice = json.choices?.[0];
      const text = choice?.message?.content || '';
      const usage = {
        promptTokens: json.usage?.prompt_tokens || 0,
        completionTokens: json.usage?.completion_tokens || 0,
        totalTokens: json.usage?.total_tokens || 0,
      };

      return {
        text,
        usage,
        model: json.model || targetModel,
        provider: 'openai',
        finishReason: choice?.finish_reason || 'stop',
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        const timeoutErr = new Error(`OpenAI request timed out after ${timeoutMs}ms`);
        timeoutErr.code = 'TIMEOUT';
        timeoutErr.errorType = 'TIMEOUT';
        throw timeoutErr;
      }
      throw err;
    }
  }

  async generateStructured({
    systemPrompt,
    prompt,
    schema,
    temperature = 0.1,
    maxTokens = 2048,
    model,
    timeoutMs = 30000,
  }) {
    this._checkApiKey();
    const targetModel = model || this.defaultModel;

    let sys = (systemPrompt || '') + '\nYou MUST respond strictly in valid, parseable JSON format matching the requested schema. Do NOT include conversational preamble.';
    if (schema) {
      sys += `\nStrict Output Schema:\n${JSON.stringify(schema, null, 2)}`;
    }

    const messages = [
      { role: 'system', content: sys },
      { role: 'user', content: prompt },
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: targetModel,
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        const err = new Error(`OpenAI HTTP ${response.status}: ${errorBody}`);
        err.statusCode = response.status;
        err.errorType = response.status === 429 ? 'RATE_LIMIT' : response.status === 401 ? 'AUTH_ERROR' : 'API_ERROR';
        throw err;
      }

      const json = await response.json();
      const rawText = json.choices?.[0]?.message?.content || '{}';
      const parsedData = extractJsonFromText(rawText);

      return {
        data: parsedData,
        rawText,
        usage: {
          promptTokens: json.usage?.prompt_tokens || 0,
          completionTokens: json.usage?.completion_tokens || 0,
          totalTokens: json.usage?.total_tokens || 0,
        },
        model: json.model || targetModel,
        provider: 'openai',
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        const timeoutErr = new Error(`OpenAI request timed out after ${timeoutMs}ms`);
        timeoutErr.code = 'TIMEOUT';
        timeoutErr.errorType = 'TIMEOUT';
        throw timeoutErr;
      }
      throw err;
    }
  }

  async embed({ text, model, timeoutMs = 15000 }) {
    this._checkApiKey();
    const targetModel = model || this.defaultEmbeddingModel;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: targetModel,
          input: text,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        const err = new Error(`OpenAI Embeddings HTTP ${response.status}: ${errorBody}`);
        err.statusCode = response.status;
        err.errorType = response.status === 429 ? 'RATE_LIMIT' : 'API_ERROR';
        throw err;
      }

      const json = await response.json();
      return {
        embedding: json.data?.[0]?.embedding || [],
        usage: { totalTokens: json.usage?.total_tokens || 0 },
        model: targetModel,
        provider: 'openai',
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        const timeoutErr = new Error(`OpenAI Embeddings request timed out after ${timeoutMs}ms`);
        timeoutErr.code = 'TIMEOUT';
        timeoutErr.errorType = 'TIMEOUT';
        throw timeoutErr;
      }
      throw err;
    }
  }
}

/**
 * Anthropic Provider Implementation
 */
class AnthropicProvider extends LLMProvider {
  constructor() {
    super('anthropic');
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.baseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1';
    this.defaultModel = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022';
  }

  _checkApiKey() {
    if (!this.apiKey) {
      const err = new Error('ANTHROPIC_API_KEY environment variable is not set');
      err.code = 'API_KEY_MISSING';
      err.errorType = 'AUTH_ERROR';
      throw err;
    }
  }

  async generate({
    systemPrompt,
    prompt,
    temperature = 0.2,
    maxTokens = 2048,
    model,
    timeoutMs = 30000,
  }) {
    this._checkApiKey();
    const targetModel = model || this.defaultModel;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const payload = {
        model: targetModel,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }],
      };
      if (systemPrompt) {
        payload.system = systemPrompt;
      }

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        const err = new Error(`Anthropic HTTP ${response.status}: ${errorBody}`);
        err.statusCode = response.status;
        err.errorType = response.status === 429 ? 'RATE_LIMIT' : response.status === 401 ? 'AUTH_ERROR' : 'API_ERROR';
        throw err;
      }

      const json = await response.json();
      const text = json.content?.[0]?.text || '';
      const usage = {
        promptTokens: json.usage?.input_tokens || 0,
        completionTokens: json.usage?.output_tokens || 0,
        totalTokens: (json.usage?.input_tokens || 0) + (json.usage?.output_tokens || 0),
      };

      return {
        text,
        usage,
        model: json.model || targetModel,
        provider: 'anthropic',
        finishReason: json.stop_reason || 'end_turn',
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        const timeoutErr = new Error(`Anthropic request timed out after ${timeoutMs}ms`);
        timeoutErr.code = 'TIMEOUT';
        timeoutErr.errorType = 'TIMEOUT';
        throw timeoutErr;
      }
      throw err;
    }
  }

  async generateStructured({
    systemPrompt,
    prompt,
    schema,
    temperature = 0.1,
    maxTokens = 2048,
    model,
    timeoutMs = 30000,
  }) {
    this._checkApiKey();
    const targetModel = model || this.defaultModel;

    let sys = (systemPrompt || '') + '\nYou MUST return ONLY a valid JSON object matching the requested schema. Do NOT include markdown ticks or conversational text.';
    if (schema) {
      sys += `\nStrict JSON Schema:\n${JSON.stringify(schema, null, 2)}`;
    }

    const res = await this.generate({
      systemPrompt: sys,
      prompt: `${prompt}\n\nStrict JSON Output:`,
      temperature,
      maxTokens,
      model: targetModel,
      timeoutMs,
    });

    try {
      const data = extractJsonFromText(res.text);
      return {
        data,
        rawText: res.text,
        usage: res.usage,
        model: res.model,
        provider: 'anthropic',
      };
    } catch (parseErr) {
      const err = new Error(`Failed to parse structured JSON from Anthropic response: ${parseErr.message}`);
      err.code = 'MALFORMED_JSON';
      err.errorType = 'PARSING_ERROR';
      err.rawResponse = res.text;
      throw err;
    }
  }

  async embed({ text, model = 'voyage-3-lite', timeoutMs = 15000 }) {
    // If OpenAI key is available, use high-quality embeddings as fallback
    if (process.env.OPENAI_API_KEY) {
      const openAI = new OpenAIProvider();
      return openAI.embed({ text, timeoutMs });
    }

    // High-dimension signed n-gram feature hashing (1024-dim normalized vector) for high orthogonal separation
    const dim = 1024;
    const embedding = new Array(dim).fill(0);
    const stopwords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'of', 'to', 'for', 'it', 'with', 'as', 'by', 'that', 'this', 'are', 'was', 'what', 'how', 'why', 'can', 'you', 'explain', 'tell', 'about', 'from'
    ]);
    const cleanWords = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopwords.has(w));

    // Hash unigrams and bigrams
    for (let i = 0; i < cleanWords.length; i++) {
      const w = cleanWords[i];
      let hash = 2166136261;
      for (let j = 0; j < w.length; j++) {
        hash = (hash ^ w.charCodeAt(j)) * 16777619;
      }
      const idx = Math.abs(hash) % dim;
      const sign = (hash & 1) === 0 ? 1 : -1;
      embedding[idx] += sign * 1.5;

      // Bigram
      if (i + 1 < cleanWords.length) {
        const bigram = `${w}_${cleanWords[i + 1]}`;
        let biHash = 2166136261;
        for (let j = 0; j < bigram.length; j++) {
          biHash = (biHash ^ bigram.charCodeAt(j)) * 16777619;
        }
        const biIdx = Math.abs(biHash) % dim;
        const biSign = (biHash & 1) === 0 ? 1 : -1;
        embedding[biIdx] += biSign * 2.0;
      }
    }

    // L2 Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0)) || 1.0;
    const normalized = embedding.map((v) => Number((v / magnitude).toFixed(6)));

    return {
      embedding: normalized,
      usage: { totalTokens: cleanWords.length },
      model: 'deterministic-feature-hash-1024d',
      provider: 'anthropic',
    };
  }
}

/**
 * Singleton factory for active LLM Provider
 * Selected via LLM_PROVIDER ('openai' | 'anthropic')
 */
let currentProviderInstance = null;

function getLLMProvider(providerOverride) {
  const providerName = (providerOverride || process.env.LLM_PROVIDER || 'anthropic').toLowerCase().trim();

  if (providerName === 'openai') {
    return new OpenAIProvider();
  } else if (providerName === 'anthropic') {
    return new AnthropicProvider();
  }

  throw new Error(`Unsupported LLM_PROVIDER: '${providerName}'. Supported providers: 'openai', 'anthropic'`);
}

module.exports = {
  LLMProvider,
  OpenAIProvider,
  AnthropicProvider,
  getLLMProvider,
  extractJsonFromText,
};
