import asyncio
import os
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.grading.confidence import apply_confidence_policy, get_confidence_threshold
from app.grading.consistency_validator import evaluate_with_consistency_check
from app.grading.written_evaluator import (
    evaluate_written_submission,
    SYSTEM_PROMPT,
)
from app.schemas.grade_report import (
    CriterionScore,
    EvaluationRequest,
    GradeReport,
    RubricCriterionInput,
)

client = TestClient(app)


def test_evaluate_valid_anonymous_payload():
    payload = {
        "anonymous_submission_id": "anon-sub-998877",
        "question": "Explain Deadlock Prevention vs Deadlock Avoidance in Operating Systems.",
        "max_marks": 10.0,
        "learning_outcome": "Understand resource allocation graphs and banker's algorithm.",
        "rubric": [
            {"criterion": "Prevention Strategies (Mutual Exclusion, Hold and Wait)", "max_marks": 5.0},
            {"criterion": "Avoidance & Banker's Algorithm", "max_marks": 5.0},
        ],
        "reference_concepts": "Prevention negates 1 of 4 conditions; avoidance dynamically checks safe state.",
        "student_answer": "Deadlock prevention eliminates at least one Coffman condition. Deadlock avoidance checks safe state dynamically using Banker's algorithm.",
    }

    response = client.post("/fairgrade/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["submission_id"] == "anon-sub-998877"
    assert data["maximum_marks"] == 10.0
    assert len(data["criteria"]) == 2
    assert "total_marks" in data
    assert "percentage" in data
    assert "feedback" in data
    assert "requires_human_review" in data


def test_evaluate_rejects_student_id_defense_in_depth():
    payload = {
        "anonymous_submission_id": "anon-sub-998877",
        "student_id": "student-uuid-leak-12345",  # FORBIDDEN
        "question": "Explain TCP Reno",
        "max_marks": 10.0,
        "rubric": [{"criterion": "Concept", "max_marks": 10.0}],
        "student_answer": "TCP Reno uses fast recovery.",
    }

    response = client.post("/fairgrade/evaluate", json=payload)
    assert response.status_code == 400
    assert "Forbidden identity key 'student_id'" in response.json()["detail"]


def test_evaluate_rejects_name_and_email_keys():
    for forbidden_key in ["name", "email", "roll_number", "student_name"]:
        payload = {
            "anonymous_submission_id": "anon-sub-998877",
            forbidden_key: "some-value",
            "question": "Explain Dijkstra algorithm",
            "max_marks": 10.0,
            "rubric": [{"criterion": "Algorithm steps", "max_marks": 10.0}],
            "student_answer": "Shortest path graph traversal algorithm.",
        }

        response = client.post("/fairgrade/evaluate", json=payload)
        assert response.status_code == 400
        assert f"Forbidden identity key '{forbidden_key}'" in response.json()["detail"]


def test_llm_parsing_retry_and_graceful_fallback():
    req = EvaluationRequest(
        anonymous_submission_id="anon-sub-fallback-001",
        question="What is polymorphism?",
        max_marks=5.0,
        rubric=[RubricCriterionInput(criterion="Definition", max_marks=5.0)],
        student_answer="Ability of an object to take many forms.",
    )

    with patch("anthropic.Anthropic") as mock_anthropic_class, patch.dict(
        "os.environ", {"ANTHROPIC_API_KEY": "test-key-fake"}
    ):
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text="<INVALID_NOT_JSON_RESPONSE>")]
        mock_client.messages.create.return_value = mock_message

        report = asyncio.run(evaluate_written_submission(req))

        assert mock_client.messages.create.call_count == 2
        args, kwargs = mock_client.messages.create.call_args
        assert kwargs["system"] == SYSTEM_PROMPT
        assert kwargs["model"] == "claude-sonnet-4-6"

        assert report.requires_human_review is True
        assert report.parsing_error is True
        assert report.submission_id == "anon-sub-fallback-001"


def test_confidence_threshold_policy():
    report_low = GradeReport(
        submission_id="sub-low-conf",
        maximum_marks=10.0,
        criteria=[],
        total_marks=8.0,
        percentage=80.0,
        feedback="Good answer",
        confidence_score=0.82,  # < 0.85
        requires_human_review=False,
    )
    apply_confidence_policy(report_low)
    assert report_low.requires_human_review is True

    report_high = GradeReport(
        submission_id="sub-high-conf",
        maximum_marks=10.0,
        criteria=[],
        total_marks=9.0,
        percentage=90.0,
        feedback="Excellent answer",
        confidence_score=0.92,  # >= 0.85
        requires_human_review=False,
    )
    apply_confidence_policy(report_high)
    assert report_high.requires_human_review is False


