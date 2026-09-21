/**
 * Judge0 Code Execution Service
 * 
 * Dedicated service executing untrusted code strictly through Judge0 CE / Extra-CE.
 * Implements standard submit -> token -> poll asynchronous lifecycle.
 * Never executes code locally via child_process or eval.
 */

const STATUS_CODES = {
  IN_QUEUE: 1,
  PROCESSING: 2,
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT_EXCEEDED: 5,
  COMPILATION_ERROR: 6,
  RUNTIME_ERROR_SIGSEGV: 7,
  RUNTIME_ERROR_SIGXFSZ: 8,
  RUNTIME_ERROR_SIGFPE: 9,
  RUNTIME_ERROR_SIGABRT: 10,
  RUNTIME_ERROR_NZEC: 11,
  RUNTIME_ERROR_OTHER: 12,
  INTERNAL_ERROR: 13,
  EXEC_FORMAT_ERROR: 14,
};

const STATUS_DESCRIPTIONS = {
  1: 'In Queue',
  2: 'Processing',
  3: 'Accepted',
  4: 'Wrong Answer',
  5: 'Time Limit Exceeded',
  6: 'Compilation Error',
  7: 'Runtime Error (SIGSEGV - Segmentation Fault)',
  8: 'Runtime Error (SIGXFSZ - File Size Limit Exceeded)',
  9: 'Runtime Error (SIGFPE - Floating Point Exception)',
  10: 'Runtime Error (SIGABRT - Aborted)',
  11: 'Runtime Error (NZEC - Non-Zero Exit Code)',
  12: 'Runtime Error (Other)',
  13: 'Internal Error',
  14: 'Exec Format Error',
};

// Standard Fallback Language Mappings (Judge0 CE standard IDs)
const FALLBACK_LANGUAGES = [
  { id: 71, name: 'Python (3.8.1 / 3.11)', key: 'python', ext: '.py' },
  { id: 54, name: 'C++ (GCC 9.2.0 / GCC 13)', key: 'c++', ext: '.cpp' },
  { id: 62, name: 'Java (OpenJDK 13 / 21)', key: 'java', ext: '.java' },
  { id: 63, name: 'JavaScript (Node.js 12.14.0 / 20)', key: 'javascript', ext: '.js' },
  { id: 60, name: 'Go (1.13.5 / 1.21)', key: 'go', ext: '.go' },
  { id: 50, name: 'C (GCC 9.2.0)', key: 'c', ext: '.c' },
  { id: 73, name: 'Rust (1.40.0)', key: 'rust', ext: '.rs' },
  { id: 74, name: 'TypeScript (3.7.4)', key: 'typescript', ext: '.ts' },
];

class Judge0Service {
  static _languagesCache = null;
  static _languagesCacheExpiry = 0;

  /**
   * Get configured Judge0 Base URL from server environment
   */
  static getApiUrl() {
    const raw = process.env.JUDGE0_API_URL || process.env.JUDGE0_URL || 'https://ce.judge0.com';
    return raw.replace(/\/+$/, '');
  }

  /**
   * Get HTTP Headers for Judge0 API requests.
   * If JUDGE0_API_KEY is present and non-empty, attaches auth headers.
   * If empty, sends NO auth headers at all.
   */
  static getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const apiKey = (process.env.JUDGE0_API_KEY || '').trim();
    if (apiKey.length > 0) {
      headers['X-Auth-Token'] = apiKey;
      headers['X-RapidAPI-Key'] = apiKey;
    }

