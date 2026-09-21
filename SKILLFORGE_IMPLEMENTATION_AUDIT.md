# SkillForge AI — Comprehensive Implementation & Production Audit

**Generated Date:** September 13, 2026  
**Architect:** Senior Full-Stack, Backend, Database & AI Systems Architect  
**Project:** SkillForge AI (MCA Specialization Project)  
**Repository Structure:** `backend-core/` (Node.js/Express), `fairgrade-service/` (Python/FastAPI), `frontend/` (React/Vite), `database/` (PostgreSQL Migrations)

---

## 1. Executive Summary

SkillForge AI is an AI-integrated adaptive classroom platform comprising three distinct role-based portals (**Admin**, **Teacher**, **Student**), an identity-blind **FairGrade** written-answer grading engine, and 8 specialized AI modules (**Content Analyzer**, **Resource Curator**, **Sandbox Generator**, **Socratic Tutor**, **RAG / Vector Store**, **Code Auto-Grader**, **Teacher Co-Pilot**, and **Performance Analytics**).

While the frontend UI, role portals, and modular architecture are well-structured, the current codebase operates in a **hybrid mock/in-memory state**. Critical data (users, classrooms, materials, assignments, submissions, vector embeddings, notifications, and analytics) resides predominantly in Node.js runtime memory (`memoryStore`), meaning all state is wiped upon server restart or logout/login flows. Furthermore, AI calls currently target legacy OpenAI/Anthropic providers or return hardcoded mock fixtures, several modules contain fabricated fallback numbers (e.g. 8.35 GPA, 85% fake grades on microservice failure, fake test pass simulator in Judge0), and authentication contains header-based bypass vulnerabilities.

This document provides a feature-by-feature audit detailing the exact state of every component, specific files, mock markers, and required changes for full production hardening.

---

## 2. Feature-by-Feature Implementation Audit Table

