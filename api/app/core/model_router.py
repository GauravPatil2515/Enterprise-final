"""
ModelRouter — Multi-model LLM routing via Featherless API.

Architecture:
  intent       → small fast model  (Phi-3 / Llama-3.2-3B)
  reasoning    → large deep model  (Qwen2.5-32B / DeepSeek-V3)
  explanation  → prose-optimized   (Llama-3.3-70B / Gemma-3-27B)
  postmortem   → chain-of-thought  (DeepSeek-R1)
  summary      → balanced fast     (Gemma-2-9B)

All models go through Featherless API with same base URL / key.
"""

from enum import Enum
from typing import List, Dict, Generator, Optional
from openai import OpenAI
from .config import settings
import logging
import time

logger = logging.getLogger(__name__)


class TaskType(Enum):
    INTENT = "intent"
    REASONING = "reasoning"
    EXPLANATION = "explanation"
    POSTMORTEM = "postmortem"
    SUMMARY = "summary"


class _ModelConfig:
    __slots__ = ("model_id", "max_tokens", "temperature", "system_prompt")

    def __init__(self, model_id: str, max_tokens: int, temperature: float, system_prompt: str):
        self.model_id = model_id
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.system_prompt = system_prompt


# ── System prompts per task type ──────────────────────────────────────────

_SYSTEM_PROMPTS = {
    TaskType.INTENT: (
        "You are an intent classifier. Classify the user query into exactly one category. "
        "Respond with a single word only:\n"
        "  risk_analysis | team_query | simulation | financial | general\n"
        "No explanation. One word."
    ),
    TaskType.REASONING: (
        "You are an expert Engineering Delivery Analyst. "
        "Your job is to analyze risk signals, explain WHY a project is at risk, "
        "and reason about tradeoffs between interventions. "
        "Always cite evidence using the format [Ticket-ID]. Be direct and data-driven. "
        "Use contrastive reasoning: 'If we do A → X, but if B → Y.'"
    ),
    TaskType.EXPLANATION: (
        "You are a senior engineering communicator. "
        "Transform technical analysis into clear, actionable explanations for decision-makers. "
        "Use bullet points, bold key metrics, and structure your response with headers. "
        "Be concise but thorough. Cite specific data points using [Ticket-ID] format."
    ),
    TaskType.POSTMORTEM: (
        "You are a principal engineer conducting a formal postmortem. "
        "Use systematic root-cause analysis (5 Whys). Be thorough and structured: "
        "Executive Summary → What Went Wrong → Root Cause → Impact → Actions → Lessons. "
        "Think step by step before concluding."
    ),
    TaskType.SUMMARY: (
        "You are a concise intelligence briefer. "
        "Provide 2-3 sentence summaries of complex data. "
        "Lead with the most important finding. Use numbers."
    ),
}


# ── Model registry ────────────────────────────────────────────────────────

MODEL_REGISTRY: Dict[TaskType, _ModelConfig] = {
    TaskType.INTENT: _ModelConfig(
        model_id="Qwen/Qwen2.5-32B-Instruct",  # Smart & fast for classification
        max_tokens=50,
        temperature=0.0,
        system_prompt=_SYSTEM_PROMPTS[TaskType.INTENT],
    ),
    TaskType.REASONING: _ModelConfig(
        model_id="deepseek-ai/DeepSeek-V3",  # SOTA reasoning model
        max_tokens=1000,
        temperature=0.3,
        system_prompt=_SYSTEM_PROMPTS[TaskType.REASONING],
    ),
    TaskType.EXPLANATION: _ModelConfig(
        model_id="deepseek-ai/DeepSeek-V3",  # Switch to DeepSeek-V3 (Ungated SOTA)
        max_tokens=1200,
        temperature=0.4,
        system_prompt=_SYSTEM_PROMPTS[TaskType.EXPLANATION],
    ),
    TaskType.POSTMORTEM: _ModelConfig(
        model_id="Qwen/Qwen2.5-32B-Instruct",  # DeepSeek API failing (500), using Qwen as reliable fallback
        max_tokens=2000,
        temperature=0.3,
        system_prompt=_SYSTEM_PROMPTS[TaskType.POSTMORTEM],
    ),
    TaskType.SUMMARY: _ModelConfig(
        model_id="Qwen/Qwen2.5-32B-Instruct",  # Switch to Qwen (Ungated Workhorse)
        max_tokens=400,
        temperature=0.3,
        system_prompt=_SYSTEM_PROMPTS[TaskType.SUMMARY],
    ),
}


