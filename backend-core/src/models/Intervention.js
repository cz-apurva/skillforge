const { pool, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Intervention {
  static async create({
    id = null,
    student_id,
    studentId,
    classroom_id,
    classroomId,
    concept_id,
    conceptId,
    misconception_id = null,
    misconceptionId = null,
    initial_mastery = 0.0,
    initialMastery = 0.0,
    target_mastery = 80.0,
    targetMastery = 80.0,
    status = 'IN_PROGRESS',
    recommended_by = 'RULE_ENGINE',
    steps = [],
  }) {
    const finalId = id || uuidv4();
    const finalStudentId = student_id || studentId;
    const finalClassroomId = classroom_id || classroomId;
    const finalConceptId = concept_id || conceptId;
    const finalMisconceptionId = misconception_id || misconceptionId;
    const finalInitialMastery = Number(initial_mastery !== undefined ? initial_mastery : initialMastery) || 0.0;
    const finalTargetMastery = Number(target_mastery !== undefined ? target_mastery : targetMastery) || 80.0;

    const createdSteps = [];

    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const newIntervention = {
        id: finalId,
        student_id: finalStudentId,
        classroom_id: finalClassroomId,
        concept_id: finalConceptId,
        misconception_id: finalMisconceptionId,
        initial_mastery: finalInitialMastery,
        target_mastery: finalTargetMastery,
        status,
        recommended_by,
        created_at: new Date().toISOString(),
        completed_at: null,
        updated_at: new Date().toISOString(),
      };
      if (!memoryStore.interventions) memoryStore.interventions = new Map();
      memoryStore.interventions.set(newIntervention.id, newIntervention);

      if (!memoryStore.intervention_steps) memoryStore.intervention_steps = new Map();
      steps.forEach((step, idx) => {
        const stepObj = {
          id: step.id || uuidv4(),
          intervention_id: finalId,
          step_number: step.step_number || idx + 1,
          step_type: step.step_type || 'FOUNDATIONAL_EXPLANATION',
          delivery_channel: step.delivery_channel || 'SOCRATIC_TUTOR',
          title: step.title || `Intervention Step ${idx + 1}`,
          instructions: step.instructions || '',
          payload: step.payload || {},
          is_completed: step.is_completed || false,
          completed_at: null,
          created_at: new Date().toISOString(),
        };
        memoryStore.intervention_steps.set(stepObj.id, stepObj);
        createdSteps.push(stepObj);
      });

      return { ...newIntervention, steps: createdSteps };
    }

    const queryText = `
      INSERT INTO interventions (id, student_id, classroom_id, concept_id, misconception_id, initial_mastery, target_mastery, status, recommended_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const values = [finalId, finalStudentId, finalClassroomId, finalConceptId, finalMisconceptionId, finalInitialMastery, finalTargetMastery, status, recommended_by];
    const { rows } = await pool.query(queryText, values);
    const intervention = rows[0];

    for (let idx = 0; idx < steps.length; idx++) {
      const step = steps[idx];
      const stepId = step.id || uuidv4();
      const stepNum = step.step_number || idx + 1;
      const stepType = step.step_type || 'FOUNDATIONAL_EXPLANATION';
      const channel = step.delivery_channel || 'SOCRATIC_TUTOR';
      const title = step.title || `Intervention Step ${stepNum}`;
      const instructions = step.instructions || '';
      const payload = step.payload || {};

      const stepQuery = `
        INSERT INTO intervention_steps (id, intervention_id, step_number, step_type, delivery_channel, title, instructions, payload, is_completed)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
      `;
      const stepValues = [stepId, finalId, stepNum, stepType, channel, title, instructions, JSON.stringify(payload), false];
      const stepRes = await pool.query(stepQuery, stepValues);
      createdSteps.push(stepRes.rows[0]);
    }

    return { ...intervention, steps: createdSteps };
  }

  static async findById(id) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const intervention = memoryStore.interventions?.get(id);
      if (!intervention) return null;
      const steps = Array.from(memoryStore.intervention_steps?.values() || [])
        .filter((s) => s.intervention_id === id)
        .sort((a, b) => a.step_number - b.step_number);
      return { ...intervention, steps };
    }
    const { rows } = await pool.query(`SELECT * FROM interventions WHERE id = $1;`, [id]);
    if (rows.length === 0) return null;
    const stepsRes = await pool.query(`SELECT * FROM intervention_steps WHERE intervention_id = $1 ORDER BY step_number ASC;`, [id]);
    return { ...rows[0], steps: stepsRes.rows };
  }

  static async findByStudent(studentId, classroomId = null) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const list = Array.from(memoryStore.interventions?.values() || [])
        .filter((i) => i.student_id === studentId && (!classroomId || i.classroom_id === classroomId))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return list.map((i) => {
        const steps = Array.from(memoryStore.intervention_steps?.values() || [])
          .filter((s) => s.intervention_id === i.id)
          .sort((a, b) => a.step_number - b.step_number);
        const concept = memoryStore.concepts?.get(i.concept_id);
        const misconception = i.misconception_id ? memoryStore.misconceptions?.get(i.misconception_id) : null;
        return {
          ...i,
          concept_name: concept ? concept.name : 'Target Concept',
          topic: concept ? concept.topic : 'General',
          misconception_title: misconception ? misconception.title : null,
          steps,
        };
      });
    }

    const queryText = classroomId
      ? `SELECT i.*, c.name as concept_name, c.topic, m.title as misconception_title 
         FROM interventions i 
         JOIN concepts c ON i.concept_id = c.id 
         LEFT JOIN misconceptions m ON i.misconception_id = m.id 
         WHERE i.student_id = $1 AND i.classroom_id = $2 
         ORDER BY i.created_at DESC;`
      : `SELECT i.*, c.name as concept_name, c.topic, m.title as misconception_title 
         FROM interventions i 
         JOIN concepts c ON i.concept_id = c.id 
         LEFT JOIN misconceptions m ON i.misconception_id = m.id 
         WHERE i.student_id = $1 
         ORDER BY i.created_at DESC;`;
    const params = classroomId ? [studentId, classroomId] : [studentId];
    const { rows } = await pool.query(queryText, params);

    for (const row of rows) {
      const stepsRes = await pool.query(`SELECT * FROM intervention_steps WHERE intervention_id = $1 ORDER BY step_number ASC;`, [row.id]);
      row.steps = stepsRes.rows;
    }
    return rows;
  }

  static async completeStep(stepId) {
    if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
      const step = memoryStore.intervention_steps?.get(stepId);
      if (!step) return null;
      step.is_completed = true;
      step.completed_at = new Date().toISOString();
      memoryStore.intervention_steps.set(stepId, step);

      // Check if all steps in intervention are completed
      const allSteps = Array.from(memoryStore.intervention_steps?.values() || []).filter(
        (s) => s.intervention_id === step.intervention_id
      );
      if (allSteps.every((s) => s.is_completed)) {
        const parent = memoryStore.interventions?.get(step.intervention_id);
        if (parent) {
          parent.status = 'COMPLETED';
          parent.completed_at = new Date().toISOString();
          memoryStore.interventions.set(parent.id, parent);
        }
      }
      return step;
    }

    const queryText = `
      UPDATE intervention_steps 
      SET is_completed = TRUE, completed_at = NOW() 
      WHERE id = $1 
      RETURNING *;
    `;
    const { rows } = await pool.query(queryText, [stepId]);
    if (rows.length === 0) return null;
    const step = rows[0];

    // Check if parent intervention steps are all completed
    const uncompletedRes = await pool.query(
      `SELECT COUNT(*) as count FROM intervention_steps WHERE intervention_id = $1 AND is_completed = FALSE;`,
      [step.intervention_id]
    );
    if (parseInt(uncompletedRes.rows[0]?.count || 0) === 0) {
      await pool.query(
        `UPDATE interventions SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW() WHERE id = $1;`,
        [step.intervention_id]
      );
    }
    return step;
  }
}

module.exports = Intervention;