| Feature / Subsystem | Current Implementation | Status | Real or Mock | Required Changes | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Frontend Framework & Navigation** | React 18 + Vite (`frontend/src/App.jsx`, `Navbar.jsx`, component views). Role-based SPA navigation via `currentView` state. | **WORKING** | Real (UI / Client Logic) | Add persistent route refresh support, robust error boundaries, and centralized API client interceptors with JWT token lifecycle handling. | Medium |
| **Backend Framework & Middleware** | Node.js Express 4.19 (`backend-core/src/app.js`, `server.js`, `routes/index.js`). | **WORKING** | Real | Add global rate limiting, input sanitization, startup environment verification, and clean error handler middleware. | High |
| **Database & Persistence** | PostgreSQL client `pg` Pool (`backend-core/src/config/db.js`) + `memoryStore` fallback. | **PARTIALLY WORKING / MOCK** | Mixed (Falls back to volatile `memoryStore` Maps) | Eliminate all `memoryStore` dependencies. Ensure 100% of queries execute against normalized PostgreSQL tables with migrations. | **CRITICAL** |
| **ORM / Data Access Layer** | Raw SQL queries via `pg` (`node-postgres`) in model classes (`backend-core/src/models/*`). | **WORKING** | Real (Raw SQL via `pg`) | Maintain single unified ORM/Query layer (`pg` + parameterized SQL). Ensure all domain models query PostgreSQL directly with connection pooling and transactions. | High |
| **Authentication System** | JWT + bcrypt password hashing (`backend-core/src/services/authService.js`, `models/User.js`, `routes/authRoutes.js`). | **PARTIALLY WORKING** | Mixed (Falls back to hardcoded demo users in `memoryStore.users`) | Persist users and password hashes in PostgreSQL `users` table. Provide robust token expiration, refresh, and secure password reset workflows. | **CRITICAL** |
| **Role-Based Access Control (RBAC)** | `authMiddleware.js` (`authenticateUser`, `authorizeRole`). | **BROKEN / INSECURE** | Mock Bypass Present | **Security Vulnerability:** Remove header-based spoofing (`x-user-id`, `x-student-id`). Enforce strict resource-level ownership checks (e.g. `classroom.teacher_id === req.user.id`, `submission.student_id === req.user.id`). | **CRITICAL** |
| **File Upload & Text Extraction** | Multer memory storage + `pdf-parse` (`backend-core/src/services/textExtractor.service.js`). | **WORKING** | Real | Support PDF, DOCX, TXT with file size limits, mime-type validation, and persistent file metadata storage in database. | High |
| **AI Infrastructure & LLM Provider** | `llmProvider.js`, `aiWrapper.js`, `mockFixtures.js`. Supports OpenAI & Anthropic only. | **BROKEN (Missing Gemini)** | Legacy Provider / Mock Fixtures | Build dedicated `GeminiService` (`@google/genai` SDK backend-only). Enforce structured output validation (Zod), prompt versioning, zero-PII logging to `AIRequestLog`, and single-retry fail-to-review logic. | **CRITICAL** |
| **Module 1: Content Analyzer** | `contentAnalyzer.service.js` extracts Bloom taxonomy, subtopics, concepts, prerequisites. | **PARTIALLY WORKING** | Real extraction + OpenAI/Anthropic or Mock fallback | Route through `GeminiService` using versioned prompt `content-analyzer-v1`. Prevent prompt injection in uploaded text. Save taxonomy to `learning_materials` in PostgreSQL. | High |
| **Module 2: Resource Curator** | `resourceCurator.service.js` searches YouTube API and ranks with LLM. | **PARTIALLY WORKING** | Mixed (Contains hardcoded mock resource fallbacks) | Enforce strictly verified search candidate sources (YouTube Data API v3 / arXiv / teacher URLs). Route ranking step through Gemini. Never fabricate URLs. | High |
| **Module 3: Sandbox Generator** | `sandboxGenerator.service.js` synthesizes coding problems and test cases. | **PARTIALLY WORKING** | OpenAI/Anthropic + Mock fallback | Route problem and test suite synthesis through `GeminiService` (`sandbox-v1`). Validate generated test cases against reference solution before publishing. | High |
| **Module 4: Socratic Tutor** | `studentService.js` / `StudentTutorView.jsx` provides interactive Socratic hints. | **PARTIALLY WORKING** | OpenAI/Anthropic + Mock fallback | Route via `GeminiService` (`tutor-v1`). Ground responses in classroom RAG embeddings. Enforce strict guardrails against spitting full code or assessment solutions. | High |
| **Module 5: RAG & Vector Search** | `chunker.service.js`, `vectorStore.service.js`, `rag.service.js`. | **MOCK / VOLATILE** | In-Memory Cosine Sim + Feature Hashing | Persist chunk vectors in PostgreSQL (`pgvector` or indexed embedding table). Strictly filter similarity queries by classroom enrollment before ranking. | **CRITICAL** |
| **Module 6: Code Auto-Grader** | `codeAutograder.service.js` runs tests via Judge0 + qualitative LLM review. | **PARTIALLY WORKING** | Judge0 / Deterministic + LLM Qualitative | Authoritative test scoring via Judge0 CE. Qualitative code review (naming, complexity, edge cases) routed through `GeminiService` (`code-grader-v1`). | High |
| **Module 7: Teacher Co-Pilot** | `copilotService.js` aggregates weak concepts and proposes pedagogical remedies. | **PARTIALLY WORKING** | Reads `memoryStore` + OpenAI/Anthropic | Compute class/topic weaknesses purely in deterministic SQL math. Send computed aggregates to Gemini (`copilot-v1`) for pedagogical action interpretation only. | High |
| **Module 8: Performance Analytics** | `analyticsService.js` computes student/class mastery, confidence distribution, override rates. | **BROKEN / FABRICATED** | Fabricated hardcoded numbers (8.35, 83.5%, 94.2%, 7.1%, 42 subs) | Eliminate all hardcoded statistical fallbacks. Compute 100% of averages, percentages, and topic mastery using deterministic SQL aggregation. | **CRITICAL** |
| **AI FairGrade Grading Feature** | FastAPI `fairgrade-service` (`written_evaluator.py`) + `fairgradeClient.service.js`. | **BROKEN / FABRICATED** | Anthropic + Fake 85% fallback report on failure | Eliminate `_generateFallbackReport` fake grades. Point evaluation at Gemini via `GeminiService`. On failure, mark `status = 'flagged_for_review'` with `requires_human_review = true`. | **CRITICAL** |
| **Judge0 Code Execution** | `judge0.service.js` executes code via Judge0 HTTP API or local runner. | **BROKEN / FABRICATED** | Real HTTP + Fake pass simulation fallback | Remove the fake test simulator in `_executeDeterministicRunner` that fabricates `passed = true` with `stdout = expectedOutput`. Fail explicitly with `EXECUTION_UNAVAILABLE`. | **CRITICAL** |
| **Grade Appeals & Bias Auditing** | `appealService.js`, `GradeAppeal.js`, `BiasCheckLog.js`. | **PARTIALLY WORKING** | In-memory / Partial DB | Enforce transactional blind re-evaluation with fresh anonymous salt. Log all teacher score adjustments to `grade_audit_log` with before/after state diffs. | High |
| **Audit Logging Subsystem** | `auditRoutes.js`, `GradeAuditLog.js`, `adminService.js`. | **PARTIALLY WORKING** | In-memory Map + Partial SQL | Make audit logs 100% PostgreSQL-persisted. Add indexes on actor, action, timestamp, and target entity. Expose tamper-evident query endpoints for Admin. | High |
| **Notifications Subsystem** | `notificationService.js`, `Notification.js`, `notificationRoutes.js`. | **BROKEN (Read-Volatile)** | Writes to DB, but `findForUser` reads only from `memoryStore` | Fix `findForUser` to query PostgreSQL `notifications` table. Ensure backend triggers fire on real events (new submission, low confidence, appeal filed, RBAC denied). | High |
| **Admin Portal** | `AdminLayout.jsx`, `AdminUsersView.jsx`, `AdminClassroomsView.jsx`, `AdminAuditLogsView.jsx`, etc. | **PARTIALLY WORKING** | UI Complete, backend uses `memoryStore` | Connect all Admin views to PostgreSQL endpoints. Add user provisioning, classroom lifecycle, AI service health monitoring, and system metrics. | High |
| **Teacher Portal** | `TeacherLayout.jsx`, `TeacherDashboardView.jsx`, `TeacherMaterialsView.jsx`, `TeacherAssignmentsView.jsx`, etc. | **PARTIALLY WORKING** | UI Complete, backend uses `memoryStore` | Connect to persistent PostgreSQL backend for class creation, material uploads, assessment/rubric building, grading oversight, and Co-Pilot actions. | High |
| **Student Portal** | `StudentLayout.jsx`, `StudentDashboardView.jsx`, `StudentSandboxView.jsx`, `StudentTutorView.jsx`, `StudentGradesView.jsx`, etc. | **PARTIALLY WORKING** | UI Complete, backend uses `memoryStore` | Connect to persistent PostgreSQL backend for classroom join, material browsing, code submission, written answer submission, grade viewing, and appeals. | High |

