"""A curated question bank for AI/ML mock interviews.

Ollama is CPU-bound and can take minutes per question, and isn't reachable at all from the
deployed backend (it only runs on a developer's local machine). So the AI/ML role — the most
requested one — runs entirely on this static, hand-written bank instead of calling an LLM: no
network dependency, no wait, and it works identically in every environment including production.

Each question ships with `key_points` — what a strong answer would touch on — used to build a
"sample" feedback summary at the end of the interview without needing an LLM to grade the
candidate's actual answers.
"""

import random
import re
from typing import TypedDict


class BankQuestion(TypedDict):
    category: str
    question: str
    key_points: list[str]


QUESTION_BANK: list[BankQuestion] = [
    # Project-based
    {
        "category": "project",
        "question": "Walk me through a machine learning project you've built end-to-end — the problem, your "
        "data pipeline, the model you chose, and how you evaluated it.",
        "key_points": [
            "States the problem and why it mattered (business or research goal)",
            "Describes the data source, cleaning, and feature choices",
            "Justifies the model choice against simpler baselines",
            "Names a concrete evaluation metric and result",
        ],
    },
    {
        "category": "project",
        "question": "Tell me about a time a model performed well in training but poorly in production. What "
        "went wrong and how did you debug it?",
        "key_points": [
            "Identifies a plausible cause: data/label drift, leakage, or train-serve skew",
            "Describes a concrete debugging step (slicing metrics, checking input distributions)",
            "Explains the fix, not just the diagnosis",
            "Mentions a safeguard added afterward (monitoring, validation)",
        ],
    },
    {
        "category": "project",
        "question": "Describe a project where you had to work with a messy, small, or imbalanced dataset. How "
        "did you handle it?",
        "key_points": [
            "Names a specific technique (resampling, class weights, augmentation, synthetic data)",
            "Explains why that technique fit the situation over alternatives",
            "Mentions how they validated the fix actually helped (not just applied it blindly)",
        ],
    },
    {
        "category": "project",
        "question": "If you were to redesign your most recent ML or LLM project from scratch today, what would "
        "you do differently and why?",
        "key_points": [
            "Shows genuine retrospective thinking, not just praise for the original approach",
            "Ties the change to a real constraint hit during the project (data, latency, cost, accuracy)",
        ],
    },
    # Core ML fundamentals
    {
        "category": "ml",
        "question": "Explain the bias-variance tradeoff and how it shows up when you're tuning a model.",
        "key_points": [
            "Defines bias (underfitting) and variance (overfitting) correctly",
            "Connects model complexity to the tradeoff",
            "Gives a concrete example: e.g. deeper trees increase variance, more regularization increases bias",
        ],
    },
    {
        "category": "ml",
        "question": "What's the difference between L1 and L2 regularization, and when would you pick one over "
        "the other?",
        "key_points": [
            "L1 (Lasso) can zero out coefficients — useful for feature selection / sparsity",
            "L2 (Ridge) shrinks coefficients smoothly, handles correlated features better",
            "Mentions elastic net as a middle ground",
        ],
    },
    {
        "category": "ml",
        "question": "How would you handle a dataset with severe class imbalance in a binary classification task?",
        "key_points": [
            "Names class weighting, oversampling (SMOTE), or undersampling",
            "Notes that accuracy is the wrong metric here — prefers precision/recall/F1/AUC-PR",
            "Mentions threshold tuning as a lever independent of resampling",
        ],
    },
    {
        "category": "ml",
        "question": "Explain precision, recall, and F1-score, and describe a scenario where you'd prioritize one "
        "metric over the other.",
        "key_points": [
            "Precision = correctness of positive predictions; recall = coverage of actual positives",
            "Gives a real scenario: e.g. spam filtering favors precision, disease screening favors recall",
            "Mentions F1 as the harmonic mean, useful when both matter",
        ],
    },
    {
        "category": "ml",
        "question": "What is the difference between bagging and boosting? Give an example algorithm for each.",
        "key_points": [
            "Bagging trains models in parallel on bootstrapped samples to reduce variance (e.g. Random Forest)",
            "Boosting trains sequentially, each model correcting the last, to reduce bias (e.g. XGBoost, AdaBoost)",
        ],
    },
    {
        "category": "ml",
        "question": "How do you detect and prevent overfitting in a deep learning model?",
        "key_points": [
            "Detection: gap between train and validation loss/metric",
            "Prevention: dropout, weight decay, early stopping, data augmentation, more data",
            "Mentions cross-validation or a held-out test set for honest evaluation",
        ],
    },
    # LLMs
    {
        "category": "llm",
        "question": "What's the difference between fine-tuning and prompt engineering for adapting an LLM to a "
        "task, and when would you choose one over the other?",
        "key_points": [
            "Prompt engineering: no training, fast to iterate, limited by context window and consistency",
            "Fine-tuning: changes weights (or adapters), better for consistent behavior/format at scale",
            "Mentions cost/data tradeoffs — fine-tuning needs labeled examples and compute",
        ],
    },
    {
        "category": "llm",
        "question": "Explain what RAG (retrieval-augmented generation) is and why it helps reduce hallucinations "
        "in LLM responses.",
        "key_points": [
            "Retrieves relevant documents/chunks and injects them into the prompt before generation",
            "Grounds the answer in real, current, or private data instead of relying solely on parametric memory",
            "Notes it doesn't eliminate hallucination entirely — retrieval quality still matters",
        ],
    },
    {
        "category": "llm",
        "question": "What is the difference between a base/foundation model and an instruction-tuned or "
        "RLHF-aligned model?",
        "key_points": [
            "Base model: next-token prediction on raw text, not tuned to follow instructions",
            "Instruction/RLHF-tuned: further trained to follow instructions and align with human preferences",
            "Gives an example pair (e.g. a base GPT model vs. a chat-tuned variant)",
        ],
    },
    {
        "category": "llm",
        "question": "How would you evaluate the quality of an LLM's output when there's no single 'correct' "
        "answer to compare it against?",
        "key_points": [
            "Mentions human evaluation / rubric-based scoring",
            "Mentions LLM-as-judge or pairwise comparison methods",
            "Notes task-specific automatic metrics where applicable (e.g. faithfulness for RAG)",
        ],
    },
    # Transformer architecture
    {
        "category": "transformer",
        "question": "Explain self-attention in a transformer — what are queries, keys, and values, and how do "
        "they combine to produce an output?",
        "key_points": [
            "Each token projects to a query, key, and value vector",
            "Attention weights come from query-key similarity (scaled dot product + softmax)",
            "Output is a weighted sum of value vectors using those attention weights",
        ],
    },
    {
        "category": "transformer",
        "question": "Why do transformers use positional encoding, and what problem does it solve?",
        "key_points": [
            "Self-attention has no inherent notion of token order (it's permutation-invariant)",
            "Positional encoding injects position information so the model can use word order",
            "Mentions sinusoidal or learned positional embeddings as examples",
        ],
    },
    {
        "category": "transformer",
        "question": "What is the purpose of using multiple attention heads instead of a single attention head?",
        "key_points": [
            "Each head can attend to different relationships/subspaces of the representation",
            "Increases representational capacity without a proportional cost in sequence length",
        ],
    },
    {
        "category": "transformer",
        "question": "Explain the difference between an encoder-only, decoder-only, and encoder-decoder "
        "transformer architecture, and name an example model for each.",
        "key_points": [
            "Encoder-only: bidirectional context, good for understanding tasks (e.g. BERT)",
            "Decoder-only: causal/autoregressive generation (e.g. GPT family)",
            "Encoder-decoder: encodes input then generates output conditioned on it (e.g. T5, original Transformer)",
        ],
    },
    {
        "category": "transformer",
        "question": "What role do layer normalization and residual connections play in a transformer block?",
        "key_points": [
            "Residual connections let gradients flow through deep stacks and preserve earlier representations",
            "Layer normalization stabilizes training by normalizing activations within each layer",
        ],
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


_GENERIC_STRENGTHS = [
    "You made it through the full set of AI/ML questions — good stamina for a real interview loop.",
    "Answering out loud (or in writing) under mild time pressure is itself good interview practice.",
]

_GENERIC_IMPROVEMENTS = [
    "Where possible, anchor answers in a specific project or number rather than textbook definitions alone — "
    "interviewers remember concrete details.",
    "Practice saying your answers out loud once more; a second pass usually tightens the explanation.",
]


def sample_feedback(history: list[dict]) -> dict:
    """Builds a static, rule-based feedback summary for an AI/ML sample interview — no LLM involved.

    Instead of pretending to grade the candidate's specific answers (which needs a real model),
    this surfaces the key points a strong answer would have covered for each question they were
    asked, so they can self-review against it.
    """
    by_question = {q["question"]: q for q in QUESTION_BANK}
    key_points = [
        {"question": qa["question"], "points": by_question[qa["question"]]["key_points"]}
        for qa in history
        if qa.get("question") in by_question
    ]
    return {
        "overall_feedback": (
            "This was a sample AI/ML interview using curated questions — there's no live AI grading your "
            "specific answers in this environment. Compare your answers against the key points below for "
            "each question to see what a strong response would cover."
        ),
        "strengths": _GENERIC_STRENGTHS,
        "improvements": _GENERIC_IMPROVEMENTS,
        "score": 0,
        "is_sample": True,
        "key_points": key_points,
    }
