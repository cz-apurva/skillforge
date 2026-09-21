import React, { useState } from 'react';
import StudentDashboardView from './StudentDashboardView';
import StudentClassesView from './StudentClassesView';
import StudentClassFeedView from './StudentClassFeedView';
import StudentMaterialsView from './StudentMaterialsView';
import StudentAssignmentsView from './StudentAssignmentsView';
import StudentTutorView from './StudentTutorView';
import StudentSandboxView from './StudentSandboxView';
import StudentGradesView from './StudentGradesView';
import StudentProgressView from './StudentProgressView';
import StudentProfileView from './StudentProfileView';
import StudentMyLearningView from './StudentMyLearningView';
import StudentPortal from './StudentPortal';

import {
  DashboardIcon,
  ClassesIcon,
  FeedIcon,
  MaterialsIcon,
  ResourcesIcon,
  BrainIcon,
  AssignmentsIcon,
  AssessmentsIcon,
  BotIcon,
  SubmissionsIcon,
  TrophyIcon,
  FairGradeIcon,
  ShieldIcon,
  AnalyticsIcon,
  UserIcon,
  LogOutIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CodeIcon,
  AcademicCapIcon,
} from '../common/Icons';
import StatusIndicator from '../common/StatusIndicator';
import Button from '../common/Button';

