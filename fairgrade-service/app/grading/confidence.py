import os
import logging
from app.schemas.grade_report import GradeReport

logger = logging.getLogger(__name__)

# Default confidence threshold: evaluations with confidence below 85% require human inspection
DEFAULT_CONFIDENCE_THRESHOLD = 0.85


def get_confidence_threshold() -> float:
    """Retrieves the configurable confidence threshold from environment variables."""
    try:
        return float(os.environ.get("FAIRGRADE_CONFIDENCE_THRESHOLD", DEFAULT_CONFIDENCE_THRESHOLD))
    except (ValueError, TypeError):
        logger.warning(
            f"Invalid FAIRGRADE_CONFIDENCE_THRESHOLD value in env. Falling back to default {DEFAULT_CONFIDENCE_THRESHOLD}"
        )
        return DEFAULT_CONFIDENCE_THRESHOLD


def apply_confidence_policy(report: GradeReport) -> GradeReport:
    """
    Applies confidence threshold policy to a GradeReport.
    If confidence_score is below the threshold, forces requires_human_review = True.
    """
    threshold = get_confidence_threshold()

    if report.confidence_score < threshold:
        logger.info(
            f"Submission '{report.submission_id}' confidence ({report.confidence_score:.3f}) "
            f"is below threshold ({threshold:.3f}). Escalating to human review."
        )
        report.requires_human_review = True

    return report
