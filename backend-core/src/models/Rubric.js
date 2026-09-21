const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Rubric {
  static async createWithCriteria({
    assessment_id = null,
    question_id = null,
    title,
    description = null,
    total_weight = 100.00,
    criteria = [],
  }) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const rubricId = uuidv4();
      const newRubric = {
        id: rubricId,
        assessment_id,
        question_id,
        title,
        description,
        total_weight: Number(total_weight),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.rubrics.set(rubricId, newRubric);

      const savedCriteria = [];
      criteria.forEach((crit, index) => {
        const criterionId = uuidv4();
        const newCriterion = {
          id: criterionId,
          rubric_id: rubricId,
          criterion_name: crit.criterion_name || crit.name,
          description: crit.description || '',
          max_points: Number(crit.max_points ?? crit.max_marks ?? 0),
          weight: Number(crit.weight || 1.00),
          scoring_levels: crit.scoring_levels || [],
          order_index: crit.order_index ?? index,
          created_at: new Date().toISOString(),
        };
        memoryStore.rubric_criteria.set(criterionId, newCriterion);
        savedCriteria.push(newCriterion);
      });

      return { ...newRubric, criteria: savedCriteria };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const rubricQuery = `
        INSERT INTO rubric (assessment_id, question_id, title, description, total_weight)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
      const rubricValues = [assessment_id, question_id, title, description, total_weight];
      const rubricResult = await client.query(rubricQuery, rubricValues);
      const createdRubric = rubricResult.rows[0];

      const savedCriteria = [];
      for (let i = 0; i < criteria.length; i++) {
        const crit = criteria[i];
        const criterionQuery = `
          INSERT INTO rubric_criterion (
            rubric_id, criterion_name, description, max_points, weight, scoring_levels, order_index
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *;
        `;
        const criterionValues = [
          createdRubric.id,
          crit.criterion_name || crit.name,
          crit.description || '',
          crit.max_points ?? crit.max_marks ?? 0,
          crit.weight || 1.00,
          JSON.stringify(crit.scoring_levels || []),
          crit.order_index ?? i,
        ];
        const critResult = await client.query(criterionQuery, criterionValues);
        savedCriteria.push(critResult.rows[0]);
      }

      await client.query('COMMIT');
      return { ...createdRubric, criteria: savedCriteria };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findByQuestionId(questionId) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      let foundRubric = null;
      for (const r of memoryStore.rubrics.values()) {
        if (r.question_id === questionId) {
          foundRubric = { ...r };
          break;
        }
      }
      if (!foundRubric) return null;

      const criteria = [];
      for (const c of memoryStore.rubric_criteria.values()) {
        if (c.rubric_id === foundRubric.id) {
          criteria.push(c);
        }
      }
      criteria.sort((a, b) => a.order_index - b.order_index);
      return { ...foundRubric, criteria };
    }

    const rubricQuery = `SELECT * FROM rubric WHERE question_id = $1;`;
    const { rows: rubricRows } = await pool.query(rubricQuery, [questionId]);
    if (rubricRows.length === 0) return null;

    const rubric = rubricRows[0];
    const criteriaQuery = `
      SELECT * FROM rubric_criterion 
      WHERE rubric_id = $1 
      ORDER BY order_index ASC;
    `;
    const { rows: criteriaRows } = await pool.query(criteriaQuery, [rubric.id]);
    return { ...rubric, criteria: criteriaRows };
  }
}

module.exports = Rubric;
