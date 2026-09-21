import React, { useState } from 'react';

export default function StudentClassFeedView({ onNavigateToSandbox, onNavigateToExam }) {
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [activeFilter, setActiveFilter] = useState('ALL');

  const [posts, setPosts] = useState([
    {
      id: 'post-1',
      classroom_id: 'cls-mca-401',
      classroom_name: 'MCA Section A - Advanced Operating Systems',
      type: 'Announcement',
      title: 'Welcome to Advanced OS & FairGrade Evaluation System',
      content: 'Welcome students! All subjective assignments this semester will be evaluated anonymously via the SkillForge FairGrade engine. Identity markers will be scrubbed before grading to ensure unbiased grading.',
      author_name: 'Prof. A. Anupam',
      author_role: 'TEACHER',
      created_at: '2026-03-09T08:00:00.000Z',
      attachments: [{ title: 'Course Policy & Rubric Guidelines.pdf', type: 'PDF' }],
    },
    {
      id: 'post-2',
      classroom_id: 'cls-mca-401',
      classroom_name: 'MCA Section A - Advanced Operating Systems',
      type: 'Lesson',
      title: 'Module 04: Concurrency, Deadlock Detection & Chandy-Misra-Haas Algorithm',
      content: 'Please review the uploaded slides and interactive sandbox. Focus on how edge chasing messages (initiator, sender, receiver) prevent false deadlocks in distributed transactions.',
      author_name: 'Prof. A. Anupam',
      author_role: 'TEACHER',
      created_at: '2026-03-08T11:20:00.000Z',
      attachments: [{ title: 'OS_Distributed_Deadlocks.pptx', type: 'PPTX' }],
    },
    {
      id: 'post-3',
      classroom_id: 'cls-mca-401',
      classroom_name: 'MCA Section A - Advanced Operating Systems',
      type: 'Assignment',
      title: 'Assignment 02: Multi-threaded Bank Transaction Engine with Deadlock Prevention',
      content: 'Implement a concurrent banking ledger in C++ or Python that uses strict lock ordering and RAII mutex guards. Submit code for automated sandbox verification and written design report for FairGrade evaluation.',
      author_name: 'Prof. A. Anupam',
      author_role: 'TEACHER',
      created_at: '2026-03-07T14:45:00.000Z',
      due_date: '2026-03-18T23:59:00.000Z',
      attachments: [{ title: 'bank_sandbox_spec.pdf', type: 'PDF' }],
    },
    {
      id: 'post-4',
      classroom_id: 'cls-mca-402',
      classroom_name: 'MCA Section B - Database Engineering',
      type: 'Assessment',
      title: 'Midterm Written Assessment: Database Normalization & BCNF Decomposition Proofs',
      content: 'Comprehensive 100-mark evaluation covering 3NF synthesis, BCNF decomposition, and serializable multi-version concurrency control (MVCC). Evaluated with FairGrade multi-pass grading.',
      author_name: 'Prof. A. Anupam',
      author_role: 'TEACHER',
      created_at: '2026-03-06T09:30:00.000Z',
      due_date: '2026-03-15T18:00:00.000Z',
      attachments: [],
    },
    {
      id: 'post-5',
      classroom_id: 'cls-mca-402',
      classroom_name: 'MCA Section B - Database Engineering',
      type: 'Resource',
      title: 'Curated Resource: Interactive Normalization Decomposition Visualizer',
      content: 'Explore step-by-step canonical cover computations and lossless join tests using the SkillForge curated sandbox tool.',
      author_name: 'SkillForge Co-Pilot',
      author_role: 'AI_AGENT',
      created_at: '2026-03-05T16:00:00.000Z',
      attachments: [{ title: 'Interactive Normalization Visualizer', type: 'SANDBOX' }],
    },
  ]);

  const filtered = posts.filter((p) => {
    const classMatch = selectedClassId === 'ALL' || p.classroom_id === selectedClassId;
    const typeMatch = activeFilter === 'ALL' || p.type.toUpperCase() === activeFilter.toUpperCase();
    return classMatch && typeMatch;
  });

  const getPostTypeBadge = (type) => {
    switch (type.toUpperCase()) {
      case 'LESSON':
        return { bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)', text: '#38bdf8', icon: '📖' };
      case 'ANNOUNCEMENT':
        return { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.4)', text: '#fbbf24', icon: '📢' };
      case 'RESOURCE':
        return { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.4)', text: '#c084fc', icon: '💡' };
      case 'ASSIGNMENT':
        return { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', text: '#34d399', icon: '💻' };
      case 'ASSESSMENT':
        return { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', text: '#f87171', icon: '⚖️' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.4)', text: '#94a3b8', icon: '📌' };
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>📢</span> Enrolled Class Feed & Announcements Stream
        </h1>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
          Stay up to date with faculty lesson notes, homework specs, and exam notifications.
        </p>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'ANNOUNCEMENT', 'LESSON', 'ASSIGNMENT', 'ASSESSMENT', 'RESOURCE'].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: `1px solid ${activeFilter === f ? '#6366f1' : '#334155'}`,
                background: activeFilter === f ? 'rgba(99, 102, 241, 0.2)' : '#1e293b',
                color: activeFilter === f ? '#c7d2fe' : '#94a3b8',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              {f === 'ALL' ? '🌐 All Posts' : f}
            </button>
          ))}
        </div>

        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          style={{
            padding: '8px 12px',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            color: '#f8fafc',
            fontSize: '13px',
          }}
        >
          <option value="ALL">All Enrolled Classes</option>
          <option value="cls-mca-401">MCA Section A - Advanced OS</option>
          <option value="cls-mca-402">MCA Section B - Database Engineering</option>
        </select>
      </div>

      {/* Posts Stream */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {filtered.map((post) => {
          const badge = getPostTypeBadge(post.type);
          return (
            <div
              key={post.id}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '700',
                      background: badge.bg,
                      border: `1px solid ${badge.border}`,
                      color: badge.text,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{badge.icon}</span> {post.type.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{post.author_name}</span>
                  <span style={{ fontSize: '12px', color: '#38bdf8' }}>• {post.classroom_name}</span>
                </div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{new Date(post.created_at).toLocaleString()}</span>
              </div>

              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', margin: '0 0 8px 0' }}>{post.title}</h2>
                <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6', margin: 0 }}>{post.content}</p>
              </div>

              {post.due_date && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#f87171', fontSize: '12px', fontWeight: '600', width: 'fit-content' }}>
                  <span>⏰ Due:</span> {new Date(post.due_date).toLocaleString()}
                </div>
              )}

              {post.attachments && post.attachments.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {post.attachments.map((att, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', fontSize: '12px', color: '#38bdf8', cursor: 'pointer' }}>
                      <span>📎</span> {att.title}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ borderTop: '1px solid #334155', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                {post.type === 'ASSIGNMENT' && (
                  <button
                    onClick={() => onNavigateToSandbox && onNavigateToSandbox('asg-001')}
                    style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)', border: 'none', borderRadius: '6px', color: '#0f172a', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Open in Code Sandbox →
                  </button>
                )}
                {post.type === 'ASSESSMENT' && (
                  <button
                    onClick={() => onNavigateToExam && onNavigateToExam('asg-002')}
                    style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)', border: 'none', borderRadius: '6px', color: '#ffffff', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Take Written Exam →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