# ── Intent → task-type mapping ────────────────────────────────────────────

INTENT_TO_TASK: Dict[str, TaskType] = {
    "risk_analysis": TaskType.REASONING,
    "team_query": TaskType.SUMMARY,
    "simulation": TaskType.REASONING,
    "financial": TaskType.EXPLANATION,
    "general": TaskType.EXPLANATION,
}


class ModelRouter:
    """
    Intelligent LLM router — selects optimal model and prompt per task.
    Uses LAZY client initialization for Vercel serverless compatibility.
    """

    def __init__(self):
        self._client = None

    @property
    def client(self):
        """Lazy OpenAI client — only created on first LLM call."""
        if self._client is None:
            self._client = OpenAI(
                base_url=settings.FEATHERLESS_BASE_URL,
                api_key=settings.FEATHERLESS_API_KEY,
            )
        return self._client

    # ── Core dispatch ─────────────────────────────────────────────────────

    def generate(
        self,
        task: TaskType,
        messages: List[Dict[str, str]],
    ) -> str:
        """Synchronous generation with task-specific model + prompt."""
        cfg = MODEL_REGISTRY[task]
        full = [{"role": "system", "content": cfg.system_prompt}] + messages
        try:
            t0 = time.time()
            resp = self.client.chat.completions.create(
                model=cfg.model_id,
                messages=full,
                temperature=cfg.temperature,
                max_tokens=cfg.max_tokens,
            )
            elapsed = time.time() - t0
            logger.info(f"ModelRouter [{task.value}] model={cfg.model_id} tokens={resp.usage.total_tokens if resp.usage else '?'} time={elapsed:.1f}s")
            return resp.choices[0].message.content
        except Exception as e:
            logger.error(f"ModelRouter [{task.value}] error: {e}")
            # PHASE 1 FIX: Removed fake postmortem fallback.
            # We must fail honestly if the LLM is down.
            raise RuntimeError(f"LLM [{task.value}] unavailable: {str(e)}") from e

    def stream(
        self,
        task: TaskType,
        messages: List[Dict[str, str]],
    ) -> Generator[str, None, None]:
        """Streaming generation — yields tokens as they arrive."""
        cfg = MODEL_REGISTRY[task]
        full = [{"role": "system", "content": cfg.system_prompt}] + messages
        try:
            stream = self.client.chat.completions.create(
                model=cfg.model_id,
                messages=full,
                temperature=cfg.temperature,
                max_tokens=cfg.max_tokens,
                stream=True,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta and delta.content:
                    yield delta.content
        except Exception as e:
            logger.error(f"ModelRouter stream [{task.value}] error: {e}")
            yield f"[ERROR] {e}"

    # ── Intent classification ─────────────────────────────────────────────

    def classify_intent(self, query: str) -> str:
        """Use fast model to classify user intent into a category."""
        try:
            raw = self.generate(
                TaskType.INTENT,
                [{"role": "user", "content": f"Query: {query}"}],
            )
            intent = raw.strip().lower().replace('"', "").replace("'", "")
            # Normalise to known categories
            if intent not in INTENT_TO_TASK:
                intent = "general"
            return intent
        except Exception:
            return "general"

    def task_for_intent(self, intent: str) -> TaskType:
        return INTENT_TO_TASK.get(intent, TaskType.EXPLANATION)

    # ── Convenience helpers ───────────────────────────────────────────────

    def chat(self, messages: List[Dict[str, str]], temperature: float = 0.4) -> str:
        """Drop-in replacement for the old llm_client.chat()"""
        return self.generate(TaskType.EXPLANATION, messages)

    def chat_stream(self, messages: List[Dict[str, str]], temperature: float = 0.4) -> Generator[str, None, None]:
        """Drop-in replacement for the old llm_client.chat_stream()"""
        return self.stream(TaskType.EXPLANATION, messages)


# Singleton
model_router = ModelRouter()
