-- ======================================================================================
-- Migration: 002_complete_skillforge_core_schema.sql
-- Description: Creates complete normalized domain schema tables, constraints,
--              and performance indexes for SkillForge AI production architecture.
-- ======================================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ======================================================================================
-- 1. Identity, Users & Role Accounts
-- ======================================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'TEACHER', 'STUDENT')),
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ======================================================================================
-- 2. Academic Subjects & Departments
-- ======================================================================================

CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_subjects_code UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);

-- ======================================================================================
-- 3. Classrooms & Student Enrollments
-- ======================================================================================

CREATE TABLE IF NOT EXISTS classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    semester VARCHAR(50) NOT NULL DEFAULT 'Semester 4',
    academic_year VARCHAR(50) NOT NULL DEFAULT '2026-2027',
    join_code VARCHAR(50) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_count INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_classrooms_join_code UNIQUE (join_code)
);

CREATE INDEX IF NOT EXISTS idx_classrooms_created_by ON classrooms(created_by);
CREATE INDEX IF NOT EXISTS idx_classrooms_join_code ON classrooms(join_code);
CREATE INDEX IF NOT EXISTS idx_classrooms_status ON classrooms(status);

CREATE TABLE IF NOT EXISTS student_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DROPPED', 'COMPLETED')),
    CONSTRAINT uq_classroom_student_enrollment UNIQUE (classroom_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollment_classroom ON student_enrollments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_student ON student_enrollments(student_id);

-- ======================================================================================
-- 4. Classroom Feed & Announcements
-- ======================================================================================

CREATE TABLE IF NOT EXISTS class_feed_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL DEFAULT 'Announcement' CHECK (type IN ('Announcement', 'Material', 'Assignment', 'Alert')),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_classroom ON class_feed_posts(classroom_id);
CREATE INDEX IF NOT EXISTS idx_feed_created ON class_feed_posts(created_at DESC);

-- ======================================================================================
-- 5. Learning Materials & Taxonomy Analysis
-- ======================================================================================

CREATE TABLE IF NOT EXISTS learning_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    extracted_text TEXT NOT NULL,
    taxonomy JSONB NOT NULL DEFAULT '{}'::jsonb,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materials_classroom ON learning_materials(classroom_id);
CREATE INDEX IF NOT EXISTS idx_materials_topic ON learning_materials(topic);

-- ======================================================================================
-- 6. Curated External Resources
-- ======================================================================================

CREATE TABLE IF NOT EXISTS curated_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES learning_materials(id) ON DELETE SET NULL,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    topic VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    type VARCHAR(100) NOT NULL CHECK (type IN ('VIDEO', 'DOCUMENTATION', 'RESEARCH_PAPER', 'PRACTICE_LAB', 'CHEAT_SHEET', 'INTERACTIVE_SANDBOX')),
    relevance_score NUMERIC(4, 2) NOT NULL DEFAULT 0.85,
    source VARCHAR(255) NOT NULL,
    description TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curated_classroom ON curated_resources(classroom_id);
CREATE INDEX IF NOT EXISTS idx_curated_topic ON curated_resources(topic);

-- ======================================================================================
-- 7. Document Chunks & Vector Store
-- ======================================================================================

CREATE TABLE IF NOT EXISTS document_chunks (
    id VARCHAR(255) PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES learning_materials(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding JSONB NOT NULL,
    topic VARCHAR(255),
    title VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_chunks_doc ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_class ON document_chunks(classroom_id);

-- ======================================================================================
-- 8. Programming Assignments, Test Cases & Submissions (Judge0)
-- ======================================================================================

CREATE TABLE IF NOT EXISTS programming_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    language VARCHAR(50) NOT NULL DEFAULT 'Python',
    starter_code TEXT NOT NULL DEFAULT '',
    solution_code TEXT,
    cpu_time_limit NUMERIC(4, 2) NOT NULL DEFAULT 2.00,
    memory_limit INT NOT NULL DEFAULT 128000,
    due_date TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prog_assignment_class ON programming_assignments(classroom_id);

CREATE TABLE IF NOT EXISTS test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES programming_assignments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    input TEXT NOT NULL DEFAULT '',
    expected_output TEXT NOT NULL,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    weight NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
    explanation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_cases_assignment ON test_cases(assignment_id);

CREATE TABLE IF NOT EXISTS code_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES programming_assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_code TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'COMPILATION_ERROR', 'RUNTIME_ERROR', 'JUDGE0_UNAVAILABLE')),
    execution_time VARCHAR(50),
    memory_used VARCHAR(50),
    passed_test_cases INT NOT NULL DEFAULT 0,
    total_test_cases INT NOT NULL DEFAULT 0,
    code_grade_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    qualitative_review JSONB NOT NULL DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_code_sub_assignment ON code_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_code_sub_student ON code_submissions(student_id);

CREATE TABLE IF NOT EXISTS code_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES code_submissions(id) ON DELETE CASCADE,
    test_case_id UUID REFERENCES test_cases(id) ON DELETE SET NULL,
    status_id INT NOT NULL,
    status_description VARCHAR(100) NOT NULL,
    stdout TEXT,
    stderr TEXT,
    compile_output TEXT,
    execution_time NUMERIC(6, 4),
    memory_kb INT,
    passed BOOLEAN NOT NULL DEFAULT FALSE,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_code_exec_sub ON code_executions(submission_id);

-- ======================================================================================
-- 9. Socratic AI Tutor Sessions & Messages
-- ======================================================================================

CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    assignment_id UUID,
    title VARCHAR(255) NOT NULL DEFAULT 'Socratic Discussion',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_classroom ON chat_sessions(classroom_id);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('STUDENT', 'TUTOR', 'SYSTEM')),
    message_text TEXT NOT NULL,
    sources JSONB NOT NULL DEFAULT '[]'::jsonb,
    guardrail_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

