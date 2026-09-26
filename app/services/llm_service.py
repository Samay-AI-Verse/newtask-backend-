import json
import logging
from typing import Optional, Dict, Any
from app.config import settings

logger = logging.getLogger("uvicorn.error")

class GroqLLMService:
    _client = None

    @classmethod
    def get_client(cls):
        if cls._client is None and settings.GROQ_API_KEY:
            try:
                from groq import AsyncGroq
                cls._client = AsyncGroq(api_key=settings.GROQ_API_KEY)
            except Exception as e:
                logger.warning(f"Could not initialize Groq client: {e}")
        return cls._client

    @classmethod
    async def analyze_ticket_with_groq(
        cls,
        title: str,
        description: str,
        impact_scope: str,
        business_criticality: str,
        requester_name: str,
        requester_dept: str,
        is_vip: bool
    ) -> Optional[Dict[str, Any]]:
        """
        Uses Groq LLM (Llama-3.3-70B) to perform deep semantic triage, root-cause assessment,
        and generate engineer action plans.
        """
        client = cls.get_client()
        if not client or not settings.GROQ_API_KEY:
            return None

        prompt = f"""You are an elite enterprise IT and Service Operations Triage AI.
Analyze the following incoming service request:

Title: {title}
Description: {description}
Impact Scope: {impact_scope}
Business Criticality: {business_criticality}
Requester: {requester_name} (Dept: {requester_dept}, VIP: {is_vip})

Return ONLY a valid JSON object with the following schema:
{{
  "urgency_score": <integer 0 to 30>,
  "impact_score": <integer 0 to 30>,
  "criticality_score": <integer 0 to 30>,
  "detected_keywords": [<list of key urgency words found>],
  "reasoning": "<concise 2-sentence explanation of priority assessment>",
  "root_cause_hypothesis": "<1-sentence hypothesis of underlying cause>",
  "recommended_action": "<1-2 actionable remediation steps for assigned technician>",
  "suggested_category": "<one of: IT_INFRASTRUCTURE, SOFTWARE_APPLICATIONS, SECURITY_ACCESS, HR_PAYROLL, FINANCE_BILLING, FACILITIES_OFFICE, CUSTOMER_SUPPORT, OTHER>"
}}
Do NOT output markdown blocks, backticks, or preamble. Return raw JSON only."""

        try:
            response = await client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": "You are a specialized JSON-only IT Triage AI engine."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=400
            )

            raw_content = response.choices[0].message.content.strip()
            # Clean possible markdown wrapping
            if raw_content.startswith("```json"):
                raw_content = raw_content[7:]
            if raw_content.startswith("```"):
                raw_content = raw_content[3:]
            if raw_content.endswith("```"):
                raw_content = raw_content[:-3]
            raw_content = raw_content.strip()

            parsed = json.loads(raw_content)
            logger.info(f"Groq LLM successfully triaged ticket: '{title}'")
            return parsed
        except Exception as e:
            logger.warning(f"Groq LLM triage fallback to heuristics due to: {e}")
            return None
