const fs = require('fs');
const path = require('path');

const PROMPTS_CACHE = new Map();

/**
 * Locate and read a versioned prompt file.
 * Checks root prompts/ and src/prompts/ directories.
 */
function getPromptFilePath(promptName) {
  const normalizedName = promptName.endsWith('.prompt') ? promptName : `${promptName}.prompt`;
  
  const possiblePaths = [
    path.join(__dirname, '../../prompts', normalizedName),
    path.join(__dirname, '../prompts', normalizedName),
    path.join(process.cwd(), 'prompts', normalizedName),
    path.join(process.cwd(), 'backend-core/prompts', normalizedName),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  throw new Error(`Prompt file not found for '${promptName}'. Searched paths: ${possiblePaths.join(', ')}`);
}

/**
 * Load a versioned prompt file and parse header metadata.
 * Format:
 * ---
 * VERSION: v1.0.0
 * MODULE: moduleName
 * DESCRIPTION: ...
 * ---
 * <Prompt Content>
 */
function loadPrompt(promptName, useCache = true) {
  if (useCache && PROMPTS_CACHE.has(promptName)) {
    return PROMPTS_CACHE.get(promptName);
  }

  const filePath = getPromptFilePath(promptName);
  const rawContent = fs.readFileSync(filePath, 'utf8');

  let version = 'v1.0.0';
  let moduleName = promptName.replace(/\.prompt$/, '');
  let description = '';
  let systemPrompt = rawContent;

  const headerMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (headerMatch) {
    const headerBlock = headerMatch[1];
    systemPrompt = headerMatch[2].trim();

    const versionMatch = headerBlock.match(/VERSION:\s*([^\r\n]+)/i);
    if (versionMatch) {
      version = versionMatch[1].trim();
    }

    const moduleMatch = headerBlock.match(/MODULE:\s*([^\r\n]+)/i);
    if (moduleMatch) {
      moduleName = moduleMatch[1].trim();
    }

    const descMatch = headerBlock.match(/DESCRIPTION:\s*([^\r\n]+)/i);
    if (descMatch) {
      description = descMatch[1].trim();
    }
  }

  const result = {
    promptName,
    version,
    module: moduleName,
    description,
    systemPrompt,
    raw: rawContent,
    filePath,
  };

  PROMPTS_CACHE.set(promptName, result);
  return result;
}

/**
 * Clear the in-memory prompt cache (useful during development / testing)
 */
function clearPromptCache() {
  PROMPTS_CACHE.clear();
}

module.exports = {
  loadPrompt,
  clearPromptCache,
};
