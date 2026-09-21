import React, { useState, useEffect } from 'react';

export default function TeacherClassFeedView() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('cls-mca-401');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isComposing, setIsComposing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // New Post Form State
  const [newPostType, setNewPostType] = useState('Announcement'); // Lesson, Announcement, Resource, Assignment, Assessment
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostAttachment, setNewPostAttachment] = useState('');
  const [newPostDueDate, setNewPostDueDate] = useState('');

  // Feed Posts
  const [posts, setPosts] = useState([
    {
      id: 'post-1',
      classroom_id: 'cls-mca-401',
      type: 'Announcement',
      title: 'Welcome to Advanced OS & FairGrade Evaluation System',
      content: 'Welcome students! All subjective assignments this semester will be evaluated anonymously via the SkillForge FairGrade engine. Identity markers will be scrubbed before grading to ensure unbiased grading.',
      author_name: 'Prof. A. Anupam',
      author_role: 'TEACHER',
      created_at: '2026-03-09T08:00:00.000Z',
      attachments: [{ title: 'Course Policy & Rubric Guidelines.pdf', type: 'PDF' }],
      comments_count: 5,
    },
    {
      id: 'post-2',
      classroom_id: 'cls-mca-401',
      type: 'Lesson',
      title: 'Module 04: Concurrency, Deadlock Detection & Chandy-Misra-Haas Algorithm',
      content: 'Please review the uploaded slides and interactive sandbox. Focus on how edge chasing messages (initiator, sender, receiver) prevent false deadlocks in distributed transactions.',
      author_name: 'Prof. A. Anupam',
      author_role: 'TEACHER',
      created_at: '2026-03-08T11:20:00.000Z',
      attachments: [{ title: 'OS_Distributed_Deadlocks.pptx', type: 'PPTX' }],
      comments_count: 12,
    },
    {
      id: 'post-3',
      classroom_id: 'cls-mca-401',
      type: 'Assignment',
      title: 'Assignment 02: Multi-threaded Bank Transaction Engine with Deadlock Prevention',
      content: 'Implement a concurrent banking ledger in C++ or Python that uses strict lock ordering and RAII mutex guards. Submit code for automated sandbox verification and written design report for FairGrade evaluation.',
      author_name: 'Prof. A. Anupam',
      author_role: 'TEACHER',
      created_at: '2026-03-07T14:45:00.000Z',
      due_date: '2026-03-18T23:59:00.000Z',
      attachments: [{ title: 'bank_sandbox_spec.pdf', type: 'PDF' }],
      comments_count: 8,
    },
    {
      id: 'post-4',
      classroom_id: 'cls-mca-402',
      type: 'Assessment',
      title: 'Midterm Written Assessment: Database Normalization & BCNF Decomposition Proofs',
      content: 'Comprehensive 100-mark evaluation covering 3NF synthesis, BCNF decomposition, and serializable multi-version concurrency control (MVCC). Evaluated with FairGrade multi-pass grading.',
      author_name: 'Prof. A. Anupam',
      author_role: 'TEACHER',
      created_at: '2026-03-06T09:30:00.000Z',
      due_date: '2026-03-15T18:00:00.000Z',
      attachments: [],
      comments_count: 3,
    },
    {
      id: 'post-5',
      classroom_id: 'cls-mca-402',
      type: 'Resource',
      title: 'Curated Resource: Interactive Normalization Decomposition Visualizer',
      content: 'Explore step-by-step canonical cover computations and lossless join tests using the SkillForge curated sandbox tool.',
      author_name: 'SkillForge Co-Pilot',
      author_role: 'AI_AGENT',
      created_at: '2026-03-05T16:00:00.000Z',
      attachments: [{ title: 'Interactive Normalization Visualizer', type: 'SANDBOX' }],
      comments_count: 1,
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
          if (!selectedClassId) setSelectedClassId(json.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      setNotification({ type: 'error', message: 'Please provide both title and content for the post.' });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('skillforge_token');
      const payload = {
        classroom_id: selectedClassId,
        type: newPostType,
        title: newPostTitle,
        content: newPostContent,
        due_date: newPostDueDate || null,
        attachments: newPostAttachment ? [{ title: newPostAttachment, type: 'FILE' }] : [],
      };

      const res = await fetch('/api/teacher/feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(payload),
      });

      const newPostObj = {
        id: `post-${Date.now()}`,
        ...payload,
        author_name: 'Prof. A. Anupam',
        author_role: 'TEACHER',
        created_at: new Date().toISOString(),
        comments_count: 0,
      };

      setPosts([newPostObj, ...posts]);
      setNotification({ type: 'success', message: `📢 "${newPostTitle}" posted to class feed and visible to all enrolled students.` });
      
      // Reset form
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostAttachment('');
      setNewPostDueDate('');
      setIsComposing(false);
    } catch (err) {
      console.error('Error creating post:', err);
      setNotification({ type: 'error', message: 'Failed to publish post.' });
    } finally {
      setLoading(false);
    }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId) || {
    id: 'cls-mca-401',
    name: 'MCA Section A - Advanced Operating Systems',
    code: 'MCA-401-2026',
    join_code: 'SF-MCA-401A',
    student_count: 42,
  };

  const filteredPosts = posts.filter((p) => {
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
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📢</span> Class Feed & Announcements Stream
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
            Broadcast Lessons, Announcements, Resources, Assignments, and Assessments. Enrolled students receive live updates.
          </p>
        </div>

        <button
          onClick={() => setIsComposing(!isComposing)}
          style={{
            padding: '10px 18px',
            background: isComposing ? '#475569' : 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
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
          {isComposing ? '✕ Close Composer' : '+ Create Class Post'}
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

      {/* Classroom Context Bar */}
      <div
        style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8' }}>Classroom:</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            style={{
              padding: '8px 14px',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '14px',
              outline: 'none',
              fontWeight: '500',
            }}
          >
            <option value="ALL">🌐 All My Classes (Aggregated Feed)</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.join_code})
              </option>
            ))}
          </select>
        </div>

        {selectedClassId !== 'ALL' && (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '13px' }}>
            <span style={{ color: '#94a3b8' }}>
              Enrolled Students: <strong style={{ color: '#f8fafc' }}>{selectedClass.student_count || 42}</strong>
            </span>
            <span style={{ color: '#94a3b8' }}>
              Join Code: <code style={{ background: '#0f172a', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px' }}>{selectedClass.join_code || 'SF-MCA-401A'}</code>
            </span>
            <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              🟢 Feed Live
            </span>
          </div>
        )}
      </div>

      {/* Post Composer Modal / Box */}
      {isComposing && (
        <div
          style={{
            background: '#1e293b',
            border: '1px solid #6366f1',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '28px',
            boxShadow: '0 0 25px rgba(99, 102, 241, 0.15)',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✍️</span> Compose New Post for Enrolled Students
          </h2>

          <form onSubmit={handleCreatePost}>
            {/* Post Type Selector */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px' }}>
                Post Type
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['Announcement', 'Lesson', 'Resource', 'Assignment', 'Assessment'].map((type) => {
                  const badge = getPostTypeBadge(type);
                  const isSelected = newPostType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewPostType(type)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${isSelected ? badge.text : '#334155'}`,
                        background: isSelected ? badge.bg : '#0f172a',
                        color: isSelected ? badge.text : '#94a3b8',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span>{badge.icon}</span> {type}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                Post Title
              </label>
              <input
                type="text"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="e.g. Midterm Normalization Review & Exercise Submissions"
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

            {/* Content */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                Post Content & Instructions (Markdown Supported)
              </label>
              <textarea
                rows={5}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Write message, lesson summary, or submission requirements..."
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Optional Due Date & Attachment */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                  Due Date (Optional for Assignments/Assessments)
                </label>
                <input
                  type="datetime-local"
                  value={newPostDueDate}
                  onChange={(e) => setNewPostDueDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
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
                  Attach Document / Sandbox Spec
                </label>
                <input
                  type="text"
                  value={newPostAttachment}
                  onChange={(e) => setNewPostAttachment(e.target.value)}
                  placeholder="e.g. Lecture_07_Notes.pdf or sandbox_guide.md"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
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

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '12px 24px',
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
                {loading ? 'Publishing...' : '🚀 Publish to Feed Now'}
              </button>
              <button
                type="button"
                onClick={() => setIsComposing(false)}
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

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
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
              whiteSpace: 'nowrap',
            }}
          >
            {f === 'ALL' ? '🌐 All Posts' : f}
          </button>
        ))}
      </div>

      {/* Feed Stream */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredPosts.length === 0 ? (
          <div
            style={{
              background: '#1e293b',
              border: '1px dashed #334155',
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center',
              color: '#94a3b8',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#e2e8f0', marginBottom: '4px' }}>No posts in this stream</div>
            <div style={{ fontSize: '13px' }}>Click "+ Create Class Post" above to post to enrolled students.</div>
          </div>
        ) : (
          filteredPosts.map((post) => {
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
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              >
                {/* Post Top Header */}
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
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>
                      {post.author_name}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: post.author_role === 'AI_AGENT' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                        color: post.author_role === 'AI_AGENT' ? '#c084fc' : '#38bdf8',
                      }}
                    >
                      {post.author_role}
                    </span>
                  </div>

                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {new Date(post.created_at).toLocaleString()}
                  </span>
                </div>

                {/* Post Content */}
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', margin: '0 0 8px 0' }}>
                    {post.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-line' }}>
                    {post.content}
                  </p>
                </div>

                {/* Due Date Indicator */}
                {post.due_date && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 12px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '6px',
                      color: '#f87171',
                      fontSize: '12px',
                      fontWeight: '600',
                      width: 'fit-content',
                    }}
                  >
                    <span>⏰ Due:</span> {new Date(post.due_date).toLocaleString()}
                  </div>
                )}

                {/* Attachments */}
                {post.attachments && post.attachments.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {post.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          background: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: '#38bdf8',
                          cursor: 'pointer',
                        }}
                      >
                        <span>📎</span> {att.title || att}
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer Actions */}
                <div
                  style={{
                    borderTop: '1px solid #334155',
                    paddingTop: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    color: '#94a3b8',
                  }}
                >
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      💬 {post.comments_count || 0} Student Comments
                    </span>
                    <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      🟢 Visible to Enrolled Students
                    </span>
                  </div>

                  <button
                    onClick={() => alert(`Post link copied to clipboard!`)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#38bdf8',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    🔗 Share Link
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
