import React, { useState, useEffect } from 'react';

export default function TeacherResourcesView() {
  const [activeStatus, setActiveStatus] = useState('ALL'); // ALL, PENDING, APPROVED, REJECTED
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const [resources, setResources] = useState([]);
  const [classes, setClasses] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('cls-mca-402');

  // AI Curation Modal State
  const [showCurateModal, setShowCurateModal] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [curateTopic, setCurateTopic] = useState('Database Engineering & Normal Forms');
  const [curateSubtopics, setCurateSubtopics] = useState('Boyce-Codd Normal Form, Lossless Join Decomposition, Chase Algorithm');
  const [curateDifficulty, setCurateDifficulty] = useState('Intermediate');
  const [curateTeacherUrls, setCurateTeacherUrls] = useState('');
  const [curating, setCurating] = useState(false);
  const [curationResult, setCurationResult] = useState(null);

  // Manual Resource Modal State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualTopic, setManualTopic] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualAutoApprove, setManualAutoApprove] = useState(true);

  useEffect(() => {
    fetchClasses();
    fetchResources();
    fetchMaterials();
  }, [selectedClassId]);

  const fetchMaterials = async () => {
    try {
      const token = localStorage.getItem('skillforge_token');
      const res = await fetch(`/api/teacher/classes/${selectedClassId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.materials) {
          setMaterials(json.data.materials);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch materials:', err);
    }
  };

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
        }
      }
    } catch (err) {
      console.warn('Failed to fetch classes:', err);
    }
  };

  const fetchResources = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('skillforge_token');
      const res = await fetch(`/api/teacher/resources?classroomId=${selectedClassId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setResources(json.data);
        }
      }
    } catch (err) {
      console.warn('Using local resource state:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (resourceId, newStatus) => {
    try {
      const token = localStorage.getItem('skillforge_token');
      const res = await fetch(`/api/teacher/resources/${resourceId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const json = await res.json();
        setResources((prev) =>
          prev.map((r) => (r.id === resourceId ? { ...r, approved_status: newStatus } : r))
        );
        setNotification({
          type: 'success',
          message: `Resource "${json.data?.title || resourceId}" status updated to ${newStatus}. ${
            newStatus === 'APPROVED' ? 'Now visible to students.' : 'Hidden from students.'
          }`,
        });
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (err) {
      setNotification({ type: 'error', message: `Failed to update status: ${err.message}` });
    }
  };

  const handleTriggerCuration = async (e) => {
    e.preventDefault();
    if (!curateTopic.trim()) return;

    setCurating(true);
    setCurationResult(null);

    try {
      const token = localStorage.getItem('skillforge_token');
      const teacherUrlsParsed = curateTeacherUrls
        .split('\n')
        .map((u) => u.trim())
        .filter((u) => u.startsWith('http'))
        .map((url, i) => ({
          title: `Teacher Source [${i + 1}]`,
          url,
          description: 'Instructor-provided candidate link',
        }));

      const res = await fetch('/api/teacher/resources/curate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          classroom_id: selectedClassId,
          topic: curateTopic.trim(),
          subtopics: curateSubtopics.split(',').map((s) => s.trim()).filter(Boolean),
          difficulty: curateDifficulty,
          teacher_urls: teacherUrlsParsed,
        }),
      });

      const json = await res.json();
      setCurationResult(json.data);

      if (json.data?.available && json.data?.resources?.length > 0) {
        setNotification({
          type: 'success',
          message: `Curated and ranked ${json.data.resources.length} candidate resources. Pending your review before publishing to students!`,
        });
        fetchResources();
      }
    } catch (err) {
      setNotification({ type: 'error', message: `Curation error: ${err.message}` });
    } finally {
      setCurating(false);
    }
  };

  const handleAddManualResource = async (e) => {
    e.preventDefault();
    if (!manualUrl.trim() || !manualTitle.trim()) return;

    try {
      const token = localStorage.getItem('skillforge_token');
      const res = await fetch('/api/teacher/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          classroom_id: selectedClassId,
          title: manualTitle.trim(),
          url: manualUrl.trim(),
          topic: manualTopic.trim() || 'Course Reference',
          description: manualDesc.trim() || 'Teacher-verified educational resource',
          auto_approve: manualAutoApprove,
        }),
      });

      if (res.ok) {
        setNotification({
          type: 'success',
          message: `Resource "${manualTitle}" successfully added ${manualAutoApprove ? 'and approved for students!' : 'as pending review.'}`,
        });
        setShowManualModal(false);
        setManualTitle('');
        setManualUrl('');
        setManualTopic('');
        setManualDesc('');
        fetchResources();
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (err) {
      setNotification({ type: 'error', message: `Failed to add resource: ${err.message}` });
    }
  };

  const filtered = resources.filter((r) => {
    const matchesStatus =
      activeStatus === 'ALL' ||
      r.approved_status === activeStatus ||
      (activeStatus === 'APPROVED' && (!r.approved_status || r.approved_status === 'APPROVED'));

    const matchesSearch =
      r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.source?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: '#f8fafc' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>💡</span> Pedagogical Resource Curator & External Content Registry
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
            Curate, evaluate, and rank candidate learning resources. Enforce teacher approval before external links appear in student portals.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowCurateModal(true)}
            style={{
              padding: '10px 18px',
              background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            }}
          >
            <span>🤖</span> Trigger AI Resource Curation
          </button>
          <button
            onClick={() => setShowManualModal(true)}
            style={{
              padding: '10px 16px',
              background: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>➕</span> Add Verified URL
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          style={{
            padding: '12px 18px',
            marginBottom: '20px',
            borderRadius: '8px',
            fontSize: '14px',
            background: notification.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${notification.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
            color: notification.type === 'error' ? '#fca5a5' : '#6ee7b7',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
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

      {/* Classroom Selector & Status Filter Bar */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>Classroom:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{
                padding: '6px 12px',
                background: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '13px',
              }}
            >
              {classes.length > 0 ? (
                classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code || c.name} ({c.name})
                  </option>
                ))
              ) : (
                <>
                  <option value="cls-mca-402">MCA-402 - Database Engineering & ACID</option>
                  <option value="cls-mca-401">MCA-401 - Advanced Operating Systems</option>
                </>
              )}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: 'ALL', label: '🌐 All' },
              { id: 'PENDING', label: '⏳ Pending Review' },
              { id: 'APPROVED', label: '✓ Approved for Students' },
              { id: 'REJECTED', label: '✕ Rejected' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveStatus(tab.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${activeStatus === tab.id ? '#6366f1' : '#334155'}`,
                  background: activeStatus === tab.id ? 'rgba(99, 102, 241, 0.2)' : '#0f172a',
                  color: activeStatus === tab.id ? '#c7d2fe' : '#94a3b8',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <input
          type="text"
          placeholder="Search by title, topic, or source..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '8px 14px',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '6px',
            color: '#f8fafc',
            fontSize: '13px',
            width: '280px',
            outline: 'none',
          }}
        />
      </div>

      {/* Grid of Curated Resources */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          Loading curated resources...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#1e293b', border: '1px dashed #475569', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
          <h3 style={{ fontSize: '16px', color: '#f8fafc', margin: '0 0 6px 0' }}>No resources match current filter</h3>
          <p style={{ fontSize: '13px', margin: '0 0 16px 0' }}>
            Click "Trigger AI Resource Curation" to discover and rank candidate videos & documentation, or "Add Verified URL" to publish directly.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px' }}>
          {filtered.map((res) => {
            const isApproved = res.approved_status === 'APPROVED';
            const isPending = res.approved_status === 'PENDING';
            const isRejected = res.approved_status === 'REJECTED';

            return (
              <div
                key={res.id}
                style={{
                  background: '#1e293b',
                  border: `1px solid ${isApproved ? 'rgba(16, 185, 129, 0.4)' : isPending ? 'rgba(234, 179, 8, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                  borderRadius: '12px',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                }}
              >
                <div>
                  {/* Top Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '700',
                          background: res.source === 'YouTube' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                          color: res.source === 'YouTube' ? '#f87171' : '#38bdf8',
                        }}
                      >
                        {res.source === 'YouTube' ? '▶ YouTube' : '🔗 ' + (res.source || 'External')}
                      </span>
                      {res.difficulty_fit && (
                        <span style={{ fontSize: '11px', color: '#94a3b8', background: '#0f172a', padding: '2px 6px', borderRadius: '4px' }}>
                          Fit: {res.difficulty_fit}
                        </span>
                      )}
                    </div>

                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        background: isApproved ? 'rgba(16, 185, 129, 0.2)' : isPending ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: isApproved ? '#34d399' : isPending ? '#fbbf24' : '#f87171',
                        border: `1px solid ${isApproved ? 'rgba(16, 185, 129, 0.4)' : isPending ? 'rgba(234, 179, 8, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                      }}
                    >
                      {isApproved ? '✓ APPROVED (STUDENT VISIBLE)' : isPending ? '⏳ PENDING APPROVAL' : '✕ REJECTED'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', margin: '0 0 6px 0', lineHeight: '1.4' }}>
                    {res.title}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#38bdf8', marginBottom: '8px', fontWeight: '600' }}>
                    Topic: {res.topic}
                  </div>
                  <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5', margin: '0 0 12px 0' }}>
                    {res.description}
                  </p>

                  {/* Quality & Score Bar */}
                  <div style={{ background: '#0f172a', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <span style={{ color: '#94a3b8' }}>AI Relevance Score:</span>
                      <strong style={{ color: '#38bdf8' }}>{Math.round((res.relevance_score || 0.85) * 100)}% Match</strong>
                    </div>
                    {res.educational_usefulness && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginTop: '4px' }}>
                        <span style={{ color: '#94a3b8' }}>Educational Usefulness:</span>
                        <span style={{ color: '#34d399', fontWeight: '600' }}>{res.educational_usefulness}</span>
                      </div>
                    )}
                  </div>

                  {/* URL preview */}
                  <div style={{ fontSize: '11px', color: '#64748b', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                    URL: {res.url || 'No external URL'}
                  </div>
                </div>

                {/* Card Action Controls */}
                <div style={{ borderTop: '1px solid #334155', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '6px 12px',
                      background: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '6px',
                      color: '#38bdf8',
                      fontSize: '12px',
                      fontWeight: '600',
                      textDecoration: 'none',
                    }}
                  >
                    ↗ Test Link
                  </a>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {!isApproved && (
                      <button
                        onClick={() => handleUpdateStatus(res.id, 'APPROVED')}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(16, 185, 129, 0.2)',
                          border: '1px solid rgba(16, 185, 129, 0.5)',
                          borderRadius: '6px',
                          color: '#34d399',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        ✓ Approve
                      </button>
                    )}
                    {!isRejected && (
                      <button
                        onClick={() => handleUpdateStatus(res.id, 'REJECTED')}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          borderRadius: '6px',
                          color: '#f87171',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        ✕ Reject
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Curation Modal */}
      {showCurateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#1e293b',
              border: '1px solid #6366f1',
              borderRadius: '12px',
              maxWidth: '650px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 0 35px rgba(99, 102, 241, 0.3)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
                  🤖 Trigger AI Resource Curator
                </h2>
                <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
                  Searches YouTube Data API (if configured) and instructor URLs, then ranks candidates with LLM.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCurateModal(false);
                  setCurationResult(null);
                }}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTriggerCuration} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {materials && materials.length > 0 && (
                <div style={{ background: '#0f172a', padding: '12px 16px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#38bdf8', marginBottom: '6px' }}>
                    📖 Auto-Fill from Analyzed Course Material (Content Analyzer)
                  </label>
                  <select
                    value={selectedMaterialId}
                    onChange={(e) => {
                      const matId = e.target.value;
                      setSelectedMaterialId(matId);
                      const found = materials.find((m) => m.id === matId);
                      if (found) {
                        setCurateTopic(found.main_topic || found.topic || found.title);
                        if (found.subtopics && found.subtopics.length > 0) {
                          setCurateSubtopics(found.subtopics.join(', '));
                        }
                        if (found.difficulty) {
                          setCurateDifficulty(found.difficulty);
                        }
                      }
                    }}
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
                    <option value="">-- Choose Analyzed Syllabus Module --</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({m.main_topic || m.topic || 'General'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                  Target Curriculum Topic
                </label>
                <input
                  type="text"
                  value={curateTopic}
                  onChange={(e) => setCurateTopic(e.target.value)}
                  placeholder="e.g. Relational Database Schema Normalization & BCNF"
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
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                  Subtopics / Key Concepts (Comma-separated)
                </label>
                <input
                  type="text"
                  value={curateSubtopics}
                  onChange={(e) => setCurateSubtopics(e.target.value)}
                  placeholder="e.g. BCNF, 3NF synthesis, Chase Matrix Algorithm"
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                    Target Difficulty Fit
                  </label>
                  <select
                    value={curateDifficulty}
                    onChange={(e) => setCurateDifficulty(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '14px',
                    }}
                  >
                    <option value="Beginner">Beginner (Foundational)</option>
                    <option value="Intermediate">Intermediate (Undergraduate)</option>
                    <option value="Advanced">Advanced (Graduate / MCA)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                    Classroom Assignment
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
                    }}
                  >
                    <option value="cls-mca-402">MCA-402 Database Engineering</option>
                    <option value="cls-mca-401">MCA-401 Advanced Operating Systems</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                  Candidate Teacher URLs (Optional, one per line)
                </label>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
                  If YouTube API is unavailable, provided URLs will be ranked and evaluated by LLM.
                </div>
                <textarea
                  rows={3}
                  value={curateTeacherUrls}
                  onChange={(e) => setCurateTeacherUrls(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=UrYLYV7WSHM&#10;https://docs.kernel.org/scheduler/sched-design-CFS.html"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Status or Result Preview */}
              {curationResult && !curationResult.available && (
                <div style={{ padding: '12px 16px', background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.4)', borderRadius: '8px', color: '#fde047', fontSize: '13px' }}>
                  ⚠️ <strong>Resource Search Unavailable:</strong> {curationResult.reason}
                  <div style={{ marginTop: '6px', fontSize: '12px', color: '#cbd5e1' }}>
                    Tip: Add your candidate URLs in the box above or use "Add Verified URL" to publish immediately without synthetic links.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCurateModal(false)}
                  style={{ padding: '10px 18px', background: '#334155', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={curating}
                  style={{
                    padding: '10px 24px',
                    background: curating ? '#475569' : 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: curating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {curating ? 'Ranking Candidates...' : '🚀 Search & Rank Resources'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Resource Addition Modal */}
      {showManualModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
              maxWidth: '580px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 0 35px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
                ➕ Add Verified Resource URL
              </h2>
              <button
                onClick={() => setShowManualModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManualResource} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                  Resource Title
                </label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. MIT 6.824 Raft Lecture Notes & Video"
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
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                  External Verified URL (HTTP/HTTPS)
                </label>
                <input
                  type="url"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                  Topic / Subject
                </label>
                <input
                  type="text"
                  value={manualTopic}
                  onChange={(e) => setManualTopic(e.target.value)}
                  placeholder="e.g. Distributed Systems & Consensus"
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

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                  Pedagogical Description
                </label>
                <textarea
                  rows={3}
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder="Explain why this resource will help students master the concept..."
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
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '6px 0' }}>
                <input
                  type="checkbox"
                  id="auto_approve_checkbox"
                  checked={manualAutoApprove}
                  onChange={(e) => setManualAutoApprove(e.target.checked)}
                />
                <label htmlFor="auto_approve_checkbox" style={{ fontSize: '13px', color: '#cbd5e1', cursor: 'pointer' }}>
                  Auto-approve immediately (make visible to students in this class)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  style={{ padding: '10px 18px', background: '#334155', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 24px',
                    background: '#10b981',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Save Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
