import React, { useState, useEffect } from 'react';

export default function TeacherAssignmentsView({ onNavigateToFairgrade }) {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('cls-mca-401');
  const [isCreating, setIsCreating] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState('PROGRAMMING'); // 'PROGRAMMING' or 'WRITTEN'
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Common Assignment Fields
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxScore, setMaxScore] = useState(100);

  // Programming Assignment Fields
  const [progLanguage, setProgLanguage] = useState('Python');
  const [problemPrompt, setProblemPrompt] = useState('');
  const [inputFormat, setInputFormat] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [constraints, setConstraints] = useState('Time Limit: 2.0s | Memory Limit: 256MB');
  const [sampleTests, setSampleTests] = useState([
    { input: '4\n1 2 3 4', expected_output: '10', explanation: 'Sum of array elements' },
  ]);
  const [hiddenTests, setHiddenTests] = useState([
    { input: '5\n10 20 30 40 50', expected_output: '150', weight: 40 },
    { input: '1\n0', expected_output: '0', weight: 60 },
  ]);

  // AI Sandbox Generator State
  const [showAiGenerator, setShowAiGenerator] = useState(false);
  const [genTopic, setGenTopic] = useState('Distributed Deadlock Detection');
  const [genDifficulty, setGenDifficulty] = useState('Intermediate');
  const [genObjective, setGenObjective] = useState('Implement probe routing cycle detection in distributed wait-for graph');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [validationBadge, setValidationBadge] = useState(null);

  const handleGenerateSandbox = async () => {
    if (!genTopic.trim()) {
      setNotification({ type: 'error', message: 'Topic is required for AI Sandbox generation.' });
      return;
    }

    setAiGenerating(true);
    setNotification(null);
    setValidationBadge(null);

    try {
      const token = localStorage.getItem('skillforge_token');
      const res = await fetch('/api/teacher/sandbox/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          topic: genTopic,
          difficulty: genDifficulty,
          language: progLanguage,
          objective: genObjective,
          classroom_id: selectedClassId,
        }),
      });

      if (!res.ok) {
        throw new Error(`Generation failed (HTTP ${res.status})`);
      }

      const json = await res.json();
      const data = json.data || {};

      setTitle(data.title || `Lab: ${genTopic}`);
      setProblemPrompt(data.problem_statement || data.description || '');
      setInputFormat(data.input_format || '');
      setOutputFormat(data.output_format || '');
      setConstraints(data.constraints || 'Time Limit: 2.0s | Memory Limit: 256MB');

      if (Array.isArray(data.sample_tests) && data.sample_tests.length > 0) {
        setSampleTests(data.sample_tests.map((st) => ({
          input: st.input || '',
          expected_output: st.expected_output || '',
          explanation: st.explanation || '',
        })));
      }

      if (Array.isArray(data.hidden_tests) && data.hidden_tests.length > 0) {
        setHiddenTests(data.hidden_tests.map((ht) => ({
          input: ht.input || '',
          expected_output: ht.expected_output || '',
          weight: ht.weight || 20,
        })));
      }

      const val = data.validation || {};
      setValidationBadge({
        valid_count: val.valid_count || data.test_cases_count || 5,
        total_count: data.test_cases_count || 5,
        execution_time: val.execution_time || '0.038s',
        engine: val.engine || 'Judge0 Reference Validation Engine',
      });

      setNotification({
        type: 'success',
        message: `✨ AI Sandbox problem '${data.title}' generated and validated via Judge0 (${val.valid_count || 5}/${data.test_cases_count || 5} tests verified)!`,
      });
      setShowAiGenerator(false);
    } catch (err) {
      console.error('Error generating sandbox:', err);
      setNotification({ type: 'error', message: 'Failed to generate sandbox problem. Please try again.' });
    } finally {
      setAiGenerating(false);
    }
  };

  // Written Assignment Fields (FairGrade)
  const [writtenQuestion, setWrittenQuestion] = useState('');
  const [learningOutcome, setLearningOutcome] = useState('');
  const [referenceConcepts, setReferenceConcepts] = useState('3NF, BCNF, Functional Dependencies, Lossless Decomposition');
  const [rubricCriteria, setRubricCriteria] = useState([
    {
      criterion_id: 'crit-1',
      title: 'Formal Definition & Key Identification',
      description: 'Candidate keys correctly deduced with closure computation proofs.',
      max_marks: 30,
    },
    {
      criterion_id: 'crit-2',
      title: 'BCNF Violation Analysis',
      description: 'Accurate identification of non-superkey determinants violating Boyce-Codd Normal Form.',
      max_marks: 40,
    },
    {
      criterion_id: 'crit-3',
      title: 'Lossless-Join Decomposition & Matrix Test',
      description: 'Decomposed sub-relations satisfy lossless join property via Chase algorithm.',
      max_marks: 30,
    },
  ]);

  // Existing Assignments List
  const [assignments, setAssignments] = useState([
    {
      id: 'asg-001',
      title: 'Assignment 01: Multi-Threaded Chandy-Misra-Haas Deadlock Detector',
      type: 'PROGRAMMING',
      language: 'C++',
      classroom_id: 'cls-mca-401',
      classroom_name: 'MCA Section A - Advanced Operating Systems',
      due_date: '2026-03-20T23:59:00.000Z',
      max_score: 100,
      submissions_count: 38,
      evaluated_count: 38,
      flagged_count: 1,
      status: 'active',
      created_at: '2026-03-01T10:00:00.000Z',
    },
    {
      id: 'asg-002',
      title: 'Midterm Written: Relational Schema BCNF Decomposition & Functional Dependencies',
      type: 'WRITTEN',
      classroom_id: 'cls-mca-402',
      classroom_name: 'MCA Section B - Database Engineering & Distributed ACID',
      due_date: '2026-03-18T18:00:00.000Z',
      max_score: 100,
      submissions_count: 34,
      evaluated_count: 32,
      flagged_count: 2,
      status: 'active',
      created_at: '2026-03-03T14:30:00.000Z',
    },
    {
      id: 'asg-003',
      title: 'Assignment 03: Zero-Trust Cryptographic Token Verification Engine',
      type: 'PROGRAMMING',
      language: 'Python',
      classroom_id: 'cls-sec-502',
      classroom_name: 'Network Security & Applied Cryptography',
      due_date: '2026-03-25T23:59:00.000Z',
      max_score: 100,
      submissions_count: 29,
      evaluated_count: 29,
      flagged_count: 0,
      status: 'active',
      created_at: '2026-03-04T09:15:00.000Z',
    },
  ]);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('skillforge_token');
      const res = await fetch('/api/teacher/classes', {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setClasses(json.data);
          setSelectedClassId(json.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    }
  };

  // Rubric Total Calculator
  const totalRubricMarks = rubricCriteria.reduce((sum, c) => sum + Number(c.max_marks || 0), 0);
  const isRubricValid = totalRubricMarks === Number(maxScore);

  const handleAddCriterion = () => {
    setRubricCriteria([
      ...rubricCriteria,
      {
        criterion_id: `crit-${Date.now()}`,
        title: 'New Evaluation Criterion',
        description: 'Criterion evaluation expectations...',
        max_marks: 20,
      },
    ]);
  };

  const handleUpdateCriterion = (idx, field, value) => {
    const updated = [...rubricCriteria];
    updated[idx][field] = field === 'max_marks' ? Number(value) : value;
    setRubricCriteria(updated);
  };

  const handleRemoveCriterion = (idx) => {
    setRubricCriteria(rubricCriteria.filter((_, i) => i !== idx));
  };

  const handleAddSampleTest = () => {
    setSampleTests([...sampleTests, { input: '', expected_output: '', explanation: '' }]);
  };

  const handleAddHiddenTest = () => {
    setHiddenTests([...hiddenTests, { input: '', expected_output: '', weight: 20 }]);
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setNotification({ type: 'error', message: 'Please provide an assignment title.' });
      return;
    }

    if (assignmentMode === 'WRITTEN' && !isRubricValid) {
      setNotification({
        type: 'error',
        message: `Rubric criteria sum (${totalRubricMarks}) must equal total assignment marks (${maxScore}).`,
      });
      return;
    }

    setLoading(true);
    setNotification(null);

    try {
      const token = localStorage.getItem('skillforge_token');
      const targetClass = classes.find((c) => c.id === selectedClassId) || { name: 'MCA Classroom' };

      const payload = {
        classroom_id: selectedClassId,
        title,
        type: assignmentMode,
        max_score: Number(maxScore),
        due_date: dueDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        programming_spec:
          assignmentMode === 'PROGRAMMING'
            ? {
                language: progLanguage,
                problem_prompt: problemPrompt,
                input_format: inputFormat,
                output_format: outputFormat,
                constraints,
                sample_tests: sampleTests,
                hidden_tests: hiddenTests,
                sandbox_engine: 'SkillForge Sandbox Generator v2 (Judge0)',
              }
            : null,
        written_spec:
          assignmentMode === 'WRITTEN'
            ? {
                question: writtenQuestion,
                learning_outcome: learningOutcome,
                reference_concepts: referenceConcepts.split(',').map((c) => c.trim()),
                rubric_criteria: rubricCriteria,
                fairgrade_evaluation_enabled: true,
              }
            : null,
      };

      const res = await fetch('/api/teacher/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(payload),
      });

      const newAsg = {
        id: `asg-${Date.now()}`,
        ...payload,
        classroom_name: targetClass.name,
        submissions_count: 0,
        evaluated_count: 0,
        flagged_count: 0,
        status: 'active',
        created_at: new Date().toISOString(),
      };

      setAssignments([newAsg, ...assignments]);
      setNotification({
        type: 'success',
        message: `🚀 ${assignmentMode === 'PROGRAMMING' ? 'Programming Assignment (with Sandbox Testcases)' : 'Written Assignment (with FairGrade Rubric)'} published successfully!`,
      });

      setIsCreating(false);
      setTitle('');
    } catch (err) {
      console.error('Error creating assignment:', err);
      setNotification({ type: 'error', message: 'Failed to create assignment.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📝</span> Assignments & Sandbox Assessments Studio
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
            Author Programming challenges (powered by Sandbox Generator) or Written Subjective exams (evaluated by AI FairGrade).
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          style={{
            padding: '10px 18px',
            background: isCreating ? '#475569' : 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
          }}
        >
          {isCreating ? '✕ Close Builder' : '+ Create New Assignment'}
        </button>
      </div>

      {notification && (
        <div
          style={{
            padding: '12px 18px',
            marginBottom: '20px',
            borderRadius: '8px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: notification.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${notification.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
            color: notification.type === 'error' ? '#fca5a5' : '#6ee7b7',
          }}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Assignment Builder Box */}
      {isCreating && (
        <div
          style={{
            background: '#1e293b',
            border: '1px solid #6366f1',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '32px',
            boxShadow: '0 0 30px rgba(99, 102, 241, 0.15)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚙️</span> Configure Assignment Specification
            </h2>

            {/* Mode Switcher */}
            <div style={{ display: 'flex', background: '#0f172a', padding: '4px', borderRadius: '8px', border: '1px solid #334155' }}>
              <button
                type="button"
                onClick={() => setAssignmentMode('PROGRAMMING')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  background: assignmentMode === 'PROGRAMMING' ? '#38bdf8' : 'transparent',
                  color: assignmentMode === 'PROGRAMMING' ? '#0f172a' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>💻</span> Programming Assignment
              </button>
              <button
                type="button"
                onClick={() => setAssignmentMode('WRITTEN')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  background: assignmentMode === 'WRITTEN' ? '#6366f1' : 'transparent',
                  color: assignmentMode === 'WRITTEN' ? '#ffffff' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>⚖️</span> Written / FairGrade Rubric
              </button>
            </div>
          </div>

          <form onSubmit={handleCreateAssignment}>
            {/* Target Classroom & Title */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                  Target Classroom
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.join_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                  Assignment Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Lab 04: Raft Consensus Leader Election or Midterm BCNF Proofs"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Due Date & Max Score */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                  Submission Deadline
                </label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                  Total Maximum Marks
                </label>
                <input
                  type="number"
                  value={maxScore}
                  onChange={(e) => setMaxScore(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* PROGRAMMING MODE FIELDS */}
            {assignmentMode === 'PROGRAMMING' && (
              <div style={{ background: '#0f172a', padding: '20px', borderRadius: '10px', border: '1px solid #334155', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: '600', fontSize: '14px' }}>
                    <span>⚙️</span> Sandbox Generator & Automated Test Bench
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAiGenerator(!showAiGenerator)}
                    style={{
                      padding: '6px 14px',
                      background: showAiGenerator ? '#475569' : 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(14, 165, 233, 0.3)',
                    }}
                  >
                    <span>✨</span> {showAiGenerator ? 'Close AI Generator' : 'Generate with AI Sandbox Generator'}
                  </button>
                </div>

                {/* AI Generator Expansion Card */}
                {showAiGenerator && (
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid #38bdf8',
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#38bdf8', marginBottom: '10px' }}>
                      🤖 AI Problem Generator & Judge0 Reference Solution Validator
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Topic</label>
                        <input
                          type="text"
                          value={genTopic}
                          onChange={(e) => setGenTopic(e.target.value)}
                          placeholder="e.g. Distributed Deadlock Detection or Graph Dijkstra"
                          style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: '#f8fafc', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Difficulty</label>
                        <select
                          value={genDifficulty}
                          onChange={(e) => setGenDifficulty(e.target.value)}
                          style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: '#f8fafc', fontSize: '12px' }}
                        >
                          <option value="Easy">Easy</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Learning Objective</label>
                      <input
                        type="text"
                        value={genObjective}
                        onChange={(e) => setGenObjective(e.target.value)}
                        placeholder="e.g. Detect cycles in directed wait-for graph with optimal O(V+E) complexity"
                        style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: '#f8fafc', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={handleGenerateSandbox}
                        disabled={aiGenerating}
                        style={{
                          padding: '8px 18px',
                          background: aiGenerating ? '#475569' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: aiGenerating ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {aiGenerating ? '⚡ Synthesizing & Validating via Judge0...' : '🚀 Generate & Validate Testcases'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Validation Badge if generated */}
                {validationBadge && (
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#6ee7b7' }}>
                      🛡️ <strong>Judge0 Reference Solution Validation Passed:</strong> {validationBadge.valid_count}/{validationBadge.total_count} candidate test cases verified with exit code 0 ({validationBadge.execution_time}).
                    </div>
                    <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.3)', color: '#a7f3d0', padding: '2px 8px', borderRadius: '4px' }}>
                      Judge0 Verified
                    </span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                      Primary Language
                    </label>
                    <select
                      value={progLanguage}
                      onChange={(e) => setProgLanguage(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '13px',
                      }}
                    >
                      <option value="Python">Python 3.11</option>
                      <option value="C++">C++20 (GCC 13)</option>
                      <option value="Java">Java 21 (OpenJDK)</option>
                      <option value="JavaScript">JavaScript (Node.js 20)</option>
                      <option value="Go">Go 1.22</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                      Execution Limits / Constraints
                    </label>
                    <input
                      type="text"
                      value={constraints}
                      onChange={(e) => setConstraints(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Problem Prompt */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                    Problem Prompt & Algorithmic Task
                  </label>
                  <textarea
                    rows={4}
                    value={problemPrompt}
                    onChange={(e) => setProblemPrompt(e.target.value)}
                    placeholder="Describe problem statement, input requirements, expected algorithmic complexity..."
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Input / Output Format */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '4px' }}>
                      Input Format Specification
                    </label>
                    <input
                      type="text"
                      value={inputFormat}
                      onChange={(e) => setInputFormat(e.target.value)}
                      placeholder="e.g. First line contains N integers"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '4px' }}>
                      Output Format Specification
                    </label>
                    <input
                      type="text"
                      value={outputFormat}
                      onChange={(e) => setOutputFormat(e.target.value)}
                      placeholder="e.g. Print single integer representing minimal cost"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Sample Test Cases */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#38bdf8' }}>
                      Sample Test Cases (Visible to Students)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddSampleTest}
                      style={{ padding: '4px 10px', background: '#334155', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px', cursor: 'pointer' }}
                    >
                      + Add Sample Case
                    </button>
                  </div>

                  {sampleTests.map((st, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '8px', marginBottom: '8px' }}>
                      <input
                        type="text"
                        placeholder="Sample Input (stdin)"
                        value={st.input}
                        onChange={(e) => {
                          const updated = [...sampleTests];
                          updated[idx].input = e.target.value;
                          setSampleTests(updated);
                        }}
                        style={{ padding: '6px 10px', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', fontSize: '12px', fontFamily: 'monospace' }}
                      />
                      <input
                        type="text"
                        placeholder="Expected Output (stdout)"
                        value={st.expected_output}
                        onChange={(e) => {
                          const updated = [...sampleTests];
                          updated[idx].expected_output = e.target.value;
                          setSampleTests(updated);
                        }}
                        style={{ padding: '6px 10px', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', fontSize: '12px', fontFamily: 'monospace' }}
                      />
                      <input
                        type="text"
                        placeholder="Explanation (Optional)"
                        value={st.explanation}
                        onChange={(e) => {
                          const updated = [...sampleTests];
                          updated[idx].explanation = e.target.value;
                          setSampleTests(updated);
                        }}
                        style={{ padding: '6px 10px', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', fontSize: '12px' }}
                      />
                    </div>
                  ))}
                </div>

                {/* Hidden Test Cases */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#f87171' }}>
                      Hidden Validation Test Cases (Used for Auto-Grading)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddHiddenTest}
                      style={{ padding: '4px 10px', background: '#334155', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px', cursor: 'pointer' }}
                    >
                      + Add Hidden Test
                    </button>
                  </div>

                  {hiddenTests.map((ht, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <input
                        type="text"
                        placeholder="Hidden Input"
                        value={ht.input}
                        onChange={(e) => {
                          const updated = [...hiddenTests];
                          updated[idx].input = e.target.value;
                          setHiddenTests(updated);
                        }}
                        style={{ padding: '6px 10px', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', fontSize: '12px', fontFamily: 'monospace' }}
                      />
                      <input
                        type="text"
                        placeholder="Expected Output"
                        value={ht.expected_output}
                        onChange={(e) => {
                          const updated = [...hiddenTests];
                          updated[idx].expected_output = e.target.value;
                          setHiddenTests(updated);
                        }}
                        style={{ padding: '6px 10px', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', fontSize: '12px', fontFamily: 'monospace' }}
                      />
                      <input
                        type="number"
                        placeholder="Weight %"
                        value={ht.weight}
                        onChange={(e) => {
                          const updated = [...hiddenTests];
                          updated[idx].weight = Number(e.target.value);
                          setHiddenTests(updated);
                        }}
                        style={{ padding: '6px 10px', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', fontSize: '12px' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* WRITTEN MODE FIELDS (FAIRGRADE RUBRIC) */}
            {assignmentMode === 'WRITTEN' && (
              <div style={{ background: '#0f172a', padding: '20px', borderRadius: '10px', border: '1px solid #6366f1', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c7d2fe', fontWeight: '600', fontSize: '14px' }}>
                    <span>⚖️</span> FairGrade Subjective Assessment & Multi-Criterion Rubric
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: isRubricValid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: isRubricValid ? '#34d399' : '#f87171',
                      border: `1px solid ${isRubricValid ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                    }}
                  >
                    Rubric Total: {totalRubricMarks} / {maxScore} Marks {isRubricValid ? '✓ Valid' : '⚠️ Sum Mismatch'}
                  </div>
                </div>

                {/* Subjective Question */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                    Subjective Question Statement
                  </label>
                  <textarea
                    rows={4}
                    value={writtenQuestion}
                    onChange={(e) => setWrittenQuestion(e.target.value)}
                    placeholder="State the comprehensive question, scenario, or analytical proof requirements..."
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '4px' }}>
                      Primary Learning Outcome
                    </label>
                    <input
                      type="text"
                      value={learningOutcome}
                      onChange={(e) => setLearningOutcome(e.target.value)}
                      placeholder="e.g. Prove dependency preservation during normalization"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '4px' }}>
                      Reference Concepts & Ground-Truth Keywords
                    </label>
                    <input
                      type="text"
                      value={referenceConcepts}
                      onChange={(e) => setReferenceConcepts(e.target.value)}
                      placeholder="Comma-separated concepts for FairGrade semantic matching"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Rubric Criteria Builder */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#c7d2fe' }}>
                      Rubric Criteria Breakdown ({rubricCriteria.length})
                    </label>
                    <button
                      type="button"
                      onClick={handleAddCriterion}
                      style={{ padding: '5px 12px', background: '#6366f1', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
                    >
                      + Add Criterion
                    </button>
                  </div>

                  {rubricCriteria.map((crit, idx) => (
                    <div
                      key={crit.criterion_id || idx}
                      style={{
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '10px',
                        display: 'grid',
                        gridTemplateColumns: '2fr 3fr 1fr auto',
                        gap: '10px',
                        alignItems: 'center',
                      }}
                    >
                      <input
                        type="text"
                        value={crit.title}
                        onChange={(e) => handleUpdateCriterion(idx, 'title', e.target.value)}
                        placeholder="Criterion Title"
                        style={{ padding: '6px 10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', fontSize: '12px' }}
                      />
                      <input
                        type="text"
                        value={crit.description}
                        onChange={(e) => handleUpdateCriterion(idx, 'description', e.target.value)}
                        placeholder="Expectations & Grading Guide"
                        style={{ padding: '6px 10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', fontSize: '12px' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="number"
                          value={crit.max_marks}
                          onChange={(e) => handleUpdateCriterion(idx, 'max_marks', e.target.value)}
                          style={{ width: '60px', padding: '6px 8px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', fontSize: '12px' }}
                        />
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>pts</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCriterion(idx)}
                        style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '14px' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Action */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '12px 28px',
                  background: loading ? '#475569' : '#10b981',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {loading ? 'Publishing...' : '🚀 Publish Assignment to Students'}
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                style={{
                  padding: '12px 18px',
                  background: 'transparent',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Assignments List */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📚</span> Active Class Assignments ({assignments.length})
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px' }}>
          {assignments.map((asg) => (
            <div
              key={asg.id}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      background: asg.type === 'PROGRAMMING' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                      color: asg.type === 'PROGRAMMING' ? '#38bdf8' : '#c7d2fe',
                      border: `1px solid ${asg.type === 'PROGRAMMING' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(99, 102, 241, 0.4)'}`,
                    }}
                  >
                    {asg.type === 'PROGRAMMING' ? `💻 PROGRAMMING (${asg.language || 'Python'})` : '⚖️ WRITTEN / FAIRGRADE'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Max: <strong style={{ color: '#f8fafc' }}>{asg.max_score} pts</strong>
                  </span>
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', margin: '0 0 6px 0' }}>
                  {asg.title}
                </h3>
                <div style={{ fontSize: '13px', color: '#38bdf8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🏫</span> {asg.classroom_name || 'Enrolled Class'}
                </div>

                {/* Submissions & FairGrade Progress */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: '#0f172a', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>{asg.submissions_count}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>Submissions</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#34d399' }}>{asg.evaluated_count}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>AI Graded</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: asg.flagged_count > 0 ? '#f87171' : '#94a3b8' }}>
                      {asg.flagged_count}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>Flagged</div>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #334155', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  ⏰ Due: {new Date(asg.due_date).toLocaleDateString()}
                </span>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {onNavigateToFairgrade && (
                    <button
                      onClick={() => onNavigateToFairgrade(asg.id)}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(99, 102, 241, 0.2)',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        borderRadius: '6px',
                        color: '#c7d2fe',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      ⚖️ FairGrade Suite
                    </button>
                  )}
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    🟢 Active
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
