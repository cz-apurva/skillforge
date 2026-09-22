# ⚡ SkillForge AI — Adaptive Classroom & Assessment Platform

SkillForge AI is a high-performance, AI-native education ecosystem designed for adaptive learning, automated code grading, bias-resistant assessment evaluation (FairGrade), teacher copilot assistance, and student mastery analytics.

---

## 🏗️ Architecture Overview

```
                           ┌────────────────────────┐
                           │   Frontend (React/Vite)│
                           │   Port: 3000           │
                           └───────────┬────────────┘
                                       │ HTTP / REST
                                       ▼
                           ┌────────────────────────┐
                           │   Backend Core (Node)  │
                           │   Express.js (Port 5000)│
                           └─────┬────────────┬─────┘
                                 │            │
            ┌────────────────────┘            └────────────────────┐
            ▼                                                      ▼
┌────────────────────────┐                               ┌────────────────────────┐
│ FairGrade Microservice │                               │ PostgreSQL / Supabase  │
│ Python/FastAPI (8000)  │                               │ Database Persistence   │
└────────────────────────┘                               └────────────────────────┘
```

1. **Frontend (`frontend/`)**: Modern Single Page Application built with React 18, Vite, dynamic analytics charts, student/teacher/admin portals, code sandbox editor, and interactive Socratic tutor.
2. **Backend Core (`backend-core/`)**: Express.js REST API providing JWT auth, RBAC, Gemini 2.0 Flash AI integrations, RAG vector pipeline, Judge0 sandbox autograding, and automated real-time notifications.
3. **FairGrade Microservice (`fairgrade-service/`)**: Python FastAPI service delivering double-blind, rubric-based evaluation with multi-perspective grading and bias detection.
4. **Database (`database/`)**: PostgreSQL migrations and seed scripts for users, classrooms, assignments, rubrics, submissions, and learning intelligence layers.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ 
- **Python**: v3.10+
- **PostgreSQL Database** (or cloud Supabase instance)

---

### 1. Clone & Configure Environment

```bash
git clone https://github.com/cz-apurva/skillforge.git
cd skillforge

# Copy and update root environment variables
cp .env.example .env
cp backend-core/.env.example backend-core/.env
```

Ensure your `.env` contains your Gemini API key and PostgreSQL `DATABASE_URL`.

---

### 2. Install Dependencies

```bash
# Install backend dependencies
cd backend-core
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install FairGrade python dependencies
cd ../fairgrade-service
pip install -r requirements.txt
```

---

### 3. Run Database Migrations & Seeding

```bash
npm run db:migrate
npm run db:seed
```

---

### 4. Running the Platform Services

In separate terminal tabs:

**Terminal 1 — FairGrade Python Microservice:**
```bash
cd fairgrade-service
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — Backend Core Service:**
```bash
cd backend-core
npm run dev
```

**Terminal 3 — React Frontend:**
```bash
cd frontend
npm run dev
```

Platform will be available at:
- **Web App**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **FairGrade API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🔒 Security & Privacy
- Zero secrets or `.env` files are tracked in version control.
- Double-blind student identity mapping for FairGrade evaluation.
- Role-Based Access Control (Admin, Teacher, Student).

---

## 📄 License
MIT License
