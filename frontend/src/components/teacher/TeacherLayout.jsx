import React, { useState } from 'react';
import TeacherDashboardView from './TeacherDashboardView';
import TeacherClassesView from './TeacherClassesView';
import TeacherClassFeedView from './TeacherClassFeedView';
import TeacherMaterialsView from './TeacherMaterialsView';
import TeacherAssignmentsView from './TeacherAssignmentsView';
import TeacherSubmissionsView from './TeacherSubmissionsView';
import TeacherCopilotView from './TeacherCopilotView';
import TeacherResourcesView from './TeacherResourcesView';
import TeacherProfileView from './TeacherProfileView';
import TeacherSettingsView from './TeacherSettingsView';
import TeacherInterventionCenter from './TeacherInterventionCenter';
import FairGradeDashboard from '../fairgrade/FairGradeDashboard';
import FairGradeAnalytics from '../analytics/FairGradeAnalytics';
import FlaggedAnswers from '../fairgrade/FlaggedAnswers';

import {
  DashboardIcon,
  ClassesIcon,
  FeedIcon,
  MaterialsIcon,
  AssignmentsIcon,
  AssessmentsIcon,
  SubmissionsIcon,
  FairGradeIcon,
  BrainIcon,
  BotIcon,
  AnalyticsIcon,
  ResourcesIcon,
  UserIcon,
  SettingsIcon,
  LogOutIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AlertTriangleIcon,
} from '../common/Icons';
import StatusIndicator from '../common/StatusIndicator';
import Button from '../common/Button';

