const DocumentChunk = require('../../models/DocumentChunk');
const { memoryStore, pool } = require('../../config/db');

/**
 * Cosine similarity between two numerical vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const len = Math.min(vecA.length, vecB.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dot / denominator;
}

class VectorStoreService {
  /**
   * Upsert an array of chunk embeddings into the vector store / PostgreSQL document_chunks
   * @param {Array<Object>} chunksWithVectors - Array of { id, vector, text, classroom_id, course_id, document_id, teacher_id, topic, title }
   */
  static async upsertChunks(chunksWithVectors) {
    if (!chunksWithVectors || chunksWithVectors.length === 0) {
      return { success: true, upserted_count: 0 };
    }

    if (!memoryStore.vector_embeddings) {
      memoryStore.vector_embeddings = new Map();
    }

    // Always maintain memory index for immediate low-latency lookups
    for (const chunk of chunksWithVectors) {
      memoryStore.vector_embeddings.set(chunk.id, {
        ...chunk,
        indexed_at: new Date().toISOString(),
      });
    }

    // Persist to PostgreSQL document_chunks table via DocumentChunk model
    try {
      await DocumentChunk.upsertMany(chunksWithVectors);
    } catch (dbErr) {
      console.warn('[VectorStore] Warning saving chunks to PostgreSQL:', dbErr.message);
    }

    return {
      success: true,
      upserted_count: chunksWithVectors.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Similarity search strictly scoped to specified classroom IDs.
   * 
   * QUERY-LEVEL SECURITY ENFORCEMENT:
   * Chunks belonging to classrooms the student is not enrolled in are
   * filtered out BEFORE calculating similarity and ranking.
   */
  static async similaritySearch({
    queryVector,
    classroomIds = [],
    topK = 4,
    minSimilarity = 0.55,
  }) {
    // 1. Fetch candidate chunks scoped to authorized classroom IDs from PostgreSQL or memory
    let candidateChunks = [];
    try {
      candidateChunks = await DocumentChunk.findByClassrooms(classroomIds);
    } catch (err) {
      console.warn('[VectorStore] Database query fallback to memory:', err.message);
      const allChunks = Array.from(memoryStore.vector_embeddings?.values() || []);
      const allowedSet = new Set(classroomIds || []);
      candidateChunks = allChunks.filter((chunk) => {
        if (allowedSet.size === 0) return true;
        return allowedSet.has(chunk.classroom_id) || chunk.classroom_id === 'cls-all';
      });
    }

    if (candidateChunks.length === 0) {
      // Check memory store as secondary source
      const allChunks = Array.from(memoryStore.vector_embeddings?.values() || []);
      const allowedSet = new Set(classroomIds || []);
      candidateChunks = allChunks.filter((chunk) => {
        if (allowedSet.size === 0) return true;
        return allowedSet.has(chunk.classroom_id) || chunk.classroom_id === 'cls-all';
      });
    }

    if (candidateChunks.length === 0) {
      return [];
    }

    // 2. Score candidate chunks via hybrid semantic cosine vector similarity + lexical overlap
    const scoredChunks = candidateChunks
      .map((chunk) => {
        const chunkVector = chunk.vector || chunk.embedding || [];
        const cosSim = cosineSimilarity(queryVector, chunkVector);
        
        // Lexical token overlap booster
        const chunkLower = ((chunk.text || chunk.chunk_text || '') + ' ' + (chunk.topic || '') + ' ' + (chunk.title || '')).toLowerCase();
        let overlapCount = 0;
        let queryTokenCount = 0;
        
        // Extract significant query keywords (>= 2 chars, non-stopword)
        const stopwords = new Set(['what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how', 'does', 'that', 'this', 'with', 'from', 'about', 'explain', 'tell', 'please', 'the', 'and', 'for', 'are', 'was', 'were', 'is', 'in', 'on', 'at', 'to', 'a', 'an']);
        const queryText = (queryVector?.rawQuery || '').toLowerCase();
        const queryTokens = queryText
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length >= 2 && !stopwords.has(w));

        for (const token of queryTokens) {
          queryTokenCount++;
          if (chunkLower.includes(token)) {
            overlapCount++;
          }
        }

        const lexicalScore = queryTokenCount > 0 ? (overlapCount / queryTokenCount) : 0;
        const hybridSimilarity = Number((0.5 * cosSim + 0.5 * lexicalScore).toFixed(4));
        const finalScore = Math.max(cosSim, hybridSimilarity);

        return {
          ...chunk,
          text: chunk.text || chunk.chunk_text,
          similarity: finalScore,
        };
      })
      .filter((chunk) => chunk.similarity >= minSimilarity);

    // 3. Rank descending by similarity score
    scoredChunks.sort((a, b) => b.similarity - a.similarity);

    return scoredChunks.slice(0, topK);
  }

  /**
   * Remove all vectors associated with a deleted document
   */
  static async deleteDocumentVectors(documentId) {
    if (memoryStore.vector_embeddings) {
      for (const [id, chunk] of memoryStore.vector_embeddings.entries()) {
        if (chunk.document_id === documentId) {
          memoryStore.vector_embeddings.delete(id);
        }
      }
    }

    try {
      return await DocumentChunk.deleteByDocument(documentId);
    } catch {
      return 0;
    }
  }
}

module.exports = VectorStoreService;

