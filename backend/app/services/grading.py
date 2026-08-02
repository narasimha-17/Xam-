import asyncio
from typing import Any

from app.models.exam import Question, QuestionType
from app.services import jdoodle


async def _grade_coding(question: Question, answer: dict[str, Any]) -> tuple[bool | None, float, dict[str, Any]]:
    language = answer.get("language")
    code = answer.get("code") or ""
    test_cases = question.test_cases
    total = len(test_cases)

    if not code or not language or total == 0:
        return False, 0.0, {"test_case_results": [], "passed_count": 0, "total_count": total}

    outcomes = await asyncio.gather(*(jdoodle.run_code(language, code, tc.input) for tc in test_cases))

    test_case_results = []
    passed_count = 0
    for tc, outcome in zip(test_cases, outcomes):
        actual = outcome["stdout"].strip()
        expected = tc.expected_output.strip()
        passed = outcome["error"] is None and actual == expected
        if passed:
            passed_count += 1
        test_case_results.append(
            {
                "input": tc.input,
                "expected_output": tc.expected_output,
                "actual_output": outcome["stdout"],
                "is_sample": tc.is_sample,
                "passed": passed,
                "error": outcome["error"],
            }
        )

    points = question.points * (passed_count / total)
    return passed_count == total, points, {
        "test_case_results": test_case_results,
        "passed_count": passed_count,
        "total_count": total,
    }


async def grade_answer(question: Question, answer: dict[str, Any]) -> tuple[bool | None, float, dict[str, Any]]:
    """Returns (is_correct, points_awarded, correct_answer) for a single question."""

    if question.type == QuestionType.mcq:
        correct_option = next((o for o in question.options if o.is_correct), None)
        selected = answer.get("selected_option_id")
        is_correct = correct_option is not None and selected == correct_option.id
        points = question.points if is_correct else 0.0
        return is_correct, points, {"selected_option_id": correct_option.id if correct_option else None}

    if question.type == QuestionType.maq:
        correct_ids = sorted(o.id for o in question.options if o.is_correct)
        selected_ids = sorted(answer.get("selected_option_ids") or [])
        is_correct = correct_ids == selected_ids
        points = question.points if is_correct else 0.0
        return is_correct, points, {"selected_option_ids": correct_ids}

    if question.type == QuestionType.match:
        pairs = answer.get("pairs") or {}
        total = len(question.match_pairs)
        correct_count = sum(1 for pair in question.match_pairs if pairs.get(str(pair.id)) == pair.id)
        points = question.points * (correct_count / total) if total else 0.0
        is_correct = (correct_count == total) if total else None
        return is_correct, points, {"pairs": {str(p.id): p.id for p in question.match_pairs}}

    if question.type == QuestionType.fill_blank:
        blanks = answer.get("blanks") or {}
        total = len(question.fill_blank_answers)
        correct_count = 0
        correct_answer_map: dict[str, list[str]] = {}
        for fb in question.fill_blank_answers:
            accepted = {a.strip().lower() for a in fb.accepted_answers}
            correct_answer_map[str(fb.blank_index)] = fb.accepted_answers
            submitted = str(blanks.get(str(fb.blank_index), "")).strip().lower()
            if submitted and submitted in accepted:
                correct_count += 1
        points = question.points * (correct_count / total) if total else 0.0
        is_correct = (correct_count == total) if total else None
        return is_correct, points, {"blanks": correct_answer_map}

    if question.type == QuestionType.coding:
        return await _grade_coding(question, answer)

    return False, 0.0, {}


async def grade_attempt(
    questions: list[Question], answers: list[dict[str, Any]]
) -> tuple[float, float, list[dict[str, Any]]]:
    """Grades a full attempt. Returns (score, max_score, per-question results)."""

    answers_by_question = {a["question_id"]: a.get("answer", {}) for a in answers}
    results = []
    score = 0.0
    max_score = 0.0

    for question in questions:
        max_score += question.points
        submitted = answers_by_question.get(question.id, {})
        is_correct, points_awarded, correct_answer = await grade_answer(question, submitted)
        score += points_awarded
        results.append(
            {
                "question_id": question.id,
                "is_correct": is_correct,
                "points_awarded": points_awarded,
                "correct_answer": correct_answer,
            }
        )

    return score, max_score, results
