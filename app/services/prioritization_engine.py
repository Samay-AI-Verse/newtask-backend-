import re
from datetime import datetime, timedelta
from typing import Tuple, List, Dict
from app.models.ticket_model import (
    TicketPriority,
    TicketCategory,
    ImpactScope,
    BusinessCriticality
)
from app.schemas.ticket_schema import (
    PriorityBreakdown,
    SLAResponse,
    RequesterInfo
)
from app.config import settings

# Keyword dictionaries for urgency and domain classification
CRITICAL_KEYWORDS = [
    "down", "outage", "offline", "crashed", "emergency", "blocked", "cannot work",
    "production", "data loss", "breach", "security leak", "hacked", "payroll locked",
    "fire", "leak", "system halt", "unresponsive", "zero day", "payment failing"
]

HIGH_KEYWORDS = [
    "asap", "urgent", "deadline today", "severe delay", "corrupted", "error 500",
    "unable to login", "broken", "critical bug", "customer blocked", "failed build"
]

MEDIUM_KEYWORDS = [
    "slow", "glitch", "warning", "intermittent", "delayed", "reinstall",
    "access requested", "update needed", "inconvenience", "question"
]

CATEGORY_RULES = {
    TicketCategory.SECURITY_ACCESS: ["vpn", "password", "mfa", "2fa", "access", "permission", "login", "credentials", "firewall", "breach", "phishing", "locked out"],
    TicketCategory.IT_INFRASTRUCTURE: ["server", "database", "wifi", "network", "internet", "router", "vpn", "cloud", "aws", "docker", "cluster", "disk full", "cpu"],
    TicketCategory.SOFTWARE_APPLICATIONS: ["bug", "app", "ui", "crash", "github", "frontend", "backend", "api", "slack", "teams", "jira", "zoom"],
    TicketCategory.HR_PAYROLL: ["salary", "payroll", "payslip", "bonus", "tax", "leave", "holiday", "onboarding", "resignation", "insurance", "benefits"],
    TicketCategory.FINANCE_BILLING: ["invoice", "payment", "reimbursement", "vendor", "credit card", "billing", "receipt", "expense", "bank"],
    TicketCategory.FACILITIES_OFFICE: ["chair", "desk", "ac", "air condition", "light", "heating", "water", "coffee", "cleaning", "cafeteria", "door card", "keycard"]
}


