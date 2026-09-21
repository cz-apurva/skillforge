const { v4: uuidv4 } = require('uuid');

class ChunkerService {
  /**
   * Semantic text chunker with overlap and metadata tagging
   * @param {string} text - Extracted document text
   * @param {Object} metadata - Tags: { document_id, classroom_id, course_id, teacher_id, topic, title }
   * @param {Object} [options] - { chunkSize: 700, chunkOverlap: 120 }
   * @returns {Array<Object>} List of chunk objects
   */
  static chunkDocument(text, metadata = {}, options = {}) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return [];
    }

    const chunkSize = options.chunkSize || 700;
    const chunkOverlap = options.chunkOverlap || 120;
    const cleanedText = text.replace(/\r\n/g, '\n').trim();

    // Split on paragraphs or double newlines first
    const paragraphs = cleanedText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    const chunks = [];
    let currentChunk = '';

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();

      if ((currentChunk + '\n\n' + paragraph).length <= chunkSize) {
        currentChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
      } else {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          // Start next chunk with overlap from end of previous
          const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
          const overlapText = currentChunk.slice(overlapStart).trim();
          currentChunk = overlapText ? `${overlapText}\n\n${paragraph}` : paragraph;
        } else {
          // Paragraph itself is larger than chunkSize -> split by sentence
          const sentences = paragraph.split(/(?<=[.?!])\s+/);
          for (const sentence of sentences) {
            if ((currentChunk + ' ' + sentence).length <= chunkSize) {
              currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
            } else {
              if (currentChunk) chunks.push(currentChunk.trim());
              currentChunk = sentence;
            }
          }
        }
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    // Fallback if no chunks were formed
    if (chunks.length === 0 && cleanedText.length > 0) {
      chunks.push(cleanedText.slice(0, chunkSize));
    }

    return chunks.map((chunkText, index) => ({
      id: uuidv4(),
      document_id: metadata.document_id || metadata.id || 'doc-unknown',
      classroom_id: metadata.classroom_id || metadata.class_id || 'cls-all',
      course_id: metadata.course_id || metadata.subject || metadata.topic || 'crs-general',
      teacher_id: metadata.teacher_id || metadata.created_by || 'teacher-default',
      topic: metadata.topic || metadata.main_topic || 'Academic Syllabus',
      title: metadata.title || 'Course Notes',
      chunk_index: index,
      total_chunks: chunks.length,
      text: chunkText,
      created_at: new Date().toISOString(),
    }));
  }
}

module.exports = ChunkerService;
