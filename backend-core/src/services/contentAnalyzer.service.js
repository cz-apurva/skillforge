const { geminiService, GeminiService } = require('./ai/gemini/gemini.service');
const { CONTENT_ANALYZER_PROMPT } = require('./ai/gemini/promptRegistry');
const TextExtractorService = require('./textExtractor.service');
const { executeAICall } = require('../ai');
const LearningMaterial = require('../models/LearningMaterial');
const { memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class ContentAnalyzerService {
  /**
   * Validate extracted LLM JSON output strictly against required schema
   */
  static _validateSchema(data) {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Output is not an object' };
    }

    const errors = [];
    if (!data.title || typeof data.title !== 'string') errors.push('Missing or invalid title');
    if (!data.main_topic || typeof data.main_topic !== 'string') errors.push('Missing or invalid main_topic');
    if (!Array.isArray(data.subtopics) || data.subtopics.length === 0) errors.push('subtopics must be a non-empty array');
    if (!Array.isArray(data.concepts) || data.concepts.length === 0) errors.push('concepts must be a non-empty array');
    if (!Array.isArray(data.learning_objectives) || data.learning_objectives.length === 0) errors.push('learning_objectives must be a non-empty array');
    if (!Array.isArray(data.prerequisites)) errors.push('prerequisites must be an array');
    if (!['Beginner', 'Intermediate', 'Advanced'].includes(data.difficulty)) {
      data.difficulty = 'Intermediate'; // Normalize fallback
    }
    if (!Array.isArray(data.key_terms)) errors.push('key_terms must be an array');
    if (!Array.isArray(data.possible_misconceptions)) errors.push('possible_misconceptions must be an array');
    if (!Array.isArray(data.suggested_assessment_topics)) errors.push('suggested_assessment_topics must be an array');

    let structuredConcepts = [];
    if (Array.isArray(data.structured_concepts) && data.structured_concepts.length > 0) {
      structuredConcepts = data.structured_concepts.map((sc) => ({
        name: String(sc.name || 'Concept').trim(),
        description: String(sc.description || `Core principles of ${sc.name || 'this concept'}`).trim(),
        prerequisites: Array.isArray(sc.prerequisites) ? sc.prerequisites.map(String) : [],
        common_misconceptions: Array.isArray(sc.common_misconceptions) ? sc.common_misconceptions.map(String) : [],
      }));
    } else if (Array.isArray(data.concepts)) {
      structuredConcepts = data.concepts.map((c) => ({
        name: String(c).trim(),
        description: `Fundamental theoretical mechanics and application of ${String(c).trim()}`,
        prerequisites: Array.isArray(data.prerequisites) ? data.prerequisites.map(String) : [],
        common_misconceptions: Array.isArray(data.possible_misconceptions) ? data.possible_misconceptions.slice(0, 2).map(String) : [],
      }));
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: {
        title: String(data.title || 'Course Material').trim(),
        main_topic: String(data.main_topic || 'Computer Science').trim(),
        subtopics: (data.subtopics || []).map((s) => String(s).trim()),
        concepts: (data.concepts || []).map((c) => String(c).trim()),
        structured_concepts: structuredConcepts,
        learning_objectives: (data.learning_objectives || []).map((o) => String(o).trim()),
        prerequisites: (data.prerequisites || []).map((p) => String(p).trim()),
        difficulty: data.difficulty || 'Intermediate',
        key_terms: (data.key_terms || []).map((k) => String(k).trim()),
        possible_misconceptions: (data.possible_misconceptions || []).map((m) => String(m).trim()),
        suggested_assessment_topics: (data.suggested_assessment_topics || []).map((t) => String(t).trim()),
      },
    };
  }

  /**
   * Run end-to-end extraction and AI Content Analysis via Gemini.
   * Employs single-retry resilience on schema validation / JSON parsing errors.
   */
  static async analyzeDocument({ buffer, base64, fileName, fileType, rawContent, titleHint }) {
    // 1. Real Text Extraction (Fails with explicit error if empty or unreadable)
    const extraction = await TextExtractorService.extractText({
      buffer,
      base64,
      fileName,
      fileType,
      rawContent,
    });

    const extractedText = extraction.text;
    const previewText = extractedText.slice(0, 8000); // Send first 8k chars to prompt context

    const userPrompt = `Please analyze the following academic course material and extract a comprehensive curriculum taxonomy.

Document Title / File: ${titleHint || fileName || 'Uploaded Material'}
Format: ${extraction.source_type}

Content:
${GeminiService.wrapUntrustedContent(previewText)}

Return strictly valid JSON conforming to the requested schema. Ensure all fields are thoroughly populated.`;

    let lastError = null;
    let validatedAnalysis = null;
    let promptVersion = CONTENT_ANALYZER_PROMPT.version;
    let aiMode = 'live';

    // 2. If GEMINI_API_KEY is present and AI_MODE is live, call GeminiService directly
    if (process.env.GEMINI_API_KEY && (process.env.AI_MODE || 'live') !== 'mock') {
      try {
        const geminiRes = await geminiService.generateStructured({
          prompt: userPrompt,
          systemInstruction: CONTENT_ANALYZER_PROMPT.systemInstruction,
          zodSchema: CONTENT_ANALYZER_PROMPT.schema,
          service: 'contentAnalyzer',
          promptVersion: CONTENT_ANALYZER_PROMPT.version,
          temperature: 0.1,
          maxTokens: 3000,
        });

        if (geminiRes.success && geminiRes.data) {
          const validation = this._validateSchema(geminiRes.data);
          if (validation.valid) {
            validatedAnalysis = validation.sanitized;
            promptVersion = geminiRes.prompt_version || CONTENT_ANALYZER_PROMPT.version;
          }
        } else if (geminiRes.requires_human_review) {
          lastError = new Error(geminiRes.message || 'Gemini structured output failed');
        }
      } catch (geminiErr) {
        lastError = geminiErr;
        console.warn(`[ContentAnalyzer] Gemini call error: ${geminiErr.message}. Checking fallback pipeline.`);
      }
    }

    // 3. Fallback to executeAICall wrapper (for OpenAI/Anthropic/mock compatibility)
    if (!validatedAnalysis) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const aiResponse = await executeAICall({
            service: 'contentAnalyzer',
            promptName: 'contentAnalyzer',
            userPrompt,
            schema: CONTENT_ANALYZER_PROMPT.schema,
            temperature: 0.1,
            maxTokens: 2500,
            structured: true,
            throwOnError: true,
          });

          promptVersion = aiResponse.prompt_version || promptVersion;
          aiMode = aiResponse.ai_mode || 'live';

          // In mock mode, map fixture to schema
          if (aiResponse.is_mock) {
            const mock = aiResponse.data;
            validatedAnalysis = {
              title: titleHint || mock.title || 'Relational Normalization & Multivalued Dependencies',
              main_topic: mock.topic || 'Database Systems & Normal Forms',
              subtopics: mock.subtopics || ['1NF / 2NF / 3NF Foundations', 'Boyce-Codd Normal Form (BCNF)', 'Lossless-Join Decomposition'],
              concepts: mock.reference_concepts || ['Armstrong Axioms', 'Transitive Dependency', 'Superkeys', 'Decomposition'],
              learning_objectives: mock.learning_outcomes || [
                'Differentiate between 3NF and BCNF violations with formal proofs',
                'Compute minimal canonical cover of functional dependencies',
                'Execute synthesis algorithms for relational schemas',
              ],
              prerequisites: mock.prerequisites || ['Relational Algebra', 'Functional Dependencies'],
              difficulty: mock.difficulty || 'Intermediate',
              key_terms: ['Determinant', 'Canonical Cover', 'Prime Attribute', 'Lossless Join'],
              possible_misconceptions: [
                'Assuming all 3NF schemas are automatically in BCNF',
                'Confusing dependency preservation with lossless join property',
              ],
              suggested_assessment_topics: [
                'Midterm Exam: Canonical Cover Calculation & BCNF Proof',
                'Interactive Lab: Chase Matrix Lossless Join Test',
              ],
            };
            break;
          }

          // Validate schema
          const validation = this._validateSchema(aiResponse.data);
          if (validation.valid) {
            validatedAnalysis = validation.sanitized;
            break;
          } else {
            lastError = new Error(`Schema validation failed on attempt ${attempt}: ${validation.errors.join(', ')}`);
          }
        } catch (err) {
          lastError = err;
        }
      }
    }

    // 4. Failure handling if both attempts failed
    if (!validatedAnalysis) {
      if (lastError && lastError.isAiUnavailable) {
        throw lastError;
      }
      const failureErr = new Error(`Content Analyzer failed after retry: ${lastError?.message || 'Invalid structured output'}`);
      failureErr.statusCode = 502;
      failureErr.code = 'ANALYSIS_FAILED';
      throw failureErr;
    }

    // 5. Return enriched analysis ready for preview and RAG feed-forward
    return {
      ...validatedAnalysis,
      // Backward compatibility aliases for existing UI elements
      topic: validatedAnalysis.main_topic,
      reference_concepts: validatedAnalysis.concepts,
      learning_outcomes: validatedAnalysis.learning_objectives,
      extracted_summary: `AI Content Analyzer extracted ${validatedAnalysis.subtopics.length} subtopics, ${validatedAnalysis.learning_objectives.length} learning objectives, and ${validatedAnalysis.possible_misconceptions.length} potential misconceptions.`,
      metadata: {
        file_name: fileName || 'uploaded_document.pdf',
        file_type: extraction.source_type,
        extracted_character_count: extraction.extracted_character_count,
        extracted_word_count: extraction.extracted_word_count,
        extracted_text_preview: extractedText.slice(0, 500) + (extractedText.length > 500 ? '...' : ''),
        prompt_version: promptVersion,
        ai_mode: aiMode,
        analyzed_at: new Date().toISOString(),
      },
      raw_extracted_text: extractedText,
    };
  }
}

module.exports = ContentAnalyzerService;

