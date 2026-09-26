from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional
from app.schemas.ticket_schema import (
    TicketCreateRequest,
    TicketResponse,
    TicketListResponse,
    StatusChangeRequest,
    AssignTicketRequest,
    AddNoteRequest
)
from app.services.ticket_service import TicketService

router = APIRouter(prefix="/tickets", tags=["Tickets & Prioritization"])


@router.post(
    "",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest & Intelligently Prioritize Service Request"
)
async def create_ticket(payload: TicketCreateRequest):
    """
    Submits a service request from an employee or customer.
    The system automatically executes the **Intelligent Prioritization Engine** to:
    - Parse urgency keywords & sentiment
    - Evaluate blast radius (impact scope & business criticality)
    - Apply VIP requester weighting
    - Auto-assign Priority (P1/P2/P3/P4) and compute SLA deadline
    """
    try:
        return await TicketService.create_ticket(payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error ingesting ticket: {str(e)}"
        )


@router.get(
    "",
    response_model=TicketListResponse,
    summary="List tickets with Intelligent Priority Ordering & Filters"
)
async def list_tickets(
    priority: Optional[str] = Query(None, description="Filter by priority: P1_CRITICAL, P2_HIGH, P3_MEDIUM, P4_LOW"),
    status: Optional[str] = Query(None, description="Filter by status: OPEN, IN_PROGRESS, PENDING_INFO, RESOLVED, CLOSED, ESCALATED"),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Text search in title, description, ticket ID, or requester"),
    sla_breached_only: bool = Query(False, description="Show only tickets currently breaching SLA"),
    sort_by_priority: bool = Query(True, description="Sort strictly by Priority Score descending (Urgent First)"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100)
):
    """Returns dynamic prioritized list of tickets for administrators."""
    return await TicketService.get_tickets(
        priority=priority,
        status=status,
        category=category,
        search=search,
        sla_breached_only=sla_breached_only,
        sort_by_priority=sort_by_priority,
        page=page,
        limit=limit
    )


@router.get(
    "/{identifier}",
    response_model=TicketResponse,
    summary="Get Ticket Details with Priority Score Breakdown & Audit Trail"
)
async def get_ticket(identifier: str):
    """Fetches full ticket record including urgency breakdown, timeline events, and SLA clock."""
    ticket = await TicketService.get_ticket_by_id(identifier)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Ticket '{identifier}' not found.")
    return ticket


@router.patch(
    "/{identifier}/status",
    response_model=TicketResponse,
    summary="Update Ticket Status (Resolve, Escalate, In Progress)"
)
async def update_ticket_status(identifier: str, payload: StatusChangeRequest):
    """Updates ticket lifecycle state and appends to audit trail."""
    ticket = await TicketService.update_status(
        identifier=identifier,
        new_status=payload.status,
        actor=payload.actor,
        note=payload.note
    )
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Ticket '{identifier}' not found.")
    return ticket


@router.patch(
    "/{identifier}/assign",
    response_model=TicketResponse,
    summary="Assign Ticket to Administrator/Support Specialist"
)
async def assign_ticket(identifier: str, payload: AssignTicketRequest):
    """Assigns ticket ownership to an agent and auto-transitions state to IN_PROGRESS."""
    ticket = await TicketService.assign_ticket(
        identifier=identifier,
        agent=payload.assigned_to,
        actor=payload.actor
    )
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Ticket '{identifier}' not found.")
    return ticket


@router.post(
    "/seed",
    summary="Seed / Reset Database with Realistic Enterprise Demo Tickets"
)
async def seed_tickets_endpoint():
    """Wipes and reseeds MongoDB with diverse P1-P4 tickets for live demo presentation."""
    try:
        from scripts.seed_data import seed_database
        await seed_database()
        return {"status": "success", "message": "Demo data successfully seeded into MongoDB", "inserted_count": 9}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Seed error: {str(e)}")


@router.post(
    "/{identifier}/notes",
    response_model=TicketResponse,
    summary="Add Internal Triage / Investigation Note"
)
async def add_ticket_note(identifier: str, payload: AddNoteRequest):
    """Adds investigation details or resolution steps to ticket timeline."""
    ticket = await TicketService.add_note(
        identifier=identifier,
        actor=payload.actor,
        note=payload.note
    )
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Ticket '{identifier}' not found.")
    return ticket
