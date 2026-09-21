const {
  LLMProvider,
  OpenAIProvider,
  AnthropicProvider,
  getLLMProvider,
  extractJsonFromText,
} = require('./llmProvider');

const { loadPrompt, clearPromptCache } = require('./promptLoader');
const { MOCK_FIXTURES, getMockFixture } = require('./mockFixtures');
const { executeAICall, AIServiceUnavailableError } = require('./aiWrapper');

module.exports = {
  // Provider Interfaces & Classes
  LLMProvider,
  OpenAIProvider,
  AnthropicProvider,
  getLLMProvider,
  extractJsonFromText,

  // Prompt Management
  loadPrompt,
  clearPromptCache,

  // Mock Fixtures
  MOCK_FIXTURES,
  getMockFixture,

  // AI Execution Wrapper & Error Handling
  executeAICall,
  AIServiceUnavailableError,
};
