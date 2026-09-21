import React, { useState, useEffect } from 'react';

export default function StudentSandboxView({ assignmentId, onNavigateBack }) {
  const [selectedLanguage, setSelectedLanguage] = useState('Python');
  const [availableLanguages, setAvailableLanguages] = useState([
    { id: 71, name: 'Python (3.11 / 3.8.1)' },
    { id: 54, name: 'C++ (GCC 13 / 9.2)' },
    { id: 62, name: 'Java (OpenJDK 21 / 13)' },
    { id: 63, name: 'JavaScript (Node.js 20)' },
    { id: 60, name: 'Go (1.21 / 1.13)' },
    { id: 73, name: 'Rust (1.40)' },
  ]);
  const [code, setCode] = useState(`# Problem: Chandy-Misra-Haas Distributed Deadlock Detector
# Implementation: Trace probe 3-tuple (initiator, sender, receiver)

def detect_deadlock(num_processes, wait_for_edges):
    """
    Returns True if a distributed deadlock cycle exists, False otherwise.
    wait_for_edges: list of tuples (p_i, p_j) where p_i is waiting for p_j
    """
    # Build wait-for graph adjacency list
    adj = {i: [] for i in range(1, num_processes + 1)}
    for u, v in wait_for_edges:
        adj[u].append(v)

    # Detect cycle via probe routing
    visited = [0] * (num_processes + 1)
    rec_stack = [0] * (num_processes + 1)

    def dfs(node):
        visited[node] = 1
        rec_stack[node] = 1
        for neighbor in adj.get(node, []):
            if not visited[neighbor]:
                if dfs(neighbor):
                    return True
            elif rec_stack[neighbor]:
                return True
        rec_stack[node] = 0
        return False

    for p in range(1, num_processes + 1):
        if not visited[p]:
            if dfs(p):
                return True
    return False

if __name__ == '__main__':
    # Sample Testcase 1
    # 3 processes: P1 -> P2 -> P3 -> P1 (Cycle)
    edges = [(1, 2), (2, 3), (3, 1)]
    print("Deadlock Detected" if detect_deadlock(3, edges) else "No Deadlock")
`);

  const [customStdin, setCustomStdin] = useState('');
  const [showStdinInput, setShowStdinInput] = useState(false);
  const [activeTab, setActiveTab] = useState('TESTS'); // 'TESTS' | 'CONSOLE' | 'REVIEW'
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [consoleOutput, setConsoleOutput] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [tutorHints] = useState([
    'Hint 1: In the Chandy-Misra-Haas algorithm, a process $P_i$ initiates a probe $(i, i, j)$ for all processes $P_j$ it is waiting for.',
    'Hint 2: When $P_k$ receives probe $(i, j, k)$, it propagates $(i, k, m)$ only if $P_k$ is blocked and waiting on $P_m$.',
    'Hint 3: A deadlock is confirmed when the probe $(i, j, i)$ returns back to initiator $P_i$.',
  ]);

  // Fetch live languages dynamically from Judge0 backend service
  useEffect(() => {
    async function fetchLanguages() {
      try {
        const res = await fetch('/api/sandbox/languages');
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.data) && json.data.length > 0) {
            // Filter common languages for selector
            const popular = json.data.filter((l) =>
              /python|c\+\+|java |javascript|typescript|golang|rust|c \(gcc/i.test(l.name)
            );
            if (popular.length > 0) {
              setAvailableLanguages(popular);
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch live languages, using cached defaults:', err.message);
      }
    }
    fetchLanguages();
  }, []);

  const handleRunCode = async () => {
    setRunning(true);
    setErrorMessage(null);
    setActiveTab('TESTS');

    try {
      const token = localStorage.getItem('skillforge_token');
      const res = await fetch('/api/sandbox/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          code,
          language: selectedLanguage,
          stdin: showStdinInput ? customStdin : '',
          assignmentId: showStdinInput ? null : assignmentId,
        }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setTestResults(json.data);
        const out = json.data.console_output || json.data.stdout || json.data.stderr || json.data.compile_output || 'Program completed with no output.';
        setConsoleOutput(out);
      } else {
        const errMsg = json.message || `Execution failed with status ${res.status}`;
        setErrorMessage(errMsg);
        setConsoleOutput(`[Execution Error]\n${errMsg}`);
        setActiveTab('CONSOLE');
      }
    } catch (err) {
      console.error('Run execution error:', err);
      const errMsg = `Network error connecting to execution backend: ${err.message}`;
      setErrorMessage(errMsg);
      setConsoleOutput(`[Execution Connection Failed]\n${errMsg}`);
      setActiveTab('CONSOLE');
    } finally {
      setRunning(false);
    }
  };

  const handleSubmitCode = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    setActiveTab('TESTS');

    try {
      const token = localStorage.getItem('skillforge_token');
      const res = await fetch('/api/sandbox/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          code,
          language: selectedLanguage,
          assignmentId,
        }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setTestResults(json.data);
        setConsoleOutput(json.data.console_output || 'Submission benchmarking complete.');
      } else {
        const errMsg = json.message || `Submission failed with status ${res.status}`;
        setErrorMessage(errMsg);
        setConsoleOutput(`[Submission Error]\n${errMsg}`);
        setActiveTab('CONSOLE');
      }
    } catch (err) {
      console.error('Submission error:', err);
      const errMsg = `Network error submitting code: ${err.message}`;
      setErrorMessage(errMsg);
      setConsoleOutput(`[Submission Failed]\n${errMsg}`);
      setActiveTab('CONSOLE');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeStyle = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'ACCEPTED' || s === 'PASSED') {
      return { background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)' };
    }
    if (s.includes('TIME LIMIT') || s.includes('PROCESSING') || s.includes('QUEUE')) {
      return { background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' };
    }
    return { background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)', background: '#0f172a', color: '#f8fafc' }}>
      {/* Top Toolbar */}
      <div
        style={{
          height: '52px',
          background: '#1e293b',
          borderBottom: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '14px', cursor: 'pointer' }}
            >
              ← Back
            </button>
          )}
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>
            💻 Assignment 01: Chandy-Misra-Haas Deadlock Detector
          </span>
          <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px' }}>
            Judge0 Real Engine
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Language Selector */}
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            style={{
              padding: '6px 12px',
              background: '#0f172a',
              border: '1px solid #475569',
              borderRadius: '6px',
              color: '#f8fafc',
              fontSize: '12px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {availableLanguages.map((lang) => (
              <option key={lang.id || lang.name} value={lang.name}>
                {lang.name}
              </option>
            ))}
          </select>

          {/* Custom Stdin Toggle */}
          <button
            onClick={() => setShowStdinInput(!showStdinInput)}
            style={{
              padding: '6px 12px',
              background: showStdinInput ? '#38bdf8' : '#0f172a',
              color: showStdinInput ? '#0f172a' : '#94a3b8',
              border: '1px solid #475569',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
            title="Toggle custom stdin input for free execution"
          >
            ⌨️ {showStdinInput ? 'Custom Stdin: ON' : 'Custom Stdin'}
          </button>

          {/* Run Code Button */}
          <button
            id="sandbox-run-btn"
            onClick={handleRunCode}
            disabled={running || submitting}
            style={{
              padding: '7px 16px',
              background: '#334155',
              border: '1px solid #475569',
              borderRadius: '6px',
              color: '#f8fafc',
              fontSize: '12px',
              fontWeight: '600',
              cursor: running || submitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: running || submitting ? 0.7 : 1,
            }}
          >
            <span>▶</span> {running ? 'Executing in Judge0...' : 'Run Code'}
          </button>

          {/* Submit Code Button */}
          <button
            id="sandbox-submit-btn"
            onClick={handleSubmitCode}
            disabled={running || submitting}
            style={{
              padding: '7px 18px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '700',
              cursor: running || submitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)',
              opacity: running || submitting ? 0.7 : 1,
            }}
          >
            <span>🚀</span> {submitting ? 'Benchmarking...' : 'Submit Code'}
          </button>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', minHeight: 0 }}>
        {/* Column 1: Problem Description */}
        <div
          style={{
            background: '#1e293b',
            borderRight: '1px solid #334155',
            padding: '20px',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase' }}>
              Problem Statement
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Max Marks: 100</span>
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', margin: '0 0 12px 0' }}>
            Distributed Deadlock Detection
          </h2>

          <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '16px' }}>
            In distributed operating systems and database transaction managers, processes on different nodes may form circular wait-for relationships. Your task is to implement the core cycle detection mechanism using probe routing.
          </p>

          <div style={{ background: '#0f172a', padding: '14px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#38bdf8', marginBottom: '6px' }}>Input Format:</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
              Line 1: Number of processes $N$<br />
              Subsequent lines: Edge tuples $(u, v)$ indicating process $u$ is waiting for process $v$.
            </div>
          </div>

          <div style={{ background: '#0f172a', padding: '14px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#38bdf8', marginBottom: '6px' }}>Output Format:</div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Print <code>Deadlock Detected</code> if a circular wait exists, otherwise <code>No Deadlock</code>.
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Constraints: $N \le 1000$ • Time Limit: 2.0s • Memory Limit: 128MB • Real Judge0 CE
          </div>
        </div>

        {/* Column 2: Code Editor & Optional Custom Stdin */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#0f172a', borderRight: '1px solid #334155' }}>
          <div style={{ padding: '8px 16px', background: '#1e293b', borderBottom: '1px solid #334155', fontSize: '12px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
            <span>solution.{selectedLanguage.toLowerCase().includes('python') ? 'py' : selectedLanguage.toLowerCase().includes('cpp') || selectedLanguage.toLowerCase().includes('c++') ? 'cpp' : selectedLanguage.toLowerCase().includes('java') ? 'java' : 'js'}</span>
            <span>UTF-8 • Real Judge0 CE Execution</span>
          </div>

          <textarea
            id="sandbox-code-editor"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{
              flex: showStdinInput ? '0.7' : '1',
              background: '#090d16',
              color: '#e2e8f0',
              fontFamily: 'Consolas, "Fira Code", monospace',
              fontSize: '13px',
              lineHeight: '1.6',
              padding: '16px',
              border: 'none',
              resize: 'none',
              outline: 'none',
              whiteSpace: 'pre',
            }}
          />

          {/* Stdin Area when toggled */}
          {showStdinInput && (
            <div style={{ height: '110px', background: '#0f172a', borderTop: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '4px 12px', background: '#1e293b', fontSize: '11px', color: '#38bdf8', fontWeight: '600' }}>
                Standard Input (stdin):
              </div>
              <textarea
                id="sandbox-stdin-input"
                value={customStdin}
                onChange={(e) => setCustomStdin(e.target.value)}
                placeholder="Enter input here (e.g. 3\n1 2\n2 3\n3 1)"
                style={{
                  flex: 1,
                  background: '#090d16',
                  color: '#94a3b8',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  padding: '8px 12px',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                }}
              />
            </div>
          )}
        </div>

        {/* Column 3: Socratic AI Tutor Hints */}
        <div style={{ background: '#1e293b', padding: '20px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '18px' }}>🤖</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>Socratic Tutor Guidance</div>
              <div style={{ fontSize: '11px', color: '#38bdf8' }}>Grounded in OS Concurrency Concepts</div>
            </div>
          </div>

          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '12px', marginBottom: '14px', fontSize: '12px', color: '#cbd5e1' }}>
            🛡️ <strong>Guardrail Active:</strong> Hints guide algorithmic understanding without writing the full solution for you.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tutorHints.map((hint, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '12px',
                  color: '#c7d2fe',
                  lineHeight: '1.5',
                }}
              >
                {hint}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Panel: Testcase Results & Console Output */}
      <div
        style={{
          height: '210px',
          background: '#0f172a',
          borderTop: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Panel Tabs */}
        <div style={{ display: 'flex', gap: '2px', background: '#1e293b', padding: '0 12px', borderBottom: '1px solid #334155' }}>
          <button
            onClick={() => setActiveTab('TESTS')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'TESTS' ? '#0f172a' : 'transparent',
              border: 'none',
              borderTop: activeTab === 'TESTS' ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeTab === 'TESTS' ? '#38bdf8' : '#94a3b8',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            📊 Test Results {testResults && `(${testResults.status || (testResults.passed ? 'PASSED' : 'FAILED')})`}
          </button>
          <button
            onClick={() => setActiveTab('CONSOLE')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'CONSOLE' ? '#0f172a' : 'transparent',
              border: 'none',
              borderTop: activeTab === 'CONSOLE' ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeTab === 'CONSOLE' ? '#38bdf8' : '#94a3b8',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            📟 Console Log
          </button>
          {testResults?.qualitative_review && (
            <button
              onClick={() => setActiveTab('REVIEW')}
              style={{
                padding: '8px 16px',
                background: activeTab === 'REVIEW' ? '#0f172a' : 'transparent',
                border: 'none',
                borderTop: activeTab === 'REVIEW' ? '2px solid #a855f7' : '2px solid transparent',
                color: activeTab === 'REVIEW' ? '#c084fc' : '#94a3b8',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>✨</span> Qualitative AI Review (Score: {testResults.qualitative_review.readability_score || 8.5}/10)
            </button>
          )}
        </div>

        {/* Panel Content */}
        <div style={{ flex: 1, padding: '14px 20px', overflowY: 'auto' }}>
          {errorMessage && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', padding: '8px 12px', borderRadius: '6px', marginBottom: '10px', fontSize: '12px' }}>
              ⚠️ {errorMessage}
            </div>
          )}

          {activeTab === 'TESTS' ? (
            testResults ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: '800',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      ...getStatusBadgeStyle(testResults.status),
                    }}
                  >
                    {testResults.passed ? '✓' : '✗'} {testResults.status || (testResults.passed ? 'ACCEPTED' : 'FAILED')}
                  </span>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {testResults.total_count !== undefined && `Passed: ${testResults.passed_count || 0} / ${testResults.total_count || 0} • `}
                    {testResults.score !== undefined && `Score: ${testResults.score} / ${testResults.max_score || 100} • `}
                    Runtime: {testResults.execution_time || '0.01s'} • Memory: {testResults.memory_used || '12.4 MB'}
                  </span>
                </div>

                {/* Single practice run output or test case grid */}
                {Array.isArray(testResults.cases) && testResults.cases.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                    {testResults.cases.map((tc, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#1e293b',
                          border: tc.passed || tc.status === 'PASSED' || tc.status === 'Accepted' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ color: '#f8fafc', fontWeight: '600' }}>{tc.name || `Case ${tc.id}`}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Time: {tc.time || '0.015s'}</div>
                        </div>
                        <span style={{ color: tc.passed || tc.status === 'PASSED' || tc.status === 'Accepted' ? '#34d399' : '#f87171', fontWeight: '700' }}>
                          {tc.status || (tc.passed ? 'PASSED' : 'FAILED')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ background: '#090d16', padding: '10px 14px', borderRadius: '6px', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '11px', color: '#38bdf8', marginBottom: '4px', fontWeight: '600' }}>Standard Output:</div>
                    <pre style={{ margin: 0, fontSize: '12px', color: '#f8fafc', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                      {testResults.stdout || '(Empty standard output)'}
                    </pre>
                    {testResults.stderr && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#f87171', marginBottom: '2px', fontWeight: '600' }}>Standard Error / Traceback:</div>
                        <pre style={{ margin: 0, fontSize: '12px', color: '#f87171', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                          {testResults.stderr}
                        </pre>
                      </div>
                    )}
                    {testResults.compile_output && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#f87171', marginBottom: '2px', fontWeight: '600' }}>Compilation Output:</div>
                        <pre style={{ margin: 0, fontSize: '12px', color: '#f87171', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                          {testResults.compile_output}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', paddingTop: '20px' }}>
                Click "Run Code" or "Submit Code" above to execute solution in live Judge0 CE sandbox.
              </div>
            )
          ) : activeTab === 'CONSOLE' ? (
            <pre style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {consoleOutput || 'Console output will appear here after code execution.'}
            </pre>
          ) : (
            testResults?.qualitative_review && (
              <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '6px', border: '1px solid #334155' }}>
                    <div style={{ fontWeight: '700', color: '#38bdf8', marginBottom: '4px' }}>⏱️ Complexity Assessment:</div>
                    <div><strong>Time:</strong> {testResults.qualitative_review.time_complexity_assessment}</div>
                    <div><strong>Space:</strong> {testResults.qualitative_review.space_complexity_assessment}</div>
                  </div>
                  <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '6px', border: '1px solid #334155' }}>
                    <div style={{ fontWeight: '700', color: '#c084fc', marginBottom: '4px' }}>🏷️ Naming & Modularity:</div>
                    <div style={{ marginBottom: '2px' }}>{testResults.qualitative_review.naming_conventions_review}</div>
                    <div style={{ color: '#94a3b8' }}>{testResults.qualitative_review.code_structure_and_modularity}</div>
                  </div>
                </div>

                {Array.isArray(testResults.qualitative_review.constructive_suggestions) && (
                  <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '6px', padding: '10px 14px' }}>
                    <div style={{ fontWeight: '700', color: '#a5b4fc', marginBottom: '4px' }}>💡 Constructive Suggestions:</div>
                    <ul style={{ margin: 0, paddingLeft: '18px' }}>
                      {testResults.qualitative_review.constructive_suggestions.map((sug, sIdx) => (
                        <li key={sIdx} style={{ marginBottom: '2px' }}>{sug}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
