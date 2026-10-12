"""AI Provider Manager with priority routing, failover, circuit breaking, and local fallback."""

import time
import logging
from typing import List, Dict, Any, Optional

from app.core.config import settings
from app.ai.provider_base import BaseAIProvider, ProviderResponse
from app.ai.grok_provider import GrokProvider
from app.ai.mistral_provider import MistralProvider
from app.ai.gemini_provider import GeminiProvider
from app.ai.prompts import HEALTH_EXPLAINER_SYSTEM_PROMPT, MEDICAL_QA_SYSTEM_PROMPT
from app.ai.formatting import remove_heading_hashes
from app.medical.local_explainer import TEST_DESCRIPTIONS, generate_deterministic_summary

logger = logging.getLogger(__name__)


class AIProviderManager:
    """
    Manages multi-provider LLM integrations (Grok, Mistral, Gemini).
    Executes automatic failover upon HTTP errors, rate limits (429), or timeouts.
    Falls back gracefully to local deterministic algorithms when needed.
    """

    def __init__(self):
        self.providers: Dict[str, BaseAIProvider] = {
            "grok": GrokProvider(
                api_key=settings.XAI_API_KEY,
                model_name=settings.XAI_MODEL,
                base_url=settings.XAI_BASE_URL
            ),
            "mistral": MistralProvider(
                api_key=settings.MISTRAL_API_KEY,
                model_name=settings.MISTRAL_MODEL,
                base_url=settings.MISTRAL_BASE_URL
            ),
            "gemini": GeminiProvider(
                api_key=settings.GEMINI_API_KEY,
                model_name=settings.GEMINI_MODEL,
                base_url=settings.GEMINI_BASE_URL
            ),
        }

    def get_configured_providers_ordered(self, custom_order: Optional[List[str]] = None) -> List[BaseAIProvider]:
        order = custom_order or settings.provider_order
        ordered_list = []
        for name in order:
            p = self.providers.get(name.lower())
            if p and p.is_configured():
                # Check circuit breaker
                if p.is_circuit_open:
                    if p.circuit_opened_at and (time.time() - p.circuit_opened_at > settings.AI_CIRCUIT_BREAKER_COOLDOWN_SECONDS):
                        # Half-open: test circuit reset
                        p.is_circuit_open = False
                        p.consecutive_failures = 0
                        ordered_list.append(p)
                else:
                    ordered_list.append(p)
        return ordered_list

    def get_provider_status(self) -> List[Dict[str, Any]]:
        status_list = []
        for name, p in self.providers.items():
            status_list.append({
                "name": name,
                "configured": p.is_configured(),
                "healthy": not p.is_circuit_open and p.consecutive_failures == 0,
                "consecutive_failures": p.consecutive_failures,
                "is_circuit_open": p.is_circuit_open,
                "model": p.model_name
            })
        return status_list

    def record_failure(self, provider: BaseAIProvider):
        provider.consecutive_failures += 1
        if provider.consecutive_failures >= settings.AI_CIRCUIT_BREAKER_FAILURES:
            provider.is_circuit_open = True
            provider.circuit_opened_at = time.time()
            logger.warning(f"Circuit breaker tripped for provider: {provider.name}")

    def record_success(self, provider: BaseAIProvider):
        provider.consecutive_failures = 0
        provider.is_circuit_open = False
        provider.circuit_opened_at = None

    async def execute_with_failover(
        self,
        system_prompt: str,
        user_prompt: str,
        user_consent: bool = True,
        local_only: bool = False,
        timeout_seconds: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Executes prompt through active providers in priority order.
        If local_only is True or user_consent is False or all providers fail, returns fallback indicator.
        """
        start_time = time.time()
        timeout = timeout_seconds or settings.AI_REQUEST_TIMEOUT_SECONDS

        if local_only or not user_consent:
            return {
                "success": False,
                "content": None,
                "provider_used": "local_fallback",
                "model_used": None,
                "failover_occurred": False,
                "providers_attempted": [],
                "duration_ms": int((time.time() - start_time) * 1000),
                "reason": "local_only_or_no_consent"
            }

        candidate_providers = self.get_configured_providers_ordered()
        attempted = []
        failover_occurred = False

        for idx, provider in enumerate(candidate_providers):
            attempted.append(provider.name)
            if idx > 0:
                failover_occurred = True

            try:
                logger.info(f"Attempting AI generation with provider: {provider.name} (model: {provider.model_name})")
                resp: ProviderResponse = await provider.generate_text(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    timeout_seconds=timeout
                )
                self.record_success(provider)
                return {
                    "success": True,
                    "content": resp.content,
                    "provider_used": provider.name,
                    "model_used": provider.model_name,
                    "failover_occurred": failover_occurred,
                    "providers_attempted": attempted,
                    "duration_ms": int((time.time() - start_time) * 1000),
                    "reason": None
                }
            except Exception as e:
                logger.warning(f"Provider {provider.name} failed: {type(e).__name__} - {str(e)[:100]}")
                self.record_failure(provider)
                continue

        # All providers exhausted or none configured
        return {
            "success": False,
            "content": None,
            "provider_used": "local_fallback",
            "model_used": None,
            "failover_occurred": len(attempted) > 0,
            "providers_attempted": attempted,
            "duration_ms": int((time.time() - start_time) * 1000),
            "reason": "all_providers_failed_or_unconfigured"
        }

    async def explain_medical_document(
        self,
        extracted_data: Dict[str, Any],
        user_consent: bool = True,
        local_only: bool = False,
        preferred_language: str = "en"
    ) -> Dict[str, Any]:
        """
        Explains medical report using AI if available and consented,
        or deterministic rule-based explainer if not.
        """
        # Always generate rule-based base
        fallback = generate_deterministic_summary(extracted_data, language=preferred_language)

        if local_only or not user_consent:
            return fallback

        user_content = (
            f"Please analyze and explain this extracted medical report for a patient.\n"
            f"Document Type: {extracted_data.get('category')}\n"
            f"Date: {extracted_data.get('document_date')}\n"
            f"Healthcare Provider: {extracted_data.get('healthcare_provider')}\n"
            f"Laboratory Tests: {extracted_data.get('lab_tests')}\n"
            f"Medications: {extracted_data.get('medications')}\n"
            f"Diagnoses/Impressions: {extracted_data.get('diagnoses')}\n"
            f"Preferred Language: {preferred_language}\n"
        )

        res = await self.execute_with_failover(
            system_prompt=HEALTH_EXPLAINER_SYSTEM_PROMPT,
            user_prompt=user_content,
            user_consent=user_consent,
            local_only=local_only
        )

        if res["success"] and res["content"]:
            return {
                "summary": fallback["summary"],
                "explanation": remove_heading_hashes(res["content"]),
                "doctor_questions": fallback["doctor_questions"],
                "flagged_items": fallback["flagged_items"],
                "is_rule_based": False,
                "provider_used": res["provider_used"],
                "model_used": res["model_used"],
                "failover_occurred": res["failover_occurred"]
            }

        return fallback

    async def answer_health_question(
        self,
        question: str,
        user_records_context: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        user_consent: bool = True,
        local_only: bool = False,
        preferred_language: str = "en"
    ) -> Dict[str, Any]:
        """
        Answers user question grounded exclusively in their saved records.
        """
        history_text = "\n".join(
            f"{item['role'].title()}: {item['content']}"
            for item in (conversation_history or [])
            if item.get("role") in {"user", "assistant"} and item.get("content")
        )
        user_prompt = (
            f"Patient Records Context:\n{user_records_context}\n\n"
            f"Recent conversation:\n{history_text or 'No earlier messages.'}\n\n"
            f"Patient Question: {question}\n"
            f"Response Language: {preferred_language}"
        )

        res = await self.execute_with_failover(
            system_prompt=MEDICAL_QA_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            user_consent=user_consent,
            local_only=local_only
        )

        if res["success"] and res["content"]:
            return {
                "answer": remove_heading_hashes(res["content"]),
                "provider_used": res["provider_used"],
                "model_used": res["model_used"],
                "failover_occurred": res["failover_occurred"],
                "is_rule_based": False,
                "disclaimer": "AI response grounded in your uploaded records. Consult a doctor for medical guidance."
            }

        # Deterministic fallback response
        lower_q = question.lower()
        if any(w in lower_q for w in ["glucose", "sugar"]):
            match = next((line for line in user_records_context.splitlines() if "glucose" in line.lower() or "sugar" in line.lower()), None)
            reply = (
                f"Your recorded blood glucose result: {match}\n\n"
                "Glucose is the sugar your body uses for energy. Whether a result is expected depends on "
                "the reference range printed by that laboratory and whether the sample was fasting."
                if match else
                "I could not find a blood glucose result in your saved records. Glucose is the sugar your "
                "body uses for energy; upload a report if you would like me to explain a specific result."
            )
        elif any(w in lower_q for w in ["hemoglobin", "hb", "hgb"]):
            match = next((line for line in user_records_context.splitlines() if "hemoglobin" in line.lower()), None)
            reply = (
                f"Your recorded hemoglobin result: {match}\n\n"
                "Hemoglobin is the protein in red blood cells that carries oxygen. Compare the result with "
                "the range printed on your report; ranges vary by laboratory and personal context."
                if match else
                "I could not find a hemoglobin result in your saved records. Hemoglobin is the protein in "
                "red blood cells that carries oxygen; upload a report if you would like help with a specific result."
            )
        elif any(w in lower_q for w in ["medicine", "medication", "prescription", "drug"]):
            med_lines = [l for l in user_records_context.splitlines() if "prescriptions" in l.lower() or "- " in l and ("mg" in l or "tab" in l.lower())]
            reply = (
                "Your recorded active medications:\n" + "\n".join(med_lines)
                if med_lines else "I could not find any active medications in your saved records."
            )
        elif any(w in lower_q for w in ["summar", "report", "lab result", "test result", "analysis"]):
            reply = (
                f"Here is what I found in your saved health records:\n{user_records_context[:3500]}\n\n"
                "This summary is educational. Review report flags with your clinician."
                if "No records currently uploaded" not in user_records_context else
                "I could not find an uploaded medical report yet. Upload a PDF or image report and I can "
                "summarize the extracted findings."
            )
        elif any(test_name.lower() in lower_q for test_name in ["thyroid stimulating hormone (tsh)", "fasting blood glucose", "post prandial blood glucose", "total cholesterol", "serum creatinine", "blood urea nitrogen", "wbc count", "platelet count", "hba1c", "hemoglobin"]):
            test_name = next(
                name for name in ["Thyroid Stimulating Hormone (TSH)", "Fasting Blood Glucose", "Post Prandial Blood Glucose", "Total Cholesterol", "Serum Creatinine", "Blood Urea Nitrogen", "WBC Count", "Platelet Count", "HbA1c", "Hemoglobin"]
                if name.lower() in lower_q
            )
            explanation = TEST_DESCRIPTIONS.get(test_name)
            reply = explanation or f"{test_name} is a medical measurement. Ask me about a result on an uploaded report to discuss it in context."
        else:
            reply = (
                f"Thank you for your question: '{question}'.\n\n"
                "I can give a more complete general-health answer when an AI provider is available. "
                "If you are asking about your records, try naming the test or uploading its report."
            )

        return {
            "answer": reply,
            "provider_used": "local_fallback",
            "model_used": None,
            "failover_occurred": res.get("failover_occurred", False),
            "is_rule_based": True,
            "disclaimer": "Local clinical engine response. Consult your doctor for medical decisions."
        }


ai_manager = AIProviderManager()
