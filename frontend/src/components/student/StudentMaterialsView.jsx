import React, { useState, useEffect } from 'react';

export default function StudentMaterialsView({ onAskTutor }) {
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'TEACHER' | 'CURATED'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  const [materials, setMaterials] = useState([
    {
      id: 'mat-001',
      source_type: 'TEACHER',
      title: 'Database Schema Normalization & Functional Dependencies',
      topic: 'Database Engineering & Normal Forms',
      difficulty: 'Intermediate',
      classroom_name: 'MCA Section B - Database Engineering & Distributed ACID',
      file_type: 'PDF',
      file_name: 'Lecture_07_Database_Normalization_3NF_BCNF.pdf',
      subtopics: ['1NF / 2NF / 3NF Foundations', 'Boyce-Codd Normal Form (BCNF)', 'Lossless-Join Decomposition', 'Dependency Preservation Test'],
      learning_outcomes: [
        'Differentiate between 3NF and BCNF violations with formal proofs',
        'Compute minimal canonical cover of functional dependencies',
        'Execute synthesis and decomposition algorithms for relational schemas',
      ],
      reference_concepts: ['Armstrong Axioms', 'Transitive Dependency', 'Prime Attributes', 'Multivalued Dependencies (4NF)'],
      summary: 'Comprehensive analysis of database schema normalization, redundancy reduction techniques, and anomaly-free relational decomposition.',
    },
    {
      id: 'mat-002',
      source_type: 'TEACHER',
      title: 'Linux Kernel Scheduling: CFS & Concurrency Control',
      topic: 'Operating Systems',
      difficulty: 'Intermediate',
      classroom_name: 'MCA Section A - Advanced Operating Systems',
      file_type: 'PPTX',
      file_name: 'Module_04_CPU_Scheduling.pptx',
      subtopics: ['Completely Fair Scheduler', 'Red-Black Tree Runqueues', 'Nice Values & Latency Target', 'Chandy-Misra-Haas Deadlock Algorithm'],
      learning_outcomes: ['Analyze vruntime calculation algorithm', 'Configure SCHED_FIFO vs SCHED_RR', 'Trace distributed deadlock probes'],
      reference_concepts: ['vruntime', 'Red-Black Trees', 'Convoy Effect', 'Edge Chasing'],
      summary: 'In-depth analysis of Linux CFS scheduling algorithms, latency target optimizations, and distributed deadlock detection algorithms.',
    },
    {
      id: 'res-curated-1',
      source_type: 'CURATED',
      title: 'Interactive Normalization & Chase Matrix Decomposition Visualizer',
      topic: 'Database Systems & BCNF',
      type: 'INTERACTIVE_SANDBOX',
      relevance: 'High Relevance to Database Systems & BCNF Modules',
      description: 'Step-by-step canonical cover computations and lossless join matrix tests directly in your browser.',
      tags: ['BCNF', '3NF', 'Functional Dependencies', 'Chase Algorithm'],
      source: 'SkillForge Resource Curator AI',
    },
    {
      id: 'res-curated-2',
      source_type: 'CURATED',
      title: 'Linux Kernel CFS Red-Black Tree Runqueue Visualizer',
      topic: 'Advanced Operating Systems',
      type: 'INTERACTIVE_SANDBOX',
      relevance: 'High Relevance to Advanced Operating Systems',
      description: 'Interactive execution timeline visualizing vruntime dynamics and process scheduling under CFS.',
      tags: ['CFS', 'Scheduling', 'Linux Kernel', 'vruntime'],
      source: 'SkillForge Resource Curator AI',
    },
    {
      id: 'res-curated-3',
      source_type: 'CURATED',
      title: 'Distributed 2-Phase Commit & Raft Consensus Reference Sheet',
      topic: 'Distributed ACID & Fault Tolerance',
      type: 'CHEAT_SHEET',
      relevance: 'Essential Reference for Distributed ACID & Fault Tolerance',
      description: 'Comprehensive quick reference covering commit log replication, quorum intersections, and leader stepdown.',
      tags: ['Raft', '2PC', 'ACID', 'Distributed Consensus'],
      source: 'SkillForge Resource Curator AI',
    },
  ]);

  useEffect(() => {
    const token = localStorage.getItem('skillforge_token');
    fetch('/api/student/materials', {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) {
          const teacherMats = (json.data.materials || []).map((m) => ({ ...m, source_type: 'TEACHER' }));
          const curatedRes = (json.data.curated_resources || []).map((r) => ({ ...r, source_type: 'CURATED' }));
          if (teacherMats.length > 0 || curatedRes.length > 0) {
            setMaterials([...teacherMats, ...curatedRes]);
          }
        }
      })
      .catch((err) => console.warn('Using default materials payload:', err));
  }, []);

  const filtered = materials.filter((item) => {
    const matchesTab =
      activeTab === 'ALL' ||
      (activeTab === 'TEACHER' && item.source_type === 'TEACHER') ||
      (activeTab === 'CURATED' && item.source_type === 'CURATED');

    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.topic && item.topic.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.subtopics && item.subtopics.some((st) => st.toLowerCase().includes(searchQuery.toLowerCase()))) ||
      (item.tags && item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

    return matchesTab && matchesSearch;
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📖</span> Course Learning Materials & Curated Resources
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
            Review teacher-uploaded syllabus notes and AI-curated sandboxes & cheat sheets from the Resource Curator.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'ALL', label: '🌐 All Content' },
            { id: 'TEACHER', label: '👨‍🏫 Teacher-Uploaded Courseware' },
            { id: 'CURATED', label: '🤖 AI-Curated Resources' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: `1px solid ${activeTab === tab.id ? '#6366f1' : '#334155'}`,
                background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.2)' : '#1e293b',
                color: activeTab === tab.id ? '#c7d2fe' : '#94a3b8',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search materials by topic, concept, or tag..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '9px 14px',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            color: '#f8fafc',
            fontSize: '13px',
            width: '320px',
            outline: 'none',
          }}
        />
      </div>

      {/* Materials Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' }}>
        {filtered.map((item) => (
          <div
            key={item.id}
            style={{
              background: '#1e293b',
              border: `1px solid ${item.source_type === 'TEACHER' ? '#334155' : 'rgba(99, 102, 241, 0.4)'}`,
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '700',
                    background: item.source_type === 'TEACHER' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                    color: item.source_type === 'TEACHER' ? '#38bdf8' : '#c084fc',
                    border: `1px solid ${item.source_type === 'TEACHER' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(168, 85, 247, 0.4)'}`,
                  }}
                >
                  {item.source_type === 'TEACHER' ? `📁 ${item.file_type || 'COURSEWARE'}` : `🤖 ${item.type || 'CURATED'}`}
                </span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {item.difficulty || item.topic}
                </span>
              </div>

              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#f8fafc', margin: '0 0 6px 0' }}>
                {item.title}
              </h3>

              <div style={{ fontSize: '12px', color: '#38bdf8', marginBottom: '12px' }}>
                {item.classroom_name || item.relevance || 'Academic Cohort Resource'}
              </div>

              <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5', margin: '0 0 14px 0' }}>
                {item.summary || item.description}
              </p>

              {/* Subtopics / Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(item.subtopics || item.tags || []).slice(0, 4).map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '11px',
                      background: '#0f172a',
                      color: '#cbd5e1',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #334155', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setSelectedItem(item)}
                  style={{
                    padding: '6px 12px',
                    background: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  👁️ Overview
                </button>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '6px 12px',
                      background: item.source === 'YouTube' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                      border: `1px solid ${item.source === 'YouTube' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(56, 189, 248, 0.5)'}`,
                      borderRadius: '6px',
                      color: item.source === 'YouTube' ? '#fca5a5' : '#38bdf8',
                      fontSize: '12px',
                      fontWeight: '600',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>{item.source === 'YouTube' ? '▶' : '🔗'}</span> Open
                  </a>
                )}
              </div>

              <button
                onClick={() => onAskTutor && onAskTutor(item.title)}
                style={{
                  padding: '6px 14px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>🤖</span> Ask AI Tutor
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Reader Modal */}
      {selectedItem && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
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
              maxWidth: '750px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 0 35px rgba(99, 102, 241, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: '700' }}>
                  {selectedItem.source_type === 'TEACHER' ? '👨‍🏫 Official Courseware Note' : '🤖 Curated Engineering Resource'}
                </span>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc', margin: '4px 0 0 0' }}>
                  {selectedItem.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc', marginBottom: '6px' }}>
                Course Concepts & Theoretical Overview:
              </div>
              <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', margin: 0 }}>
                {selectedItem.summary || selectedItem.description}
              </p>
            </div>

            {selectedItem.learning_outcomes && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#38bdf8', marginBottom: '8px' }}>
                  🎯 Target Learning Outcomes:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedItem.learning_outcomes.map((lo, i) => (
                    <div key={i} style={{ fontSize: '13px', color: '#e2e8f0', background: '#0f172a', padding: '8px 12px', borderRadius: '6px' }}>
                      • {lo}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => {
                  const title = selectedItem.title;
                  setSelectedItem(null);
                  if (onAskTutor) onAskTutor(title);
                }}
                style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >
                Ask Socratic AI Tutor About This Note →
              </button>
              <button
                onClick={() => setSelectedItem(null)}
                style={{ padding: '10px 16px', background: '#334155', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
