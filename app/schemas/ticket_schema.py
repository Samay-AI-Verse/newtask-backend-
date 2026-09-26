from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.ticket_model import (
    TicketPriority,
    TicketStatus,
    TicketCategory,
    ImpactScope,
    BusinessCriticality
)


class RequesterInfo(BaseModel):
    name: str = Field(..., example="Alice Johnson")
    email: EmailStr = Field(..., example="alice.johnson@company.com")
    department: str = Field(..., example="Finance")
    role: Optional[str] = Field("Employee", example="Senior Accountant")
    is_vip: bool = Field(False, description="VIP employees (C-level/directors) receive priority weight boost")


class AssignedAgent(BaseModel):
    name: str = Field(..., example="David Miller")
    email: EmailStr = Field(..., example="david.m@support.internal")
    team: str = Field(..., example="IT Operations")


class SLAResponse(BaseModel):
    target_hours: int
    due_at: datetime
    is_breached: bool = False
    remaining_hours: float
    status_label: str = Field(..., example="On Track")


class PriorityBreakdown(BaseModel):
    urgency_score: int = Field(..., description="Calculated from urgency keywords & phrasing (0-30)")
    impact_score: int = Field(..., description="Calculated from impact scope (0-30)")
    criticality_score: int = Field(..., description="Calculated from business criticality (0-30)")
    vip_bonus: int = Field(..., description="Bonus points for VIP requesters (0-10)")
    total_score: int = Field(..., description="Composite Score out of 100")
    detected_urgency_keywords: List[str] = []
    reasoning: str = Field(..., example="High urgency detected: Outage affecting payroll on pay-day")


class TimelineEvent(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    action: str = Field(..., example="Ticket Created")
    actor: str = Field(..., example="System / Requester")
    note: Optional[str] = None


class TicketCreateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=150, example="Production Database down - Orders failing")
    description: str = Field(..., min_length=10, example="Our live payment gateway is returning 500 errors and customers cannot checkout. Immediate fix needed!")
    category: Optional[TicketCategory] = Field(None, description="Optional manual category; auto-classified if omitted")
    requester: RequesterInfo
    impact_scope: ImpactScope = Field(ImpactScope.INDIVIDUAL, example=ImpactScope.ORGANIZATION)
    business_criticality: BusinessCriticality = Field(BusinessCriticality.MEDIUM, example=BusinessCriticality.SEVERE)


class TicketUpdateRequest(BaseModel):
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    assigned_to: Optional[AssignedAgent] = None
    category: Optional[TicketCategory] = None


class AddNoteRequest(BaseModel):
    actor: str = Field(..., example="Support Admin")
    note: str = Field(..., min_length=2, example="Investigated server logs; restarted payment connector node.")


class StatusChangeRequest(BaseModel):
    status: TicketStatus
    actor: str = Field("System Admin", example="Support Admin")
    note: Optional[str] = Field(None, example="Resolved via patch deploy #441")


class AssignTicketRequest(BaseModel):
    assigned_to: AssignedAgent
    actor: str = Field("System Admin", example="Team Lead")


class TicketResponse(BaseModel):
    id: str
    ticket_id: str
    title: str
    description: str
    category: TicketCategory
    requester: RequesterInfo
    impact_scope: ImpactScope
    business_criticality: BusinessCriticality
    priority: TicketPriority
    priority_score: int
    priority_breakdown: PriorityBreakdown
    status: TicketStatus
    assigned_to: Optional[AssignedAgent] = None
    sla: SLAResponse
    timeline: List[TimelineEvent] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }


class TicketListResponse(BaseModel):
    total: int
    page: int
    limit: int
    tickets: List[TicketResponse]


class DashboardStats(BaseModel):
    total_tickets: int
    open_tickets: int
    p1_critical_count: int
    p2_high_count: int
    sla_breached_count: int
    sla_at_risk_count: int
    resolved_count: int
    avg_priority_score: float
    category_distribution: Dict[str, int]
    priority_distribution: Dict[str, int]
    status_distribution: Dict[str, int]
