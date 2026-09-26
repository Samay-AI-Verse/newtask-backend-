import random
from datetime import datetime
from typing import List, Optional, Dict, Any
from bson import ObjectId
from app.database import get_db
from app.models.ticket_model import TicketStatus, TicketPriority, TicketCategory
from app.schemas.ticket_schema import (
    TicketCreateRequest,
    TicketResponse,
    TicketListResponse,
    DashboardStats,
    TimelineEvent,
    AssignedAgent,
    SLAResponse
)
from app.services.prioritization_engine import PrioritizationEngine


class TicketService:

    @staticmethod
    def _doc_to_response(doc: Dict[str, Any]) -> TicketResponse:
        """Converts raw MongoDB doc to TicketResponse with live SLA recalculation."""
        doc_id = str(doc.get("_id", ""))
        due_at = doc["sla"]["due_at"]
        status = doc.get("status", "OPEN")
        
        is_breached, remaining_hours, status_label = PrioritizationEngine.evaluate_sla_status(due_at, status)
        
        sla_data = {
            "target_hours": doc["sla"]["target_hours"],
            "due_at": due_at,
            "is_breached": is_breached,
            "remaining_hours": remaining_hours,
            "status_label": status_label
        }

        return TicketResponse(
            id=doc_id,
            ticket_id=doc["ticket_id"],
            title=doc["title"],
            description=doc["description"],
            category=doc["category"],
            requester=doc["requester"],
            impact_scope=doc["impact_scope"],
            business_criticality=doc["business_criticality"],
            priority=doc["priority"],
            priority_score=doc["priority_score"],
            priority_breakdown=doc["priority_breakdown"],
            status=doc["status"],
            assigned_to=doc.get("assigned_to"),
            sla=SLAResponse(**sla_data),
            timeline=[TimelineEvent(**t) for t in doc.get("timeline", [])],
            created_at=doc["created_at"],
            updated_at=doc["updated_at"]
        )

    @classmethod
    async def create_ticket(cls, payload: TicketCreateRequest) -> TicketResponse:
        db = get_db()
        
        # 1. Run Intelligent Prioritization Engine
        priority, priority_score, breakdown, category, sla = await PrioritizationEngine.analyze_and_score(
            title=payload.title,
            description=payload.description,
            impact_scope=payload.impact_scope,
            business_criticality=payload.business_criticality,
            requester=payload.requester,
            manual_category=payload.category
        )

        # 2. Generate unique Ticket Number (e.g. TC-8924)
        count = await db.tickets.count_documents({})
        ticket_id = f"TC-{1000 + count + 1}"

        now = datetime.utcnow()
        doc = {
            "ticket_id": ticket_id,
            "title": payload.title,
            "description": payload.description,
            "category": category.value if hasattr(category, 'value') else category,
            "requester": payload.requester.model_dump(),
            "impact_scope": payload.impact_scope.value,
            "business_criticality": payload.business_criticality.value,
            "priority": priority.value,
            "priority_score": priority_score,
            "priority_breakdown": breakdown.model_dump(),
            "status": TicketStatus.OPEN.value,
            "assigned_to": None,
            "sla": {
                "target_hours": sla.target_hours,
                "due_at": sla.due_at,
                "is_breached": False
            },
            "timeline": [
                {
                    "timestamp": now,
                    "action": "Ticket Ingested & Auto-Prioritized",
                    "actor": "IntelliPrioritizer AI",
                    "note": f"Classified as {priority.value} (Score: {priority_score}/100, SLA: {sla.target_hours}h)"
                }
            ],
            "created_at": now,
            "updated_at": now
        }

        result = await db.tickets.insert_one(doc)
        doc["_id"] = result.inserted_id
        return cls._doc_to_response(doc)

    @classmethod
    async def get_tickets(
        cls,
        priority: Optional[str] = None,
        status: Optional[str] = None,
        category: Optional[str] = None,
        search: Optional[str] = None,
        sla_breached_only: bool = False,
        sort_by_priority: bool = True,
        page: int = 1,
        limit: int = 50
    ) -> TicketListResponse:
        db = get_db()
        query: Dict[str, Any] = {}

        if priority:
            query["priority"] = priority.upper()
        if status:
            query["status"] = status.upper()
        if category:
            query["category"] = category.upper()
        if search:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"ticket_id": {"$regex": search, "$options": "i"}},
                {"requester.name": {"$regex": search, "$options": "i"}}
            ]
        if sla_breached_only:
            query["sla.due_at"] = {"$lt": datetime.utcnow()}
            query["status"] = {"$nin": ["RESOLVED", "CLOSED"]}

        total = await db.tickets.count_documents(query)
        
        # Primary sort: Priority score descending (intelligent urgent first), then created_at
        sort_criteria = [("priority_score", -1), ("created_at", -1)] if sort_by_priority else [("created_at", -1)]

        cursor = db.tickets.find(query).sort(sort_criteria).skip((page - 1) * limit).limit(limit)
        docs = await cursor.to_list(length=limit)

        tickets = [cls._doc_to_response(doc) for doc in docs]
        return TicketListResponse(
            total=total,
            page=page,
            limit=limit,
            tickets=tickets
        )

    @classmethod
    async def get_ticket_by_id(cls, identifier: str) -> Optional[TicketResponse]:
        db = get_db()
        query = {}
        if ObjectId.is_valid(identifier):
            query = {"$or": [{"_id": ObjectId(identifier)}, {"ticket_id": identifier.upper()}]}
        else:
            query = {"ticket_id": identifier.upper()}

        doc = await db.tickets.find_one(query)
        if not doc:
            return None
        return cls._doc_to_response(doc)

    @classmethod
    async def update_status(cls, identifier: str, new_status: TicketStatus, actor: str, note: Optional[str] = None) -> Optional[TicketResponse]:
        db = get_db()
        ticket = await cls.get_ticket_by_id(identifier)
        if not ticket:
            return None

        now = datetime.utcnow()
        timeline_entry = {
            "timestamp": now,
            "action": f"Status changed to {new_status.value}",
            "actor": actor,
            "note": note or f"Status transitioned from {ticket.status.value} to {new_status.value}"
        }

        await db.tickets.update_one(
            {"ticket_id": ticket.ticket_id},
            {
                "$set": {"status": new_status.value, "updated_at": now},
                "$push": {"timeline": timeline_entry}
            }
        )
        return await cls.get_ticket_by_id(ticket.ticket_id)

    @classmethod
    async def assign_ticket(cls, identifier: str, agent: AssignedAgent, actor: str) -> Optional[TicketResponse]:
        db = get_db()
        ticket = await cls.get_ticket_by_id(identifier)
        if not ticket:
            return None

        now = datetime.utcnow()
        timeline_entry = {
            "timestamp": now,
            "action": f"Assigned to {agent.name} ({agent.team})",
            "actor": actor,
            "note": f"Ownership transferred to {agent.email}"
        }

        # Auto transition to IN_PROGRESS if OPEN
        new_status = TicketStatus.IN_PROGRESS.value if ticket.status == TicketStatus.OPEN else ticket.status.value

        await db.tickets.update_one(
            {"ticket_id": ticket.ticket_id},
            {
                "$set": {
                    "assigned_to": agent.model_dump(),
                    "status": new_status,
                    "updated_at": now
                },
                "$push": {"timeline": timeline_entry}
            }
        )
        return await cls.get_ticket_by_id(ticket.ticket_id)

    @classmethod
    async def add_note(cls, identifier: str, actor: str, note: str) -> Optional[TicketResponse]:
        db = get_db()
        ticket = await cls.get_ticket_by_id(identifier)
        if not ticket:
            return None

        now = datetime.utcnow()
        timeline_entry = {
            "timestamp": now,
            "action": "Internal Investigation Note Added",
            "actor": actor,
            "note": note
        }

        await db.tickets.update_one(
            {"ticket_id": ticket.ticket_id},
            {
                "$set": {"updated_at": now},
                "$push": {"timeline": timeline_entry}
            }
        )
        return await cls.get_ticket_by_id(ticket.ticket_id)

    @classmethod
    async def get_dashboard_analytics(cls) -> DashboardStats:
        db = get_db()
        now = datetime.utcnow()

        all_tickets = await db.tickets.find({}).to_list(length=2000)
        
        total = len(all_tickets)
        open_count = sum(1 for t in all_tickets if t.get("status") in ["OPEN", "IN_PROGRESS", "PENDING_INFO", "ESCALATED"])
        p1_count = sum(1 for t in all_tickets if t.get("priority") == "P1_CRITICAL" and t.get("status") not in ["RESOLVED", "CLOSED"])
        p2_count = sum(1 for t in all_tickets if t.get("priority") == "P2_HIGH" and t.get("status") not in ["RESOLVED", "CLOSED"])
        resolved_count = sum(1 for t in all_tickets if t.get("status") in ["RESOLVED", "CLOSED"])
        
        # SLA stats
        sla_breached = 0
        sla_at_risk = 0
        scores = []

        category_dist: Dict[str, int] = {}
        priority_dist: Dict[str, int] = {}
        status_dist: Dict[str, int] = {}

        for t in all_tickets:
            scores.append(t.get("priority_score", 0))
            
            cat = t.get("category", "OTHER")
            category_dist[cat] = category_dist.get(cat, 0) + 1

            prio = t.get("priority", "P4_LOW")
            priority_dist[prio] = priority_dist.get(prio, 0) + 1

            st = t.get("status", "OPEN")
            status_dist[st] = status_dist.get(st, 0) + 1

            if st not in ["RESOLVED", "CLOSED"]:
                due = t.get("sla", {}).get("due_at", now)
                rem_hours = (due - now).total_seconds() / 3600.0
                if rem_hours <= 0:
                    sla_breached += 1
                elif rem_hours <= 2.0:
                    sla_at_risk += 1

        avg_score = round(sum(scores) / total, 1) if total > 0 else 0.0

        return DashboardStats(
            total_tickets=total,
            open_tickets=open_count,
            p1_critical_count=p1_count,
            p2_high_count=p2_count,
            sla_breached_count=sla_breached,
            sla_at_risk_count=sla_at_risk,
            resolved_count=resolved_count,
            avg_priority_score=avg_score,
            category_distribution=category_dist,
            priority_distribution=priority_dist,
            status_distribution=status_dist
        )