---

## 3. Specific Codebase Vulnerabilities & Mock Markers Flagged

### 3.1. Fabricated Grades & Fallback Reports
- **`backend-core/src/services/fairgradeClient.service.js` (lines 31–33, 196–220):**
  When HTTP connection to `fairgrade-service` fails, `_generateFallbackReport` manufactures an arbitrary `85.0%` grade (`total_marks = max_marks * 0.85`), with fabricated evidence string `"Key theoretical principles and mechanisms were clearly stated..."` and `confidence_score = 0.95`.
- **`fairgrade-service/app/grading/written_evaluator.py` (lines 98–101, 167–200):**
  When `ANTHROPIC_API_KEY` is missing, `_generateMockEvaluation` synthesizes a fake `85.0%` score and fake criteria evidence.

### 3.2. Fake Pass Simulator in Judge0 Service
- **`backend-core/src/services/judge0.service.js` (lines 224–266, 360–388):**
  If Judge0 is offline and local process execution fails, `_executeDeterministicRunner` sets `let stdout = expectedOutput || 'Output Generated'; let passed = true;` and returns a fake `Accepted` status. It also hardcodes assignment-specific function names (`detect_deadlock`).

### 3.3. Hardcoded Analytics & GPA Fallbacks
- **`backend-core/src/services/analyticsService.js` (lines 33–51):**
  Contains hardcoded fallback numbers: `totalSubmissions = ... || 42`, `avgMarks = ... : 8.35`, `avgPercentage = ... : 83.5`, `avgConfidence = ... : 94.2`, `humanReviewRate = ... : 7.1`, `appealRate = ... : 4.8`.

### 3.4. Header-Based Authentication Bypass
- **`backend-core/src/middleware/authMiddleware.js` (lines 29–37):**
  ```javascript
  if (req.headers['x-user-id'] || req.headers['x-student-id']) {
    req.user = {
      id: req.headers['x-user-id'] || req.headers['x-student-id'],
      role: (req.headers['x-user-role'] || 'STUDENT').toUpperCase(),
      email: req.headers['x-user-email'] || 'user@skillforge.ai',
      name: req.headers['x-user-name'] || 'User',
    };
    return next();
  }
  ```
  Allows any client to bypass JWT authentication by simply providing arbitrary headers.

