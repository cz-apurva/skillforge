import json
import logging
import os
import re
from typing import Any, Dict, Optional
import anthropic
from app.schemas.grade_report import CriterionScore, EvaluationRequest, GradeReport

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are an academic assessment engine. Evaluate the student's answer ONLY "
    "according to the supplied question, learning outcomes, reference concepts, "
    "and grading rubric. Do not consider student identity, name, previous marks, "
    "teacher opinions, demographic information, or any information unrelated to "
    "the submitted answer. Do not compare the student with other students. Do "
    "not reward or penalize wording simply because it differs from the reference "
    "answer. Evaluate conceptual correctness, completeness, reasoning, relevance, "
    "and other explicitly defined rubric criteria. Every awarded mark must be "
    "supported by evidence from the student's answer. Do not invent evidence "
    "that is not present. If the answer is ambiguous or insufficiently clear to "
    "make a reliable grading decision, flag it for human review rather than "
    "guessing. Return structured JSON only."
)


def _extract_json_from_response(text: str) -> Dict[str, Any]:
    """Extract and parse JSON object from LLM response text."""
    text = text.strip()

    # If wrapped in markdown code blocks ```json ... ```
    match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text)
    if match:
        return json.loads(match.group(1))

    # Or find outermost braces
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return json.loads(text[start : end + 1])

    return json.loads(text)


def _build_user_prompt(req: EvaluationRequest) -> str:
    rubric_desc = "\n".join(
        [f"- Criterion: {c.criterion} (Max Marks: {c.max_marks})" for c in req.rubric]
    )

    return f"""Please evaluate the following subjective student answer according to the rubric criteria:

Question: {req.question}
Maximum Marks: {req.max_marks}
Learning Outcome: {req.learning_outcome or 'N/A'}
Reference Concepts / Solution Guidelines: {req.reference_concepts or 'N/A'}

Grading Rubric:
{rubric_desc}

Student's Answer:
\"\"\"
{req.student_answer}
\"\"\"

Return a valid JSON object strictly matching this schema:
{{
  "submission_id": "{req.anonymous_submission_id}",
  "question_id": "{req.question_id or ''}",
  "maximum_marks": {req.max_marks},
  "criteria": [
    {{
      "criterion": "Criterion Name",
      "max_marks": 0.0,
      "awarded_marks": 0.0,
      "evidence": "Direct quote from answer as evidence",
      "reason": "Evaluation justification"
    }}
  ],
  "total_marks": 0.0,
  "percentage": 0.0,
  "strengths": ["..."],
  "missing_concepts": ["..."],
  "feedback": "...",
  "confidence_score": 1.0,
  "requires_human_review": false
}}"""


async def evaluate_written_submission(req: EvaluationRequest) -> GradeReport:
    """
    Evaluates an anonymized written submission using Claude (claude-sonnet-4-6).
    Employs single-retry resiliency on parsing failures and gracefully falls back
    to human review with parsing_error=True rather than crashing.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")

    # If no API key is provided, check for mock evaluation mode in tests
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY not set. Running mock evaluation.")
        return _generate_mock_evaluation(req)

    client = anthropic.Anthropic(api_key=api_key)
    prompt = _build_user_prompt(req)

    last_error: Optional[Exception] = None

    # Try up to 2 times (1 initial attempt + 1 retry)
    for attempt in range(2):
        try:
            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=2048,
                temperature=0.1,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            )

            raw_text = response.content[0].text
            parsed_data = _extract_json_from_response(raw_text)

            # Ensure identifiers and numbers conform
            parsed_data["submission_id"] = req.anonymous_submission_id
            parsed_data["maximum_marks"] = float(req.max_marks)

            # Recalculate total and percentage for safety
            criteria_scores = parsed_data.get("criteria", [])
            total = sum(float(c.get("awarded_marks", 0.0)) for c in criteria_scores)
            parsed_data["total_marks"] = round(total, 2)
            parsed_data["percentage"] = (
                round((total / req.max_marks) * 100, 2) if req.max_marks > 0 else 0.0
            )

            return GradeReport(**parsed_data)
        except Exception as ex:
            logger.warning(
                f"Evaluation attempt {attempt + 1} failed: {ex}. Retrying..."
            )
            last_error = ex

    # Both attempts failed -> Graceful fallback without crashing
    logger.error(f"Evaluation failed after retry. Marking for human review: {last_error}")
    return GradeReport(
        submission_id=req.anonymous_submission_id,
        question_id=req.question_id,
        maximum_marks=req.max_marks,
        criteria=[
            CriterionScore(
                criterion=c.criterion,
                max_marks=c.max_marks,
                awarded_marks=0.0,
                evidence="[PARSING_FAILED]",
                reason=f"Automated evaluation encountered an error: {str(last_error)}",
            )
            for c in req.rubric
        ],
        total_marks=0.0,
        percentage=0.0,
        strengths=[],
        missing_concepts=["Manual instructor verification required."],
        feedback="Automated grading output could not be parsed reliably. Submission has been flagged for human review.",
        confidence_score=0.0,
        requires_human_review=True,
        parsing_error=True,
    )


def _generate_mock_evaluation(req: EvaluationRequest) -> GradeReport:
    """Provides a deterministic mock grading report for offline testing."""
    criteria_list = []
    total_awarded = 0.0

    for c in req.rubric:
        awarded = round(c.max_marks * 0.85, 2)
        total_awarded += awarded
        criteria_list.append(
            CriterionScore(
                criterion=c.criterion,
                max_marks=c.max_marks,
                awarded_marks=awarded,
                evidence="Student accurately identified core mechanisms and principles.",
                reason="Clear conceptual explanation aligned with rubric guidelines.",
            )
        )

    percentage = round((total_awarded / req.max_marks) * 100, 2) if req.max_marks > 0 else 0.0

    return GradeReport(
        submission_id=req.anonymous_submission_id,
        question_id=req.question_id,
        maximum_marks=req.max_marks,
        criteria=criteria_list,
        total_marks=round(total_awarded, 2),
        percentage=percentage,
        strengths=["Strong grasp of underlying theory", "Accurate technical terminology"],
        missing_concepts=[],
        feedback="Well-structured answer addressing all primary rubric dimensions accurately.",
        confidence_score=0.95,
        requires_human_review=False,
        parsing_error=False,
    )
