import React, { useState, useEffect, useRef } from 'react';
import { BellIcon, LogOutIcon, AcademicCapIcon, ShieldIcon, UserIcon, CheckIcon } from './common/Icons';
import Badge from './common/Badge';
import Button from './common/Button';

export default function Navbar({
  user,
  currentView,
  onNavigate,
  onLogout,
}) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('skillforge_token');
      const res = await fetch('/api/notifications', {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (res.ok) {
        const json = await res.json();
        const list = json.data?.notifications || [];
        setNotifications(list);
        setUnreadCount(json.data?.unread_count || list.filter((n) => !n.is_read).length);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Click outside listener for dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('skillforge_token');
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('skillforge_token');
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.is_read) {
      handleMarkAsRead(notif.id, { stopPropagation: () => {} });
    }
    setIsOpen(false);

    // Contextual navigation based on record_type
    if (onNavigate) {
      if (notif.record_type === 'submission') {
        if (user.role === 'TEACHER') onNavigate('teacher-grading');
        else if (user.role === 'STUDENT') onNavigate('student-submissions');
      } else if (notif.record_type === 'appeal') {
        if (user.role === 'TEACHER') onNavigate('teacher-appeals');
        else if (user.role === 'STUDENT') onNavigate('student-submissions');
      } else if (notif.record_type === 'copilot_recommendation') {
        onNavigate('teacher-copilot');
      } else if (notif.record_type === 'assessment') {
        if (user.role === 'STUDENT') onNavigate('student-assignments');
        else onNavigate('teacher-assignments');
      } else if (notif.record_type === 'ai_service') {
        onNavigate('admin-ai-services');
      } else if (notif.record_type === 'security_log') {
        onNavigate('admin-audit-logs');
      }
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.is_read;
    return true;
  });

  return (
    <header
      style={{
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-bg-surface)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '0.65rem 1.75rem',
      }}
    >
      <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Brand */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
          onClick={() => onNavigate && user && onNavigate(`${user.role.toLowerCase()}-dashboard`)}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #0284c7 100%)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            SF
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}>
                SkillForge AI
              </span>
              <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                • Adaptive Classroom
              </span>
            </div>
          </div>
        </div>

        {/* Navigation & Role-Specific Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user ? (
            <>
              {/* Role Indicator & Portal Switcher */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'var(--color-bg-app)',
                  padding: '0.25rem 0.35rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {user.role === 'ADMIN' && (
                  <button
                    type="button"
                    onClick={() => onNavigate('admin-dashboard')}
                    className={`btn ${currentView === 'admin-dashboard' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.785rem' }}
                  >
                    <ShieldIcon size={14} />
                    <span>Admin</span>
                  </button>
                )}
                {(user.role === 'ADMIN' || user.role === 'TEACHER') && (
                  <button
                    type="button"
                    onClick={() => onNavigate('teacher-dashboard')}
                    className={`btn ${currentView === 'teacher-dashboard' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.785rem' }}
                  >
                    <UserIcon size={14} />
                    <span>Faculty</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onNavigate('student-dashboard')}
                  className={`btn ${currentView === 'student-dashboard' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.785rem' }}
                >
                  <AcademicCapIcon size={14} />
                  <span>Student</span>
                </button>
              </div>

              {/* Notification Bell Dropdown */}
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsOpen(!isOpen)}
                  style={{
                    background: isOpen ? 'var(--color-primary-light)' : 'var(--color-bg-app)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.45rem 0.6rem',
                    cursor: 'pointer',
                    color: isOpen ? '#a5b4fc' : 'var(--color-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    transition: 'all 0.15s ease',
                  }}
                  title="Notifications & Alerts"
                >
                  <BellIcon size={16} />
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: 'var(--color-danger)',
                        color: '#fff',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '0.05rem 0.3rem',
                        borderRadius: 'var(--radius-full)',
                        border: '2px solid var(--color-bg-surface)',
                        minWidth: '16px',
                        textAlign: 'center',
                      }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Panel */}
                {isOpen && (
                  <div
                    className="animate-fade-in"
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 8px)',
                      width: '360px',
                      maxHeight: '460px',
                      background: 'var(--color-bg-surface-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: 'var(--shadow-lg)',
                      display: 'flex',
                      flexDirection: 'column',
                      zIndex: 200,
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        padding: '0.85rem 1rem',
                        borderBottom: '1px solid var(--color-border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>Activity Alerts</span>
                        {unreadCount > 0 && (
                          <Badge variant="danger" size="sm">
                            {unreadCount} new
                          </Badge>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-primary-hover)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        Mark all as read
                      </button>
                    </div>

                    {/* Filter Pills */}
                    <div
                      style={{
                        padding: '0.4rem 0.85rem',
                        background: 'var(--color-bg-app)',
                        borderBottom: '1px solid var(--color-border-subtle)',
                        display: 'flex',
                        gap: '0.4rem',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setFilter('ALL')}
                        style={{
                          background: filter === 'ALL' ? 'var(--color-primary)' : 'transparent',
                          border: 'none',
                          color: filter === 'ALL' ? '#fff' : 'var(--color-text-muted)',
                          padding: '0.2rem 0.55rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.725rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        All ({notifications.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilter('UNREAD')}
                        style={{
                          background: filter === 'UNREAD' ? 'var(--color-primary)' : 'transparent',
                          border: 'none',
                          color: filter === 'UNREAD' ? '#fff' : 'var(--color-text-muted)',
                          padding: '0.2rem 0.55rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.725rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        Unread ({unreadCount})
                      </button>
                    </div>

                    {/* Notifications List */}
                    <div style={{ overflowY: 'auto', maxHeight: '340px', padding: '0.5rem' }}>
                      {filteredNotifications.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                          No notifications right now
                        </div>
                      ) : (
                        filteredNotifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            style={{
                              padding: '0.75rem',
                              borderRadius: 'var(--radius-md)',
                              background: notif.is_read ? 'transparent' : 'var(--color-bg-surface-hover)',
                              border: notif.is_read ? '1px solid transparent' : '1px solid var(--color-border)',
                              marginBottom: '0.35rem',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.3rem',
                              transition: 'background-color 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <strong style={{ fontSize: '0.8125rem', color: notif.is_read ? 'var(--color-text-secondary)' : 'var(--color-text-primary)' }}>
                                {notif.title}
                              </strong>
                              {!notif.is_read && (
                                <button
                                  type="button"
                                  onClick={(e) => handleMarkAsRead(notif.id, e)}
                                  title="Mark as read"
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--color-primary)',
                                    fontSize: '0.7rem',
                                    cursor: 'pointer',
                                    padding: '0 0.2rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.2rem',
                                  }}
                                >
                                  <CheckIcon size={12} /> Read
                                </button>
                              )}
                            </div>

                            <p style={{ fontSize: '0.765rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.35 }}>
                              {notif.message}
                            </p>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.15rem' }}>
                              {notif.record_id && (
                                <span
                                  style={{
                                    fontSize: '0.675rem',
                                    fontFamily: 'var(--font-mono)',
                                    background: 'var(--color-bg-app)',
                                    padding: '0.1rem 0.35rem',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'var(--color-text-muted)',
                                    border: '1px solid var(--color-border-subtle)',
                                  }}
                                >
                                  Ref: #{notif.record_id.slice(0, 10)}
                                </span>
                              )}
                              <span style={{ fontSize: '0.675rem', color: 'var(--color-text-muted)' }}>
                                {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Identity Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{user.name || user.email || 'User'}</div>
                  <Badge
                    variant={user.role === 'ADMIN' ? 'warning' : user.role === 'TEACHER' ? 'info' : 'success'}
                    size="sm"
                    style={{ marginTop: '0.1rem' }}
                  >
                    {user.role}
                  </Badge>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onLogout}
                  icon={<LogOutIcon size={14} />}
                  title="Sign out of SkillForge"
                >
                  Sign Out
                </Button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate('login')}
              >
                Sign In
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

