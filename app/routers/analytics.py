from fastapi import APIRouter, HTTPException, status
from app.schemas.ticket_schema import DashboardStats
from app.services.ticket_service import TicketService

router = APIRouter(prefix="/analytics", tags=["Dashboard & Analytics"])


@router.get(
    "/dashboard",
    response_model=DashboardStats,
    summary="Get System Health & Intelligent Triage Dashboard Metrics"
)
async def get_dashboard_metrics():
    """
    Returns high-level operational intelligence:
    - Critical P1/P2 unassigned count
    - SLA breach & risk counts
    - Department request breakdown
    - Average queue priority score
    """
    try:
        return await TicketService.get_dashboard_analytics()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to aggregate analytics: {str(e)}"
        )
