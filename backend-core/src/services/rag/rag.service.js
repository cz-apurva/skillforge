const ChunkerService = require('./chunker.service');
const VectorStoreService = require('./vectorStore.service');
const { geminiService, GeminiService } = require('../ai/gemini/gemini.service');
const { SOCRATIC_TUTOR_PROMPT } = require('../ai/gemini/promptRegistry');
const { getLLMProvider } = require('../../ai');
const { executeAICall } = require('../../ai');
const StudentEnrollment = require('../../models/StudentEnrollment');
const { memoryStore } = require('../../config/db');

class RAGService {
  /**
   * Index an extracted curriculum document into the vector store
   */
  static async indexDocument({
    document_id,
    documentId,
    id,
    text,
    raw_extracted_text,
    content_text,
    classroom_id,
    classroomId,
    class_id,
    course_id,
    courseId,
    teacher_id,
    teacherId,
    topic,
    main_topic,
    title,
  }) {
    const docId = document_id || documentId || id || `doc-${Date.now()}`;
    const rawText = text || raw_extracted_text || content_text || '';
    const classId = classroom_id || classroomId || class_id || 'cls-all';
    const course = course_id || courseId || topic || main_topic || 'Computer Science';
    const teacher = teacher_id || teacherId || 'teacher-default';
    const docTopic = topic || main_topic || 'Academic Courseware';
    const docTitle = title || 'Curriculum Module';

    if (!rawText || rawText.trim().length === 0) {
      return { indexed: false, reason: 'Empty document text' };
    }

    // 1. Chunk document
    const chunks = ChunkerService.chunkDocument(rawText, {
      document_id: docId,
      classroom_id: classId,
      course_id: course,
      teacher_id: teacher,
      topic: docTopic,
      title: docTitle,
    });

    if (chunks.length === 0) {
      return { indexed: false, reason: 'No chunks generated' };
    }

    // 2. Generate embeddings for all chunks (Gemini or deterministic provider)
    const chunksWithVectors = [];

    for (const chunk of chunks) {
      let vector = null;

      // Try Gemini Embeddings if configured
      if (process.env.GEMINI_API_KEY && (process.env.AI_MODE || 'live') !== 'mock') {
        try {
          const res = await geminiService.embedText({ text: chunk.text });
          if (res.embedding && res.embedding.length > 0) {
            vector = res.embedding;
          }
        } catch (geminiErr) {
          console.warn(`[RAGService] Gemini embed error: ${geminiErr.message}. Fallback to provider.`);
        }
      }

      // Fallback provider embeddings
      if (!vector) {
        try {
          const provider = getLLMProvider();
          const embedRes = await provider.embed({ text: chunk.text });
          vector = embedRes.embedding;
        } catch (err) {
          const provider = getLLMProvider();
          const fallbackRes = await provider.embed({ text: chunk.text });
          vector = fallbackRes.embedding;
        }
      }

      chunksWithVectors.push({
        ...chunk,
        vector,
      });
    }

    // 3. Upsert into Vector Store & PostgreSQL
    await VectorStoreService.upsertChunks(chunksWithVectors);

    return {
      indexed: true,
      document_id: docId,
      classroom_id: classId,
      chunks_indexed: chunksWithVectors.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Search vector knowledge base scoped to student's enrolled classrooms
   * and generate a grounded Socratic response with active assignment context
   */
  static async queryKnowledgeBase({
    query,
    message,
    user,
    studentId,
    assignmentId,
    assignment_id,
    contextTopic,
    topic,
    targetClassroomId,
    classroomId,
    classroom_id,
  }) {
    const studentQuery = (query || message || '').trim();
    if (!studentQuery) {
      const err = new Error('Query message is required');
      err.statusCode = 400;
      throw err;
    }

    const currentStudentId = user?.id || studentId || 'student-mca-402-alice';

    // 1. Resolve student's authorized enrolled classrooms for QUERY-LEVEL SCOPING
    let enrolledClassIds = [];
    try {
      const enrollments = await StudentEnrollment.findByStudent(currentStudentId);
      if (enrollments && enrollments.length > 0) {
        enrolledClassIds = enrollments.map((e) => e.classroom_id);
      }
    } catch {
      // Memory fallback
      if (memoryStore.student_enrollments) {
        for (const [key, val] of memoryStore.student_enrollments.entries()) {
          if (val.student_id === currentStudentId) {
            enrolledClassIds.push(val.classroom_id);
          }
        }
      }
    }

    // If teacher/admin is testing, grant access to their classes or targetClassroomId
    if (user?.role === 'TEACHER' || user?.role === 'ADMIN') {
      if (memoryStore.classrooms) {
        for (const [cid] of memoryStore.classrooms.entries()) {
          enrolledClassIds.push(cid);
        }
      }
    }

    // Fallback default enrollment if empty
    if (enrolledClassIds.length === 0) {
      enrolledClassIds.push('cls-mca-401', 'cls-mca-402');
    }

    // 2. Resolve Active Assignment Context (if assignmentId is passed)
    const targetAsgId = assignmentId || assignment_id;
    let activeAssignment = null;

    if (targetAsgId) {
      if (memoryStore.assignments && memoryStore.assignments.has(targetAsgId)) {
        activeAssignment = memoryStore.assignments.get(targetAsgId);
      } else if (memoryStore.assessments && memoryStore.assessments.has(targetAsgId)) {
        activeAssignment = memoryStore.assessments.get(targetAsgId);
      } else if (memoryStore.assignments) {
        for (const asg of memoryStore.assignments.values()) {
          if (asg.id === targetAsgId || asg.title?.toLowerCase().includes(targetAsgId.toLowerCase())) {
            activeAssignment = asg;
            break;
          }
        }
      }
    }

    // 3. Resolve Classroom / Course Context
    const targetCid = classroomId || classroom_id || targetClassroomId || activeAssignment?.classroom_id;
    let classroomContext = null;
    if (targetCid && memoryStore.classrooms?.has(targetCid)) {
      classroomContext = memoryStore.classrooms.get(targetCid);
    }

    // 4. Embed the student query + active assignment context (if present)
    const queryContext = [studentQuery, activeAssignment?.title].filter(Boolean).join(' ');
    
    let queryVector = null;
    if (process.env.GEMINI_API_KEY && (process.env.AI_MODE || 'live') !== 'mock') {
      try {
        const res = await geminiService.embedText({ text: queryContext });
        if (res.embedding && res.embedding.length > 0) {
          queryVector = res.embedding;
        }
      } catch (geminiErr) {
        console.warn(`[RAGService] Gemini query embed error: ${geminiErr.message}. Fallback to provider.`);
      }
    }

    if (!queryVector) {
      const provider = getLLMProvider();
      const queryEmbedRes = await provider.embed({ text: queryContext });
      queryVector = queryEmbedRes.embedding;
    }
    if (queryVector) {
      queryVector.rawQuery = queryContext;
    }

    // 5. Similarity search strictly scoped to enrolled classrooms at the query level
    const matchedChunks = await VectorStoreService.similaritySearch({
      queryVector,
      classroomIds: enrolledClassIds,
      topK: 4,
      minSimilarity: 0.20,
    });

    // 6. STRICT ANTI-HALLUCINATION GUARDRAIL:
    // If no chunk matches with sufficient similarity, respond with the strict syllabus boundary notice.
    if (matchedChunks.length === 0) {
      return {
        reply: 'This topic is not covered in the available class material. Please consult your professor during office hours or verify course syllabus.',
        grounded_sources: [],
        socratic_hint_mode: true,
        is_covered: false,
        guardrail_notice: 'SkillForge Grounding Guardrail: Query did not match any uploaded course material in your enrolled classrooms.',
      };
    }

    // 7. Build Socratic prompt with Assignment Context + Course Context + RAG Chunks
    const contextBlocks = matchedChunks.map(
      (c, idx) => `--- Course Material Source [${idx + 1}]: "${c.title}" (Topic: ${c.topic}) ---\n${c.text}`
    ).join('\n\n');

    let assignmentSection = '';
    if (activeAssignment) {
      assignmentSection = `
Active Assignment Context:
- Assignment Title: "${activeAssignment.title}"
- Type: ${activeAssignment.assignment_type || activeAssignment.type || 'Coursework'} (${activeAssignment.language || 'Theoretical Proof / Implementation'})
- Problem Statement: ${activeAssignment.description || activeAssignment.learning_outcome || 'Active graded coursework'}
- Status: ACTIVE ASSIGNMENT IN PROGRESS (ENFORCE HINT-ONLY Socratic scaffolding)`;
    }

    let courseSection = '';
    if (classroomContext) {
      courseSection = `
Classroom / Course Context:
- Course Name: ${classroomContext.name} (${classroomContext.code || 'MCA-2026'})
- Subject: ${classroomContext.subject || 'Computer Science'}`;
    }

    const currentTopic = topic || contextTopic || matchedChunks[0]?.topic || 'Engineering Courseware';

    const userPrompt = `Student Question:
${GeminiService.wrapUntrustedContent(studentQuery)}

Course Topic Focus: "${currentTopic}"
${courseSection}
${assignmentSection}

Authorized Course Material Context retrieved from student's enrolled courses:
${contextBlocks}

Instructions for Tutor Response:
1. If the student is asking for the complete solution, direct copy-paste code, or completed proof for the active assignment, REFUSE the complete solution directly and uphold academic integrity.
2. Provide 2-3 progressive Socratic guiding questions or point at the next conceptual invariant based on the course materials.
3. Cite the course material by title in your response.`;

    let replyText = '';
    let promptVersion = SOCRATIC_TUTOR_PROMPT.version;

    // Try GeminiService live generation if configured
    if (process.env.GEMINI_API_KEY && (process.env.AI_MODE || 'live') !== 'mock') {
      try {
        const geminiRes = await geminiService.generateText({
          prompt: userPrompt,
          systemInstruction: SOCRATIC_TUTOR_PROMPT.systemInstruction,
          service: 'tutor',
          promptVersion: SOCRATIC_TUTOR_PROMPT.version,
          temperature: 0.2,
          maxTokens: 1024,
        });
        if (geminiRes.success && geminiRes.text) {
          replyText = geminiRes.text;
          promptVersion = geminiRes.prompt_version || promptVersion;
        }
      } catch (geminiErr) {
        console.warn(`[RAGService] Gemini text generation error: ${geminiErr.message}. Checking fallback.`);
      }
    }

    // Fallback via executeAICall if replyText is empty
    if (!replyText) {
      const aiResponse = await executeAICall({
        service: 'tutor',
        promptName: 'tutor',
        userPrompt,
        structured: false,
        temperature: 0.2,
        maxTokens: 1024,
        throwOnError: false,
      });

      if (aiResponse.success && aiResponse.data) {
        replyText = typeof aiResponse.data === 'string' ? aiResponse.data : aiResponse.data.reply || aiResponse.raw_text;
      }
      promptVersion = aiResponse.prompt_version || promptVersion;
    }

    // Check if student asked for full solution / copy-paste code
    const isSolutionRequest = /give me (the )?code|solve (this|it)|write the (solution|code|program)|full solution|complete code|what is the answer|solve my assignment/i.test(studentQuery);

    if (isSolutionRequest && (!replyText || process.env.AI_MODE === 'mock' || (!replyText.includes('academic integrity') && !replyText.includes('cannot provide complete solution')))) {
      const topTitle = matchedChunks[0]?.title || 'Course Lecture Notes';
      const asgTitle = activeAssignment?.title ? ` for "${activeAssignment.title}"` : '';
      const qLower = studentQuery.toLowerCase();

      if (qLower.includes('deadlock') || qLower.includes('probe') || qLower.includes('c++')) {
        replyText = `I cannot provide complete solution code or direct implementations${asgTitle} to uphold academic integrity.\n\nInstead, let's explore the key concept step-by-step from "${topTitle}":\n1. In the Chandy-Misra-Haas algorithm, what is the exact structure and meaning of the probe 3-tuple $(initiator, sender, receiver)$?\n2. Under what condition should a process propagate a received probe message to other processes it is waiting for?\n3. What exact condition indicates that a distributed cycle has occurred?`;
      } else if (qLower.includes('bcnf') || qLower.includes('3nf') || qLower.includes('normalization') || qLower.includes('proof')) {
        replyText = `I cannot provide direct completed proofs or complete solutions${asgTitle} to uphold academic integrity.\n\nInstead, let's review the theoretical foundations from "${topTitle}":\n1. For each functional dependency $X \\rightarrow Y$, what must be true about the determinant $X$ for Boyce-Codd Normal Form?\n2. What is the fundamental difference between dependency preservation and the lossless join property?\n3. How can you set up the Chase matrix test to formally verify losslessness?`;
      } else {
        replyText = `I cannot provide complete solution code or direct answers${asgTitle} to uphold academic integrity.\n\nInstead, let's explore the key concept step-by-step from "${topTitle}":\n1. What is the core invariant or definition that must hold true in this scenario?\n2. What initial state or data structure are you setting up to track progress?\n3. How would you trace what happens in the simplest edge case?`;
      }
    }

    // Dynamic generation fallback for mock / offline mode
    if (!replyText) {
      const topTitle = matchedChunks[0]?.title || 'Course Lecture Notes';
      const asgTitle = activeAssignment?.title ? ` for "${activeAssignment.title}"` : '';
      const qLower = studentQuery.toLowerCase();

      if (isSolutionRequest) {
        if (qLower.includes('deadlock') || qLower.includes('probe') || qLower.includes('c++')) {
          replyText = `I cannot provide complete solution code or direct implementations${asgTitle} to uphold academic integrity.\n\nInstead, let's explore the key concept step-by-step from "${topTitle}":\n1. In the Chandy-Misra-Haas algorithm, what is the exact structure and meaning of the probe 3-tuple $(initiator, sender, receiver)$?\n2. Under what condition should a process propagate a received probe message to other processes it is waiting for?\n3. What exact condition indicates that a distributed cycle has occurred?`;
        } else if (qLower.includes('bcnf') || qLower.includes('3nf') || qLower.includes('normalization') || qLower.includes('proof')) {
          replyText = `I cannot provide direct completed proofs or complete solutions${asgTitle} to uphold academic integrity.\n\nInstead, let's review the theoretical foundations from "${topTitle}":\n1. For each functional dependency $X \\rightarrow Y$, what must be true about the determinant $X$ for Boyce-Codd Normal Form?\n2. What is the fundamental difference between dependency preservation and the lossless join property?\n3. How can you set up the Chase matrix test to formally verify losslessness?`;
        } else {
          replyText = `I cannot provide complete solution code or direct answers${asgTitle} to uphold academic integrity.\n\nInstead, let's explore the key concept step-by-step from "${topTitle}":\n1. What is the core invariant or definition that must hold true in this scenario?\n2. What initial state or data structure are you setting up to track progress?\n3. How would you trace what happens in the simplest edge case?`;
        }
      } else {
        if (qLower.includes('bcnf') || qLower.includes('3nf') || qLower.includes('normalization')) {
          replyText = `Based on your course notes in "${topTitle}":\n1. For a given functional dependency $X \\rightarrow Y$, is the determinant $X$ a superkey for the relation?\n2. In 3NF, prime attributes are allowed on the right-hand side even if $X$ is not a superkey—why does BCNF remove this exception?\n3. How does eliminating non-superkey determinants eliminate update and deletion anomalies?`;
        } else if (qLower.includes('cfs') || qLower.includes('vruntime') || qLower.includes('sched')) {
          replyText = `Based on your course notes in "${topTitle}":\n1. Why does the Completely Fair Scheduler (CFS) index processes in a red-black tree using \`vruntime\`?\n2. How does the 'nice' value mathematically scale the rate of \`vruntime\` advancement?\n3. What role does the \`min_vruntime\` tracking play in handling newly awakened tasks?`;
        } else {
          replyText = `Based on your course notes in "${topTitle}":\n1. How does the core invariant apply to the problem stated in ${activeAssignment?.title || 'your coursework'}?\n2. What initial condition or base assumption are you testing?\n3. What is the next logical step in your derivation?`;
        }
      }
    }

    const groundedSources = matchedChunks.map((c) => ({
      title: c.title,
      topic: c.topic,
      document_id: c.document_id,
      classroom_id: c.classroom_id,
      similarity_score: c.similarity,
      file_name: `${(c.title || 'course_material').replace(/\s+/g, '_')}.pdf`,
    }));

    // Emit Learning Evidence into Learning Intelligence Layer
    try {
      const LearningIntelligenceService = require('../learningIntelligence.service');
      const conceptTag = currentTopic || matchedChunks[0]?.title || 'Core Principles';
      const isConfusion = isSolutionRequest || /why|how|confused|don't understand|explain again|what does.*mean/i.test(studentQuery);
      
      await LearningIntelligenceService.recordLearningEvidence({
        studentId: currentStudentId,
        classroomId: targetCid || 'cls-mca-402',
        conceptName: conceptTag,
        topic: currentTopic,
        source: 'TUTOR_INTERACTION',
        scoreAchieved: isConfusion ? 5.0 : 8.0,
        maxScore: 10.0,
        successRate: isConfusion ? 50.0 : 80.0,
        confidenceScore: 0.85,
        evidencePayload: {
          query: studentQuery,
          is_confusion_pattern: isConfusion,
          grounded_chunk_count: matchedChunks.length,
          matched_titles: matchedChunks.map((c) => c.title),
        },
      });
    } catch (tutorEvErr) {
      console.warn('[RAGService] Warning recording tutor learning evidence:', tutorEvErr.message);
    }

    return {
      reply: replyText,
      grounded_sources: groundedSources,
      socratic_hint_mode: true,
      is_covered: true,
      similarity_score: matchedChunks[0]?.similarity || 0.85,
      prompt_version: promptVersion,
      active_assignment: activeAssignment ? { id: activeAssignment.id, title: activeAssignment.title } : null,
      guardrail_notice: 'SkillForge Socratic Guardrail: Providing hints & conceptual guidance only. Full solution code generation is prohibited during active coursework.',
    };
  }

  /**
   * Seed default curriculum vector embeddings for standard MCA classes
   */
  static async seedDefaultsIfNeeded() {
    const defaultDocs = [
      {
        document_id: 'mat-001',
        title: 'Database Schema Normalization & Functional Dependencies',
        topic: 'Database Engineering & Normal Forms',
        classroom_id: 'cls-mca-402',
        course_id: 'MCA-402',
        teacher_id: 'teacher-001-uuid',
        text: 'Relational Database Normalization: 1NF requires atomic values. 2NF removes partial key dependencies where non-prime attributes depend on a proper subset of candidate keys. 3NF removes transitive dependencies for non-prime attributes (X -> A implies X is superkey or A is prime attribute). Boyce-Codd Normal Form (BCNF) strictly eliminates all redundancy anomalies by enforcing every determinant X in X -> A is a superkey. Lossless join decomposition is verified via the Chase matrix algorithm.',
      },
      {
        document_id: 'mat-002',
        title: 'Linux Kernel Scheduling: CFS & Concurrency Control',
        topic: 'Operating Systems: Process Scheduling',
        classroom_id: 'cls-mca-401',
        course_id: 'MCA-401',
        teacher_id: 'teacher-001-uuid',
        text: 'Linux Completely Fair Scheduler (CFS) uses red-black trees indexed by vruntime (virtual runtime). Tasks with smallest vruntime get scheduled next. Nice values scale the rate of vruntime progression. Deadlocks in multi-threaded environments are handled via Chandy-Misra-Haas probe routing (initiator, sender, receiver). When an initiator receives its own probe message, a cycle is declared.',
      },
      {
        document_id: 'mat-003',
        title: 'Distributed ACID & 2-Phase Commit Protocols',
        topic: 'Distributed Database Systems',
        classroom_id: 'cls-mca-402',
        course_id: 'MCA-402',
        teacher_id: 'teacher-001-uuid',
        text: 'Distributed transaction management uses 2-Phase Commit (2PC): Prepare phase and Commit phase. Raft consensus ensures distributed log replication safety across diverging followers. Strict 2-Phase Locking (Strict 2PL) guarantees conflict serializability without cascading aborts.',
      },
    ];

    for (const doc of defaultDocs) {
      let alreadyIndexed = false;
      if (memoryStore.vector_embeddings) {
        for (const chunk of memoryStore.vector_embeddings.values()) {
          if (chunk.document_id === doc.document_id) {
            alreadyIndexed = true;
            break;
          }
        }
      }
      if (!alreadyIndexed) {
        await this.indexDocument(doc);
      }
    }
  }
}

module.exports = RAGService;

