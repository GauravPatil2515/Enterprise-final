from typing import Generator, List, Dict
from openai import OpenAI
from .config import settings
import logging

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are an expert Engineering Delivery Analyst and AI Co-Pilot. "
    "Your job is to analyze risk signals, explain WHY a project is at risk, "
    "reason about tradeoffs between interventions, and answer follow-up questions. "
    "Always cite evidence from the provided project data. Be direct, professional, "
    "and data-driven. When comparing actions, use contrastive reasoning: "
    "'If we do A → X outcome, but if we do B → Y outcome.'"
)


class FeatherlessClient:
    def __init__(self):
        self.client = OpenAI(
            base_url=settings.FEATHERLESS_BASE_URL,
            api_key=settings.FEATHERLESS_API_KEY
        )
        self.model = settings.MODEL_ID

    def generate_reasoning(self, context: str) -> str:
        """
        One-shot reasoning for risk analysis summaries.
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": context}
                ],
                temperature=0.3,
                max_tokens=400
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"LLM reasoning error: {e}")
            raise RuntimeError(f"LLM reasoning failed: {str(e)}") from e

    def chat(self, messages: List[Dict[str, str]], temperature: float = 0.4) -> str:
        """
        Multi-turn chat — accepts full message history for conversational context.
        """
        try:
            full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
            response = self.client.chat.completions.create(
                model=self.model,
                messages=full_messages,
                temperature=temperature,
                max_tokens=800,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"LLM chat error: {e}")
            raise RuntimeError(f"LLM chat failed: {str(e)}") from e

    def chat_stream(self, messages: List[Dict[str, str]], temperature: float = 0.4) -> Generator[str, None, None]:
        """
        Streaming multi-turn chat — yields tokens as they arrive.
        """
        full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
        stream = self.client.chat.completions.create(
            model=self.model,
            messages=full_messages,
            temperature=temperature,
            max_tokens=800,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                yield delta.content


llm_client = FeatherlessClient()