    return headers;
  }

  /**
   * Fetch all supported languages dynamically from Judge0 GET /languages
   */
  static async getAvailableLanguages() {
    const now = Date.now();
    if (this._languagesCache && this._languagesCacheExpiry > now) {
      return this._languagesCache;
    }

    const apiUrl = this.getApiUrl();
    try {
      const response = await fetch(`${apiUrl}/languages`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.ok) {
        const languages = await response.json();
        if (Array.isArray(languages) && languages.length > 0) {
          this._languagesCache = languages;
          this._languagesCacheExpiry = now + 60 * 60 * 1000; // Cache for 1 hour
          return languages;
        }
      }
    } catch (err) {
      console.warn(`[Judge0Service] Could not fetch live languages from ${apiUrl}:`, err.message);
    }

    return FALLBACK_LANGUAGES;
  }

  /**
   * Resolve language metadata (ID and display name) from string or number
   */
  static async resolveLanguage(langInput = 'Python') {
    if (typeof langInput === 'number' && langInput > 0) {
      return { id: langInput, name: `Language ID ${langInput}` };
    }

    const clean = String(langInput || 'Python').toLowerCase().trim();

    // Specific aliases
    if (clean === 'py' || clean.includes('python')) return { id: 71, name: 'Python (3.11 / 3.8)' };
    if (clean === 'cpp' || clean.includes('c++')) return { id: 54, name: 'C++ (GCC 13 / 9.2)' };
    if (clean.includes('java') && !clean.includes('script')) return { id: 62, name: 'Java (OpenJDK 21 / 13)' };
    if (clean.includes('javascript') || clean.includes('node') || clean === 'js') return { id: 63, name: 'JavaScript (Node.js)' };
    if (clean.includes('go') || clean === 'golang') return { id: 60, name: 'Go' };
    if (clean === 'c' || clean.startsWith('c (')) return { id: 50, name: 'C (GCC)' };
    if (clean.includes('rust')) return { id: 73, name: 'Rust' };
    if (clean.includes('typescript') || clean === 'ts') return { id: 74, name: 'TypeScript' };

    // Dynamic search from available languages
    try {
      const languages = await this.getAvailableLanguages();
      const match = languages.find(
        (l) => l.name && l.name.toLowerCase().includes(clean)
      );
      if (match) {
        return { id: match.id, name: match.name };
      }
    } catch {}

    // Default fallback
    return { id: 71, name: 'Python 3' };
  }

  /**
   * Submit code to Judge0 and poll until completion
   */
  static async executeSubmission({
    sourceCode,
    language = 'Python',
    stdin = '',
    expectedOutput = null,
    cpuTimeLimit = 2.0,
    memoryLimit = 128000,
    maxWaitMs = 15000,
  }) {
    if (!sourceCode || typeof sourceCode !== 'string') {
      const err = new Error('Source code is required for Judge0 execution');
      err.statusCode = 400;
      throw err;
    }

    // Security & Size limits (Max 64KB for source code and stdin)
    if (sourceCode.length > 65536) {
      const err = new Error('Source code exceeds 64KB size limit');
      err.statusCode = 413;
      throw err;
    }
    if (stdin && stdin.length > 65536) {
      const err = new Error('Stdin exceeds 64KB size limit');
      err.statusCode = 413;
      throw err;
    }

    const apiUrl = this.getApiUrl();
    const langInfo = await this.resolveLanguage(language);
    const headers = this.getHeaders();

    const payload = {
      source_code: sourceCode,
      language_id: langInfo.id,
      stdin: stdin || '',
      expected_output: expectedOutput !== null && expectedOutput !== undefined ? String(expectedOutput) : undefined,
      cpu_time_limit: Math.min(Math.max(Number(cpuTimeLimit) || 2.0, 0.5), 10.0),
      memory_limit: Math.min(Math.max(Number(memoryLimit) || 128000, 16000), 512000),
    };

    let submitResponse;
    try {
      submitResponse = await fetch(`${apiUrl}/submissions?base64_encoded=false`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    } catch (netErr) {
      console.error(`[Judge0Service] Connection failed to ${apiUrl}:`, netErr.message);
      return {
        status_id: STATUS_CODES.INTERNAL_ERROR,
        status: 'Judge0 Unavailable',
        status_description: `Judge0 execution engine is currently unreachable (${netErr.message}).`,
        passed: false,
        stdout: '',
        stderr: `Failed to connect to execution sandbox at ${apiUrl}.`,
        compile_output: '',
        time: '0.000s',
        time_numeric: 0,
        memory: '0.0 MB',
        memory_kb: 0,
        exit_code: 1,
        engine: 'Judge0 Sandbox Engine',
        error: 'SERVICE_UNREACHABLE',
      };
    }

    if (!submitResponse.ok) {
      const errText = await submitResponse.text();
      console.error(`[Judge0Service] Submission rejected (${submitResponse.status}):`, errText);
      return {
        status_id: STATUS_CODES.INTERNAL_ERROR,
        status: 'Submission Rejected',
        status_description: `Judge0 API error ${submitResponse.status}: ${errText}`,
        passed: false,
        stdout: '',
        stderr: `Judge0 API error (${submitResponse.status}): ${errText}`,
        compile_output: '',
        time: '0.000s',
        time_numeric: 0,
        memory: '0.0 MB',
        memory_kb: 0,
        exit_code: 1,
        engine: 'Judge0 Sandbox Engine',
        error: 'API_ERROR',
      };
    }

    const submitJson = await submitResponse.json();
    const token = submitJson.token;

    if (!token) {
      return {
        status_id: STATUS_CODES.INTERNAL_ERROR,
        status: 'Internal Error',
        status_description: 'Judge0 did not return a submission token',
        passed: false,
        stdout: '',
        stderr: 'No submission token returned from execution sandbox',
        compile_output: '',
        time: '0.000s',
        time_numeric: 0,
        memory: '0.0 MB',
        memory_kb: 0,
        exit_code: 1,
        engine: 'Judge0 Sandbox Engine',
      };
    }

    // Poll for completion (submit -> token -> poll)
    const startTime = Date.now();
    let pollInterval = 400; // Start fast at 400ms

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise((r) => setTimeout(r, pollInterval));
      pollInterval = Math.min(pollInterval + 200, 1000); // Backoff up to 1000ms

      try {
        const pollResponse = await fetch(`${apiUrl}/submissions/${token}?base64_encoded=false`, {
          method: 'GET',
          headers,
        });

        if (!pollResponse.ok) {
          continue;
        }

        const result = await pollResponse.json();
        const statusId = result.status?.id || 1;

        // Terminal status reached (id >= 3: Accepted, Wrong Answer, TLE, Compilation Error, Runtime Error, etc.)
        if (statusId >= 3) {
          return this._formatSubmissionResult(result, expectedOutput, token);
        }
      } catch (pollErr) {
        console.warn(`[Judge0Service] Error polling token ${token}:`, pollErr.message);
      }
    }

    // If polling timed out
    return {
      status_id: STATUS_CODES.TIME_LIMIT_EXCEEDED,
      status: 'Time Limit Exceeded',
      status_description: 'Execution polling timed out waiting for Judge0',
      passed: false,
      stdout: '',
      stderr: 'Execution timed out waiting for response from sandbox queue.',
      compile_output: '',
      time: `${(maxWaitMs / 1000).toFixed(3)}s`,
      time_numeric: maxWaitMs / 1000,
      memory: '0.0 MB',
      memory_kb: 0,
      exit_code: 1,
      token,
      engine: 'Judge0 Sandbox Engine',
    };
  }

  /**
   * Format Judge0 response into clean, standardized structure
   */
  static _formatSubmissionResult(raw, expectedOutput, token) {
    const statusObj = raw.status || {};
    const statusId = statusObj.id || STATUS_CODES.ACCEPTED;
    const rawDescription = statusObj.description || STATUS_DESCRIPTIONS[statusId] || 'Unknown';
    const friendlyDescription = STATUS_DESCRIPTIONS[statusId] || rawDescription;

    const stdout = (raw.stdout || '').trimEnd();
    const stderr = (raw.stderr || '').trimEnd();
    const compileOutput = (raw.compile_output || '').trimEnd();
    const timeSec = Number(raw.time) || 0.0;
    const memoryKb = Number(raw.memory) || 0;

    let isPassed = statusId === STATUS_CODES.ACCEPTED;
    let finalStatus = friendlyDescription;

    // Test-case comparison against expectedOutput
    if (expectedOutput !== null && expectedOutput !== undefined) {
      const normExpected = String(expectedOutput).trim();
      const normActual = stdout.trim();

      if (statusId === STATUS_CODES.ACCEPTED) {
        if (normActual === normExpected) {
          isPassed = true;
          finalStatus = 'Accepted';
        } else {
          isPassed = false;
          finalStatus = 'Wrong Answer';
        }
      } else {
        isPassed = false;
      }
    } else {
      isPassed = statusId === STATUS_CODES.ACCEPTED;
    }

    return {
      status_id: statusId,
      status: finalStatus,
      status_description: friendlyDescription,
      passed: isPassed,
      stdout,
      stderr,
      compile_output: compileOutput,
      time: `${timeSec.toFixed(3)}s`,
      time_numeric: timeSec,
      memory: `${(memoryKb / 1024).toFixed(1)} MB`,
      memory_kb: memoryKb,
      exit_code: raw.exit_code !== undefined && raw.exit_code !== null ? raw.exit_code : (isPassed ? 0 : 1),
      token: token || raw.token || null,
      engine: 'Judge0 Sandbox Engine',
    };
  }

  /**
   * Execute a batch of test cases against source code sequentially
   */
  static async executeBatch({
    sourceCode,
    language = 'Python',
    testCases = [],
    cpuTimeLimit = 2.0,
    memoryLimit = 128000,
  }) {
    if (!Array.isArray(testCases) || testCases.length === 0) {
      return {
        cases: [],
        passed_count: 0,
        failed_count: 0,
        total_count: 0,
        overall_status: 'NO_TESTS',
        execution_time: '0.000s',
        execution_time_ms: 0,
        memory_used: '0.0 MB',
        memory_kb: 0,
      };
    }

    const results = [];
    let totalTimeSec = 0;
    let maxMemoryKb = 0;
    let passedCount = 0;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const exec = await this.executeSubmission({
        sourceCode,
        language,
        stdin: tc.input || tc.stdin || '',
        expectedOutput: tc.expected_output !== undefined ? tc.expected_output : tc.output,
        cpuTimeLimit,
        memoryLimit,
      });

      totalTimeSec += exec.time_numeric || 0;
      maxMemoryKb = Math.max(maxMemoryKb, exec.memory_kb || 0);

      const isPassed = exec.passed;
      if (isPassed) passedCount++;

      results.push({
        id: tc.id || i + 1,
        name: tc.name || `Test Case ${i + 1}`,
        input: tc.input || tc.stdin || '',
        expected: tc.expected_output !== undefined ? tc.expected_output : tc.output,
        actual: exec.stdout,
        passed: isPassed,
        status: exec.status,
        status_id: exec.status_id,
        status_description: exec.status_description,
        time: exec.time,
        memory: exec.memory,
        stderr: exec.stderr,
        compile_output: exec.compile_output,
        token: exec.token,
        is_hidden: Boolean(tc.is_hidden),
        weight: tc.weight || Math.round(100 / testCases.length),
      });
    }

    const failedCount = testCases.length - passedCount;
    let overallStatus = 'ACCEPTED';
    if (results.some((r) => r.status_id === STATUS_CODES.COMPILATION_ERROR)) {
      overallStatus = 'COMPILATION_ERROR';
    } else if (results.some((r) => r.status_id === STATUS_CODES.TIME_LIMIT_EXCEEDED)) {
      overallStatus = 'TIME_LIMIT_EXCEEDED';
    } else if (results.some((r) => r.status_id >= STATUS_CODES.RUNTIME_ERROR_SIGSEGV && r.status_id <= STATUS_CODES.RUNTIME_ERROR_OTHER)) {
      overallStatus = 'RUNTIME_ERROR';
    } else if (failedCount > 0) {
      overallStatus = 'WRONG_ANSWER';
    }

    return {
      cases: results,
      passed_count: passedCount,
      failed_count: failedCount,
      total_count: testCases.length,
      overall_status: overallStatus,
      execution_time: `${totalTimeSec.toFixed(3)}s`,
      execution_time_ms: Math.round(totalTimeSec * 1000),
      memory_used: `${(maxMemoryKb / 1024).toFixed(1)} MB`,
      memory_kb: maxMemoryKb,
    };
  }

  /**
   * Validate a generated reference solution against candidate test cases via Judge0
   */
  static async validateReferenceSolution({
    referenceSolution,
    language = 'Python',
    candidateTestCases = [],
  }) {
    if (!referenceSolution || !referenceSolution.trim()) {
      return {
        validated: false,
        reason: 'Reference solution is empty or missing',
        validated_test_cases: candidateTestCases,
      };
    }

    const batch = await this.executeBatch({
      sourceCode: referenceSolution,
      language,
      testCases: candidateTestCases,
    });

    const validatedCases = [];
    let validCount = 0;

    for (let i = 0; i < batch.cases.length; i++) {
      const caseResult = batch.cases[i];
      const originalCandidate = candidateTestCases[i] || {};

      // If reference solution executed successfully (status Accepted / no crash)
      const ranSuccessfully = caseResult.status_id === STATUS_CODES.ACCEPTED || (caseResult.actual && !caseResult.stderr && caseResult.exit_code === 0);

      if (ranSuccessfully) {
        validCount++;
        validatedCases.push({
          ...originalCandidate,
          id: originalCandidate.id || i + 1,
          expected_output: caseResult.actual.trim(),
          verified_by_reference: true,
          reference_runtime: caseResult.time,
          reference_status: 'PASSED',
        });
      } else {
        validatedCases.push({
          ...originalCandidate,
          id: originalCandidate.id || i + 1,
          verified_by_reference: false,
          reference_runtime: caseResult.time,
          reference_status: caseResult.status,
          reference_error: caseResult.stderr || caseResult.compile_output || caseResult.status,
        });
      }
    }

    return {
      validated: validCount === candidateTestCases.length,
      valid_count: validCount,
      total_count: candidateTestCases.length,
      overall_status: batch.overall_status,
      execution_time: batch.execution_time,
      validated_test_cases: validatedCases,
    };
  }

  /**
   * Check Health of Judge0 Execution Service without leaking credentials
   */
  static async checkHealth() {
    const start = Date.now();
    const apiUrl = this.getApiUrl();
    const apiKey = (process.env.JUDGE0_API_KEY || '').trim();

    try {
      const res = await fetch(`${apiUrl}/about`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const latencyMs = Date.now() - start;

      if (res.ok) {
        let aboutData = {};
        try {
          aboutData = await res.json();
        } catch {}

        return {
          service: 'judge0',
          configured: true,
          reachable: true,
          status: 'Connected',
          endpoint: apiUrl,
          has_auth_key: apiKey.length > 0,
          latency_ms: latencyMs,
          version: aboutData.version || 'Judge0 CE',
          details: 'Judge0 isolated code execution sandbox is online and responding',
        };
      }

      // If /about returned non-200, try /languages as secondary probe
      const langRes = await fetch(`${apiUrl}/languages`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (langRes.ok) {
        return {
          service: 'judge0',
          configured: true,
          reachable: true,
          status: 'Connected',
          endpoint: apiUrl,
          has_auth_key: apiKey.length > 0,
          latency_ms: Date.now() - start,
          details: 'Judge0 isolated code execution sandbox is online and reachable',
        };
      }

      return {
        service: 'judge0',
        configured: true,
        reachable: false,
        status: 'Degraded',
        endpoint: apiUrl,
        has_auth_key: apiKey.length > 0,
        latency_ms: Date.now() - start,
        details: `Judge0 returned HTTP status ${res.status}`,
      };
    } catch (err) {
      return {
        service: 'judge0',
        configured: Boolean(process.env.JUDGE0_API_URL || process.env.JUDGE0_URL),
        reachable: false,
        status: 'Unavailable',
        endpoint: apiUrl,
        has_auth_key: apiKey.length > 0,
        latency_ms: Date.now() - start,
        details: `Judge0 unreachable: ${err.message}`,
      };
    }
  }
}

module.exports = Judge0Service;
