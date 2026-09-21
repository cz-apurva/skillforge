import asyncio
import logging
import os
import statistics
from typing import List, Tuple
from app.grading.confidence import apply_confidence_policy
from app.grading.written_evaluator import evaluate_written_submission
from app.schemas.grade_report import EvaluationRequest, GradeReport

logger = logging.getLogger(__name__)

# Default variance threshold: 10% of maximum marks
DEFAULT_VARIANCE_THRESHOLD = 0.10


def get_variance_threshold() -> float:
    """Retrieves the allowed variance threshold percentage from environment variables."""
    try:
        return float(os.environ.get("FAIRGRADE_CONSISTENCY_VARIANCE_THRESHOLD", DEFAULT_VARIANCE_THRESHOLD))
    except (ValueError, TypeError):
        logger.warning(
            f"Invalid FAIRGRADE_CONSISTENCY_VARIANCE_THRESHOLD. Defaulting to {DEFAULT_VARIANCE_THRESHOLD}"
        )
        return DEFAULT_VARIANCE_THRESHOLD


async def evaluate_with_consistency_check(
    req: EvaluationRequest,
    num_passes: int = 3,
) -> Tuple[GradeReport, List[GradeReport]]:
    """
    Runs multi-pass evaluation (up to 3 independent passes) when requested,
    evaluating consistency across passes.

    If total marks across passes diverge by more than the threshold (e.g. >10% of max marks),
    it flags the submission for human review and returns the MEDIAN pass.
    """
    if not req.multi_pass or num_passes <= 1:
        single_report = await evaluate_written_submission(req)
        single_report = apply_confidence_policy(single_report)
        return single_report, [single_report]

    logger.info(
        f"Executing multi-pass evaluation ({num_passes} passes) for submission '{req.anonymous_submission_id}'"
    )

    # Execute passes concurrently or sequentially
    pass_tasks = [evaluate_written_submission(req) for _ in range(num_passes)]
    reports: List[GradeReport] = await asyncio.gather(*pass_tasks)

    # Sort reports by total_marks to find median and compute dispersion
    reports_sorted = sorted(reports, key=lambda r: r.total_marks)
    total_scores = [r.total_marks for r in reports_sorted]

    score_spread = max(total_scores) - min(total_scores)
    allowed_spread = req.max_marks * get_variance_threshold()

    # Determine median pass
    median_index = len(reports_sorted) // 2
    selected_report = reports_sorted[median_index].model_copy(deep=True)

    # ----------------------------------------------------------------------------------
    # ARCHITECTURAL RATIONALE: Why we return the MEDIAN pass rather than an AVERAGE:
    #
    # 1. Rubric Integrity & Evidence Coupling:
    #    Every evaluation pass represents a cohesive, structured assessment where awarded
    #    marks, extracted evidence quotes, and constructive feedback are strictly coupled.
    #    Blindly averaging scores would synthesize artificial, non-existent scores (e.g., 7.33/10)
    #    detached from any concrete rubric scoring level or textual evidence quote.
    #
    # 2. Outlier & Hallucination Resistance:
    #    If two independent passes evaluate the student's answer accurately at 8/10,
    #    while an anomalous third pass experiences a transient hallucination and awards 3/10,
    #    an arithmetic mean degrades the score to 6.33/10. The median safely selects the
    #    8/10 evaluation, preserving an actual valid evaluation while the high variance
    #    triggers the human-in-the-loop review flag.
    # ----------------------------------------------------------------------------------

    selected_report.multi_pass_count = num_passes
    selected_report.consistency_variance = round(score_spread, 2)

    # Check if variance exceeds allowed threshold
    if score_spread > allowed_spread:
        logger.warning(
            f"High score variance detected for submission '{req.anonymous_submission_id}': "
            f"Spread={score_spread:.2f} > Allowed={allowed_spread:.2f} ({get_variance_threshold()*100}% of max {req.max_marks}). "
            f"Escalating to human review."
        )
        selected_report.requires_human_review = True
        selected_report.feedback = (
            f"[Automated Consistency Warning: Score variance across independent passes was "
            f"{score_spread:.2f} marks (threshold: {allowed_spread:.2f}). Flagged for instructor review.]\n\n"
            + selected_report.feedback
        )

    # Also apply single-pass confidence threshold policy
    selected_report = apply_confidence_policy(selected_report)

    return selected_report, reports
