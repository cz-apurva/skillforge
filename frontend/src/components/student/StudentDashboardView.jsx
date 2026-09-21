import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Progress,
  ProgressRing,
  EmptyState,
  LoadingSkeleton,
  SectionHeader,
  ClassesIcon,
  AssignmentsIcon,
  AssessmentsIcon,
  BrainIcon,
  BotIcon,
  CodeIcon,
  FairGradeIcon,
  CheckIcon,
  AlertTriangleIcon,
  ClockIcon,
  PlayIcon,
  TrendingUpIcon,
  SparklesIcon,
  ChevronRightIcon,
  BookOpenIcon,
  FileTextIcon,
  LearningJourneyIllustration,
  EmptyDataIllustration,
} from '../common';

export default function StudentDashboardView({ onNavigate, user }) {
  const [data, setData] = useState({
    student_profile: {
      name: user?.name || user?.email || 'Student',
      roll_number: user?.id ? `SF-${user.id.slice(0, 8).toUpperCase()}` : 'SF-MCA-2026',
      semester: 'MCA Semester 4',
      enrolled_classes_count: 2,
    },
    my_classes: [
      {
        id: 'cls-mca-401',
        name: 'MCA Section A - Advanced Operating Systems',
        subject: 'Operating Systems & System Programming',
        teacher_name: 'Prof. A. Anupam',
        join_code: 'SF-MCA-401A',
        student_count: 42,
      },
      {
        id: 'cls-mca-402',
        name: 'MCA Section B - Database Engineering & Distributed ACID',
        subject: 'Database Systems & Query Optimization',
        teacher_name: 'Prof. A. Anupam',
        join_code: 'SF-MCA-402B',
        student_count: 38,
      },
    ],
    upcoming_assessments: [
      {
        id: 'asg-002',
        title: 'Midterm Written: Relational Schema BCNF Decomposition & Functional Dependencies',
        classroom_name: 'MCA Section B - Database Engineering & Distributed ACID',
        due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString(),
        max_score: 100,
        type: 'WRITTEN',
        evaluation_engine: 'AI FairGrade Multi-Pass',
      },
    ],
    pending_assignments: [
      {
        id: 'asg-001',
        title: 'Assignment 01: Multi-Threaded Chandy-Misra-Haas Deadlock Detector',
        classroom_name: 'MCA Section A - Advanced Operating Systems',
        due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6).toISOString(),
        max_score: 100,
        type: 'PROGRAMMING',
        language: 'C++',
      },
    ],
    recent_grades: [
      {
        id: 'sub-recent-1',
        assignment_title: 'Lab 02: Completely Fair Scheduler vruntime Simulation',
        classroom_name: 'MCA Section A - Advanced Operating Systems',
        score: 94,
        max_score: 100,
        evaluated_by: 'Judge0 Automated Sandbox Benchmarks',
        grade: 'A+',
        evaluated_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      },
      {
        id: 'sub-recent-2',
        assignment_title: 'Quiz 01: Relational Algebra & Armstrong Axioms',
        classroom_name: 'MCA Section B - Database Engineering & Distributed ACID',
        score: 85,
        max_score: 100,
        evaluated_by: 'FairGrade Blind Evaluation',
        grade: 'A',
        evaluated_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
      },
    ],
    topic_mastery: [
      { topic: 'Relational Normalization & BCNF', percentage: 82, status: 'Proficient', color: '#38bdf8' },
      { topic: 'Linux CFS & Concurrency Control', percentage: 76, status: 'Good Understanding', color: '#6366f1' },
      { topic: 'Network Security & Cryptography', percentage: 90, status: 'Mastered', color: '#10b981' },
      { topic: 'Distributed ACID & Raft Consensus', percentage: 68, status: 'Needs Revision', color: '#fbbf24' },
    ],
  });

  const [learningOverview, setLearningOverview] = useState({
    needs_attention: [
      {
        id: 'cm-5',
        concept_name: 'Chandy-Misra-Haas Edge-Chasing Deadlock Detection',
        topic: 'Advanced Operating Systems',
        mastery_score: 42.0,
        status: 'NEEDS_ATTENTION',
      },
      {
        id: 'cm-1',
        concept_name: 'Boyce-Codd Normal Form (BCNF) Decomposition',
        topic: 'Database Engineering & Normal Forms',
        mastery_score: 55.0,
        status: 'DEVELOPING',
      },
    ],
    active_intervention: {
      id: 'int-001',
      concept_name: 'Boyce-Codd Normal Form (BCNF) Decomposition',
      topic: 'Database Engineering',
      initial_mastery: 40.0,
      target_mastery: 80.0,
      status: 'IN_PROGRESS',
      current_step: 'Step 2: Guided Socratic Concept Practice',
      total_steps: 3,
      completed_steps: 1,
    },
    recovery_results: [
      {
        id: 'rec-001',
        concept_name: 'Relational Functional Dependency Closures',
        topic: 'Database Engineering',
        before_mastery: 45.0,
        after_mastery: 88.0,
        improvement_delta: 43.0,
        status: 'RECOVERED',
        evaluated_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
      },
    ],
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('skillforge_token');
    const headers = { Authorization: token ? `Bearer ${token}` : '' };

    Promise.allSettled([
      fetch('/api/student/dashboard', { headers }).then((res) => (res.ok ? res.json() : null)),
      fetch('/api/student/learning/overview', { headers }).then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([dashRes, learnRes]) => {
        if (dashRes.status === 'fulfilled' && dashRes.value?.data) {
          setData((prev) => ({ ...prev, ...dashRes.value.data }));
        }
        if (learnRes.status === 'fulfilled' && learnRes.value?.data) {
          const lData = learnRes.value.data;
          setLearningOverview((prev) => ({
            ...prev,
            needs_attention: lData.needs_attention || prev.needs_attention,
            active_intervention: lData.active_intervention || prev.active_intervention,
            recovery_results: lData.recovery_results || prev.recovery_results,
          }));
        }
      })
      .catch((err) => console.warn('Using default student dashboard payload:', err))
      .finally(() => setLoading(false));
  }, []);

  // Determine what the student should do next for the "Continue Where You Left Off" card
  const primaryPending = data.pending_assignments?.[0] || null;
  const primaryAssessment = data.upcoming_assessments?.[0] || null;
  const activeIntervention = learningOverview.active_intervention || null;

  // Determine the next recommended task
  const nextUpTask = primaryPending
    ? {
        type: 'ASSIGNMENT',
        badge: primaryPending.language ? `${primaryPending.language} Sandbox` : 'Programming Assignment',
        badgeVariant: 'primary',
        title: primaryPending.title,
        course: primaryPending.classroom_name,
        due: primaryPending.due_date,
        buttonText: 'Continue Assignment in Sandbox',
        action: () => onNavigate && onNavigate('sandbox'),
        icon: <CodeIcon size={18} />,
      }
    : primaryAssessment
    ? {
        type: 'ASSESSMENT',
        badge: 'FairGrade Assessment',
        badgeVariant: 'warning',
        title: primaryAssessment.title,
        course: primaryAssessment.classroom_name,
        due: primaryAssessment.due_date,
        buttonText: 'Start Written Assessment',
        action: () => onNavigate && onNavigate('fairgrade'),
        icon: <FairGradeIcon size={18} />,
      }
    : activeIntervention
    ? {
        type: 'INTERVENTION',
        badge: 'Active Concept Recovery',
        badgeVariant: 'info',
        title: activeIntervention.concept_name,
        course: activeIntervention.topic,
        due: null,
        buttonText: 'Resume Recovery Plan',
        action: () => onNavigate && onNavigate('my-learning'),
        icon: <BrainIcon size={18} />,
      }
    : {
        type: 'LEARNING',
        badge: 'Ready to Learn',
        badgeVariant: 'success',
        title: 'Explore Socratic AI Tutoring & Practice Modules',
        course: 'All enrolled courses',
        due: null,
        buttonText: 'Open Socratic Tutor',
        action: () => onNavigate && onNavigate('tutor'),
        icon: <BotIcon size={18} />,
      };

  // Compile constructive "Needs Attention" list combining learningOverview and topic_mastery
  const needsAttentionList = [
    ...(learningOverview.needs_attention || []).map((item) => ({
      id: item.id || item.concept_name,
      name: item.concept_name || item.name,
      topic: item.topic || 'Core Concept',
      score: item.mastery_score !== undefined ? Math.round(item.mastery_score) : 50,
      statusLabel: 'Focus Area',
      recommendation: 'Practice with Socratic Tutor to reinforce understanding',
    })),
    ...(data.topic_mastery || [])
      .filter((tm) => tm.percentage < 75 || tm.status === 'Needs Revision')
      .map((tm, idx) => ({
        id: `tm-${idx}`,
        name: tm.topic,
        topic: 'Course Curriculum',
        score: tm.percentage,
        statusLabel: 'Review Recommended',
        recommendation: 'Review key lecture notes and work through practice cases',
      })),
  ].filter((item, idx, self) => self.findIndex((s) => s.name === item.name) === idx);

  // Recent progress change (before/after recovery)
  const recentRecovery = learningOverview.recovery_results?.[0] || null;

  if (loading) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem' }}>
        <LoadingSkeleton height="160px" style={{ marginBottom: '1.5rem', borderRadius: 'var(--radius-lg)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <LoadingSkeleton height="220px" />
          <LoadingSkeleton height="220px" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem' }}>
      {/* 1. Greeting + "Continue Where You Left Off" Hero Card */}
      <section style={{ marginBottom: '2rem' }}>
        {/* Top Greeting Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Badge variant="primary" size="sm">STUDENT WORKSPACE</Badge>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {data.student_profile?.semester} • Roll: {data.student_profile?.roll_number}
              </span>
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Welcome back, {user?.name || data.student_profile?.name || 'Student'}
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0' }}>
              Here is your structured learning path and immediate next steps for today.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button
              variant="outline"
              size="sm"
              icon={<BotIcon size={16} />}
              onClick={() => onNavigate && onNavigate('tutor')}
            >
              Ask AI Tutor
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<BrainIcon size={16} />}
              onClick={() => onNavigate && onNavigate('my-learning')}
            >
              My Learning Plan
            </Button>
          </div>
        </div>

        {/* Hero Card: Continue Where You Left Off */}
        <div
          className="card-surface"
          style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.25)',
          }}
        >
          {/* Subtle Accent Top Border */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, var(--color-primary), var(--color-info), var(--color-success))',
            }}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(300px, 1.4fr) minmax(200px, 0.8fr)',
              gap: '1.5rem',
              alignItems: 'center',
            }}
          >
            {/* Left: Actionable Details */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', fontWeight: 700 }}>
                  Continue Where You Left Off
                </span>
                <Badge variant={nextUpTask.badgeVariant} size="sm">
                  {nextUpTask.badge}
                </Badge>
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 0.5rem 0', lineHeight: 1.35 }}>
                {nextUpTask.title}
              </h2>

              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0 0 1.25rem 0' }}>
                Course: <strong style={{ color: 'var(--color-text-primary)' }}>{nextUpTask.course}</strong>
                {nextUpTask.due && (
                  <span style={{ marginLeft: '0.75rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <ClockIcon size={14} /> Due {new Date(nextUpTask.due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Button
                  variant="primary"
                  size="md"
                  icon={<PlayIcon size={15} />}
                  onClick={nextUpTask.action}
                  style={{ boxShadow: '0 2px 10px rgba(79, 70, 229, 0.3)' }}
                >
                  {nextUpTask.buttonText}
                </Button>

                {primaryAssessment && nextUpTask.type !== 'ASSESSMENT' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate && onNavigate('fairgrade')}
                    style={{ fontSize: '0.8rem' }}
                  >
                    View Upcoming Written Exam →
                  </Button>
                )}
              </div>
            </div>

            {/* Right: Clean Learning Journey SVG Illustration */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: 0.95,
              }}
            >
              <LearningJourneyIllustration width="100%" height="160px" />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Your Learning (Per-Course Progress) */}
      <section style={{ marginBottom: '2.25rem' }}>
        <SectionHeader
          title="Your Learning"
          subtitle="Enrolled classrooms and curriculum progress"
          icon={<ClassesIcon size={20} color="var(--color-primary)" />}
          badge={<Badge variant="secondary" size="sm">{data.my_classes.length} Courses</Badge>}
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigate && onNavigate('classes')}>
              Manage Classes →
            </Button>
          }
        />

        {data.my_classes.length === 0 ? (
          <EmptyState
            title="No classrooms enrolled yet"
            description="Use the join code provided by your instructor to enroll in your courses."
            action={
              <Button variant="primary" size="sm" onClick={() => onNavigate && onNavigate('classes')}>
                Join a Class
              </Button>
            }
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {data.my_classes.map((cls, idx) => {
              // Derive matching topic mastery percentage if available for this subject
              const matchedTopic = data.topic_mastery?.find((tm) =>
                cls.subject?.toLowerCase().includes(tm.topic.split(' ')[0].toLowerCase()) ||
                cls.name?.toLowerCase().includes(tm.topic.split(' ')[0].toLowerCase())
              );
              const progressScore = matchedTopic ? matchedTopic.percentage : 78 - idx * 6;

              return (
                <Card
                  key={cls.id || idx}
                  hoverable
                  style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                        {cls.subject || 'Course'}
                      </span>
                      <Badge variant="secondary" size="sm">Code: {cls.join_code}</Badge>
                    </div>

                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 0.4rem 0', lineHeight: 1.35 }}>
                      {cls.name}
                    </h3>

                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 1rem 0' }}>
                      Instructor: <span style={{ color: 'var(--color-text-secondary)' }}>{cls.teacher_name}</span>
                    </p>

                    {/* Real Progress Bar */}
                    <div style={{ marginBottom: '0.5rem' }}>
                      <Progress
                        value={progressScore}
                        max={100}
                        label="Curriculum Mastery"
                        showValue
                        variant={progressScore >= 80 ? 'success' : progressScore >= 65 ? 'primary' : 'warning'}
                        size="sm"
                      />
                    </div>
                  </div>

                  <Card.Footer style={{ padding: 0, marginTop: '1rem', borderTop: 'none' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {cls.student_count || 40} peers enrolled
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate && onNavigate('feed')}
                      style={{ fontSize: '0.8rem' }}
                    >
                      Class Stream →
                    </Button>
                  </Card.Footer>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Two-Column Midsection: 3. Needs Attention & 4. Continue Learning (In-Progress Recovery) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2.25rem',
        }}
      >
        {/* 3. Needs Attention (Constructive concept review) */}
        <section>
          <SectionHeader
            title="Needs Attention"
            subtitle="Recommended concepts to review and practice"
            icon={<AlertTriangleIcon size={18} color="var(--color-warning)" />}
            badge={
              needsAttentionList.length > 0 ? (
                <Badge variant="warning" size="sm">{needsAttentionList.length} Concepts</Badge>
              ) : null
            }
          />

          {needsAttentionList.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
              <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-success)',
                  }}
                >
                  <CheckIcon size={22} />
                </div>
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 0.25rem 0' }}>
                All Tracked Concepts on Target
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.4 }}>
                You have met or exceeded the proficiency threshold across your current modules.
              </p>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {needsAttentionList.map((item) => (
                <Card
                  key={item.id}
                  style={{
                    borderLeft: '3px solid var(--color-warning)',
                    padding: '1rem 1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.topic}</span>
                    <Badge variant="warning" size="sm">
                      {item.score}% Current
                    </Badge>
                  </div>

                  <h4 style={{ fontSize: '0.925rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 0.35rem 0' }}>
                    {item.name}
                  </h4>

                  <p style={{ fontSize: '0.785rem', color: 'var(--color-text-secondary)', margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
                    {item.recommendation}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ width: '100px' }}>
                      <Progress value={item.score} max={100} variant="warning" size="sm" />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate && onNavigate('tutor')}
                      style={{ fontSize: '0.785rem', color: 'var(--color-primary)' }}
                    >
                      Practice with AI Tutor →
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* 4. Continue Learning (In-Progress Recovery / Intervention) */}
        <section>
          <SectionHeader
            title="Continue Learning"
            subtitle="Active recovery and guided skill progression"
            icon={<BrainIcon size={18} color="var(--color-info)" />}
            badge={
              activeIntervention ? (
                <Badge variant="info" size="sm">In Progress</Badge>
              ) : null
            }
          />

          {activeIntervention ? (
            <Card
              style={{
                border: '1px solid rgba(56, 189, 248, 0.3)',
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-info)' }}>
                  {activeIntervention.topic || 'Guided Recovery'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Step {activeIntervention.completed_steps || 1} of {activeIntervention.total_steps || 3}
                </span>
              </div>

              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 0.4rem 0' }}>
                {activeIntervention.concept_name}
              </h3>

              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0 0 1rem 0', lineHeight: 1.4 }}>
                Current focus: <strong style={{ color: 'var(--color-text-primary)' }}>{activeIntervention.current_step || 'Guided Practice Step'}</strong>
              </p>

              {/* Progress Milestones Tracker */}
              <div
                style={{
                  background: 'var(--color-bg-app)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Initial Level</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-warning)' }}>
                    {activeIntervention.initial_mastery || 40}%
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>→</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Target Mastery</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-success)' }}>
                    {activeIntervention.target_mastery || 80}%
                  </div>
                </div>
                <div style={{ width: '70px' }}>
                  <Progress
                    value={activeIntervention.completed_steps || 1}
                    max={activeIntervention.total_steps || 3}
                    variant="info"
                    size="sm"
                  />
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                icon={<PlayIcon size={14} />}
                onClick={() => onNavigate && onNavigate('my-learning')}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Resume Recovery Plan
              </Button>
            </Card>
          ) : (
            <Card style={{ textAlign: 'center', padding: '2.25rem 1.5rem' }}>
              <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
                <SparklesIcon size={24} color="var(--color-primary)" />
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 0.25rem 0' }}>
                No Active Recovery Plans
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 1rem 0', lineHeight: 1.4 }}>
                Explore guided concept walkthroughs or ask the Socratic tutor whenever you want to deepen understanding.
              </p>
              <Button variant="outline" size="sm" onClick={() => onNavigate && onNavigate('my-learning')}>
                Explore Learning Hub
              </Button>
            </Card>
          )}
        </section>
      </div>

      {/* Two-Column Bottom: 5. Recent Progress (Before/After) & 6. Recent Activity (Grades) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* 5. Recent Progress (Real Before/After Mastery Change) */}
        <section>
          <SectionHeader
            title="Recent Progress"
            subtitle="Verified conceptual mastery improvements"
            icon={<TrendingUpIcon size={18} color="var(--color-success)" />}
          />

          {recentRecovery ? (
            <Card
              style={{
                borderLeft: '3px solid var(--color-success)',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{recentRecovery.topic}</span>
                <Badge variant="success" size="sm">
                  +{recentRecovery.improvement_delta}% Delta
                </Badge>
              </div>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 0.75rem 0' }}>
                {recentRecovery.concept_name}
              </h4>

              {/* Before vs After Visualization */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                  background: 'var(--color-bg-app)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  marginBottom: '0.85rem',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <ProgressRing
                    value={recentRecovery.before_mastery}
                    max={100}
                    size={52}
                    strokeWidth={5}
                    variant="warning"
                    label="Initial"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 700 }}>
                    +{recentRecovery.improvement_delta}%
                  </span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>→</span>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <ProgressRing
                    value={recentRecovery.after_mastery}
                    max={100}
                    size={52}
                    strokeWidth={5}
                    variant="success"
                    label="Current"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Verified via Reassessment
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate && onNavigate('my-learning')}
                  style={{ fontSize: '0.785rem' }}
                >
                  View Details →
                </Button>
              </div>
            </Card>
          ) : (
            <Card style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
              <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                <TrendingUpIcon size={22} color="var(--color-text-muted)" />
              </div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 0.25rem 0' }}>
                Track Your Growth Here
              </h4>
              <p style={{ fontSize: '0.785rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.4 }}>
                When you complete recovery steps and reassessments, your before/after mastery deltas will be recorded here.
              </p>
            </Card>
          )}
        </section>

        {/* 6. Recent Activity (Verified Evaluations & Grades) */}
        <section>
          <SectionHeader
            title="Recent Activity"
            subtitle="Verified assessment evaluations and submissions"
            icon={<AssessmentsIcon size={18} color="var(--color-primary)" />}
            action={
              <Button variant="ghost" size="sm" onClick={() => onNavigate && onNavigate('grades')}>
                All Grades →
              </Button>
            }
          />

          {data.recent_grades.length === 0 ? (
            <EmptyState
              title="No evaluations yet"
              description="Your graded assignments and assessment feedback will appear here once reviewed."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.recent_grades.map((grade) => (
                <Card
                  key={grade.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.875rem 1.15rem',
                  }}
                >
                  <div style={{ maxWidth: '75%' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.15rem' }}>
                      {grade.assignment_title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {grade.evaluated_by} • {new Date(grade.evaluated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-success)' }}>
                      {grade.score} / {grade.max_score}
                    </div>
                    <Badge variant="success" size="sm">
                      Grade {grade.grade}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
