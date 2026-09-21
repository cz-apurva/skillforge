const { memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class StudentService {
  /**
   * Initialize default student data if empty
   */
  static _initDefaultsIfNeeded(studentId = 'student-mca-402-alice') {
    const defaultClasses = [
      {
        id: 'cls-mca-401',
        code: 'MCA-401-2026',
        name: 'MCA Section A - Advanced Operating Systems',
        subject: 'Operating Systems & System Programming',
        description: 'Kernel architectures, multi-threading, concurrency control, and distributed deadlock detection.',
        semester: 'Semester 4',
        academic_year: '2026-2027',
        join_code: 'SF-MCA-401A',
        teacher_name: 'Prof. A. Anupam',
        student_count: 42,
        status: 'active',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      },
      {
        id: 'cls-mca-402',
        code: 'MCA-402-2026',
        name: 'MCA Section B - Database Engineering & Distributed ACID',
        subject: 'Database Systems & Query Optimization',
        description: 'Relational design, normalization rigor (3NF/BCNF), Raft consensus, and transaction isolation levels.',
        semester: 'Semester 4',
        academic_year: '2026-2027',
        join_code: 'SF-MCA-402B',
        teacher_name: 'Prof. A. Anupam',
        student_count: 38,
        status: 'active',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
      },
      {
        id: 'cls-sec-502',
        code: 'SEC-502-2026',
        name: 'Network Security & Applied Cryptography',
        subject: 'Information & Network Security',
        description: 'Zero-trust networks, TLS 1.3 protocol analysis, asymmetric cryptography, and penetration testing sandboxes.',
        semester: 'Semester 4 Specialization',
        academic_year: '2026-2027',
        join_code: 'SF-SEC-502C',
        teacher_name: 'Prof. A. Anupam',
        student_count: 35,
        status: 'active',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
      },
    ];
    for (const c of defaultClasses) {
      if (!memoryStore.classrooms.has(c.id)) {
        memoryStore.classrooms.set(c.id, c);
      }
    }

    // Ensure student enrollments exist
    if (!memoryStore.student_enrollments.has(`${studentId}_cls-mca-401`)) {
      memoryStore.student_enrollments.set(`${studentId}_cls-mca-401`, {
        student_id: studentId,
        classroom_id: 'cls-mca-401',
        enrolled_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString(),
      });
    }
    if (!memoryStore.student_enrollments.has(`${studentId}_cls-mca-402`)) {
      memoryStore.student_enrollments.set(`${studentId}_cls-mca-402`, {
        student_id: studentId,
        classroom_id: 'cls-mca-402',
        enrolled_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
      });
    }

    // Ensure default materials exist
    const defaultMaterials = [
      {
        id: 'mat-001',
        title: 'Database Schema Normalization & Functional Dependencies',
        topic: 'Database Engineering & Normal Forms',
        difficulty: 'Intermediate',
        classroom_id: 'cls-mca-402',
        classroom_name: 'MCA Section B - Database Engineering & Distributed ACID',
        file_type: 'PDF',
        file_name: 'Lecture_07_Database_Normalization_3NF_BCNF.pdf',
        content_text: 'Relational Database Normalization: 1NF requires atomic values. 2NF removes partial key dependencies. 3NF removes transitive dependencies for non-prime attributes (X -> A implies X is superkey or A is prime). BCNF eliminates all redundancy anomalies by enforcing every determinant X in X -> A is a superkey. Lossless join decomposition is verified via the Chase matrix algorithm.',
        subtopics: ['1NF / 2NF / 3NF Foundations', 'Boyce-Codd Normal Form (BCNF)', 'Lossless-Join Decomposition', 'Dependency Preservation Test'],
        prerequisites: ['Relational Algebra', 'Functional Dependencies (FDs)', 'Candidate Keys'],
        learning_outcomes: [
          'Differentiate between 3NF and BCNF violations with formal proofs',
          'Compute minimal canonical cover of functional dependencies',
          'Execute synthesis and decomposition algorithms for relational schemas',
        ],
        reference_concepts: ['Armstrong Axioms', 'Transitive Dependency', 'Prime Attributes', 'Multivalued Dependencies (4NF)'],
        extracted_summary: 'Comprehensive analysis of database schema normalization, redundancy reduction techniques, and anomaly-free relational decomposition.',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      },
      {
        id: 'mat-002',
        title: 'Linux Kernel Scheduling: CFS & Concurrency Control',
        topic: 'Operating Systems',
        difficulty: 'Intermediate',
        classroom_id: 'cls-mca-401',
        classroom_name: 'MCA Section A - Advanced Operating Systems',
        file_type: 'PPTX',
        file_name: 'Module_04_CPU_Scheduling.pptx',
        content_text: 'Linux Completely Fair Scheduler (CFS) uses red-black trees indexed by vruntime (virtual runtime). Tasks with smallest vruntime get scheduled first. Nice values scale the rate of vruntime progression. Deadlocks in multi-threaded environments are handled via Chandy-Misra-Haas probe routing (initiator, sender, receiver).',
        subtopics: ['Completely Fair Scheduler', 'Red-Black Tree Runqueues', 'Nice Values & Latency Target', 'Chandy-Misra-Haas Deadlock Algorithm'],
        prerequisites: ['Process Management', 'Virtual Memory', 'Mutexes and Semaphores'],
        learning_outcomes: ['Analyze vruntime calculation algorithm', 'Configure SCHED_FIFO vs SCHED_RR', 'Trace distributed deadlock probes'],
        reference_concepts: ['vruntime', 'Red-Black Trees', 'Convoy Effect', 'Edge Chasing'],
        extracted_summary: 'In-depth analysis of Linux CFS scheduling algorithms, latency target optimizations, and distributed deadlock detection algorithms.',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      },
    ];
    for (const m of defaultMaterials) {
      if (!memoryStore.learning_materials.has(m.id)) {
        memoryStore.learning_materials.set(m.id, m);
      }
    }

    // Ensure default assignments exist
    const defaultAssignments = [
      {
        id: 'asg-prog-1',
        assignment_type: 'programming',
        title: 'Assignment 01: Multi-Threaded Deadlock Detector',
        classroom_id: 'cls-mca-401',
        subject: 'Operating Systems',
        language: 'cpp',
        max_score: 100,
        description: 'Implement a multi-threaded Chandy-Misra-Haas probe message edge chasing deadlock detector in C++.',
        learning_outcome: 'Detect distributed cycles and handle initiator-sender-receiver probes.',
        status: 'active',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      },
      {
        id: 'asg-writ-1',
        assignment_type: 'written',
        title: 'Midterm Written: Relational Schema BCNF Decomposition & Functional Dependencies',
        classroom_id: 'cls-mca-402',
        subject: 'Database Engineering',
        max_score: 100,
        description: 'Verify losslessness and dependency preservation for Boyce-Codd Normal Form schemas using the Chase matrix algorithm.',
        learning_outcome: 'Differentiate between 3NF and BCNF violations with formal mathematical proofs.',
        status: 'active',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      },
    ];
    for (const a of defaultAssignments) {
      if (!memoryStore.assignments.has(a.id)) {
        memoryStore.assignments.set(a.id, a);
      }
    }
  }

  /**
   * Get Student Dashboard Data
   */
  static async getDashboardData(user) {
    const studentId = user?.id || 'student-mca-402-alice';
    this._initDefaultsIfNeeded(studentId);

    // Fetch enrolled classes
    const enrolledClassIds = [];
    for (const [key, val] of memoryStore.student_enrollments.entries()) {
      if (val.student_id === studentId) {
        enrolledClassIds.push(val.classroom_id);
      }
    }

    const myClasses = [];
    for (const cid of enrolledClassIds) {
      if (memoryStore.classrooms.has(cid)) {
        myClasses.push(memoryStore.classrooms.get(cid));
      }
    }

    return {
      student_profile: {
        id: studentId,
        name: user?.name || user?.email || 'Student',
        roll_number: user?.id ? `SF-${user.id.slice(0, 8).toUpperCase()}` : 'SF-MCA-2026',
        semester: 'MCA Semester 4',
        enrolled_classes_count: myClasses.length,
      },
      my_classes: myClasses,
      upcoming_assessments: [
        {
          id: 'asg-002',
          title: 'Midterm Written: Relational Schema BCNF Decomposition & Functional Dependencies',
          classroom_name: 'MCA Section B - Database Engineering & Distributed ACID',
          due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString(),
          max_score: 100,
          type: 'WRITTEN',
          evaluation_engine: 'AI FairGrade Multi-Pass',
          status: 'PENDING_SUBMISSION',
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
          sandbox_available: true,
          status: 'IN_PROGRESS',
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
    };
  }

  /**
   * Get Enrolled Classes
   */
  static async getClasses(user) {
    const studentId = user?.id || 'student-mca-402-alice';
    this._initDefaultsIfNeeded(studentId);

    const enrolledClassIds = [];
    for (const [key, val] of memoryStore.student_enrollments.entries()) {
      if (val.student_id === studentId) {
        enrolledClassIds.push(val.classroom_id);
      }
    }

    const classes = [];
    for (const cid of enrolledClassIds) {
      if (memoryStore.classrooms.has(cid)) {
        classes.push(memoryStore.classrooms.get(cid));
      }
    }

    return classes;
  }

  /**
   * Join a classroom by join code (e.g. SF-MCA-401A)
   */
  static async joinClassByCode(joinCode, user) {
    const studentId = user?.id || 'student-mca-402-alice';
    this._initDefaultsIfNeeded(studentId);

    if (!joinCode) {
      const err = new Error('Join code is required');
      err.statusCode = 400;
      throw err;
    }

    const cleanCode = joinCode.trim().toUpperCase();

    // Find classroom matching join code
    let targetClass = null;
    for (const [id, cls] of memoryStore.classrooms.entries()) {
      if (cls.join_code?.toUpperCase() === cleanCode) {
        targetClass = cls;
        break;
      }
    }

    if (!targetClass) {
      const err = new Error(`Classroom with code "${cleanCode}" was not found. Please verify the code with your instructor.`);
      err.statusCode = 404;
      throw err;
    }

    const enrollmentKey = `${studentId}_${targetClass.id}`;
    if (memoryStore.student_enrollments.has(enrollmentKey)) {
      return {
        already_enrolled: true,
        classroom: targetClass,
        message: `You are already enrolled in ${targetClass.name}.`,
      };
    }

    memoryStore.student_enrollments.set(enrollmentKey, {
      student_id: studentId,
      classroom_id: targetClass.id,
      enrolled_at: new Date().toISOString(),
    });

    targetClass.student_count = (targetClass.student_count || 0) + 1;

    return {
      already_enrolled: false,
      classroom: targetClass,
      message: `Successfully enrolled in ${targetClass.name}!`,
    };
  }

  /**
   * Get Single Classroom Details for Student
   */
  static async getClassById(classId, user) {
    const studentId = user?.id || 'student-mca-402-alice';
    this._initDefaultsIfNeeded(studentId);

    const classroom = memoryStore.classrooms.get(classId);
    if (!classroom) {
      const err = new Error('Classroom not found');
      err.statusCode = 404;
      throw err;
    }

    // Get feed posts for this classroom
    const posts = [];
    for (const [id, post] of memoryStore.class_feed.entries()) {
      if (post.classroom_id === classId) {
        posts.push(post);
      }
    }

    // Get materials for this classroom
    const materials = [];
    for (const [id, mat] of memoryStore.learning_materials.entries()) {
      if (mat.classroom_id === classId) {
        materials.push(mat);
      }
    }

    // Get assignments for this classroom
    const assignments = [];
    for (const [id, asg] of memoryStore.assignments.entries()) {
      if (asg.classroom_id === classId) {
        assignments.push(asg);
      }
    }

    return {
      classroom,
      posts: posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      materials,
      assignments,
    };
  }

  /**
   * Get Learning Materials and AI Curated Resources
   */
  static async getMaterialsAndResources(user) {
    this._initDefaultsIfNeeded(user?.id);
    const ResourceCuratorService = require('./resourceCurator.service');
    await ResourceCuratorService.seedDefaultsIfNeeded();

    const materials = Array.from(memoryStore.learning_materials.values());

    // Fetch strictly approved curated resources scoped to student's enrolled classes
    const approvedDbResources = await ResourceCuratorService.getResourcesForStudent(user);

    // Default interactive sandboxes & cheat sheets for courseware reinforcement
    const defaultCurated = [
      {
        id: 'res-curated-1',
        title: 'Interactive Normalization & Chase Matrix Decomposition Visualizer',
        type: 'INTERACTIVE_SANDBOX',
        relevance: 'High Relevance to Database Systems & BCNF Modules',
        description: 'Step-by-step canonical cover computations and lossless join matrix tests directly in your browser.',
        tags: ['BCNF', '3NF', 'Functional Dependencies', 'Chase Algorithm'],
        source: 'SkillForge Resource Curator AI',
        approved_status: 'APPROVED',
      },
      {
        id: 'res-curated-2',
        title: 'Linux Kernel CFS Red-Black Tree Runqueue Visualizer',
        type: 'INTERACTIVE_SANDBOX',
        relevance: 'High Relevance to Advanced Operating Systems',
        description: 'Interactive execution timeline visualizing vruntime dynamics and process scheduling under CFS.',
        tags: ['CFS', 'Scheduling', 'Linux Kernel', 'vruntime'],
        source: 'SkillForge Resource Curator AI',
        approved_status: 'APPROVED',
      },
      {
        id: 'res-curated-3',
        title: 'Distributed 2-Phase Commit & Raft Consensus Reference Sheet',
        type: 'CHEAT_SHEET',
        relevance: 'Essential Reference for Distributed ACID & Fault Tolerance',
        description: 'Comprehensive quick reference covering commit log replication, quorum intersections, and leader stepdown.',
        tags: ['Raft', '2PC', 'ACID', 'Distributed Consensus'],
        source: 'SkillForge Resource Curator AI',
        approved_status: 'APPROVED',
      },
      {
        id: 'res-curated-4',
        title: 'Zero-Knowledge Proofs & ECC Curve Cryptography Guide',
        type: 'LECTURE_SLIDES',
        relevance: 'Recommended for Network Security Specialization',
        description: 'Detailed lecture notes covering Elliptic Curve Diffie-Hellman and TLS 1.3 key exchange handshakes.',
        tags: ['Cryptography', 'TLS 1.3', 'ECDH'],
        source: 'Prof. A. Anupam',
        approved_status: 'APPROVED',
      },
    ];

    const curatedResources = [...approvedDbResources, ...defaultCurated];

    return {
      materials,
      curated_resources: curatedResources,
    };
  }

  /**
   * Get Curated Resources for Student (strictly APPROVED only)
   */
  static async getCuratedResources(user) {
    this._initDefaultsIfNeeded(user?.id);
    const ResourceCuratorService = require('./resourceCurator.service');
    return await ResourceCuratorService.getResourcesForStudent(user);
  }

  /**
   * Socratic AI Tutor & Vector RAG Search grounded strictly in teacher-uploaded content
   */
  static async handleTutorChat(payload, user) {
    this._initDefaultsIfNeeded(user?.id);
    const { RAGService } = require('./rag');
    await RAGService.seedDefaultsIfNeeded();

    const queryMessage = payload.message || payload.query || '';
    if (!queryMessage.trim()) {
      const err = new Error('Message is required');
      err.statusCode = 400;
      throw err;
    }

    return await RAGService.queryKnowledgeBase({
      query: queryMessage,
      message: queryMessage,
      user,
      studentId: user?.id,
      assignmentId: payload.assignmentId || payload.assignment_id,
      assignment_id: payload.assignment_id || payload.assignmentId,
      contextTopic: payload.contextTopic || payload.topic,
      topic: payload.topic || payload.contextTopic,
      classroomId: payload.classroomId || payload.classroom_id,
      classroom_id: payload.classroom_id || payload.classroomId,
    });
  }

  /**
   * Run code in Sandbox against sample test cases (Judge0)
   */
  static async runSandboxCode({ code, language = 'Python', assignmentId, sampleCases }) {
    const CodeAutograderService = require('./codeAutograder.service');
    return await CodeAutograderService.runSampleTests({
      code,
      language,
      assignmentId,
      sampleCases,
    });
  }

  /**
   * Submit code in Sandbox against hidden validation benchmarks (Judge0 + Hybrid Auto-Grader)
   */
  static async submitSandboxCode({ code, language = 'Python', assignmentId, testCases, maxScore }, user) {
    const CodeAutograderService = require('./codeAutograder.service');
    return await CodeAutograderService.gradeSubmission({
      code,
      language,
      assignmentId,
      allTestCases: testCases,
      maxScore,
      user,
    });
  }
}

module.exports = StudentService;
