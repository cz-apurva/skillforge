const https = require('https');
const http = require('http');
const CuratedResource = require('../models/CuratedResource');
const { executeAICall } = require('../ai');
const { memoryStore } = require('../config/db');

/**
 * Decode HTML entities commonly returned by YouTube API
 */
function decodeHtmlEntities(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/');
}

/**
 * Perform an HTTP/HTTPS GET request helper
 */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new Error(`Failed to parse JSON response: ${err.message}`));
          }
        } else {
          reject(new Error(`Request failed with status code ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Request timed out after 8000ms'));
    });
  });
}

class ResourceCuratorService {
  /**
   * Search real sources (YouTube Data API v3 if YOUTUBE_API_KEY configured, teacher-provided URLs, arXiv / external providers)
   * CRITICAL: NEVER fabricate a URL. If no API is configured and no candidate URLs provided, return unavailable state.
   */
  static async searchCandidates({
    topic,
    subtopics = [],
    difficulty = 'Intermediate',
    teacherUrls = [],
    maxResults = 5,
  }) {
    const candidates = [];
    const apiKey = process.env.YOUTUBE_API_KEY;
    const searchQuery = [topic, ...(subtopics.slice(0, 2))].filter(Boolean).join(' ');

    // 1. YouTube Data API Search (if real API key is configured)
    if (apiKey && apiKey.trim().length > 0 && apiKey !== 'mock' && apiKey !== 'disabled') {
      try {
        const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          searchQuery + ' lecture tutorial'
        )}&type=video&videoEmbeddable=true&maxResults=${maxResults}&key=${apiKey}`;

        const ytData = await fetchJson(ytUrl);
        if (ytData && Array.isArray(ytData.items)) {
          for (const item of ytData.items) {
            if (item.id && item.id.videoId) {
              candidates.push({
                id: `yt-${item.id.videoId}`,
                candidate_id: `yt-${item.id.videoId}`,
                title: decodeHtmlEntities(item.snippet.title),
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                source: 'YouTube',
                description: decodeHtmlEntities(item.snippet.description),
                channelTitle: item.snippet.channelTitle,
                thumbnail_url: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
                publishedAt: item.snippet.publishedAt,
              });
            }
          }
        }
      } catch (err) {
        console.warn(`[ResourceCuratorService] YouTube search error: ${err.message}`);
      }
    }

    // 2. Teacher-Provided URLs
    if (Array.isArray(teacherUrls) && teacherUrls.length > 0) {
      teacherUrls.forEach((tUrl, idx) => {
        const urlStr = typeof tUrl === 'string' ? tUrl : tUrl.url;
        const titleStr = typeof tUrl === 'string' ? `Teacher Reference [${idx + 1}]` : tUrl.title || `Teacher Resource [${idx + 1}]`;
        const descStr = typeof tUrl === 'object' && tUrl.description ? tUrl.description : 'Instructor-recommended external reading & documentation';
        
        if (urlStr && urlStr.startsWith('http')) {
          candidates.push({
            id: `teacher-url-${idx + 1}-${Date.now()}`,
            candidate_id: `teacher-url-${idx + 1}`,
            title: titleStr,
            url: urlStr,
            source: 'Teacher Provided',
            description: descStr,
            thumbnail_url: null,
          });
        }
      });
    }

    // 3. Strict Check: If no real candidates found, return explicit unavailable status
    if (candidates.length === 0) {
      return {
        available: false,
        reason: 'Resource search unavailable: YOUTUBE_API_KEY is not configured and no external provider search returned results. No synthetic or fabricated URLs generated.',
        search_query: searchQuery,
        candidates: [],
      };
    }

    return {
      available: true,
      search_query: searchQuery,
      candidates,
    };
  }

  /**
   * Rank real candidates using GeminiService on topic relevance, difficulty fit, and educational usefulness
   */
  static async rankCandidatesWithLLM({
    candidates,
    topic,
    subtopics = [],
    difficulty = 'Intermediate',
    learningObjectives = [],
  }) {
    if (!candidates || candidates.length === 0) {
      return [];
    }

    const { geminiService, GeminiService } = require('./ai/gemini/gemini.service');
    const { RESOURCE_CURATOR_PROMPT } = require('./ai/gemini/promptRegistry');

    const candidateListStr = candidates.map((c, idx) => {
      return `[Candidate ${idx + 1}]
Candidate ID: ${c.candidate_id || c.id}
Title: ${c.title}
URL: ${c.url}
Source: ${c.source}
Description: ${c.description || 'N/A'}`;
    }).join('\n\n');

    const userPrompt = `Target Topic: "${topic}"
Subtopics: ${subtopics.join(', ') || 'General'}
Target Difficulty: ${difficulty}
Learning Objectives: ${learningObjectives.join('; ') || 'Mastery of core concepts'}

Real Candidate Resources:
${candidateListStr}

Please evaluate and rank each of the above real candidates based on topic relevance, difficulty fit, and educational usefulness. Never alter the URLs.`;

    let rankedList = [];

    // Try GeminiService live structured generation if available
    if (process.env.GEMINI_API_KEY && (process.env.AI_MODE || 'live') !== 'mock') {
      try {
        const geminiRes = await geminiService.generateStructured({
          prompt: userPrompt,
          systemInstruction: RESOURCE_CURATOR_PROMPT.systemInstruction,
          zodSchema: RESOURCE_CURATOR_PROMPT.schema,
          service: 'resourceCurator',
          promptVersion: RESOURCE_CURATOR_PROMPT.version,
          temperature: 0.1,
          maxTokens: 2500,
        });
        if (geminiRes.success && geminiRes.data && Array.isArray(geminiRes.data.ranked_resources)) {
          rankedList = geminiRes.data.ranked_resources;
        }
      } catch (geminiErr) {
        console.warn(`[ResourceCurator] Gemini ranking warning: ${geminiErr.message}. Checking fallback.`);
      }
    }

    if (rankedList.length === 0) {
      const aiRes = await executeAICall({
        service: 'resourceCurator',
        promptName: 'resourceCurator',
        userPrompt,
        structured: true,
        temperature: 0.1,
        throwOnError: false,
      });

      if (aiRes.success && aiRes.data && Array.isArray(aiRes.data.ranked_resources)) {
        rankedList = aiRes.data.ranked_resources;
      }
    }

    // Merge AI ranking with original candidate metadata
    const finalRanked = candidates.map((cand, idx) => {
      const match = rankedList.find(
        (r) => r.candidate_id === cand.candidate_id || r.id === cand.id || r.url === cand.url || r.title === cand.title
      );

      if (match) {
        return {
          ...cand,
          relevance_score: typeof match.relevance_score === 'number' ? match.relevance_score : 0.88,
          topic_relevance: match.topic_relevance || 0.9,
          difficulty_fit: match.difficulty_fit || difficulty,
          educational_usefulness: match.educational_usefulness || (match.is_recommended ? 'High' : 'Moderate'),
          description: match.pedagogical_rationale || match.description || cand.description,
          key_takeaways: match.recommended_tags || match.key_takeaways || [],
          topic,
          subtopics,
        };
      }

      // Fallback deterministic scoring for offline / mock testing
      const titleLower = (cand.title + ' ' + cand.description).toLowerCase();
      const topicLower = topic.toLowerCase();
      let matchCount = 0;
      if (titleLower.includes(topicLower)) matchCount += 2;
      for (const st of subtopics) {
        if (titleLower.includes(st.toLowerCase())) matchCount += 1;
      }
      const score = Math.min(0.98, Math.max(0.65, 0.72 + matchCount * 0.08 - idx * 0.03));

      return {
        ...cand,
        relevance_score: Number(score.toFixed(2)),
        topic_relevance: Number(score.toFixed(2)),
        difficulty_fit: 'Optimal',
        educational_usefulness: 'High',
        description: cand.description || `Highly relevant pedagogical reference for mastering ${topic}.`,
        key_takeaways: [`Core concepts in ${topic}`, 'Practical implementation walkthrough'],
        topic,
        subtopics,
      };
    });

    // Sort by relevance_score descending
    return finalRanked.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  }

  /**
   * Curate directly from Content Analyzer taxonomy output
   */
  static async curateFromContentAnalysis({
    analysis,
    classroom_id = 'cls-mca-402',
    teacher_id = 'teacher-001-uuid',
    material_id = null,
    teacherUrls = [],
  }) {
    if (!analysis || typeof analysis !== 'object') {
      const err = new Error('Valid Content Analyzer output object is required');
      err.statusCode = 400;
      throw err;
    }

    const topic = analysis.main_topic || analysis.topic || analysis.title || 'Course Material';
    const subtopics = analysis.subtopics || [];
    const difficulty = analysis.difficulty || 'Intermediate';
    const learningObjectives = analysis.learning_objectives || analysis.learning_outcomes || [];

    return await this.curateAndStore({
      classroom_id,
      teacher_id,
      material_id,
      topic,
      subtopics,
      difficulty,
      learningObjectives,
      teacherUrls,
    });
  }

  /**
   * Curate resources for a given topic/subtopic set and store them with PENDING status
   */
  static async curateAndStore({
    classroom_id = 'cls-mca-402',
    teacher_id = 'teacher-001-uuid',
    material_id = null,
    topic,
    subtopics = [],
    difficulty = 'Intermediate',
    learningObjectives = [],
    teacherUrls = [],
  }) {
    if (!topic || !topic.trim()) {
      const err = new Error('Topic is required for resource curation');
      err.statusCode = 400;
      throw err;
    }

    // 1. Search candidates
    const searchRes = await this.searchCandidates({
      topic,
      subtopics,
      difficulty,
      teacherUrls,
    });

    if (!searchRes.available || searchRes.candidates.length === 0) {
      return {
        available: false,
        reason: searchRes.reason || 'Resource search unavailable',
        topic,
        resources: [],
      };
    }

    // 2. Rank candidates with LLM
    const rankedCandidates = await this.rankCandidatesWithLLM({
      candidates: searchRes.candidates,
      topic,
      subtopics,
      difficulty,
      learningObjectives,
    });

    // 3. Store in CuratedResource with PENDING status
    const storedResources = [];
    for (const item of rankedCandidates) {
      const created = await CuratedResource.create({
        id: item.id || `res-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        title: item.title,
        url: item.url,
        source: item.source,
        description: item.description,
        relevance_score: item.relevance_score,
        topic,
        subtopics,
        difficulty_fit: item.difficulty_fit,
        educational_usefulness: item.educational_usefulness,
        approved_status: 'PENDING', // Teacher must approve before students see!
        classroom_id,
        teacher_id,
        material_id,
        thumbnail_url: item.thumbnail_url,
        metadata: {
          key_takeaways: item.key_takeaways || [],
          topic_relevance: item.topic_relevance,
        },
      });
      storedResources.push(created);
    }

    return {
      available: true,
      topic,
      count: storedResources.length,
      resources: storedResources,
    };
  }

  /**
   * Teacher manually adds a resource URL
   */
  static async addTeacherResource({
    classroom_id = 'cls-mca-402',
    teacher_id = 'teacher-001-uuid',
    material_id = null,
    title,
    url,
    source = 'Teacher Provided',
    description = '',
    topic = 'Academic Courseware',
    subtopics = [],
    difficulty_fit = 'Optimal',
    educational_usefulness = 'High',
    auto_approve = true,
  }) {
    if (!url || !url.startsWith('http')) {
      const err = new Error('Valid URL (starting with http:// or https://) is required');
      err.statusCode = 400;
      throw err;
    }
    if (!title || !title.trim()) {
      const err = new Error('Resource title is required');
      err.statusCode = 400;
      throw err;
    }

    return await CuratedResource.create({
      title: title.trim(),
      url: url.trim(),
      source: source || 'Teacher Provided',
      description: description || 'Instructor curated reference link',
      relevance_score: 0.95,
      topic: topic || 'Academic Topic',
      subtopics: Array.isArray(subtopics) ? subtopics : [],
      difficulty_fit,
      educational_usefulness,
      approved_status: auto_approve ? 'APPROVED' : 'PENDING',
      classroom_id,
      teacher_id,
      material_id,
    });
  }

  /**
   * Update approval status of a resource
   */
  static async updateApprovalStatus(id, status, teacherUser) {
    const validStatuses = ['APPROVED', 'REJECTED', 'PENDING'];
    const normStatus = status?.toUpperCase();
    if (!validStatuses.includes(normStatus)) {
      const err = new Error(`Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    const updated = await CuratedResource.updateStatus(id, {
      approved_status: normStatus,
      approved_by: teacherUser?.id || 'teacher-001-uuid',
    });

    if (!updated) {
      const err = new Error(`Curated resource with ID '${id}' not found`);
      err.statusCode = 404;
      throw err;
    }

    return updated;
  }

  /**
   * Get resources for Teacher (can see PENDING, APPROVED, REJECTED)
   */
  static async getResourcesForTeacher({ teacherId, classroomId, status, topic }) {
    await this.seedDefaultsIfNeeded();
    return await CuratedResource.findForTeacher({
      teacherId,
      classroomId,
      status,
      topic,
    });
  }

  /**
   * Get resources for Student (ONLY approved resources in enrolled classrooms)
   */
  static async getResourcesForStudent(user) {
    await this.seedDefaultsIfNeeded();
    const studentId = user?.id || 'student-mca-402-alice';

    // Fetch student's enrolled classroom IDs
    const enrollments = Array.from(memoryStore.student_enrollments?.values() || [])
      .filter((e) => e.student_id === studentId);
    
    let classroomIds = enrollments.map((e) => e.classroom_id);
    if (classroomIds.length === 0) {
      classroomIds = ['cls-mca-401', 'cls-mca-402'];
    }

    return await CuratedResource.findForStudent({ classroomIds });
  }

  /**
   * Get resources specifically ranked for an identified student concept gap / intervention
   */
  static async getResourcesForIntervention({ conceptName, topic, user }) {
    await this.seedDefaultsIfNeeded();
    const allResources = await this.getResourcesForStudent(user);

    if (!conceptName && !topic) return allResources;

    const cLower = (conceptName || '').toLowerCase();
    const tLower = (topic || '').toLowerCase();

    // Score and rank candidates by alignment to the specific concept gap
    const ranked = allResources.map((res) => {
      let matchScore = res.relevance_score || 0.8;
      const resTitle = (res.title || '').toLowerCase();
      const resDesc = (res.description || '').toLowerCase();
      const resTopic = (res.topic || '').toLowerCase();
      const resTags = (res.tags || []).map((t) => t.toLowerCase());

      if (cLower && (resTitle.includes(cLower) || resDesc.includes(cLower) || resTags.includes(cLower))) {
        matchScore += 0.4;
      }
      if (tLower && (resTopic.includes(tLower) || resTitle.includes(tLower))) {
        matchScore += 0.2;
      }

      return {
        ...res,
        intervention_fit_score: Math.min(1.0, matchScore),
        is_targeted_recovery: matchScore > 0.9,
      };
    });

    return ranked.sort((a, b) => b.intervention_fit_score - a.intervention_fit_score);
  }

  /**
   * Seed default approved resources for MCA classes
   */
  static async seedDefaultsIfNeeded() {
    if (memoryStore.curated_resources && memoryStore.curated_resources.size > 0) {
      return;
    }

    const defaults = [
      {
        id: 'res-seed-001',
        title: 'MIT 6.824: Distributed Raft Consensus & State Machine Replication',
        url: 'https://www.youtube.com/watch?v=R2-9bsKmEbo',
        source: 'YouTube',
        description: 'Comprehensive graduate-level lecture from MIT covering Raft leader election, log replication quorum safety, and crash recovery.',
        relevance_score: 0.96,
        topic: 'Distributed ACID & Fault Tolerance',
        subtopics: ['Raft Consensus', 'Leader Election', 'Log Replication'],
        difficulty_fit: 'Optimal',
        educational_usefulness: 'High',
        approved_status: 'APPROVED',
        classroom_id: 'cls-mca-402',
        teacher_id: 'teacher-001-uuid',
      },
      {
        id: 'res-seed-002',
        title: 'Carnegie Mellon: Database Schema Normalization & BCNF Proofs',
        url: 'https://www.youtube.com/watch?v=UrYLYV7WSHM',
        source: 'YouTube',
        description: 'In-depth video analysis on 3NF synthesis vs BCNF decomposition algorithms with formal lossless join proofs.',
        relevance_score: 0.94,
        topic: 'Database Engineering & Normal Forms',
        subtopics: ['1NF / 2NF / 3NF Foundations', 'Boyce-Codd Normal Form (BCNF)', 'Lossless-Join Decomposition'],
        difficulty_fit: 'Optimal',
        educational_usefulness: 'High',
        approved_status: 'APPROVED',
        classroom_id: 'cls-mca-402',
        teacher_id: 'teacher-001-uuid',
      },
      {
        id: 'res-seed-003',
        title: 'Linux Kernel Documentation: CFS Scheduler Design & vruntime',
        url: 'https://docs.kernel.org/scheduler/sched-design-CFS.html',
        source: 'Documentation',
        description: 'Official Linux kernel design document detailing Completely Fair Scheduler red-black tree runqueues and latency targets.',
        relevance_score: 0.92,
        topic: 'Operating Systems',
        subtopics: ['Completely Fair Scheduler', 'Red-Black Tree Runqueues', 'Nice Values & Latency Target'],
        difficulty_fit: 'Optimal',
        educational_usefulness: 'High',
        approved_status: 'APPROVED',
        classroom_id: 'cls-mca-401',
        teacher_id: 'teacher-001-uuid',
      },
    ];

    for (const item of defaults) {
      await CuratedResource.create(item);
    }
  }
}

module.exports = ResourceCuratorService;
