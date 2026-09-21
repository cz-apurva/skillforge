const test = require('node:test');
const assert = require('node:assert/strict');
const AdmZip = require('adm-zip');
const TextExtractorService = require('../src/services/textExtractor.service');
const ContentAnalyzerService = require('../src/services/contentAnalyzer.service');
const TeacherService = require('../src/services/teacherService');
const { memoryStore } = require('../src/config/db');

test('Text Extraction & Content Analyzer Suite', async (t) => {
  await t.test('1. TextExtractorService extracts plain text and markdown', async () => {
    const rawContent = 'Relational Database Engineering: 1NF atomic values, 2NF partial key dependencies, 3NF transitive dependencies, BCNF superkey determinants.';
    const result = await TextExtractorService.extractText({
      rawContent,
      fileName: 'notes.txt',
      fileType: 'txt',
    });

    assert.equal(result.source_type, 'raw_text');
    assert.ok(result.text.includes('1NF atomic values'));
    assert.ok(result.extracted_word_count > 10);
  });

  await t.test('2. TextExtractorService extracts from generated DOCX file', async () => {
    // Generate valid in-memory DOCX zip
    const zip = new AdmZip();
    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Operating Systems Lecture: Linux Completely Fair Scheduler (CFS).</w:t></w:r></w:p>
    <w:p><w:r><w:t>CFS tracks process vruntime using Red-Black trees.</w:t></w:r></w:p>
  </w:body>
</w:document>`;
    zip.addFile('word/document.xml', Buffer.from(docXml, 'utf8'));
    const docxBuffer = zip.toBuffer();

    const result = await TextExtractorService.extractText({
      buffer: docxBuffer,
      fileName: 'lecture_cfs.docx',
      fileType: 'docx',
    });

    assert.equal(result.source_type, 'docx');
    assert.ok(result.text.includes('Completely Fair Scheduler'));
    assert.ok(result.text.includes('vruntime'));
  });

  await t.test('3. TextExtractorService extracts from generated PPTX file', async () => {
    // Generate valid in-memory PPTX zip with slides
    const zip = new AdmZip();
    const slide1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody>
    <a:p><a:r><a:t>Distributed Concurrency: 2-Phase Locking (2PL)</a:t></a:r></a:p>
  </p:txBody></p:sp></p:spTree></p:cSld>
</p:sld>`;
    const slide2Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody>
    <a:p><a:r><a:t>Deadlock Detection: Chandy-Misra-Haas Probe Routing Algorithm</a:t></a:r></a:p>
  </p:txBody></p:sp></p:spTree></p:cSld>
</p:sld>`;

    zip.addFile('ppt/slides/slide1.xml', Buffer.from(slide1Xml, 'utf8'));
    zip.addFile('ppt/slides/slide2.xml', Buffer.from(slide2Xml, 'utf8'));
    const pptxBuffer = zip.toBuffer();

    const result = await TextExtractorService.extractText({
      buffer: pptxBuffer,
      fileName: 'concurrency_slides.pptx',
      fileType: 'pptx',
    });

    assert.equal(result.source_type, 'pptx');
    assert.ok(result.text.includes('2-Phase Locking'));
    assert.ok(result.text.includes('Chandy-Misra-Haas Probe Routing'));
  });

  await t.test('4. Strict Error: Fails explicitly on empty text (never claims analysis succeeded on empty text)', async () => {
    await assert.rejects(
      async () => {
        await TextExtractorService.extractText({
          rawContent: '   ',
          fileName: 'empty.txt',
          fileType: 'txt',
        });
      },
      {
        code: 'NO_CONTENT_ERROR',
      }
    );

    await assert.rejects(
      async () => {
        await TextExtractorService.extractText({
          buffer: Buffer.from(''),
          fileName: 'blank.txt',
          fileType: 'txt',
        });
      },
      {
        code: 'NO_CONTENT_ERROR',
      }
    );
  });

  await t.test('5. Content Analyzer schema validation checks all 10 taxonomy dimensions', () => {
    const validData = {
      title: 'Relational Database Normalization',
      main_topic: 'Database Engineering',
      subtopics: ['1NF', '2NF', '3NF', 'BCNF'],
      concepts: ['Armstrong Axioms', 'Transitive Dependency', 'Superkey'],
      learning_objectives: ['Differentiate 3NF and BCNF', 'Prove losslessness with Chase matrix'],
      prerequisites: ['Relational Algebra', 'Functional Dependencies'],
      difficulty: 'Intermediate',
      key_terms: ['Determinant', 'Canonical Cover'],
      possible_misconceptions: ['Assuming 3NF guarantees BCNF'],
      suggested_assessment_topics: ['BCNF Decomposition Proof Lab'],
    };

    const validation = ContentAnalyzerService._validateSchema(validData);
    assert.equal(validation.valid, true);
    assert.equal(validation.sanitized.main_topic, 'Database Engineering');
    assert.equal(validation.sanitized.difficulty, 'Intermediate');

    const invalidData = {
      title: 'Incomplete',
      // Missing main_topic and arrays
    };
    const invalidValidation = ContentAnalyzerService._validateSchema(invalidData);
    assert.equal(invalidValidation.valid, false);
    assert.ok(invalidValidation.errors.length > 0);
  });

  await t.test('6. ContentAnalyzerService.analyzeDocument end-to-end in AI_MODE=mock', async () => {
    process.env.AI_MODE = 'mock';

    const analysis = await ContentAnalyzerService.analyzeDocument({
      rawContent: 'Relational database schema normalization courseware covering 1NF, 2NF, 3NF, and BCNF decompositions with formal dependency preservation proofs.',
      titleHint: 'Database Schema Normalization & Functional Dependencies',
      fileName: 'Lecture_07_Database_Normalization.pdf',
    });

    assert.ok(analysis.title);
    assert.ok(analysis.main_topic || analysis.topic);
    assert.ok(analysis.subtopics.length > 0);
    assert.ok(analysis.concepts.length > 0);
    assert.ok(analysis.learning_objectives.length > 0);
    assert.ok(analysis.prerequisites.length > 0);
    assert.ok(analysis.possible_misconceptions.length > 0);
    assert.ok(analysis.suggested_assessment_topics.length > 0);
    assert.ok(analysis.metadata.prompt_version);
    assert.equal(analysis.metadata.ai_mode, 'mock');
  });

  await t.test('7. TeacherService.publishMaterial stores full taxonomy & raw text for RAG pipeline', async () => {
    const rawContent = 'Detailed notes on Linux Completely Fair Scheduler vruntime calculations and red-black tree operations.';
    const published = await TeacherService.publishMaterial(
      {
        title: 'Linux CFS & Runqueues',
        main_topic: 'Operating Systems',
        difficulty: 'Intermediate',
        classroom_id: 'cls-mca-401',
        subtopics: ['CFS Scheduler', 'Red-Black Tree', 'vruntime'],
        concepts: ['vruntime', 'latency target'],
        learning_objectives: ['Analyze vruntime progression'],
        prerequisites: ['Processes'],
        key_terms: ['vruntime', 'nice'],
        possible_misconceptions: ['Thinking CFS uses fixed time quantum'],
        suggested_assessment_topics: ['CFS Simulation Lab'],
        raw_extracted_text: rawContent,
        metadata: { prompt_version: 'v1.0.0' },
      },
      { id: 'teacher-001-uuid', name: 'Prof. A. Anupam' }
    );

    assert.ok(published.id);
    assert.equal(published.status, 'published');
    assert.equal(published.prompt_version, 'v1.0.0');
    assert.equal(published.raw_extracted_text, rawContent);

    // Verify stored in memoryStore for RAG indexing
    const stored = memoryStore.learning_materials.get(published.id);
    assert.ok(stored);
    assert.equal(stored.subtopics.length, 3);
    assert.equal(stored.possible_misconceptions.length, 1);
  });
});
