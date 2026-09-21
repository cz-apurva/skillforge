import React, { useState, useEffect } from 'react';

export default function StudentProfileView({ user }) {
  const [profile, setProfile] = useState({
    name: user?.name || 'Student',
    email: user?.email || '',
    roll_number: user?.id ? `SF-${user.id.slice(0, 8).toUpperCase()}` : 'SF-MCA-2026-042',
    program: 'Master of Computer Applications (MCA)',
    semester: 'Semester 4',
    academic_year: '2026-2027',
    institution: 'SkillForge Institute of Technology',
    specialization: 'Distributed Cloud Architectures & Cryptographic Systems',
  });

  useEffect(() => {
    if (user) {
      setProfile((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        roll_number: user.id ? `SF-${user.id.slice(0, 8).toUpperCase()}` : prev.roll_number,
      }));
    }
  }, [user]);

  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '850px', margin: '0 auto', color: '#f8fafc' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>👤</span> Student Academic Profile
        </h1>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
          Manage your verified enrollment details, academic standing, and specialization tracks.
        </p>
      </div>

      {saved && (
        <div style={{ padding: '12px 18px', marginBottom: '20px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#6ee7b7', fontSize: '14px' }}>
          ✓ Profile preferences updated successfully!
        </div>
      )}

      <form onSubmit={handleSave} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #334155' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800', color: '#fff' }}>
            {profile.name.charAt(0)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>{profile.name}</h2>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)' }}>
                ENROLLED STUDENT
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>{profile.email} • Roll: {profile.roll_number}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>Full Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>Roll / Registration Number</label>
            <input
              type="text"
              value={profile.roll_number}
              disabled
              style={{ width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#64748b', fontSize: '14px', boxSizing: 'border-box', cursor: 'not-allowed' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>Degree Program</label>
            <input
              type="text"
              value={profile.program}
              disabled
              style={{ width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#64748b', fontSize: '14px', boxSizing: 'border-box', cursor: 'not-allowed' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>Current Semester</label>
            <input
              type="text"
              value={profile.semester}
              disabled
              style={{ width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#64748b', fontSize: '14px', boxSizing: 'border-box', cursor: 'not-allowed' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>Specialization Elective Track</label>
          <input
            type="text"
            value={profile.specialization}
            onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
            style={{ width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
        >
          💾 Save Changes
        </button>
      </form>
    </div>
  );
}
