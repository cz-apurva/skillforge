-- ======================================================================================
-- Migration: 001_create_fairgrade_tables_and_roles.sql
-- Description: Creates schema tables, indexes, and role-based access controls for 
--              SkillForge AI's FairGrade bias-resistant subjective grading system.
-- ======================================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ======================================================================================
-- 1. Assessment & Question Definition Tables
-- ======================================================================================

CREATE TABLE IF NOT EXISTS assessment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    course_id UUID NOT NULL,
    created_by UUID NOT NULL,
    total_points NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_course ON assessment(course_id);
CREATE INDEX IF NOT EXISTS idx_assessment_status ON assessment(status);
CREATE INDEX IF NOT EXISTS idx_assessment_created_by ON assessment(created_by);


CREATE TABLE IF NOT EXISTS assessment_question (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
    question_number INT NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL DEFAULT 'written' CHECK (question_type IN ('written', 'essay', 'short_answer', 'case_study')),
    max_score NUMERIC(6, 2) NOT NULL DEFAULT 10.00,
    sample_solution TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_assessment_question_num UNIQUE (assessment_id, question_number)
);

CREATE INDEX IF NOT EXISTS idx_question_assessment ON assessment_question(assessment_id);


-- ======================================================================================
-- 2. Rubric & Evaluation Criteria Tables
-- ======================================================================================