export default function StudentLayout({ user, onLogout }) {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tutorPrefillQuery, setTutorPrefillQuery] = useState('');

  // Required exact sidebar items:
  // Dashboard, My Classes, Class Feed, Learning Materials, Resources, My Learning, Assignments, Assessments, AI Tutor, My Submissions, My Grades, FairGrade, Appeals, Progress, Profile, Logout
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon size={16} />, group: 'Overview' },
    { id: 'classes', label: 'My Classes', icon: <ClassesIcon size={16} />, group: 'Academic' },
    { id: 'feed', label: 'Class Feed', icon: <FeedIcon size={16} />, group: 'Academic' },
    { id: 'materials', label: 'Learning Materials', icon: <MaterialsIcon size={16} />, group: 'Learning' },
    { id: 'resources', label: 'Resources', icon: <ResourcesIcon size={16} />, group: 'Learning' },
    { id: 'my-learning', label: 'My Learning', icon: <BrainIcon size={16} />, group: 'Learning' },
    { id: 'assignments', label: 'Assignments', icon: <AssignmentsIcon size={16} />, group: 'Evaluation' },
    { id: 'assessments', label: 'Assessments', icon: <AssessmentsIcon size={16} />, group: 'Evaluation' },
    { id: 'tutor', label: 'AI Tutor', icon: <BotIcon size={16} />, group: 'Learning' },
    { id: 'submissions', label: 'My Submissions', icon: <SubmissionsIcon size={16} />, group: 'Evaluation' },
    { id: 'grades', label: 'My Grades', icon: <TrophyIcon size={16} />, group: 'Evaluation' },
    { id: 'fairgrade', label: 'FairGrade', icon: <FairGradeIcon size={16} />, group: 'Evaluation' },
    { id: 'appeals', label: 'Appeals', icon: <ShieldIcon size={16} />, group: 'Evaluation' },
    { id: 'progress', label: 'Progress', icon: <AnalyticsIcon size={16} />, group: 'Overview' },
    { id: 'profile', label: 'Profile', icon: <UserIcon size={16} />, group: 'Account' },
  ];

  const handleAskTutor = (query) => {
    setTutorPrefillQuery(query);
    setActiveSection('tutor');
  };

  const renderActiveView = () => {
    switch (activeSection) {
      case 'dashboard':
        return <StudentDashboardView onNavigate={(view) => setActiveSection(view)} user={user} />;
      case 'classes':
        return (
          <StudentClassesView
            onNavigateToFeed={() => setActiveSection('feed')}
            onNavigateToMaterials={() => setActiveSection('materials')}
            onNavigateToSandbox={() => setActiveSection('sandbox')}
          />
        );
      case 'feed':
        return (
          <StudentClassFeedView
            onNavigateToSandbox={() => setActiveSection('sandbox')}
            onNavigateToExam={() => setActiveSection('fairgrade')}
          />
        );
      case 'materials':
        return <StudentMaterialsView onAskTutor={handleAskTutor} />;
      case 'resources':
        return <StudentMaterialsView onAskTutor={handleAskTutor} />;
      case 'my-learning':
        return <StudentMyLearningView onNavigate={(view) => setActiveSection(view)} />;
      case 'assignments':
        return (
          <StudentAssignmentsView
            onLaunchSandbox={() => setActiveSection('sandbox')}
            onLaunchWritten={() => setActiveSection('fairgrade')}
          />
        );
      case 'assessments':
        return <StudentPortal user={user} initialStep="submit" />;
      case 'tutor':
        return <StudentTutorView initialQuery={tutorPrefillQuery} />;
      case 'sandbox':
        return (
          <StudentSandboxView
            assignmentId="asg-001"
            onNavigateBack={() => setActiveSection('assignments')}
          />
        );
      case 'submissions':
        return <StudentGradesView onNavigateToAppeal={() => setActiveSection('appeals')} />;
      case 'grades':
        return <StudentGradesView onNavigateToAppeal={() => setActiveSection('appeals')} />;
      case 'fairgrade':
        return <StudentPortal user={user} initialStep="submit" />;
      case 'appeals':
        return <StudentPortal user={user} initialStep="appeal" />;
      case 'progress':
        return <StudentProgressView />;
      case 'profile':
        return <StudentProfileView user={user} />;
      default:
        return <StudentDashboardView onNavigate={(view) => setActiveSection(view)} user={user} />;
    }
  };

  const getPageTitle = () => {
    const item = navItems.find((n) => n.id === activeSection);
    if (item) return item.label;
    if (activeSection === 'sandbox') return 'Automated Code Sandbox';
    if (activeSection === 'appeals') return 'Grade Appeals & Re-Evaluation';
    return 'Student Portal';
  };

  const getPageIcon = () => {
    const item = navItems.find((n) => n.id === activeSection);
    if (item) return item.icon;
    if (activeSection === 'sandbox') return <CodeIcon size={18} />;
    if (activeSection === 'appeals') return <ShieldIcon size={18} />;
    return <AcademicCapIcon size={18} />;
  };

  const groups = ['Overview', 'Academic', 'Learning', 'Evaluation', 'Account'];

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 58px)', background: 'var(--color-bg-app)', color: 'var(--color-text-primary)' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarCollapsed ? '68px' : '256px',
          background: 'var(--color-bg-surface)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease',
          position: 'sticky',
          top: '58px',
          height: 'calc(100vh - 58px)',
          zIndex: 90,
          flexShrink: 0,
        }}
      >
        {/* Brand Header */}
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
                  background: 'var(--color-success-bg)',
                  color: 'var(--color-success-text)',
                  border: '1px solid var(--color-success-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AcademicCapIcon size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text-primary)' }}>
                  Student Portal
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-success-text)', fontWeight: 500, letterSpacing: '0.04em' }}>
                  LEARNING ENVIRONMENT
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
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRightIcon size={16} /> : <ChevronLeftIcon size={16} />}
          </button>
        </div>

        {/* Nav Items grouped */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
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
                      title={sidebarCollapsed ? item.label : undefined}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: sidebarCollapsed ? '8px 0' : '7px 10px',
                        justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: isActive ? 'var(--color-success-bg)' : 'transparent',
                        color: isActive ? 'var(--color-success-text)' : 'var(--color-text-secondary)',
                        fontSize: '13px',
                        fontWeight: isActive ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        marginBottom: '2px',
                        boxShadow: isActive ? 'inset 0 0 0 1px var(--color-success-border)' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'var(--color-bg-surface-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', color: isActive ? 'var(--color-success)' : 'inherit' }}>
                        {item.icon}
                      </span>
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* User Info & Logout Button */}
        <div
          style={{
            padding: sidebarCollapsed ? '10px 0' : '12px 14px',
            borderTop: '1px solid var(--color-border-subtle)',
            background: 'var(--color-bg-subtle)',
          }}
        >
          {!sidebarCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: 'var(--color-success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                {(user?.name || user?.email || 'Student').charAt(0)}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {user?.name || user?.email || 'Student'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-success-text)' }}>ENROLLED STUDENT</div>
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            icon={<LogOutIcon size={14} />}
            style={{ width: '100%', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', color: 'var(--color-danger-text)' }}
            title={sidebarCollapsed ? 'Logout' : undefined}
          >
            {!sidebarCollapsed && <span>Sign Out</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--color-bg-app)' }}>
        {/* Top Navbar */}
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
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--color-success-text)' }}>
              {getPageIcon()}
            </span>
            <h1 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
              {getPageTitle()}
            </h1>
            <StatusIndicator status="operational" label="Ready" />
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveSection('tutor')}
              icon={<BotIcon size={14} />}
            >
              AI Tutor
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveSection('sandbox')}
              icon={<CodeIcon size={14} />}
            >
              Sandbox
            </Button>
          </div>
        </header>

        {/* View Router */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}