class PrioritizationEngine:
    """
    Intelligent Priority & SLA Decision Engine
    Calculates weighted dynamic scores (0 - 100) based on multiple enterprise dimensions.
    """

    @classmethod
    async def analyze_and_score(
        cls,
        title: str,
        description: str,
        impact_scope: ImpactScope,
        business_criticality: BusinessCriticality,
        requester: RequesterInfo,
        manual_category: TicketCategory = None
    ) -> Tuple[TicketPriority, int, PriorityBreakdown, TicketCategory, SLAResponse]:
        
        full_text = f"{title.lower()} {description.lower()}"
        
        # Check Groq LLM first
        from app.services.llm_service import GroqLLMService
        groq_result = await GroqLLMService.analyze_ticket_with_groq(
            title=title,
            description=description,
            impact_scope=impact_scope.value,
            business_criticality=business_criticality.value,
            requester_name=requester.name,
            requester_dept=requester.department,
            is_vip=requester.is_vip
        )

        ai_model = f"Groq {settings.GROQ_MODEL}" if groq_result else "Deterministic NLP Heuristic Engine"
        root_cause = groq_result.get("root_cause_hypothesis") if groq_result else None
        recommended_action = groq_result.get("recommended_action") if groq_result else None

        if groq_result:
            urgency_score = int(groq_result.get("urgency_score", 15))
            impact_score = int(groq_result.get("impact_score", 15))
            criticality_score = int(groq_result.get("criticality_score", 15))
            detected_keywords = groq_result.get("detected_keywords", [])
            custom_reasoning = groq_result.get("reasoning")
            suggested_cat_str = groq_result.get("suggested_category")
        else:
            urgency_score = 5
            detected_keywords = []
            custom_reasoning = None
            suggested_cat_str = None

        if not groq_result:
            for kw in CRITICAL_KEYWORDS:
                if re.search(r'\b' + re.escape(kw) + r'\b', full_text):
                    urgency_score = max(urgency_score, 30)
                    detected_keywords.append(kw)

            if urgency_score < 30:
                for kw in HIGH_KEYWORDS:
                    if re.search(r'\b' + re.escape(kw) + r'\b', full_text):
                        urgency_score = max(urgency_score, 22)
                        detected_keywords.append(kw)

            if urgency_score < 22:
                for kw in MEDIUM_KEYWORDS:
                    if re.search(r'\b' + re.escape(kw) + r'\b', full_text):
                        urgency_score = max(urgency_score, 14)
                        detected_keywords.append(kw)

            # Impact Scope Score (0 - 30)
            impact_score_map = {
                ImpactScope.ORGANIZATION: 30,
                ImpactScope.TEAM_DEPARTMENT: 20,
                ImpactScope.INDIVIDUAL: 10
            }
            impact_score = impact_score_map.get(impact_scope, 10)

            # Business Criticality Score (0 - 30)
            criticality_score_map = {
                BusinessCriticality.SEVERE: 30,
                BusinessCriticality.HIGH: 22,
                BusinessCriticality.MEDIUM: 14,
                BusinessCriticality.LOW: 5
            }
            criticality_score = criticality_score_map.get(business_criticality, 14)

        # 4. VIP Bonus (0 - 10)
        vip_bonus = 10 if requester.is_vip else 0

        # 5. Composite Total Score (0 - 100)
        total_score = min(100, urgency_score + impact_score + criticality_score + vip_bonus)

        # 6. Priority Classification & SLA mapping
        if total_score >= 75:
            priority = TicketPriority.P1_CRITICAL
            target_hours = settings.SLA_P1_HOURS
            reasoning = "Critical priority: Immediate intervention needed due to high operational/business blast radius."
        elif total_score >= 55:
            priority = TicketPriority.P2_HIGH
            target_hours = settings.SLA_P2_HOURS
            reasoning = "High priority: Significant blocker or team-level disruption detected."
        elif total_score >= 35:
            priority = TicketPriority.P3_MEDIUM
            target_hours = settings.SLA_P3_HOURS
            reasoning = "Medium priority: Standard business request with manageable workaround."
        else:
            priority = TicketPriority.P4_LOW
            target_hours = settings.SLA_P4_HOURS
            reasoning = "Low priority: Routine service inquiry or minor enhancement."

        # 7. Category Auto-Classification (if not explicitly specified)
        category = manual_category or cls.detect_category(full_text)

        # 8. Compute SLA
        now = datetime.utcnow()
        due_at = now + timedelta(hours=target_hours)
        sla = SLAResponse(
            target_hours=target_hours,
            due_at=due_at,
            is_breached=False,
            remaining_hours=float(target_hours),
            status_label="On Track"
        )

        breakdown = PriorityBreakdown(
            urgency_score=urgency_score,
            impact_score=impact_score,
            criticality_score=criticality_score,
            vip_bonus=vip_bonus,
            total_score=total_score,
            detected_urgency_keywords=list(set(detected_keywords)),
            reasoning=custom_reasoning or reasoning,
            root_cause_hypothesis=root_cause,
            recommended_action=recommended_action,
            ai_model_used=ai_model
        )

        return priority, total_score, breakdown, category, sla

    @classmethod
    def detect_category(cls, text: str) -> TicketCategory:
        """Heuristic classifier to categorize incoming unstructured service requests."""
        category_scores: Dict[TicketCategory, int] = {cat: 0 for cat in CATEGORY_RULES}
        
        for category, keywords in CATEGORY_RULES.items():
            for kw in keywords:
                if re.search(r'\b' + re.escape(kw) + r'\b', text):
                    category_scores[category] += 1
        
        best_category, highest_count = max(category_scores.items(), key=lambda item: item[1])
        if highest_count > 0:
            return best_category
        return TicketCategory.SOFTWARE_APPLICATIONS

    @classmethod
    def evaluate_sla_status(cls, due_at: datetime, status: str) -> Tuple[bool, float, str]:
        """Calculates current SLA breach status and time remaining."""
        if status in ["RESOLVED", "CLOSED"]:
            return False, 0.0, "Completed"
        
        now = datetime.utcnow()
        remaining_seconds = (due_at - now).total_seconds()
        remaining_hours = round(remaining_seconds / 3600.0, 1)

        if remaining_seconds <= 0:
            return True, remaining_hours, "BREACHED"
        elif remaining_hours <= 1.0:
            return False, remaining_hours, "CRITICAL RISK (<1h)"
        elif remaining_hours <= 3.0:
            return False, remaining_hours, "AT RISK"
        return False, remaining_hours, "ON TRACK"
