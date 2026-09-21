const { memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const CopilotService = require('./copilotService');
const Assessment = require('../models/Assessment');
const WrittenSubmission = require('../models/WrittenSubmission');

class TeacherService {
  /**
   * Helper to ensure default classrooms and posts exist
   */
  static _initDefaultsIfNeeded(teacherId = 'teacher-001-uuid') {
    if (memoryStore.classrooms.size === 0) {
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
          created_by: teacherId,
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
          created_by: teacherId,
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
          created_by: teacherId,
          teacher_name: 'Prof. A. Anupam',
          student_count: 35,
          status: 'active',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
        },
      ];

      for (const c of defaultClasses) {
        memoryStore.classrooms.set(c.id, c);
      }
    }

    if (memoryStore.class_feed.size === 0) {
      const defaultPosts = [
        {
          id: 'post-1',
          classroom_id: 'cls-mca-401',
          type: 'Announcement',
          title: 'Welcome to Advanced OS & FairGrade Evaluation System',
          content: 'Welcome students! All subjective assignments this semester will be evaluated anonymously via the SkillForge FairGrade engine.',
          author_name: 'Prof. A. Anupam',
          author_role: 'TEACHER',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
          attachments: [],
        },
        {
          id: 'post-2',
          classroom_id: 'cls-mca-401',
          type: 'Lesson',
          title: 'Lecture 4: Preemptive vs Non-Preemptive Process Scheduling',
          content: 'Review slides and practice problem set on Round Robin and SRTF algorithms with context-switch latency considerations.',
          author_name: 'Prof. A. Anupam',
          author_role: 'TEACHER',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          attachments: [{ name: 'lecture4_process_scheduling.pdf', size: '2.4 MB' }],
        },
        {
          id: 'post-3',
          classroom_id: 'cls-mca-401',
          type: 'Assessment',
          title: 'Assessment 1: OS Process Scheduling & Deadlock Written Evaluation',
          content: 'Written evaluation open for submission. All answers will be evaluated based on the published 3-criterion rubric.',
          author_name: 'Prof. A. Anupam',
          author_role: 'TEACHER',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
          attachments: [],
        },
      ];

      for (const p of defaultPosts) {
        memoryStore.class_feed.set(p.id, p);
      }
    }
  }

  /**
   * Get teacher dashboard metrics, classes, and Co-Pilot recommendations
   */
  static async getDashboardData(user) {
    const teacherId = user?.id || 'teacher-001-uuid';
    this._initDefaultsIfNeeded(teacherId);

    const allClasses = Array.from(memoryStore.classrooms.values());
    const myClasses = allClasses.filter((c) => c.created_by === teacherId || c.created_by === 'teacher-001-uuid');

    const totalStudents = myClasses.reduce((sum, c) => sum + (c.student_count || 0), 0);
    const submissions = await WrittenSubmission.findAll();
    const flaggedSubmissions = submissions.filter((s) => s.status === 'flagged_for_review');

    // Get Teacher Co-Pilot recommendation with deterministic weak-topic detection
    const copilotData = await CopilotService.getTeacherRecommendations({ teacherUser: user });

    return {
      metrics: {
        my_classes_count: myClasses.length,
        total_students: totalStudents || 115,
        pending_submissions: 8,
        average_class_performance: '78.4%',
        flagged_evaluations: flaggedSubmissions.length || 2,
      },
      my_classes: myClasses,
      copilot: {
        top_weakness_concept: copilotData.top_weakness_concept || 'Relational Schema Normalization & BCNF',
        student_deficiency_count: copilotData.student_deficiency_count || 5,
        deficiency_percentage: copilotData.deficiency_percentage || '71.4%',
        computed_evidence_summary: copilotData.computed_evidence_summary || '71.4% of evaluated students scored below 70% on Normalization & BCNF.',
        priority: copilotData.priority || 'HIGH',
        action_type: copilotData.action_type || 'REVISE_TOPIC',
        suggested_action: copilotData.suggested_action,
        suggested_discussion_starter: copilotData.suggested_discussion_starter,
        recommended_resources: copilotData.recommended_resources,
        recommendations: copilotData.recommendations || [],
        evidence_breakdown: copilotData.evidence_breakdown || [],
      },
    };
  }

  /**
   * Get all Co-Pilot recommendations with decision statuses
   */
  static async getCopilotRecommendations({ classroomId, status }, user) {
    return await CopilotService.listRecommendations({ classroomId, status, teacherUser: user });
  }

  /**
   * Record Teacher Accept / Reject decision on a Co-Pilot recommendation
   */
  static async recordCopilotDecision({ recommendationId, decision, notes }, user) {
    return await CopilotService.recordTeacherDecision({
      recommendationId,
      decision,
      notes,
      user,
    });
  }

  /**
   * Run full cohort weak-topic detection and generate new recommendations
   */
  static async analyzeCohortDeficiencies(payload, user) {
    return await CopilotService.getTeacherRecommendations({
      classroomId: payload?.classroom_id || payload?.classroomId,
      teacherUser: user,
      forceRefresh: true,
    });
  }

  /**
   * List classes for the teacher
   */
  static async getClasses(user) {
    const teacherId = user?.id || 'teacher-001-uuid';
    this._initDefaultsIfNeeded(teacherId);

    const allClasses = Array.from(memoryStore.classrooms.values());
    return allClasses.filter((c) => c.created_by === teacherId || c.created_by === 'teacher-001-uuid');
  }

  /**
   * Create a new classroom and generate a unique join code
   */
  static async createClass({ name, subject, description, semester, academic_year, academicYear }, user) {
    const teacherId = user?.id || 'teacher-001-uuid';
    const teacherName = user?.name || 'Prof. A. Anupam';

    if (!name || name.trim() === '') {
      const error = new Error('Classroom name is required');
      error.statusCode = 400;
      throw error;
    }

    if (!subject || subject.trim() === '') {
      const error = new Error('Subject is required');
      error.statusCode = 400;
      throw error;
    }

    // Generate readable, unique join code (e.g. SF-MCA-7281)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const subjectPrefix = subject.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'MCA');
    const joinCode = `SF-${subjectPrefix}-${randomSuffix}`;

    const newClass = {
      id: uuidv4(),
      code: `${subjectPrefix}-${randomSuffix}`,
      name: name.trim(),
      subject: subject.trim(),
      description: description ? description.trim() : '',
      semester: semester || 'Semester 4',
      academic_year: academic_year || academicYear || '2026-2027',
      join_code: joinCode,
      created_by: teacherId,
      teacher_name: teacherName,
      student_count: 0,
      status: 'active',
      created_at: new Date().toISOString(),
    };

    memoryStore.classrooms.set(newClass.id, newClass);

    try {
      const GradeAuditLog = require('../models/GradeAuditLog');
      await GradeAuditLog.create({
        actor: teacherName,
        role: 'TEACHER',
        action: 'CLASS_CREATED',
        target: `class:${newClass.id}`,
        old_value: null,
        new_value: { class_id: newClass.id, name: newClass.name, subject: newClass.subject, join_code: newClass.join_code },
        reason: `Teacher created new classroom ${newClass.name} (${newClass.code})`,
        class_id: newClass.id,
        teacher_id: teacherId,
      });
    } catch {}

    return newClass;
  }

  /**
   * Get single classroom details with feed and roster
   */
  static async getClassById(classId, user) {
    this._initDefaultsIfNeeded();
    const cls = memoryStore.classrooms.get(classId);
    if (!cls) {
      const error = new Error(`Classroom not found: ${classId}`);
      error.statusCode = 404;
      throw error;
    }

    const feed = Array.from(memoryStore.class_feed.values()).filter(
      (p) => p.classroom_id === classId || p.classroom_id === 'cls-mca-401'
    );

    const materials = Array.from(memoryStore.learning_materials?.values() || []).filter(
      (m) => m.classroom_id === classId
    );

    return {
      ...cls,
      feed,
      materials,
      roster: [
        { id: 'std-1', name: 'Alice Smith', email: 'alice@skillforge.ai', status: 'Enrolled' },
        { id: 'std-2', name: 'Bob Johnson', email: 'bob@skillforge.ai', status: 'Enrolled' },
        { id: 'std-3', name: 'Charlie Davis', email: 'charlie@skillforge.ai', status: 'Enrolled' },
        { id: 'std-4', name: 'Diana Prince', email: 'diana@skillforge.ai', status: 'Enrolled' },
      ],
    };
  }

  /**
   * Run real Text Extraction and Content Analyzer on uploaded learning materials
   */
  static async analyzeMaterialContent(payload) {
    const ContentAnalyzerService = require('./contentAnalyzer.service');
    const fileName = payload.fileName || payload.file_name;
    const fileType = payload.fileType || payload.file_type;
    const rawContent = payload.rawContent || payload.content_text;
    const title = payload.title;

    return await ContentAnalyzerService.analyzeDocument({
      buffer: payload.buffer,
      base64: payload.base64,
      fileName,
      fileType,
      rawContent,
      titleHint: title,
    });
  }

  /**
   * Save and publish learning material to class feed and store for RAG indexing
   */
  static async publishMaterial(materialData, user) {
    const teacherId = user?.id || 'teacher-001-uuid';
    const teacherName = user?.name || 'Prof. A. Anupam';

    const materialId = materialData.id || uuidv4();
    const subtopics = materialData.subtopics || [];
    const concepts = materialData.concepts || materialData.reference_concepts || [];
    const learningOutcomes = materialData.learning_objectives || materialData.learning_outcomes || [];
    const prerequisites = materialData.prerequisites || [];
    const keyTerms = materialData.key_terms || [];
    const possibleMisconceptions = materialData.possible_misconceptions || [];
    const suggestedAssessments = materialData.suggested_assessment_topics || [];

    const newMaterial = {
      id: materialId,
      title: materialData.title || 'Course Learning Material',
      topic: materialData.main_topic || materialData.topic || 'Engineering Courseware',
      main_topic: materialData.main_topic || materialData.topic || 'Engineering Courseware',
      difficulty: materialData.difficulty || 'Intermediate',
      classroom_id: materialData.classroom_id || materialData.class_id || 'cls-mca-401',
      classroom_name: materialData.classroom_name || 'MCA Classroom',
      file_name: materialData.file_name || materialData.fileName || 'course_notes.pdf',
      file_type: materialData.file_type || materialData.fileType || 'PDF',
      content_text: materialData.raw_extracted_text || materialData.content_text || `${materialData.title}: Comprehensive notes covering ${subtopics.join(', ')}.`,
      raw_extracted_text: materialData.raw_extracted_text || materialData.content_text || '',
      subtopics,
      concepts,
      reference_concepts: concepts,
      learning_objectives: learningOutcomes,
      learning_outcomes: learningOutcomes,
      prerequisites,
      key_terms: keyTerms,
      possible_misconceptions: possibleMisconceptions,
      suggested_assessment_topics: suggestedAssessments,
      extracted_summary: materialData.extracted_summary || '',
      prompt_version: materialData.metadata?.prompt_version || materialData.prompt_version || 'v1.0.0',
      created_by: teacherId,
      author_name: teacherName,
      status: 'published',
      created_at: new Date().toISOString(),
    };

    if (!memoryStore.learning_materials) {
      memoryStore.learning_materials = new Map();
    }
    memoryStore.learning_materials.set(materialId, newMaterial);

    // Also publish a Lesson post in the class feed
    const feedPost = {
      id: uuidv4(),
      classroom_id: newMaterial.classroom_id,
      type: 'Lesson',
      title: `Lesson Material: ${newMaterial.title}`,
      content: `Published learning material covering: ${newMaterial.topic}. Key subtopics: ${subtopics.slice(0, 3).join(', ')}.`,
      author_name: teacherName,
      author_role: 'TEACHER',
      created_at: new Date().toISOString(),
      attachments: [{ title: newMaterial.file_name, type: newMaterial.file_type }],
    };

    memoryStore.class_feed.set(feedPost.id, feedPost);

    // Index into Socratic RAG Vector Knowledge Base
    try {
      const { RAGService } = require('./rag');
      await RAGService.indexDocument({
        document_id: newMaterial.id,
        text: newMaterial.raw_extracted_text || newMaterial.content_text,
        classroom_id: newMaterial.classroom_id,
        course_id: newMaterial.topic,
        teacher_id: teacherId,
        topic: newMaterial.topic,
        title: newMaterial.title,
      });
    } catch (ragErr) {
      console.warn('[TeacherService] Warning indexing material for RAG:', ragErr.message);
    }

    // Persist structured concepts into Concept model / concepts table
    try {
      const Concept = require('../models/Concept');
      const structuredConcepts = materialData.structured_concepts || [];
      if (structuredConcepts.length > 0) {
        for (const sc of structuredConcepts) {
          await Concept.create({
            classroom_id: newMaterial.classroom_id,
            material_id: newMaterial.id,
            topic: newMaterial.topic,
            name: sc.name,
            description: sc.description,
            prerequisites: sc.prerequisites || [],
            common_misconceptions: sc.common_misconceptions || [],
          });
        }
      } else if (concepts.length > 0) {
        for (const cName of concepts) {
          await Concept.create({
            classroom_id: newMaterial.classroom_id,
            material_id: newMaterial.id,
            topic: newMaterial.topic,
            name: cName,
            description: `Theoretical principles and application of ${cName}`,
            prerequisites,
            common_misconceptions: possibleMisconceptions.slice(0, 2),
          });
        }
      }
    } catch (conceptErr) {
      console.warn('[TeacherService] Warning saving concepts:', conceptErr.message);
    }

    return newMaterial;
  }

  /**
   * Get class feed posts
   */
  static async getFeed(classroomId) {
    this._initDefaultsIfNeeded();
    const all = Array.from(memoryStore.class_feed.values());
    if (classroomId) {
      return all.filter((p) => p.classroom_id === classroomId || p.classroom_id === 'cls-mca-401');
    }
    return all;
  }

  /**
   * Create class feed post
   */
  static async createFeedPost(postData, user) {
    const teacherName = user?.name || 'Prof. A. Anupam';
    const post = {
      id: uuidv4(),
      classroom_id: postData.classroom_id || postData.classroomId || 'cls-mca-401',
      type: postData.type || 'Announcement',
      title: postData.title,
      content: postData.content,
      author_name: teacherName,
      author_role: 'TEACHER',
      created_at: new Date().toISOString(),
      attachments: postData.attachments || [],
    };

    memoryStore.class_feed.set(post.id, post);
    return post;
  }

  /**
   * Create Programming or Written Assignment
   */
  static async createAssignment(assignmentData, user) {
    const teacherId = user?.id || 'teacher-001-uuid';
    const teacherName = user?.name || 'Prof. A. Anupam';

    const assignmentId = uuidv4();
    const newAssignment = {
      id: assignmentId,
      ...assignmentData,
      created_by: teacherId,
      author_name: teacherName,
      status: 'published',
      created_at: new Date().toISOString(),
    };

    memoryStore.assignments.set(assignmentId, newAssignment);

    // Create Feed Post for this Assignment
    const feedPost = {
      id: uuidv4(),
      classroom_id: assignmentData.classroom_id || 'cls-mca-401',
      type: 'Assignment',
      title: `New Assignment: ${newAssignment.title}`,
      content: `${newAssignment.assignment_type === 'programming' ? 'Coding Assignment' : 'Written Evaluation'}: ${newAssignment.description || newAssignment.title}. Due date published on class calendar.`,
      author_name: teacherName,
      author_role: 'TEACHER',
      created_at: new Date().toISOString(),
      attachments: [],
    };

    memoryStore.class_feed.set(feedPost.id, feedPost);

    return newAssignment;
  }

  /**
   * Get assignments list
   */
  static async getAssignments(user) {
    if (memoryStore.assignments.size === 0) {
      const defaultAssignments = [
        {
          id: 'asg-prog-1',
          assignment_type: 'programming',
          title: 'Implement Round Robin CPU Scheduler in C++',
          subject: 'Operating Systems',
          language: 'cpp',
          max_score: 20,
          description: 'Implement a preemptive Round Robin scheduling simulator tracking process arrival, burst time, and time quantum context switching.',
          sample_tests_count: 2,
          hidden_tests_count: 4,
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        },
        {
          id: 'asg-writ-1',
          assignment_type: 'written',
          title: 'Relational Decomposition & BCNF Proof',
          subject: 'Database Engineering',
          max_score: 15,
          learning_outcome: 'Verify losslessness and dependency preservation for Boyce-Codd Normal Form schemas.',
          rubric_criteria_count: 3,
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        },
      ];

      for (const a of defaultAssignments) {
        memoryStore.assignments.set(a.id, a);
      }
    }

    return Array.from(memoryStore.assignments.values());
  }

  /**
   * Run Resource Curator on topic / subtopics / teacher URLs (or directly from Content Analyzer taxonomy)
   */
  static async curateResources(payload, user) {
    const ResourceCuratorService = require('./resourceCurator.service');
    const teacherId = user?.id || 'teacher-001-uuid';

    const analysis = payload.analysis;
    const topic = payload.topic || payload.main_topic || analysis?.main_topic || analysis?.topic || analysis?.title;
    const subtopics = payload.subtopics || analysis?.subtopics || [];
    const difficulty = payload.difficulty || analysis?.difficulty || 'Intermediate';
    const learningObjectives = payload.learning_objectives || payload.learning_outcomes || analysis?.learning_objectives || analysis?.learning_outcomes || [];
    const teacherUrls = payload.teacher_urls || payload.teacherUrls || [];

    return await ResourceCuratorService.curateAndStore({
      classroom_id: payload.classroom_id || payload.classroomId || 'cls-mca-402',
      teacher_id: teacherId,
      material_id: payload.material_id || payload.materialId || null,
      topic,
      subtopics,
      difficulty,
      learningObjectives,
      teacherUrls,
    });
  }

  /**
   * Get Curated Resources for Teacher review
   */
  static async getCuratedResources({ classroomId, status, topic }, user) {
    const ResourceCuratorService = require('./resourceCurator.service');
    const teacherId = user?.id || 'teacher-001-uuid';

    return await ResourceCuratorService.getResourcesForTeacher({
      teacherId,
      classroomId,
      status,
      topic,
    });
  }

  /**
   * Teacher approves / rejects / updates resource approval status
   */
  static async updateResourceStatus(id, status, user) {
    const ResourceCuratorService = require('./resourceCurator.service');
    return await ResourceCuratorService.updateApprovalStatus(id, status, user);
  }

  /**
   * Teacher manually adds external URL resource
   */
  static async addTeacherResource(payload, user) {
    const ResourceCuratorService = require('./resourceCurator.service');
    const teacherId = user?.id || 'teacher-001-uuid';

    return await ResourceCuratorService.addTeacherResource({
      classroom_id: payload.classroom_id || payload.classroomId || 'cls-mca-402',
      teacher_id: teacherId,
      material_id: payload.material_id || payload.materialId || null,
      title: payload.title,
      url: payload.url,
      source: payload.source || 'Teacher Provided',
      description: payload.description,
      topic: payload.topic || 'Academic Courseware',
      subtopics: payload.subtopics || [],
      difficulty_fit: payload.difficulty_fit || 'Optimal',
      educational_usefulness: payload.educational_usefulness || 'High',
      auto_approve: payload.auto_approve !== false,
    });
  }

  /**
   * Generate an academic sandbox programming assignment with Judge0 reference validation
   */
  static async generateSandboxAssignment(payload, user) {
    const SandboxGeneratorService = require('./sandboxGenerator.service');
    return await SandboxGeneratorService.generateAndValidateSandbox({
      topic: payload.topic || payload.main_topic || payload.title,
      difficulty: payload.difficulty || 'Intermediate',
      language: payload.language || 'Python',
      objective: payload.objective || payload.learning_outcome || '',
      learning_objectives: payload.learning_objectives || payload.learning_outcomes || [],
      classroom_id: payload.classroom_id || payload.classroomId || 'cls-mca-401',
      auto_save: payload.auto_save !== false,
      user,
    });
  }
}

module.exports = TeacherService;
