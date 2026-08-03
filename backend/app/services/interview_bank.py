"""A curated question bank for AI/ML mock interviews.

Ollama is CPU-bound and can take minutes per question, so for the most common
mock-interview role — AI/ML — we serve from a hand-written, technically vetted
bank instead of generating live. This is both faster and higher-quality than
what a small local model reliably produces for this topic.
"""

import random
import re

QUESTION_BANK: list[dict[str, str]] = [
    # Project-based
    {
        "category": "project",
        "question": "Walk me through a machine learning project you've built end-to-end — the problem, your "
        "data pipeline, the model you chose, and how you evaluated it.",
    },
    {
        "category": "project",
        "question": "Tell me about a time a model performed well in training but poorly in production. What "
        "went wrong and how did you debug it?",
    },
    {
        "category": "project",
        "question": "Describe a project where you had to work with a messy, small, or imbalanced dataset. How "
        "did you handle it?",
    },
    {
        "category": "project",
        "question": "If you were to redesign your most recent ML or LLM project from scratch today, what would "
        "you do differently and why?",
    },
    # Core ML fundamentals
    {
        "category": "ml",
        "question": "Explain the bias-variance tradeoff and how it shows up when you're tuning a model.",
    },
    {
        "category": "ml",
        "question": "What's the difference between L1 and L2 regularization, and when would you pick one over "
        "the other?",
    },
    {
        "category": "ml",
        "question": "How would you handle a dataset with severe class imbalance in a binary classification task?",
    },
    {
        "category": "ml",
        "question": "Explain precision, recall, and F1-score, and describe a scenario where you'd prioritize one "
        "metric over the other.",
    },
    {
        "category": "ml",
        "question": "What is the difference between bagging and boosting? Give an example algorithm for each.",
    },
    {
        "category": "ml",
        "question": "How do you detect and prevent overfitting in a deep learning model?",
    },
    # LLMs
    {
        "category": "llm",
        "question": "What's the difference between fine-tuning and prompt engineering for adapting an LLM to a "
        "task, and when would you choose one over the other?",
    },
    {
        "category": "llm",
        "question": "Explain what RAG (retrieval-augmented generation) is and why it helps reduce hallucinations "
        "in LLM responses.",
    },
    {
        "category": "llm",
        "question": "What is the difference between a base/foundation model and an instruction-tuned or "
        "RLHF-aligned model?",
    },
    {
        "category": "llm",
        "question": "How would you evaluate the quality of an LLM's output when there's no single 'correct' "
        "answer to compare it against?",
    },
    # Transformer architecture
    {
        "category": "transformer",
        "question": "Explain self-attention in a transformer — what are queries, keys, and values, and how do "
        "they combine to produce an output?",
    },
    {
        "category": "transformer",
        "question": "Why do transformers use positional encoding, and what problem does it solve?",
    },
    {
        "category": "transformer",
        "question": "What is the purpose of using multiple attention heads instead of a single attention head?",
    },
    {
        "category": "transformer",
        "question": "Explain the difference between an encoder-only, decoder-only, and encoder-decoder "
        "transformer architecture, and name an example model for each.",
    },
    {
        "category": "transformer",
        "question": "What role do layer normalization and residual connections play in a transformer block?",
    },
]

# 5-question session structure: bookend with project questions, cover ml/transformer/llm in between.
_SLOT_CATEGORIES = ["project", "ml", "transformer", "llm", "project"]

_AIML_KEYWORDS = [
    "machine learning",
    "deep learning",
    "artificial intelligence",
    "data scientist",
    "data science",
    "ml engineer",
    "ai engineer",
    "ai researcher",
    "ml researcher",
    "nlp",
    "llm",
]

_WORD_BOUNDARY_TERMS = [r"\bai\b", r"\bml\b", r"\bmle\b"]


def is_aiml_role(job_role: str) -> bool:
    role = job_role.lower().strip()
    if any(re.search(pattern, role) for pattern in _WORD_BOUNDARY_TERMS):
        return True
    return any(keyword in role for keyword in _AIML_KEYWORDS)


def pick_aiml_question(history: list[dict]) -> str | None:
    """Picks the next question for an AI/ML mock interview, avoiding repeats and rotating
    through project/ml/transformer/llm categories across the session."""
    asked = {qa.get("question", "").strip() for qa in history}
    slot = len(history)
    category = _SLOT_CATEGORIES[slot % len(_SLOT_CATEGORIES)]

    pool = [q["question"] for q in QUESTION_BANK if q["category"] == category and q["question"] not in asked]
    if not pool:
        pool = [q["question"] for q in QUESTION_BANK if q["question"] not in asked]
    if not pool:
        return None
    return random.choice(pool)