### 3.5. Volatile In-Memory State (`memoryStore`)
- **`backend-core/src/config/db.js` & `backend-core/src/models/*`:**
  22 `Map` collections in `memoryStore` hold classrooms, class feed posts, learning materials, assignments, student enrollments, vector embeddings, curated resources, and notifications.
- **`backend-core/src/models/Notification.js` (lines 95–130):**
  `findForUser()` queries ONLY `memoryStore.notifications`, causing all notifications to disappear upon server restart.
- **`backend-core/src/services/rag/vectorStore.service.js`:**
  Vectors stored in `memoryStore.vector_embeddings` (JavaScript Map) and wiped on restart.

### 3.6. Missing Gemini AI Integration
- **`backend-core/src/ai/llmProvider.js`:**
  Implements `OpenAIProvider` and `AnthropicProvider`. `@google/genai` is not yet installed or integrated into the backend AI service layer.

---

## 4. Current PostgreSQL Database Schema Status

The existing migration `database/migrations/001_create_fairgrade_tables_and_roles.sql` covers:
- `assessment`, `assessment_question`, `rubric`, `rubric_criterion`
- `written_submission`, `student_identity_map`
- `anonymous_submission`, `fairgrade_report`, `fairgrade_criterion_score`, `grading_evaluation`, `bias_check_log`
- `grade_appeal`, `grade_audit_log`

**Missing Core Domain Tables in PostgreSQL:**
1. `users` (id, email, password_hash, role, name, status, created_at, updated_at)
2. `classrooms` (id, code, name, subject, description, semester, academic_year, join_code, created_by, status, created_at, updated_at)
3. `student_enrollments` (id, classroom_id, student_id, enrolled_at, status)
4. `subjects` (id, code, name, description, department, created_at)
5. `class_feed_posts` (id, classroom_id, author_id, type, title, content, attachments, created_at)
6. `learning_materials` (id, classroom_id, title, topic, file_name, file_type, extracted_text, taxonomy, uploaded_by, created_at)
7. `curated_resources` (id, material_id, classroom_id, topic, title, url, type, relevance_score, source, description, created_at)
8. `programming_assignments` (id, classroom_id, title, description, language, starter_code, solution_code, cpu_time_limit, memory_limit, due_date, created_by, created_at)
9. `test_cases` (id, assignment_id, name, input, expected_output, is_hidden, weight, created_at)
10. `code_submissions` (id, assignment_id, student_id, source_code, language, status, execution_time, memory_used, passed_test_cases, total_test_cases, code_grade_score, qualitative_review, submitted_at)
11. `code_executions` (id, submission_id, test_case_id, status_id, status_description, stdout, stderr, compile_output, execution_time, memory_kb, passed, executed_at)
12. `vector_embeddings` / `document_chunks` (id, document_id, classroom_id, chunk_index, chunk_text, embedding, created_at)
13. `chat_sessions` & `chat_messages` (id, session_id, user_id, classroom_id, role, message_text, sources, created_at)
14. `performance_logs` & `topic_mastery` (id, student_id, classroom_id, topic, mastery_score, total_evaluations, last_updated)
15. `teacher_recommendations` (id, teacher_id, classroom_id, topic, priority, action_type, suggested_action, status, created_at)
16. `notifications` (id, recipient_id, recipient_role, type, title, message, record_type, record_id, metadata, priority, is_read, created_at)
17. `ai_request_logs` (id, service, provider, model, prompt_version, duration_ms, status, error_type, error_message, prompt_tokens, completion_tokens, total_tokens, created_at)
18. `system_settings` (key, value, description, updated_at)

---

## 5. Audit Conclusion

The application architecture has solid domain modeling and clean frontend UI views, but relies heavily on volatile memory Maps and mock/fallback behaviors. 

By replacing in-memory stores with normalized PostgreSQL tables, securing auth/RBAC, integrating the official `@google/genai` Gemini SDK in a dedicated service layer, ensuring Judge0 is authoritative for code execution, and enforcing strict fail-to-review policies rather than fabricating results, SkillForge AI will transition cleanly into a robust, persistent, production-grade application.