def test_consistency_validator_multi_pass_consistent():
    req = EvaluationRequest(
        anonymous_submission_id="anon-sub-multi-01",
        question="Explain virtual memory paging.",
        max_marks=10.0,
        rubric=[RubricCriterionInput(criterion="Paging mechanics", max_marks=10.0)],
        student_answer="Paging divides virtual memory into fixed size pages and physical memory into page frames.",
        multi_pass=True,
    )

    # 3 passes with close scores: 8.0, 8.5, 8.2 (spread 0.5 <= 1.0)
    mock_reports = [
        GradeReport(
            submission_id=req.anonymous_submission_id,
            maximum_marks=10.0,
            criteria=[CriterionScore(criterion="Paging", max_marks=10.0, awarded_marks=8.0, evidence="ev", reason="re")],
            total_marks=8.0,
            percentage=80.0,
            feedback="Pass 1 Feedback",
            confidence_score=0.95,
            requires_human_review=False,
        ),
        GradeReport(
            submission_id=req.anonymous_submission_id,
            maximum_marks=10.0,
            criteria=[CriterionScore(criterion="Paging", max_marks=10.0, awarded_marks=8.5, evidence="ev", reason="re")],
            total_marks=8.5,
            percentage=85.0,
            feedback="Pass 2 Feedback",
            confidence_score=0.95,
            requires_human_review=False,
        ),
        GradeReport(
            submission_id=req.anonymous_submission_id,
            maximum_marks=10.0,
            criteria=[CriterionScore(criterion="Paging", max_marks=10.0, awarded_marks=8.2, evidence="ev", reason="re")],
            total_marks=8.2,
            percentage=82.0,
            feedback="Pass 3 Feedback (Median)",
            confidence_score=0.95,
            requires_human_review=False,
        ),
    ]

    with patch("app.grading.consistency_validator.evaluate_written_submission", side_effect=mock_reports):
        selected_report, all_passes = asyncio.run(evaluate_with_consistency_check(req, num_passes=3))

        # Verified median selection (8.2)
        assert selected_report.total_marks == 8.2
        assert selected_report.feedback.startswith("Pass 3 Feedback")
        assert selected_report.requires_human_review is False
        assert selected_report.multi_pass_count == 3
        assert selected_report.consistency_variance == 0.5


def test_consistency_validator_multi_pass_divergent_forces_human_review():
    req = EvaluationRequest(
        anonymous_submission_id="anon-sub-multi-divergent",
        question="Explain TCP Tahoe vs Reno",
        max_marks=10.0,
        rubric=[RubricCriterionInput(criterion="Fast recovery", max_marks=10.0)],
        student_answer="Tahoe resets to 1 MSS, Reno enters fast recovery.",
        multi_pass=True,
    )

    # 3 passes with wide divergence: 3.0, 7.5, 9.0 (spread 6.0 > 10% of 10.0 = 1.0)
    mock_reports = [
        GradeReport(
            submission_id=req.anonymous_submission_id,
            maximum_marks=10.0,
            criteria=[CriterionScore(criterion="Q", max_marks=10.0, awarded_marks=3.0, evidence="ev", reason="re")],
            total_marks=3.0,
            percentage=30.0,
            feedback="Pass 1 - harsh",
            confidence_score=0.90,
            requires_human_review=False,
        ),
        GradeReport(
            submission_id=req.anonymous_submission_id,
            maximum_marks=10.0,
            criteria=[CriterionScore(criterion="Q", max_marks=10.0, awarded_marks=9.0, evidence="ev", reason="re")],
            total_marks=9.0,
            percentage=90.0,
            feedback="Pass 2 - lenient",
            confidence_score=0.90,
            requires_human_review=False,
        ),
        GradeReport(
            submission_id=req.anonymous_submission_id,
            maximum_marks=10.0,
            criteria=[CriterionScore(criterion="Q", max_marks=10.0, awarded_marks=7.5, evidence="ev", reason="re")],
            total_marks=7.5,
            percentage=75.0,
            feedback="Pass 3 - median",
            confidence_score=0.90,
            requires_human_review=False,
        ),
    ]

    with patch("app.grading.consistency_validator.evaluate_written_submission", side_effect=mock_reports):
        selected_report, all_passes = asyncio.run(evaluate_with_consistency_check(req, num_passes=3))

        # Returned median pass (7.5) rather than blind average (6.5)
        assert selected_report.total_marks == 7.5
        # High variance forced human review flag
        assert selected_report.requires_human_review is True
        assert "Automated Consistency Warning" in selected_report.feedback
        assert selected_report.consistency_variance == 6.0


