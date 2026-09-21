-- ======================================================================================
-- Migration: 003_create_learning_intelligence_layer.sql
-- Description: Creates schema tables, indexes, and constraints for SkillForge AI's
--              Learning Intelligence Layer (Concepts, Learning Evidence, Mastery,
--              Misconceptions, Interventions, Reassessments & Recovery Results).
-- ======================================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ======================================================================================
-- 1. Concepts Definition Table (Hierarchy: Course/Classroom -> Topic -> Concept)
-- ======================================================================================

CREATE TABLE IF NOT EXISTS concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    material_id UUID REFERENCES learning_materials(id) ON DELETE SET NULL,
    topic VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    prerequisites TEXT[] NOT NULL DEFAULT '{}',
    common_misconceptions TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_classroom_topic_concept UNIQUE (classroom_id, topic, name)
);

CREATE INDEX IF NOT EXISTS idx_concepts_classroom ON concepts(classroom_id);
CREATE INDEX IF NOT EXISTS idx_concepts_topic ON concepts(topic);
CREATE INDEX IF NOT EXISTS idx_concepts_name ON concepts(name);
CREATE INDEX IF NOT EXISTS idx_concepts_material ON concepts(material_id);

-- ======================================================================================
-- 2. Learning Evidence Table (Immutable Event Log)
-- ======================================================================================

CREATE TABLE IF NOT EXISTS learning_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL CHECK (source IN ('WRITTEN_ASSESSMENT', 'FAIRGRADE_EVALUATION', 'CODE_AUTOGRADER', 'TUTOR_INTERACTION', 'RESOURCE_ENGAGEMENT', 'REASSESSMENT')),
    reference_id VARCHAR(255),
    score_achieved NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    max_score NUMERIC(6, 2) NOT NULL DEFAULT 100.00,
    success_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00, -- 0.00 to 100.00 %
    confidence_score NUMERIC(4, 3) NOT NULL DEFAULT 1.000,
    evidence_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_student ON learning_evidence(student_id);
CREATE INDEX IF NOT EXISTS idx_evidence_classroom ON learning_evidence(classroom_id);
CREATE INDEX IF NOT EXISTS idx_evidence_concept ON learning_evidence(concept_id);
CREATE INDEX IF NOT EXISTS idx_evidence_source ON learning_evidence(source);
CREATE INDEX IF NOT EXISTS idx_evidence_created ON learning_evidence(created_at DESC);

-- ======================================================================================
-- 3. Concept Mastery Table (Deterministic Backend Aggregation)
-- ======================================================================================

CREATE TABLE IF NOT EXISTS concept_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    mastery_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00, -- 0.00 to 100.00 %
    confidence_score NUMERIC(4, 3) NOT NULL DEFAULT 0.000,
    status VARCHAR(50) NOT NULL DEFAULT 'NEEDS_ATTENTION' CHECK (status IN ('NEEDS_ATTENTION', 'DEVELOPING', 'REQUIRES_ADDITIONAL_SUPPORT', 'PROFICIENT', 'MASTERED')),
    total_evidence_count INT NOT NULL DEFAULT 0,
    last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_classroom_concept_mastery UNIQUE (student_id, classroom_id, concept_id)
);

CREATE INDEX IF NOT EXISTS idx_concept_mastery_student ON concept_mastery(student_id);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_classroom ON concept_mastery(classroom_id);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_concept ON concept_mastery(concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_status ON concept_mastery(status);

-- ======================================================================================
-- 4. Misconceptions Table (Pattern-Based Gemini Diagnosis)
-- ======================================================================================

CREATE TABLE IF NOT EXISTS misconceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'POSSIBLE' CHECK (status IN ('LIKELY', 'CONFIRMED', 'POSSIBLE', 'INSUFFICIENT_EVIDENCE', 'RESOLVED')),
    confidence_score NUMERIC(4, 3) NOT NULL DEFAULT 0.500,
    supporting_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_misconceptions_student ON misconceptions(student_id);
CREATE INDEX IF NOT EXISTS idx_misconceptions_classroom ON misconceptions(classroom_id);
CREATE INDEX IF NOT EXISTS idx_misconceptions_concept ON misconceptions(concept_id);
CREATE INDEX IF NOT EXISTS idx_misconceptions_status ON misconceptions(status);

-- ======================================================================================
-- 5. Interventions & Step Execution Tables
-- ======================================================================================

CREATE TABLE IF NOT EXISTS interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    misconception_id UUID REFERENCES misconceptions(id) ON DELETE SET NULL,
    initial_mastery NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    target_mastery NUMERIC(5, 2) NOT NULL DEFAULT 80.00,
    status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED')),
    recommended_by VARCHAR(50) NOT NULL DEFAULT 'RULE_ENGINE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interventions_student ON interventions(student_id);
CREATE INDEX IF NOT EXISTS idx_interventions_classroom ON interventions(classroom_id);
CREATE INDEX IF NOT EXISTS idx_interventions_concept ON interventions(concept_id);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status);

CREATE TABLE IF NOT EXISTS intervention_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    step_type VARCHAR(50) NOT NULL CHECK (step_type IN ('FOUNDATIONAL_EXPLANATION', 'WORKED_EXAMPLES_PRACTICE', 'APPLICATION_CHALLENGE', 'TEACHER_REVIEW_RECOMMENDED')),
    delivery_channel VARCHAR(50) NOT NULL CHECK (delivery_channel IN ('SOCRATIC_TUTOR', 'RESOURCE_CURATOR', 'PRACTICE_SANDBOX', 'TEACHER_ACTION')),
    title VARCHAR(255) NOT NULL,
    instructions TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_intervention_step_number UNIQUE (intervention_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_intervention_steps_parent ON intervention_steps(intervention_id);
CREATE INDEX IF NOT EXISTS idx_intervention_steps_status ON intervention_steps(is_completed);

-- ======================================================================================
-- 6. Reassessments & Recovery Results Tables
-- ======================================================================================

CREATE TABLE IF NOT EXISTS reassessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessment(id) ON DELETE SET NULL,
    programming_assignment_id UUID REFERENCES programming_assignments(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reassessments_intervention ON reassessments(intervention_id);
CREATE INDEX IF NOT EXISTS idx_reassessments_student ON reassessments(student_id);
CREATE INDEX IF NOT EXISTS idx_reassessments_concept ON reassessments(concept_id);

CREATE TABLE IF NOT EXISTS recovery_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    reassessment_id UUID NOT NULL REFERENCES reassessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    before_mastery NUMERIC(5, 2) NOT NULL,
    after_mastery NUMERIC(5, 2) NOT NULL,
    improvement_delta NUMERIC(5, 2) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('RECOVERED', 'IN_PROGRESS', 'NOT_RECOVERED')),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_results_intervention ON recovery_results(intervention_id);
CREATE INDEX IF NOT EXISTS idx_recovery_results_student ON recovery_results(student_id);
CREATE INDEX IF NOT EXISTS idx_recovery_results_concept ON recovery_results(concept_id);
CREATE INDEX IF NOT EXISTS idx_recovery_results_status ON recovery_results(status);
