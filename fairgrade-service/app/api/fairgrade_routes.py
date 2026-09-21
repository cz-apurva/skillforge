from typing import Any, Set
from fastapi import APIRouter, HTTPException, Request, status
from app.grading.consistency_validator import evaluate_with_consistency_check
from app.schemas.grade_report import EvaluationRequest, GradeReport

router = APIRouter(prefix="/fairgrade", tags=["FairGrade Evaluation"])

FORBIDDEN_IDENTITY_KEYS: Set[str] = {
    "student_id",
    "studentid",
    "student_name",
    "studentname",
    "student_email",
    "studentemail",
    "name",
    "email",
    "roll_no",
    "rollno",
    "roll_number",
    "rollnumber",
    "user_id",
    "userid",
}


def _scan_for_identity_leak(data: Any, path: str = "") -> None:
    """Recursively checks whether any identity-bearing key exists in payload."""
    if isinstance(data, dict):
        for key, value in data.items():
            normalized = key.lower().replace("_", "").replace("-", "")
            if key.lower() in FORBIDDEN_IDENTITY_KEYS or normalized in FORBIDDEN_IDENTITY_KEYS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Security Violation: Forbidden identity key '{key}' detected in evaluation payload.",
                )
            if isinstance(value, (dict, list)):
                _scan_for_identity_leak(value, f"{path}.{key}" if path else key)
    elif isinstance(data, list):
        for item in data:
            _scan_for_identity_leak(item, path)


@router.post(
    "/evaluate",
    response_model=GradeReport,
    status_code=status.HTTP_200_OK,
    summary="Evaluate an anonymized written submission",
)
async def evaluate_submission(request: Request) -> GradeReport:
    """
    Evaluates a written subjective answer against a defined rubric.
    Enforces defense-in-depth identity screening, multi-pass consistency validation,
    and confidence threshold policies.
    """
    try:
        body_json = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload.",
        )

    # 1. Defense-in-depth identity check
    _scan_for_identity_leak(body_json)

    # 2. Validate with Pydantic EvaluationRequest schema
    try:
        eval_req = EvaluationRequest(**body_json)
    except Exception as validation_error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Validation error: {str(validation_error)}",
        )

    # 3. Perform evaluation (single or multi-pass with consistency check)
    report, _ = await evaluate_with_consistency_check(eval_req, num_passes=3)
    return report