def test_repeated_runs_score_consistency():
    """Verify that same answer + same rubric produces consistent score across repeated runs within small tolerance."""
    payload = {
        "anonymous_submission_id": "anon-sub-repeat-test",
        "question": "Explain ACID properties in relational database management systems.",
        "max_marks": 10.0,
        "rubric": [
            {"criterion": "Atomicity and Consistency", "max_marks": 5.0},
            {"criterion": "Isolation and Durability", "max_marks": 5.0},
        ],
        "reference_concepts": "Atomicity all-or-nothing, Consistency state valid, Isolation concurrency control, Durability committed data saved.",
        "student_answer": "Atomicity ensures all operations succeed or rollback completely. Consistency ensures database moves between valid states. Isolation isolates concurrent transactions using locks. Durability guarantees committed transactions survive power failures via write-ahead logging.",
    }

    response1 = client.post("/fairgrade/evaluate", json=payload)
    response2 = client.post("/fairgrade/evaluate", json=payload)

    assert response1.status_code == 200
    assert response2.status_code == 200

    data1 = response1.json()
    data2 = response2.json()

    # Scores across repeated runs must be within small tolerance (<= 0.5 marks)
    delta = abs(data1["total_marks"] - data2["total_marks"])
    assert delta <= 0.5, f"Score delta between runs was {delta}, expected <= 0.5"
    assert data1["requires_human_review"] == data2["requires_human_review"]


def test_conceptually_equivalent_answers_score_similarly():
    """Verify that two differently-worded but conceptually equivalent answers score within a small delta."""
    rubric = [
        {"criterion": "Core Mechanism and Strategy", "max_marks": 5.0},
        {"criterion": "Mathematical Invariants and Trade-Offs", "max_marks": 5.0},
    ]
    question = "Explain Dijkstra's Single-Source Shortest Path Algorithm."
    reference = "Greedy strategy, maintains min-priority queue, relaxes edges, requires non-negative edge weights."

    # Answer A: Formal textbook style
    payload_a = {
        "anonymous_submission_id": "anon-equiv-a",
        "question": question,
        "max_marks": 10.0,
        "rubric": rubric,
        "reference_concepts": reference,
        "student_answer": "Dijkstra algorithm employs a greedy paradigm using a min-heap priority queue to extract the vertex with minimum tentative distance. It iteratively relaxes incident edges with update formula dist[v] = min(dist[v], dist[u] + weight(u,v)). Crucially, it assumes all edge weights are non-negative to ensure optimality.",
    }

    # Answer B: Practical conversational style with same concepts
    payload_b = {
        "anonymous_submission_id": "anon-equiv-b",
        "question": question,
        "max_marks": 10.0,
        "rubric": rubric,
        "reference_concepts": reference,
        "student_answer": "Dijkstra is a greedy shortest path finder. It starts at the source and always picks the closest unvisited node from a priority queue. For each neighbor, it checks if going through the current node gives a shorter path (relaxation step). All edge costs must be zero or positive so greedy choices stay optimal.",
    }

    res_a = client.post("/fairgrade/evaluate", json=payload_a)
    res_b = client.post("/fairgrade/evaluate", json=payload_b)

    assert res_a.status_code == 200
    assert res_b.status_code == 200

    score_a = res_a.json()["total_marks"]
    score_b = res_b.json()["total_marks"]

    # Difference between conceptually equivalent answers should be small (<= 1.5 marks / 15%)
    delta = abs(score_a - score_b)
    assert delta <= 1.5, f"Conceptual equivalence delta was {delta}, expected <= 1.5"


def test_low_confidence_flagged_for_human_review():
    """Verify that a low-confidence or ambiguous answer is flagged for human review."""
    report = GradeReport(
        submission_id="sub-ambiguous-001",
        maximum_marks=10.0,
        criteria=[],
        total_marks=5.0,
        percentage=50.0,
        feedback="Answer contains ambiguous assertions requiring faculty clarification.",
        confidence_score=0.74,  # Below 0.85 threshold
        requires_human_review=False,
    )
    apply_confidence_policy(report)

    assert report.requires_human_review is True
    assert report.confidence_score < 0.85

