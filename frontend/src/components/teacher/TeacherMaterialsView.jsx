import React, { useState, useEffect } from 'react';

export default function TeacherMaterialsView() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [rawText, setRawText] = useState('');
  const [inputMode, setInputMode] = useState('file'); // 'file' or 'text'
  const [analyzing, setAnalyzing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [curating, setCurating] = useState(false);
  const [notification, setNotification] = useState(null);

  // AI Content Analyzer Output
  const [aiAnalysis, setAiAnalysis] = useState(null);

  // Form edit states for reviewed analysis
  const [editedTitle, setEditedTitle] = useState('');
  const [editedTopic, setEditedTopic] = useState('');
  const [editedDifficulty, setEditedDifficulty] = useState('Intermediate');
  const [editedSubtopics, setEditedSubtopics] = useState([]);
  const [editedConcepts, setEditedConcepts] = useState([]);
  const [editedPrerequisites, setEditedPrerequisites] = useState([]);
  const [editedOutcomes, setEditedOutcomes] = useState([]);
  const [editedKeyTerms, setEditedKeyTerms] = useState([]);
  const [editedMisconceptions, setEditedMisconceptions] = useState([]);
  const [editedAssessmentTopics, setEditedAssessmentTopics] = useState([]);
  const [rawExtractedText, setRawExtractedText] = useState('');
  const [newTagInput, setNewTagInput] = useState({
    subtopic: '',
    concept: '',
    prerequisite: '',
    outcome: '',
    keyTerm: '',
    misconception: '',
    assessmentTopic: '',
  });

  // List of existing materials
  const [materials, setMaterials] = useState([
    {
      id: 'mat-001',
      title: 'Distributed ACID & 2-Phase Commit Protocols',
      topic: 'Database Engineering',
      difficulty: 'Advanced',
      classroom_id: 'cls-mca-402',
      classroom_name: 'MCA Section B - Database Engineering & Distributed ACID',
      file_type: 'PDF',
      file_name: 'Lecture_07_Distributed_Transactions.pdf',
      subtopics: ['2PC Protocol', 'Raft Consensus', 'Distributed Deadlock', 'Serializable Isolation'],
      learning_outcomes: ['Understand coordinator-participant failure modes', 'Implement crash recovery protocols'],
      status: 'published',
      created_at: '2026-03-08T10:30:00.000Z',
    },
    {
      id: 'mat-002',
      title: 'Linux Kernel Scheduling: CFS & Real-Time Policies',
      topic: 'Operating Systems',
      difficulty: 'Intermediate',
      classroom_id: 'cls-mca-401',
      classroom_name: 'MCA Section A - Advanced Operating Systems',
      file_type: 'PPTX',
      file_name: 'Module_04_CPU_Scheduling.pptx',
      subtopics: ['Completely Fair Scheduler', 'Red-Black Tree Runqueues', 'Nice Values & Latency Target'],
      learning_outcomes: ['Analyze vruntime calculation algorithm', 'Configure SCHED_FIFO vs SCHED_RR'],
      status: 'published',
      created_at: '2026-03-05T14:15:00.000Z',
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
      console.error('Failed to fetch teacher classes:', err);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setFileName(selected.name);
      // Generate initial title from file name
      const cleanName = selected.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setEditedTitle(cleanName);
    }
  };

  const handleAnalyze = async () => {
    if (inputMode === 'file' && !file && !fileName) {
      setNotification({ type: 'error', message: 'Please select a PDF, PPTX, DOCX, or TXT file to analyze.' });
      return;
    }
    if (inputMode === 'text' && !rawText.trim()) {
      setNotification({ type: 'error', message: 'Please paste learning material text to analyze.' });
      return;
    }

    setAnalyzing(true);
    setNotification(null);

    try {
      const token = localStorage.getItem('skillforge_token');
      let res;

      if (inputMode === 'file' && file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', editedTitle || file.name);
        formData.append('class_id', selectedClassId);

        res = await fetch('/api/teacher/materials/analyze', {
          method: 'POST',
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: formData,
        });
      } else {
        const payload = {
          title: editedTitle || 'Uploaded Courseware Module',
          file_name: fileName || (inputMode === 'file' ? 'courseware_document.pdf' : 'text_document.txt'),
          file_type: fileName ? fileName.split('.').pop().toUpperCase() : 'TXT',
          rawContent: rawText,
          content_text: rawText,
          class_id: selectedClassId,
        };

        res = await fetch('/api/teacher/materials/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();

      if (res.ok && json.success) {
        const analysis = json.data;
        setAiAnalysis(analysis);
        setEditedTitle(analysis.title || editedTitle);
        setEditedTopic(analysis.main_topic || analysis.topic || 'Computer Science');
        setEditedDifficulty(analysis.difficulty || 'Intermediate');
        setEditedSubtopics(analysis.subtopics || []);
        setEditedConcepts(analysis.concepts || analysis.reference_concepts || []);
        setEditedPrerequisites(analysis.prerequisites || []);
        setEditedOutcomes(analysis.learning_objectives || analysis.learning_outcomes || []);
        setEditedKeyTerms(analysis.key_terms || []);
        setEditedMisconceptions(analysis.possible_misconceptions || []);
        setEditedAssessmentTopics(analysis.suggested_assessment_topics || []);
        setRawExtractedText(analysis.raw_extracted_text || rawText || '');
        setNotification({
          type: 'success',
          message: `✨ AI Content Analyzer successfully extracted curriculum taxonomy (${analysis.metadata?.extracted_word_count || 0} words parsed)!`,
        });
      } else {
        // Explicit extraction / analysis error: Never fabricate a false success on empty or broken text
        setNotification({
          type: 'error',
          message: `❌ ${json.message || 'Text extraction or analysis failed. Please verify file content and retry.'}`,
        });
      }
    } catch (err) {
      console.error('Error analyzing content:', err);
      setNotification({
        type: 'error',
        message: '❌ Failed to analyze material. Service error or network connectivity issue.',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedClassId) {
      setNotification({ type: 'error', message: 'Please select a classroom to publish to.' });
      return;
    }

    setPublishing(true);
    setNotification(null);

    try {
      const token = localStorage.getItem('skillforge_token');
      const targetClass = classes.find((c) => c.id === selectedClassId) || { name: 'MCA Core Classroom' };

      const payload = {
        classroom_id: selectedClassId,
        title: editedTitle,
        topic: editedTopic,
        main_topic: editedTopic,
        difficulty: editedDifficulty,
        file_name: fileName || (file ? file.name : 'curriculum_module.pdf'),
        file_type: fileName ? fileName.split('.').pop().toUpperCase() : 'PDF',
        subtopics: editedSubtopics,
        concepts: editedConcepts,
        reference_concepts: editedConcepts,
        prerequisites: editedPrerequisites,
        learning_objectives: editedOutcomes,
        learning_outcomes: editedOutcomes,
        key_terms: editedKeyTerms,
        possible_misconceptions: editedMisconceptions,
        suggested_assessment_topics: editedAssessmentTopics,
        raw_extracted_text: rawExtractedText || rawText || '',
        extracted_summary: aiAnalysis ? aiAnalysis.extracted_summary : '',
        prompt_version: aiAnalysis?.metadata?.prompt_version || 'v1.0.0',
        publish_to_feed: true,
      };

      const res = await fetch('/api/teacher/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(payload),
      });

      const newMat = {
        id: `mat-${Date.now()}`,
        ...payload,
        classroom_name: targetClass.name,
        status: 'published',
        created_at: new Date().toISOString(),
      };

      setMaterials([newMat, ...materials]);
      setNotification({
        type: 'success',
        message: `🚀 "${editedTitle}" published to ${targetClass.name} feed and indexed for Socratic RAG pipeline!`,
      });

      // Reset form
      setAiAnalysis(null);
      setFile(null);
      setFileName('');
      setRawText('');
      setRawExtractedText('');
    } catch (err) {
      console.error('Error publishing material:', err);
      setNotification({ type: 'error', message: 'Failed to publish material.' });
    } finally {
      setPublishing(false);
    }
  };

  const handleCurateFromAnalysis = async () => {
    if (!selectedClassId) {
      setNotification({ type: 'error', message: 'Please select a classroom first.' });
      return;
    }
    if (!editedTopic.trim()) {
      setNotification({ type: 'error', message: 'Topic is required for curation.' });
      return;
    }

    setCurating(true);
    setNotification(null);

    try {
      const token = localStorage.getItem('skillforge_token');
      const res = await fetch('/api/teacher/resources/curate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          classroom_id: selectedClassId,
          topic: editedTopic,
          subtopics: editedSubtopics,
          difficulty: editedDifficulty,
          learning_objectives: editedOutcomes,
        }),
      });

      const json = await res.json();
      if (res.ok && json.data?.available && json.data?.resources?.length > 0) {
        setNotification({
          type: 'success',
          message: `✨ AI Resource Curator found and ranked ${json.data.resources.length} candidate resources! Review them in the Pedagogical Resources tab before student publishing.`,
        });
      } else {
        setNotification({
          type: 'error',
          message: `⚠️ ${json.data?.reason || json.message || 'Resource search unavailable: YouTube API key not configured and no external provider returned candidates.'}`,
        });
      }
    } catch (err) {
      setNotification({ type: 'error', message: `Curation error: ${err.message}` });
    } finally {
      setCurating(false);
    }
  };

  const addTag = (field, key) => {
    const val = (newTagInput[key] || '').trim();
    if (!val) return;
    if (field === 'subtopics') setEditedSubtopics([...editedSubtopics, val]);
    if (field === 'concepts') setEditedConcepts([...editedConcepts, val]);
    if (field === 'prerequisites') setEditedPrerequisites([...editedPrerequisites, val]);
    if (field === 'outcomes') setEditedOutcomes([...editedOutcomes, val]);
    if (field === 'keyTerms') setEditedKeyTerms([...editedKeyTerms, val]);
    if (field === 'misconceptions') setEditedMisconceptions([...editedMisconceptions, val]);
    if (field === 'assessmentTopics') setEditedAssessmentTopics([...editedAssessmentTopics, val]);
    setNewTagInput({ ...newTagInput, [key]: '' });
  };

  const removeTag = (field, idx) => {
    if (field === 'subtopics') setEditedSubtopics(editedSubtopics.filter((_, i) => i !== idx));
    if (field === 'concepts') setEditedConcepts(editedConcepts.filter((_, i) => i !== idx));
    if (field === 'prerequisites') setEditedPrerequisites(editedPrerequisites.filter((_, i) => i !== idx));
    if (field === 'outcomes') setEditedOutcomes(editedOutcomes.filter((_, i) => i !== idx));
    if (field === 'keyTerms') setEditedKeyTerms(editedKeyTerms.filter((_, i) => i !== idx));
    if (field === 'misconceptions') setEditedMisconceptions(editedMisconceptions.filter((_, i) => i !== idx));
    if (field === 'assessmentTopics') setEditedAssessmentTopics(editedAssessmentTopics.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📖</span> Learning Materials & AI Content Analyzer
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
            Upload course slides, syllabus docs, or lecture notes. The Content Analyzer automatically extracts topic taxonomy, prerequisites, and learning outcomes for teacher review.
          </p>
        </div>
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

      {/* Upload and AI Analyzer Studio */}
      <div style={{ display: 'grid', gridTemplateColumns: aiAnalysis ? '1fr 1.2fr' : '1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Upload Card */}
        <div
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📤</span> 1. Select Target Class & Course Material
            </h2>
            <div style={{ display: 'flex', gap: '6px', background: '#0f172a', padding: '4px', borderRadius: '6px' }}>
              <button
                onClick={() => setInputMode('file')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  background: inputMode === 'file' ? '#38bdf8' : 'transparent',
                  color: inputMode === 'file' ? '#0f172a' : '#94a3b8',
                }}
              >
                📁 File Upload
              </button>
              <button
                onClick={() => setInputMode('text')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  background: inputMode === 'text' ? '#38bdf8' : 'transparent',
                  color: inputMode === 'text' ? '#0f172a' : '#94a3b8',
                }}
              >
                📝 Text / Markdown
              </button>
            </div>
          </div>

          {/* Classroom Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#94a3b8', marginBottom: '6px' }}>
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
                fontSize: '14px',
                outline: 'none',
              }}
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.code || cls.subject}) - Code: {cls.join_code}
                </option>
              ))}
            </select>
          </div>

          {inputMode === 'file' ? (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#94a3b8', marginBottom: '6px' }}>
                Course Document (PDF, PPTX, DOCX, TXT)
              </label>
              <div
                style={{
                  border: '2px dashed #475569',
                  borderRadius: '10px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: 'rgba(15, 23, 42, 0.6)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onClick={() => document.getElementById('material-file-input').click()}
              >
                <div style={{ fontSize: '38px', marginBottom: '10px' }}>📄</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#e2e8f0', marginBottom: '4px' }}>
                  {fileName ? fileName : 'Click to browse or drop lecture material here'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Supports PDF, PowerPoint (PPT/PPTX), Word (DOC/DOCX), Markdown, Text (Max 50MB)
                </div>
                <input
                  id="material-file-input"
                  type="file"
                  accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.md"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </div>
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#94a3b8', marginBottom: '6px' }}>
                Raw Lecture Notes / Syllabus Outline
              </label>
              <textarea
                rows={7}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste lecture transcript, reading notes, or slide summaries here..."
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Quick Demo Preloads */}
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Or load sample engineering courseware:</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setFileName('Database_Normalization_3NF_BCNF.pdf');
                  setEditedTitle('Database Schema Normalization & Functional Dependencies');
                  setRawText(`Relational Database Normalization: 1NF requires atomic values. 2NF removes partial key dependencies. 3NF removes transitive dependencies for non-prime attributes (X -> A implies X is superkey or A is prime). BCNF eliminates all anomalies by enforcing every determinant X in X -> A is a superkey.`);
                }}
                style={{
                  padding: '6px 10px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#38bdf8',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                📊 Load Database 3NF/BCNF Notes
              </button>
              <button
                type="button"
                onClick={() => {
                  setFileName('OS_Distributed_Deadlocks.pptx');
                  setEditedTitle('Distributed Concurrency & Chandy-Misra-Haas Deadlock Detection');
                  setRawText(`Distributed Deadlock Detection: Wait-For Graphs across nodes. Chandy-Misra-Haas probe computation: (initiator, sender, receiver). Handles multi-resource deadlock in distributed transaction managers.`);
                }}
                style={{
                  padding: '6px 10px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#a78bfa',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                ⚙️ Load Distributed OS Probes
              </button>
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            style={{
              padding: '12px',
              background: analyzing ? '#475569' : 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: analyzing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            }}
          >
            {analyzing ? (
              <>
                <span className="animate-spin">⏳</span> Running Content Analyzer AI...
              </>
            ) : (
              <>
                <span>✨</span> Run AI Content Analyzer
              </>
            )}
          </button>
        </div>

        {/* AI Inspection Panel */}
        {aiAnalysis && (
          <div
            style={{
              background: '#1e293b',
              border: '1px solid #6366f1',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 0 25px rgba(99, 102, 241, 0.15)',
              position: 'relative',
            }}
          >
            {/* AI Banner */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 16px',
                background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(56, 189, 248, 0.2))',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                borderRadius: '8px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: '#c7d2fe' }}>
                <span>🤖</span> REAL AI-GENERATED CURRICULUM TAXONOMY
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    background: aiAnalysis.metadata?.ai_mode === 'mock' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: aiAnalysis.metadata?.ai_mode === 'mock' ? '#fbbf24' : '#34d399',
                    border: `1px solid ${aiAnalysis.metadata?.ai_mode === 'mock' ? 'rgba(251, 191, 36, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                    borderRadius: '4px',
                  }}
                >
                  Prompt {aiAnalysis.metadata?.prompt_version || 'v1.0.0'} • Mode: {aiAnalysis.metadata?.ai_mode?.toUpperCase() || 'LIVE'}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8', background: '#0f172a', padding: '2px 8px', borderRadius: '4px' }}>
                {aiAnalysis.metadata?.extracted_word_count ? `${aiAnalysis.metadata.extracted_word_count} words extracted` : 'Teacher Review Required'}
              </span>
            </div>

            {/* Editable Title & Topic */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '4px' }}>
                  Material Title
                </label>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '4px' }}>
                  Difficulty
                </label>
                <select
                  value={editedDifficulty}
                  onChange={(e) => setEditedDifficulty(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>

            {/* Main Topic Field */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '4px' }}>
                Main Academic Topic / Domain
              </label>
              <input
                type="text"
                value={editedTopic}
                onChange={(e) => setEditedTopic(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Subtopics Section */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                Extracted Subtopics ({editedSubtopics.length})
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {editedSubtopics.map((item, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  >
                    {item}
                    <button
                      onClick={() => removeTag('subtopics', idx)}
                      style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: 0 }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Add custom subtopic..."
                  value={newTagInput.subtopic}
                  onChange={(e) => setNewTagInput({ ...newTagInput, subtopic: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addTag('subtopics', 'subtopic')}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <button
                  onClick={() => addTag('subtopics', 'subtopic')}
                  style={{ padding: '6px 12px', background: '#334155', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Core Concepts & Algorithms */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                Theoretical Concepts & Mechanisms ({editedConcepts.length})
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {editedConcepts.map((item, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      background: 'rgba(167, 139, 250, 0.15)',
                      border: '1px solid rgba(167, 139, 250, 0.3)',
                      color: '#a78bfa',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  >
                    💡 {item}
                    <button
                      onClick={() => removeTag('concepts', idx)}
                      style={{ background: 'transparent', border: 'none', color: '#a78bfa', cursor: 'pointer', padding: 0 }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Add theoretical concept..."
                  value={newTagInput.concept}
                  onChange={(e) => setNewTagInput({ ...newTagInput, concept: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addTag('concepts', 'concept')}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <button
                  onClick={() => addTag('concepts', 'concept')}
                  style={{ padding: '6px 12px', background: '#334155', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Prerequisites Section */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                Prerequisites Identified ({editedPrerequisites.length})
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {editedPrerequisites.map((item, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      background: 'rgba(251, 191, 36, 0.15)',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      color: '#fbbf24',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  >
                    🔑 {item}
                    <button
                      onClick={() => removeTag('prerequisites', idx)}
                      style={{ background: 'transparent', border: 'none', color: '#fbbf24', cursor: 'pointer', padding: 0 }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Add prerequisite..."
                  value={newTagInput.prerequisite}
                  onChange={(e) => setNewTagInput({ ...newTagInput, prerequisite: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addTag('prerequisites', 'prerequisite')}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <button
                  onClick={() => addTag('prerequisites', 'prerequisite')}
                  style={{ padding: '6px 12px', background: '#334155', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Measurable Learning Objectives (Bloom Taxonomy) */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                Measurable Learning Objectives (Bloom's Taxonomy) ({editedOutcomes.length})
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                {editedOutcomes.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#e2e8f0',
                    }}
                  >
                    <span>🎯 {item}</span>
                    <button
                      onClick={() => removeTag('outcomes', idx)}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Add measurable learning objective (e.g. Synthesize...)..."
                  value={newTagInput.outcome}
                  onChange={(e) => setNewTagInput({ ...newTagInput, outcome: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addTag('outcomes', 'outcome')}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <button
                  onClick={() => addTag('outcomes', 'outcome')}
                  style={{ padding: '6px 12px', background: '#334155', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Possible Student Misconceptions Callout */}
            {editedMisconceptions && editedMisconceptions.length > 0 && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '14px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#f87171', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚠️</span> Predicted Student Misconceptions ({editedMisconceptions.length})
                </div>
                <ul style={{ margin: '0 0 8px 0', paddingLeft: '20px', color: '#cbd5e1', fontSize: '12px', lineHeight: '1.6' }}>
                  {editedMisconceptions.map((m, idx) => (
                    <li key={idx}>
                      <strong>{m}</strong>
                    </li>
                  ))}
                </ul>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  💡 Teacher Co-Pilot and Socratic Tutor will actively monitor student answers for these specific conceptual pitfalls.
                </div>
              </div>
            )}

            {/* Suggested Assessment & Coding Lab Topics */}
            {editedAssessmentTopics && editedAssessmentTopics.length > 0 && (
              <div
                style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '8px',
                  padding: '14px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#a5b4fc', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📝</span> Suggested Assessment & Sandbox Labs ({editedAssessmentTopics.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {editedAssessmentTopics.map((top, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '4px 10px',
                        background: '#0f172a',
                        border: '1px solid #4338ca',
                        color: '#c7d2fe',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                    >
                      🧪 {top}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={handlePublish}
                disabled={publishing}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: publishing ? '#475569' : '#10b981',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: publishing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                }}
              >
                {publishing ? 'Publishing & Indexing...' : '🚀 Approve, Publish & Index for Socratic RAG'}
              </button>
              <button
                onClick={handleCurateFromAnalysis}
                disabled={curating}
                style={{
                  padding: '12px 18px',
                  background: curating ? '#475569' : 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: curating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                }}
              >
                <span>🤖</span> {curating ? 'Curating...' : 'Curate External Resources'}
              </button>
              <button
                onClick={() => setAiAnalysis(null)}
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
          </div>
        )}
      </div>

      {/* Published Materials Repository */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📚</span> Published Courseware & Materials Library ({materials.length})
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '18px' }}>
          {materials.map((mat) => (
            <div
              key={mat.id}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s, border-color 0.2s',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '700',
                      background: mat.file_type === 'PDF' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                      color: mat.file_type === 'PDF' ? '#f87171' : '#38bdf8',
                      border: `1px solid ${mat.file_type === 'PDF' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`,
                    }}
                  >
                    {mat.file_type || 'DOC'}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background:
                        mat.difficulty === 'Advanced'
                          ? 'rgba(239, 68, 68, 0.15)'
                          : mat.difficulty === 'Intermediate'
                          ? 'rgba(251, 191, 36, 0.15)'
                          : 'rgba(16, 185, 129, 0.15)',
                      color:
                        mat.difficulty === 'Advanced'
                          ? '#f87171'
                          : mat.difficulty === 'Intermediate'
                          ? '#fbbf24'
                          : '#34d399',
                    }}
                  >
                    {mat.difficulty}
                  </span>
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', margin: '0 0 6px 0' }}>
                  {mat.title}
                </h3>
                <div style={{ fontSize: '12px', color: '#38bdf8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🏫</span> {mat.classroom_name || 'Enrolled Class'}
                </div>

                {mat.subtopics && mat.subtopics.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Extracted Concepts:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {mat.subtopics.slice(0, 3).map((st, i) => (
                        <span key={i} style={{ fontSize: '11px', background: '#0f172a', color: '#cbd5e1', padding: '2px 6px', borderRadius: '4px' }}>
                          {st}
                        </span>
                      ))}
                      {mat.subtopics.length > 3 && (
                        <span style={{ fontSize: '11px', background: '#0f172a', color: '#94a3b8', padding: '2px 6px', borderRadius: '4px' }}>
                          +{mat.subtopics.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid #334155', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  {new Date(mat.created_at).toLocaleDateString()}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => alert(`Previewing material: ${mat.title}\n\nLearning Outcomes:\n${(mat.learning_outcomes || []).join('\n')}`)}
                    style={{
                      padding: '4px 10px',
                      background: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '6px',
                      color: '#cbd5e1',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    👁️ View Details
                  </button>
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
                    🟢 Live on Feed
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