-- ======================================================================================
-- 10. Performance, Topic Mastery & Teacher Recommendations
-- ======================================================================================

CREATE TABLE IF NOT EXISTS topic_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    topic VARCHAR(255) NOT NULL,
    mastery_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    total_evaluations INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_classroom_topic UNIQUE (student_id, classroom_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_mastery_student ON topic_mastery(student_id);
CREATE INDEX IF NOT EXISTS idx_mastery_classroom ON topic_mastery(classroom_id);

CREATE TABLE IF NOT EXISTS performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assessment_id UUID,
    question_id UUID,
    submission_id UUID,
    grader_type VARCHAR(50) NOT NULL,
    score_awarded NUMERIC(6, 2) NOT NULL,
    max_score NUMERIC(6, 2) NOT NULL,
    percentage NUMERIC(5, 2) NOT NULL,
    competencies_evaluated TEXT[] NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_student ON performance_logs(student_id);

CREATE TABLE IF NOT EXISTS teacher_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    topic VARCHAR(255) NOT NULL,
    priority VARCHAR(50) NOT NULL CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
    action_type VARCHAR(100) NOT NULL CHECK (action_type IN ('REVISE_TOPIC', 'PUBLISH_EXAMPLE', 'GENERATE_REMEDIAL_ASSIGNMENT', 'RECOMMEND_RESOURCE')),
    title VARCHAR(255) NOT NULL,
    suggested_action TEXT NOT NULL,
    suggested_discussion_starter TEXT,
    recommended_remedy JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DISMISSED', 'APPLIED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recs_teacher ON teacher_recommendations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_recs_classroom ON teacher_recommendations(classroom_id);

-- ======================================================================================
-- 11. System Notifications & Event Dispatch
-- ======================================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_role VARCHAR(50) NOT NULL CHECK (recipient_role IN ('ADMIN', 'TEACHER', 'STUDENT')),
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    record_type VARCHAR(100) NOT NULL DEFAULT 'general',
    record_id VARCHAR(255),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notif_role ON notifications(recipient_role);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at DESC);

-- ======================================================================================
-- 12. AI Request Telemetry & Zero-PII Audit Logging
-- ======================================================================================

CREATE TABLE IF NOT EXISTS ai_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service VARCHAR(100) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    prompt_version VARCHAR(50) NOT NULL,
    duration_ms INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    error_type VARCHAR(100),
    error_message TEXT,
    prompt_tokens INT NOT NULL DEFAULT 0,
    completion_tokens INT NOT NULL DEFAULT 0,
    total_tokens INT NOT NULL DEFAULT 0,
    ai_mode VARCHAR(50) NOT NULL DEFAULT 'live',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_log_service ON ai_request_logs(service);
CREATE INDEX IF NOT EXISTS idx_ai_log_status ON ai_request_logs(status);
CREATE INDEX IF NOT EXISTS idx_ai_log_created ON ai_request_logs(created_at DESC);

-- ======================================================================================
-- 13. System Settings & Configuration
-- ======================================================================================

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
