from typing import List, Optional
from pydantic import BaseModel, Field


class RubricCriterionInput(BaseModel):
    criterion: str
    max_marks: float


class EvaluationRequest(BaseModel):
    anonymous_submission_id: str
    question: str
    max_marks: float
    learning_outcome: Optional[str] = None
    rubric: List[RubricCriterionInput]
    reference_concepts: Optional[str] = None
    student_answer: str
    question_id: Optional[str] = None
    multi_pass: Optional[bool] = False


class CriterionScore(BaseModel):
    criterion: str
    max_marks: float
    awarded_marks: float
    evidence: str
    reason: str


class GradeReport(BaseModel):
    submission_id: str
    question_id: Optional[str] = None
    maximum_marks: float
    criteria: List[CriterionScore]
    total_marks: float
    percentage: float
    strengths: List[str] = Field(default_factory=list)
    missing_concepts: List[str] = Field(default_factory=list)
    feedback: str
    confidence_score: float = Field(default=1.0, ge=0.0, le=1.0)
    requires_human_review: bool = False
    parsing_error: Optional[bool] = False
    consistency_variance: Optional[float] = None
    multi_pass_count: Optional[int] = None