CREATE TABLE IF NOT EXISTS rubric (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES assessment(id) ON DELETE SET NULL,
    question_id UUID REFERENCES assessment_question(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    total_weight NUMERIC(6, 2) NOT NULL DEFAULT 100.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rubric_assessment ON rubric(assessment_id);
CREATE INDEX IF NOT EXISTS idx_rubric_question ON rubric(question_id);


CREATE TABLE IF NOT EXISTS rubric_criterion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rubric_id UUID NOT NULL REFERENCES rubric(id) ON DELETE CASCADE,
    criterion_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    max_points NUMERIC(6, 2) NOT NULL DEFAULT 10.00,
    weight NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    scoring_levels JSONB NOT NULL DEFAULT '[]'::jsonb,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rubric_criterion_rubric ON rubric_criterion(rubric_id);
CREATE INDEX IF NOT EXISTS idx_rubric_criterion_order ON rubric_criterion(rubric_id, order_index);


-- ======================================================================================
-- 3. Student Submissions & Identity Mapping (Backend Core Owned)
-- ======================================================================================

CREATE TABLE IF NOT EXISTS written_submission (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES assessment_question(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,
    submission_text TEXT NOT NULL,
    word_count INT,
    status VARCHAR(50) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'grading_in_progress', 'graded', 'appealed', 'flagged')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submission_student ON written_submission(student_id);
CREATE INDEX IF NOT EXISTS idx_submission_assessment ON written_submission(assessment_id);
CREATE INDEX IF NOT EXISTS idx_submission_question ON written_submission(question_id);
CREATE INDEX IF NOT EXISTS idx_submission_status ON written_submission(status);


CREATE TABLE IF NOT EXISTS student_identity_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    written_submission_id UUID NOT NULL UNIQUE REFERENCES written_submission(id) ON DELETE CASCADE,
    anonymous_submission_id UUID NOT NULL UNIQUE,
    salt VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_identity_anon_id UNIQUE (anonymous_submission_id),
    CONSTRAINT uq_student_identity_student UNIQUE (student_id, written_submission_id)
);

CREATE INDEX IF NOT EXISTS idx_identity_map_student ON student_identity_map(student_id);
CREATE INDEX IF NOT EXISTS idx_identity_map_anon_id ON student_identity_map(anonymous_submission_id);
CREATE INDEX IF NOT EXISTS idx_identity_map_submission_id ON student_identity_map(written_submission_id);


-- ======================================================================================
-- 4. Anonymized Submissions & FairGrade Evaluation Tables (FairGrade Accessible)
-- ======================================================================================

CREATE TABLE IF NOT EXISTS anonymous_submission (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES assessment_question(id) ON DELETE CASCADE,
    rubric_id UUID REFERENCES rubric(id) ON DELETE SET NULL,
    sanitized_text TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'graded', 'flagged_for_review')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anon_sub_assessment ON anonymous_submission(assessment_id);
CREATE INDEX IF NOT EXISTS idx_anon_sub_question ON anonymous_submission(question_id);
CREATE INDEX IF NOT EXISTS idx_anon_sub_status ON anonymous_submission(status);
CREATE INDEX IF NOT EXISTS idx_anon_sub_created ON anonymous_submission(created_at);


CREATE TABLE IF NOT EXISTS fairgrade_report (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anonymous_submission_id UUID NOT NULL REFERENCES anonymous_submission(id) ON DELETE CASCADE,
    rubric_id UUID REFERENCES rubric(id) ON DELETE SET NULL,
    total_score NUMERIC(6, 2) NOT NULL,
    max_possible_score NUMERIC(6, 2) NOT NULL,
    confidence_score NUMERIC(4, 3) NOT NULL DEFAULT 1.000,
    overall_feedback TEXT NOT NULL,
    strengths TEXT[] NOT NULL DEFAULT '{}',
    areas_for_improvement TEXT[] NOT NULL DEFAULT '{}',
    model_version VARCHAR(100) NOT NULL,
    grading_duration_ms INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fairgrade_report_anon ON fairgrade_report(anonymous_submission_id);
CREATE INDEX IF NOT EXISTS idx_fairgrade_report_rubric ON fairgrade_report(rubric_id);
CREATE INDEX IF NOT EXISTS idx_fairgrade_report_created ON fairgrade_report(created_at);


CREATE TABLE IF NOT EXISTS fairgrade_criterion_score (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES fairgrade_report(id) ON DELETE CASCADE,
    criterion_id UUID NOT NULL REFERENCES rubric_criterion(id) ON DELETE CASCADE,
    score_awarded NUMERIC(6, 2) NOT NULL,
    max_score NUMERIC(6, 2) NOT NULL,
    feedback TEXT NOT NULL,
    evidence_quotes TEXT[] NOT NULL DEFAULT '{}',
    rubric_level_matched VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_criterion_score_report ON fairgrade_criterion_score(report_id);
CREATE INDEX IF NOT EXISTS idx_criterion_score_criterion ON fairgrade_criterion_score(criterion_id);


CREATE TABLE IF NOT EXISTS grading_evaluation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anonymous_submission_id UUID NOT NULL REFERENCES anonymous_submission(id) ON DELETE CASCADE,
    report_id UUID REFERENCES fairgrade_report(id) ON DELETE CASCADE,
    rubric_adherence_score NUMERIC(4, 3) CHECK (rubric_adherence_score BETWEEN 0.0 AND 1.0),
    hallucination_risk_score NUMERIC(4, 3) CHECK (hallucination_risk_score BETWEEN 0.0 AND 1.0),
    consistency_score NUMERIC(4, 3) CHECK (consistency_score BETWEEN 0.0 AND 1.0),
    evaluation_notes TEXT,
    is_approved_for_release BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grading_eval_anon ON grading_evaluation(anonymous_submission_id);
CREATE INDEX IF NOT EXISTS idx_grading_eval_report ON grading_evaluation(report_id);


CREATE TABLE IF NOT EXISTS bias_check_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anonymous_submission_id UUID NOT NULL REFERENCES anonymous_submission(id) ON DELETE CASCADE,
    check_type VARCHAR(100) NOT NULL CHECK (check_type IN ('STYLE_BIAS', 'LENGTH_PENALTY_VERIFICATION', 'DEMOGRAPHIC_LEAK_DETECTION', 'SENTIMENT_NEUTRALITY', 'IDENTITY_MARKER_SCAN')),
    bias_detected BOOLEAN NOT NULL DEFAULT FALSE,
    bias_score NUMERIC(4, 3) NOT NULL DEFAULT 0.000,
    flagged_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
    mitigation_applied TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bias_check_anon ON bias_check_log(anonymous_submission_id);
CREATE INDEX IF NOT EXISTS idx_bias_check_type ON bias_check_log(check_type);
CREATE INDEX IF NOT EXISTS idx_bias_check_flagged ON bias_check_log(bias_detected);


-- ======================================================================================
-- 5. Appeals and Audit Logging Tables (Backend Core Owned)
-- ======================================================================================

CREATE TABLE IF NOT EXISTS grade_appeal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    written_submission_id UUID NOT NULL REFERENCES written_submission(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,
    report_id UUID REFERENCES fairgrade_report(id) ON DELETE SET NULL,
    appeal_reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'accepted', 'rejected', 'withdrawn')),
    reviewer_id UUID,
    reviewer_comments TEXT,
    revised_score NUMERIC(6, 2),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appeal_submission ON grade_appeal(written_submission_id);
CREATE INDEX IF NOT EXISTS idx_appeal_student ON grade_appeal(student_id);
CREATE INDEX IF NOT EXISTS idx_appeal_status ON grade_appeal(status);


CREATE TABLE IF NOT EXISTS grade_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    written_submission_id UUID REFERENCES written_submission(id) ON DELETE SET NULL,
    anonymous_submission_id UUID REFERENCES anonymous_submission(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    performed_by UUID NOT NULL,
    performed_by_role VARCHAR(50) NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_written_sub ON grade_audit_log(written_submission_id);
CREATE INDEX IF NOT EXISTS idx_audit_anon_sub ON grade_audit_log(anonymous_submission_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON grade_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_performer ON grade_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_created ON grade_audit_log(created_at);


-- ======================================================================================
-- 6. Role Creation & Role-Based Access Control (RBAC) Grants
-- ======================================================================================

-- 6.1 Create Node Core Role (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'node_core_role') THEN
        CREATE ROLE node_core_role WITH NOLOGIN;
    END IF;
END
$$;

-- 6.2 Create FairGrade Service Role (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fairgrade_service_role') THEN
        CREATE ROLE fairgrade_service_role WITH NOLOGIN;
    END IF;
END
$$;

-- 6.3 Grant full CRUD permissions to node_core_role
GRANT ALL PRIVILEGES ON TABLE 
    assessment,
    assessment_question,
    rubric,
    rubric_criterion,
    written_submission,
    student_identity_map,
    anonymous_submission,
    fairgrade_report,
    fairgrade_criterion_score,
    grading_evaluation,
    grade_appeal,
    grade_audit_log,
    bias_check_log
TO node_core_role;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO node_core_role;


-- 6.4 Grant restricted anonymized permissions to fairgrade_service_role
-- Read assessment & rubric criteria to compute grades
GRANT SELECT ON TABLE 
    assessment,
    assessment_question,
    rubric,
    rubric_criterion
TO fairgrade_service_role;

-- Read & Insert grading evaluation records
GRANT SELECT, INSERT, UPDATE ON TABLE 
    anonymous_submission,
    fairgrade_report,
    fairgrade_criterion_score,
    grading_evaluation,
    bias_check_log
TO fairgrade_service_role;

-- 6.5 Explicitly REVOKE access to student identity and submission tables from fairgrade_service_role
REVOKE ALL PRIVILEGES ON TABLE 
    student_identity_map,
    written_submission,
    grade_appeal,
    grade_audit_log
FROM fairgrade_service_role;
