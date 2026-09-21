import React, { useState } from 'react';
import AdminDashboardView from './AdminDashboardView';
import AdminUsersView from './AdminUsersView';
import AdminClassroomsView from './AdminClassroomsView';
import AdminSubjectsView from './AdminSubjectsView';
import AdminAssessmentsView from './AdminAssessmentsView';
import AdminAiServicesView from './AdminAiServicesView';
import AdminFairgradeView from './AdminFairgradeView';
import AdminAnalyticsView from './AdminAnalyticsView';
import AdminAuditLogsView from './AdminAuditLogsView';
import AdminSettingsView from './AdminSettingsView';
import AdminProfileView from './AdminProfileView';

import {
  DashboardIcon,
  UsersIcon,
  UserIcon,
  AcademicCapIcon,
  ClassesIcon,
  MaterialsIcon,
  AssignmentsIcon,
  BotIcon,
  FairGradeIcon,
  AnalyticsIcon,
  FeedIcon,
  SettingsIcon,
  LogOutIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShieldIcon,
} from '../common/Icons';
import StatusIndicator from '../common/StatusIndicator';
import Badge from '../common/Badge';
import Button from '../common/Button';

export default function AdminLayout({ user, onLogout }) {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon size={16} />, group: 'Overview' },
    { id: 'users', label: 'All Users', icon: <UsersIcon size={16} />, group: 'User Management' },
    { id: 'teachers', label: 'Teachers', icon: <UserIcon size={16} />, group: 'User Management' },
    { id: 'students', label: 'Students', icon: <AcademicCapIcon size={16} />, group: 'User Management' },
    { id: 'classes', label: 'Classrooms', icon: <ClassesIcon size={16} />, group: 'Academic' },
    { id: 'subjects', label: 'Subjects', icon: <MaterialsIcon size={16} />, group: 'Academic' },
    { id: 'assessments', label: 'Assessments', icon: <AssignmentsIcon size={16} />, group: 'Academic' },
    { id: 'ai-services', label: 'AI Services', icon: <BotIcon size={16} />, group: 'AI & Telemetry' },
    { id: 'fairgrade', label: 'FairGrade Monitoring', icon: <FairGradeIcon size={16} />, group: 'AI & Telemetry' },
    { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon size={16} />, group: 'Analytics & Logs' },
    { id: 'audit-logs', label: 'Audit Logs', icon: <FeedIcon size={16} />, group: 'Analytics & Logs' },
    { id: 'settings', label: 'System Settings', icon: <SettingsIcon size={16} />, group: 'System' },
    { id: 'profile', label: 'Admin Profile', icon: <UserIcon size={16} />, group: 'System' },
  ];

  const renderActiveView = () => {
    switch (activeSection) {
      case 'dashboard':
        return <AdminDashboardView onNavigate={(view) => setActiveSection(view)} />;
      case 'users':
        return <AdminUsersView defaultRole="ALL" title="All Platform Users" />;
      case 'teachers':
        return <AdminUsersView defaultRole="TEACHER" title="Faculty & Teachers Directory" />;
      case 'students':
        return <AdminUsersView defaultRole="STUDENT" title="Enrolled Students Directory" />;
      case 'classes':
        return <AdminClassroomsView />;
      case 'subjects':
        return <AdminSubjectsView />;
      case 'assessments':
        return <AdminAssessmentsView />;
      case 'ai-services':
        return <AdminAiServicesView />;
      case 'fairgrade':
        return <AdminFairgradeView />;
      case 'analytics':
        return <AdminAnalyticsView />;
      case 'audit-logs':
        return <AdminAuditLogsView />;
      case 'settings':
        return <AdminSettingsView />;
      case 'profile':
        return <AdminProfileView user={user} />;
      default:
        return <AdminDashboardView onNavigate={(view) => setActiveSection(view)} />;
    }
  };

  const getPageTitle = () => {
    const item = navItems.find((n) => n.id === activeSection);
    return item ? item.label : 'Admin Portal';
  };

  const getPageIcon = () => {
    const item = navItems.find((n) => n.id === activeSection);
    return item ? item.icon : <ShieldIcon size={18} />;
  };

  const groups = ['Overview', 'User Management', 'Academic', 'AI & Telemetry', 'Analytics & Logs', 'System'];

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 58px)', background: 'var(--color-bg-app)', color: 'var(--color-text-primary)' }}>
      {/* Admin Sidebar */}
      <aside
        style={{
          width: sidebarCollapsed ? '68px' : '256px',
          transition: 'width 0.2s ease',
          background: 'var(--color-bg-surface)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'sticky',
          top: '58px',
          height: 'calc(100vh - 58px)',
          zIndex: 90,
          flexShrink: 0,
        }}
      >
        <div>
          {/* Sidebar Header & Toggle */}
          <div
            style={{
              padding: sidebarCollapsed ? '16px 0' : '16px 18px',
              borderBottom: '1px solid var(--color-border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'space-between',
            }}
          >
            {!sidebarCollapsed && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-warning-bg)',
                    color: 'var(--color-warning-text)',
                    border: '1px solid var(--color-warning-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldIcon size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Admin Console
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-warning-text)', fontWeight: 500, letterSpacing: '0.04em' }}>
                    SYSTEM GOVERNANCE
                  </div>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {sidebarCollapsed ? <ChevronRightIcon size={16} /> : <ChevronLeftIcon size={16} />}
            </button>
          </div>

          {/* Navigation Links Grouped */}
          <nav style={{ padding: '12px 8px', overflowY: 'auto', maxHeight: 'calc(100vh - 180px)' }}>
            {groups.map((grp) => {
              const items = navItems.filter((i) => i.group === grp);
              if (items.length === 0) return null;
              return (
                <div key={grp} style={{ marginBottom: '14px' }}>
                  {!sidebarCollapsed && (
                    <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', padding: '4px 10px', letterSpacing: '0.06em' }}>
                      {grp}
                    </div>
                  )}
                  {items.map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveSection(item.id)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: sidebarCollapsed ? '8px 0' : '7px 10px',
                          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                          borderRadius: 'var(--radius-md)',
                          border: 'none',
                          background: isActive ? 'var(--color-primary-light)' : 'transparent',
                          color: isActive ? '#a5b4fc' : 'var(--color-text-secondary)',
                          fontWeight: isActive ? 600 : 400,
                          fontSize: '13px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isActive ? 'inset 0 0 0 1px var(--color-primary-border)' : 'none',
                          marginBottom: '2px',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.backgroundColor = 'var(--color-bg-surface-hover)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', color: isActive ? 'var(--color-primary)' : 'inherit' }}>
                          {item.icon}
                        </span>
                        {!sidebarCollapsed && <span>{item.label}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: User Card & Logout */}
        <div style={{ padding: sidebarCollapsed ? '10px 0' : '12px 14px', borderTop: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-subtle)' }}>
          {!sidebarCollapsed && (
            <div style={{ marginBottom: '10px', fontSize: '0.8rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{user?.name || user?.email || 'Administrator'}</div>
              <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)' }}>{user?.email || ''}</div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onLogout && onLogout()}
            icon={<LogOutIcon size={14} />}
            style={{ width: '100%', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', color: 'var(--color-danger-text)' }}
          >
            {!sidebarCollapsed && <span>Sign Out</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--color-bg-app)' }}>
        {/* Top Header */}
        <header
          style={{
            height: '56px',
            background: 'var(--color-bg-surface)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            position: 'sticky',
            top: '58px',
            zIndex: 80,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--color-primary)' }}>
              {getPageIcon()}
            </span>
            <h1 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
              {getPageTitle()}
            </h1>
            <StatusIndicator status="operational" label="Operational" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Badge variant="warning" size="sm">
              RBAC: ADMIN
            </Badge>
          </div>
        </header>

        {/* View Router */}
        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}