export default function TeacherLayout({ user, onLogout }) {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Exact navigation items required:
  // Dashboard, My Classes, Class Feed, Learning Materials, Assignments, Assessments, Submissions, AI FairGrade, Intervention Center, Analytics, Teacher Co-Pilot, Resources, Profile, Settings, Logout
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon size={16} />, group: 'Overview' },
    { id: 'classes', label: 'My Classes', icon: <ClassesIcon size={16} />, group: 'Teaching' },
    { id: 'feed', label: 'Class Feed', icon: <FeedIcon size={16} />, group: 'Teaching' },
    { id: 'materials', label: 'Learning Materials', icon: <MaterialsIcon size={16} />, group: 'Teaching' },
    { id: 'assignments', label: 'Assignments', icon: <AssignmentsIcon size={16} />, group: 'Evaluation' },
    { id: 'assessments', label: 'Assessments', icon: <AssessmentsIcon size={16} />, group: 'Evaluation' },
    { id: 'submissions', label: 'Submissions', icon: <SubmissionsIcon size={16} />, group: 'Evaluation' },
    { id: 'fairgrade', label: 'AI FairGrade', icon: <FairGradeIcon size={16} />, group: 'AI & Telemetry' },
    { id: 'interventions', label: 'Intervention Center', icon: <BrainIcon size={16} />, group: 'AI & Telemetry' },
    { id: 'copilot', label: 'Teacher Co-Pilot', icon: <BotIcon size={16} />, group: 'AI & Telemetry' },
    { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon size={16} />, group: 'AI & Telemetry' },
    { id: 'resources', label: 'Resources', icon: <ResourcesIcon size={16} />, group: 'Content' },
    { id: 'profile', label: 'Profile', icon: <UserIcon size={16} />, group: 'Account' },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={16} />, group: 'Account' },
  ];

  const handleOpenFairGradeForAssessment = (assessmentId) => {
    setSelectedAssessmentId(assessmentId);
    setActiveSection('fairgrade');
  };

  const renderActiveView = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <TeacherDashboardView
            onNavigate={(view) => {
              if (view.startsWith('fairgrade/')) {
                const aId = view.split('/')[1];
                handleOpenFairGradeForAssessment(aId);
              } else {
                setActiveSection(view);
              }
            }}
          />
        );
      case 'classes':
        return <TeacherClassesView onNavigateToFeed={() => setActiveSection('feed')} onNavigateToMaterials={() => setActiveSection('materials')} />;
      case 'feed':
        return <TeacherClassFeedView />;
      case 'materials':
        return <TeacherMaterialsView />;
      case 'assignments':
        return (
          <TeacherAssignmentsView
            onNavigateToFairgrade={(aId) => handleOpenFairGradeForAssessment(aId || 'mca-asg-401')}
          />
        );
      case 'assessments':
        return (
          <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
            <FairGradeDashboard
              initialAssessmentId={selectedAssessmentId}
              initialTab={selectedAssessmentId ? 'progress' : 'assessments'}
            />
          </div>
        );
      case 'submissions':
        return (
          <TeacherSubmissionsView
            onNavigateToFlagged={() => setActiveSection('flagged-answers')}
            onNavigateToFairgrade={(aId) => handleOpenFairGradeForAssessment(aId)}
          />
        );
      case 'fairgrade':
        return (
          <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
            <FairGradeDashboard
              initialAssessmentId={selectedAssessmentId}
              initialTab={selectedAssessmentId ? 'progress' : 'assessments'}
            />
          </div>
        );
      case 'flagged-answers':
        return (
          <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
            <FlaggedAnswers />
          </div>
        );
      case 'interventions':
        return <TeacherInterventionCenter onNavigate={(view) => setActiveSection(view)} />;
      case 'copilot':
        return <TeacherCopilotView onNavigateToFeed={() => setActiveSection('feed')} />;
      case 'analytics':
        return (
          <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
            <FairGradeAnalytics />
          </div>
        );
      case 'resources':
        return <TeacherResourcesView />;
      case 'profile':
        return <TeacherProfileView user={user} />;
      case 'settings':
        return <TeacherSettingsView />;
      default:
        return <TeacherDashboardView onNavigate={(view) => setActiveSection(view)} />;
    }
  };

  const getPageTitle = () => {
    const item = navItems.find((n) => n.id === activeSection);
    if (item) return item.label;
    if (activeSection === 'flagged-answers') return 'Flagged FairGrade Answers';
    return 'Teacher Portal';
  };

  const getPageIcon = () => {
    const item = navItems.find((n) => n.id === activeSection);
    if (item) return item.icon;
    if (activeSection === 'flagged-answers') return <AlertTriangleIcon size={18} color="var(--color-warning)" />;
    return <UserIcon size={18} />;
  };

  // Group nav items by section
  const groups = ['Overview', 'Teaching', 'Evaluation', 'AI & Telemetry', 'Content', 'Account'];

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
        {/* Brand / Portal Header */}
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
                  background: 'var(--color-primary-light)',
                  color: '#a5b4fc',
                  border: '1px solid var(--color-primary-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UserIcon size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text-primary)' }}>
                  Faculty Portal
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 500, letterSpacing: '0.04em' }}>
                  TEACHER WORKSPACE
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
                        background: isActive ? 'var(--color-primary-light)' : 'transparent',
                        color: isActive ? '#a5b4fc' : 'var(--color-text-secondary)',
                        fontSize: '13px',
                        fontWeight: isActive ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        marginBottom: '2px',
                        boxShadow: isActive ? 'inset 0 0 0 1px var(--color-primary-border)' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'var(--color-bg-surface-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
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
                  background: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                {(user?.name || user?.email || 'Faculty').charAt(0)}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {user?.name || user?.email || 'Faculty'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>FACULTY MEMBER</div>
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
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--color-primary)' }}>
              {getPageIcon()}
            </span>
            <h1 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
              {getPageTitle()}
            </h1>
            <StatusIndicator status="operational" label="Operational" />
          </div>

          {/* Header Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveSection('copilot')}
              icon={<BotIcon size={14} />}
            >
              Co-Pilot
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveSection('feed')}
              icon={<FeedIcon size={14} />}
            >
              Class Stream
            </Button>

            <div
              style={{
                padding: '4px 10px',
                background: 'var(--color-bg-app)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-subtle)',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
              }}
            >
              MCA Dept
            </div>
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

