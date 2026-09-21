const { pool, memoryStore } = require('../config/db');

class DocumentChunk {
  static async upsertMany(chunksWithVectors) {
    if (!Array.isArray(chunksWithVectors) || chunksWithVectors.length === 0) return 0;

    if (process.env.USE_MEMORY_DB === 'true') {
      if (!memoryStore.vector_embeddings) memoryStore.vector_embeddings = new Map();
      for (const chunk of chunksWithVectors) {
        memoryStore.vector_embeddings.set(chunk.id, {
          ...chunk,
          indexed_at: new Date().toISOString(),
        });
      }
      return chunksWithVectors.length;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const chunk of chunksWithVectors) {
        const queryText = `
          INSERT INTO document_chunks (id, document_id, classroom_id, chunk_index, chunk_text, embedding, topic, title)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO UPDATE SET
            chunk_text = EXCLUDED.chunk_text,
            embedding = EXCLUDED.embedding,
            topic = EXCLUDED.topic,
            title = EXCLUDED.title;
        `;
        await client.query(queryText, [
          chunk.id,
          chunk.document_id,
          chunk.classroom_id || 'cls-all',
          chunk.chunk_index || 0,
          chunk.text || chunk.chunk_text,
          JSON.stringify(chunk.vector || chunk.embedding || []),
          chunk.topic || 'Academic Courseware',
          chunk.title || 'Curriculum Module',
        ]);
      }
      await client.query('COMMIT');
      return chunksWithVectors.length;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async findByClassrooms(classroomIds = []) {
    if (process.env.USE_MEMORY_DB === 'true') {
      const all = Array.from(memoryStore.vector_embeddings?.values() || []);
      if (!classroomIds || classroomIds.length === 0) return all;
      const allowed = new Set(classroomIds);
      return all.filter((c) => allowed.has(c.classroom_id) || c.classroom_id === 'cls-all');
    }

    let queryText = 'SELECT * FROM document_chunks';
    const params = [];
    if (classroomIds && classroomIds.length > 0) {
      queryText += ' WHERE classroom_id = ANY($1) OR classroom_id = $2';
      params.push(classroomIds, 'cls-all');
    }
    const { rows } = await pool.query(queryText, params);
    return rows.map((r) => ({
      id: r.id,
      document_id: r.document_id,
      classroom_id: r.classroom_id,
      chunk_index: r.chunk_index,
      text: r.chunk_text,
      vector: typeof r.embedding === 'string' ? JSON.parse(r.embedding) : r.embedding,
      topic: r.topic,
      title: r.title,
    }));
  }

  static async deleteByDocument(document_id) {
    if (process.env.USE_MEMORY_DB === 'true') {
      let count = 0;
      for (const [id, c] of (memoryStore.vector_embeddings?.entries() || [])) {
        if (c.document_id === document_id) {
          memoryStore.vector_embeddings.delete(id);
          count++;
        }
      }
      return count;
    }
    const { rowCount } = await pool.query('DELETE FROM document_chunks WHERE document_id = $1', [document_id]);
    return rowCount;
  }
}

module.exports = DocumentChunk;
