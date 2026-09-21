import React, { useState, useEffect } from 'react';

export default function StudentClassesView({ onNavigateToFeed, onNavigateToMaterials, onNavigateToSandbox }) {
  const [classes, setClasses] = useState([
    {
      id: 'cls-mca-401',
      code: 'MCA-401-2026',
      name: 'MCA Section A - Advanced Operating Systems',
      subject: 'Operating Systems & System Programming',
      description: 'Kernel architectures, multi-threading, concurrency control, and distributed deadlock detection.',
      semester: 'Semester 4',
      academic_year: '2026-2027',
      join_code: 'SF-MCA-401A',
      teacher_name: 'Prof. A. Anupam',
      student_count: 42,
      materials_count: 4,
      assignments_count: 2,
    },
    {
      id: 'cls-mca-402',
      code: 'MCA-402-2026',
      name: 'MCA Section B - Database Engineering & Distributed ACID',
      subject: 'Database Systems & Query Optimization',
      description: 'Relational design, normalization rigor (3NF/BCNF), Raft consensus, and transaction isolation levels.',
      semester: 'Semester 4',
      academic_year: '2026-2027',
      join_code: 'SF-MCA-402B',
      teacher_name: 'Prof. A. Anupam',
      student_count: 38,
      materials_count: 6,
      assignments_count: 3,
    },
  ]);

  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joiningLoading, setJoiningLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('skillforge_token');
      const res = await fetch('/api/student/classes', {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setClasses(json.data);
        }
      }
    } catch (err) {
      console.warn('Using local classes mock:', err);
    }
  };

  const handleJoinClass = async (e) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) {
      setNotification({ type: 'error', message: 'Please enter a valid class join code.' });
      return;
    }

    setJoiningLoading(true);
    setNotification(null);

    try {
      const token = localStorage.getItem('skillforge_token');
      const res = await fetch('/api/student/classes/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ join_code: joinCodeInput.trim() }),
      });

      if (res.ok) {
        const json = await res.json();
        setNotification({ type: 'success', message: json.data.message || 'Successfully joined classroom!' });
        if (!json.data.already_enrolled && json.data.classroom) {
          setClasses([...classes, json.data.classroom]);
        }
        setIsJoining(false);
        setJoinCodeInput('');
      } else {
        const json = await res.json().catch(() => ({}));
        setNotification({
          type: 'error',
          message: json.message || `Class with code "${joinCodeInput.trim()}" not found. Verify with your instructor.`,
        });
      }
    } catch (err) {
      console.error('Error joining class:', err);
      // Fallback demo simulation
      if (joinCodeInput.trim().toUpperCase() === 'SF-SEC-502C') {
        const newClass = {
          id: 'cls-sec-502',
          code: 'SEC-502-2026',
          name: 'Network Security & Applied Cryptography',
          subject: 'Information & Network Security',
          description: 'Zero-trust networks, TLS 1.3 protocol analysis, asymmetric cryptography, and penetration testing sandboxes.',
          semester: 'Semester 4 Specialization',
          academic_year: '2026-2027',
          join_code: 'SF-SEC-502C',
          teacher_name: 'Prof. A. Anupam',
          student_count: 36,
          materials_count: 3,
          assignments_count: 1,
        };
        setClasses([...classes, newClass]);
        setNotification({ type: 'success', message: '🎉 Enrolled successfully in Network Security & Applied Cryptography!' });
        setIsJoining(false);
        setJoinCodeInput('');
      } else {
        setNotification({ type: 'error', message: 'Invalid class code. Please try SF-SEC-502C for demo.' });
      }
    } finally {
      setJoiningLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🏫</span> My Academic Classrooms
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
            Access enrolled courses, teacher announcements, syllabus notes, and active assignments.
          </p>
        </div>

        <button
          onClick={() => setIsJoining(true)}
          style={{
            padding: '10px 18px',
            background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
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
          <span>➕</span> Join Class with Code
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

      {/* Join Code Modal */}
      {isJoining && (
        <div
          style={{
            background: '#1e293b',
            border: '1px solid #6366f1',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '28px',
            boxShadow: '0 0 25px rgba(99, 102, 241, 0.2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔑</span> Enter Classroom Join Code
            </h2>
            <button
              onClick={() => setIsJoining(false)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          <p style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '16px' }}>
            Ask your teacher for the 8-character class join code (e.g. <code>SF-SEC-502C</code> or <code>SF-MCA-401A</code>).
          </p>

          <form onSubmit={handleJoinClass} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="e.g. SF-SEC-502C"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              style={{
                flex: '1 1 250px',
                padding: '10px 14px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '14px',
                textTransform: 'uppercase',
                fontFamily: 'monospace',
                letterSpacing: '0.05em',
              }}
            />
            <button
              type="submit"
              disabled={joiningLoading}
              style={{
                padding: '10px 24px',
                background: joiningLoading ? '#475569' : '#10b981',
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: joiningLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {joiningLoading ? 'Verifying...' : 'Enroll in Class'}
            </button>
            <button
              type="button"
              onClick={() => setJoinCodeInput('SF-SEC-502C')}
              style={{
                padding: '10px 14px',
                background: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#38bdf8',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Paste Demo Code: SF-SEC-502C
            </button>
          </form>
        </div>
      )}

      {/* Classrooms Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
        {classes.map((cls) => (
          <div
            key={cls.id}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
              transition: 'transform 0.2s, border-color 0.2s',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#38bdf8' }}>
                  {cls.code || cls.subject}
                </span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: '#0f172a', color: '#94a3b8' }}>
                  Code: {cls.join_code}
                </span>
              </div>

              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', margin: '0 0 8px 0' }}>
                {cls.name}
              </h2>

              <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                {cls.description}
              </p>

              <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>👨‍🏫</span> Faculty Instructor: <strong style={{ color: '#f8fafc' }}>{cls.teacher_name || 'Prof. A. Anupam'}</strong>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #334155', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setSelectedClass(cls)}
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
                  👁️ Class Details
                </button>
                <button
                  onClick={() => onNavigateToFeed && onNavigateToFeed(cls.id)}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    borderRadius: '6px',
                    color: '#38bdf8',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  📢 Stream
                </button>
              </div>

              <span style={{ fontSize: '11px', color: '#34d399', background: 'rgba(16, 185, 129, 0.1)', padding: '3px 8px', borderRadius: '4px' }}>
                🟢 Enrolled
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Class Details Modal */}
      {selectedClass && (
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
              maxWidth: '650px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 0 35px rgba(99, 102, 241, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: '700' }}>{selectedClass.subject}</span>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc', margin: '4px 0 0 0' }}>
                  {selectedClass.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedClass(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '20px' }}>
              {selectedClass.description}
            </p>

            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Instructor</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>{selectedClass.teacher_name || 'Prof. A. Anupam'}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Academic Semester</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>{selectedClass.semester || 'MCA Semester 4'}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Class Join Code</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#38bdf8', fontFamily: 'monospace' }}>{selectedClass.join_code}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Enrolled Cohort</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>{selectedClass.student_count || 40} Students</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setSelectedClass(null);
                  if (onNavigateToFeed) onNavigateToFeed(selectedClass.id);
                }}
                style={{ padding: '10px 18px', background: '#38bdf8', border: 'none', borderRadius: '6px', color: '#0f172a', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >
                Go to Class Feed Stream →
              </button>
              <button
                onClick={() => setSelectedClass(null)}
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
