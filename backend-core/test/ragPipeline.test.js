const test = require('node:test');
const assert = require('node:assert/strict');
const { ChunkerService, VectorStoreService, RAGService } = require('../src/services/rag');
const { memoryStore } = require('../src/config/db');

test('Socratic RAG Knowledge Base & Vector Store Suite', async (t) => {
  // Clear and seed clean test state
  memoryStore.vector_embeddings.clear();
  memoryStore.student_enrollments.clear();
  memoryStore.learning_materials.clear();

  await t.test('1. ChunkerService splits text into semantic overlapping chunks with tags', () => {
    const rawText = `First paragraph on Relational Database Normalization: 1NF enforces scalar domain values. 2NF removes partial key dependencies where non-prime attributes depend on a candidate key prefix.

Second paragraph on Boyce-Codd Normal Form: BCNF requires that every determinant in a functional dependency X -> Y must be a superkey of the relation. This eliminates all redundancy anomalies.

Third paragraph on Decomposition: The Chase matrix algorithm tests for lossless join decomposition across relational projections.`;

    const chunks = ChunkerService.chunkDocument(rawText, {
      document_id: 'doc-db-101',
      classroom_id: 'cls-mca-402',
      course_id: 'MCA-402',
      teacher_id: 'teacher-001',
      topic: 'Database Engineering',
      title: 'Database Normalization Notes',
    }, { chunkSize: 250, chunkOverlap: 50 });

    assert.ok(chunks.length >= 2, 'Should create multiple chunks');
    assert.equal(chunks[0].classroom_id, 'cls-mca-402');
    assert.equal(chunks[0].document_id, 'doc-db-101');
    assert.equal(chunks[0].topic, 'Database Engineering');
    assert.ok(chunks[0].text.length > 20);
  });

  await t.test('2. RAGService.indexDocument indexes chunks with embeddings into Vector Store', async () => {
    const indexResult = await RAGService.indexDocument({
      document_id: 'doc-os-102',
      title: 'Linux Completely Fair Scheduler',
      topic: 'Operating Systems',
      classroom_id: 'cls-mca-401',
      course_id: 'MCA-401',
      teacher_id: 'teacher-001',
      text: 'Linux CFS tracks process vruntime using red-black trees. Processes with smallest vruntime are picked next. Deadlock detection uses Chandy-Misra-Haas probe routing (initiator, sender, receiver).',
    });

    assert.equal(indexResult.indexed, true);
    assert.ok(indexResult.chunks_indexed > 0);
    assert.ok(memoryStore.vector_embeddings.size > 0);
  });

  await t.test('3. Query-Level Classroom Scoping: Student cannot retrieve material from unenrolled classroom', async () => {
    // Index document in SEC-502 (Cybersecurity)
    await RAGService.indexDocument({
      document_id: 'doc-sec-502',
      title: 'Zero-Knowledge Proofs & TLS 1.3 Handshake',
      topic: 'Network Security',
      classroom_id: 'cls-sec-502',
      course_id: 'SEC-502',
      teacher_id: 'teacher-001',
      text: 'Zero-Knowledge Proofs allow proving knowledge of a secret without revealing the secret. TLS 1.3 ephemeral key exchange uses ECDHE.',
    });

    // Student Alice is enrolled ONLY in cls-mca-401 and cls-mca-402 (NOT cls-sec-502)
    memoryStore.student_enrollments.set('student-alice_cls-mca-401', {
      student_id: 'student-alice',
      classroom_id: 'cls-mca-401',
    });
    memoryStore.student_enrollments.set('student-alice_cls-mca-402', {
      student_id: 'student-alice',
      classroom_id: 'cls-mca-402',
    });

    // Alice queries topic from cls-sec-502 -> Query-level scoping blocks access!
    const queryResult = await RAGService.queryKnowledgeBase({
      query: 'Explain TLS 1.3 Ephemeral Key Exchange with ECDHE',
      user: { id: 'student-alice', role: 'STUDENT' },
    });

    assert.equal(queryResult.is_covered, false);
    assert.equal(queryResult.grounded_sources.length, 0);
    assert.ok(queryResult.reply.includes('This topic is not covered in the available class material'));
  });

  await t.test('4. Anti-Hallucination Guardrail: Uncovered topic strictly responds with fallback notice', async () => {
    const result = await RAGService.queryKnowledgeBase({
      query: 'What is the speed of light in quantum chromodynamics vacuum?',
      user: { id: 'student-alice', role: 'STUDENT' },
    });

    assert.equal(result.is_covered, false);
    assert.equal(result.grounded_sources.length, 0);
    assert.equal(
      result.reply,
      'This topic is not covered in the available class material. Please consult your professor during office hours or verify course syllabus.'
    );
  });

  await t.test('5. Grounded Socratic Answer with source citation for covered topics', async () => {
    process.env.AI_MODE = 'mock';

    const result = await RAGService.queryKnowledgeBase({
      query: 'How does the Completely Fair Scheduler determine which process gets CPU time using vruntime?',
      user: { id: 'student-alice', role: 'STUDENT' },
    });

    assert.equal(result.is_covered, true);
    assert.ok(result.grounded_sources.length > 0);
    assert.equal(result.grounded_sources[0].title, 'Linux Completely Fair Scheduler');
    assert.equal(result.grounded_sources[0].classroom_id, 'cls-mca-401');
    assert.ok(result.reply.length > 20);
    assert.equal(result.socratic_hint_mode, true);
  });
});
