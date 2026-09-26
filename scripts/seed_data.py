import asyncio
import os
import sys
from datetime import datetime, timedelta

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from app.models.ticket_model import (
    TicketPriority,
    TicketStatus,
    TicketCategory,
    ImpactScope,
    BusinessCriticality
)
from app.services.prioritization_engine import PrioritizationEngine

DEMO_TICKETS = [
    {
        "title": "EMERGENCY: Production Payment Gateway Down - Checkout Failing",
        "description": "Our primary Stripe and Razorpay payment webhooks are returning 500 internal server errors. Hundreds of active customers are unable to complete checkout. Immediate production outage fix required!",
        "impact_scope": ImpactScope.ORGANIZATION,
        "business_criticality": BusinessCriticality.SEVERE,
        "requester": {
            "name": "Sarah Jenkins",
            "email": "sarah.j@company.com",
            "department": "E-Commerce Operations",
            "role": "Head of Operations",
            "is_vip": True
        },
        "manual_category": TicketCategory.IT_INFRASTRUCTURE,
        "assigned_to": {
            "name": "Alex Chen",
            "email": "alex.chen@infra.internal",
            "team": "DevOps & SRE"
        },
        "status": TicketStatus.IN_PROGRESS,
        "hours_ago": 1.5,
        "is_breached_demo": False
    },
    {
        "title": "CRITICAL: Payroll locked for 400 employees before salary disbursement",
        "description": "The monthly salary disbursement file cannot be signed because the payroll database token has expired. Payday is tomorrow morning. This is blocking all salary releases.",
        "impact_scope": ImpactScope.ORGANIZATION,
        "business_criticality": BusinessCriticality.SEVERE,
        "requester": {
            "name": "Michael Scott",
            "email": "m.scott@company.com",
            "department": "Human Resources",
            "role": "VP Human Resources",
            "is_vip": True
        },
        "manual_category": TicketCategory.HR_PAYROLL,
        "assigned_to": None,
        "status": TicketStatus.OPEN,
        "hours_ago": 0.8,
        "is_breached_demo": False
    },
    {
        "title": "Corporate VPN gateway unresponsive for entire London Office",
        "description": "Entire London engineering branch (55 engineers) cannot connect to corporate VPN. Cannot access staging clusters or internal tools. Team completely blocked.",
        "impact_scope": ImpactScope.TEAM_DEPARTMENT,
        "business_criticality": BusinessCriticality.HIGH,
        "requester": {
            "name": "David Miller",
            "email": "david.m@company.com",
            "department": "Engineering - London",
            "role": "Engineering Manager",
            "is_vip": False
        },
        "manual_category": TicketCategory.SECURITY_ACCESS,
        "assigned_to": {
            "name": "David Miller",
            "email": "david.m@support.internal",
            "team": "Network Security"
        },
        "status": TicketStatus.IN_PROGRESS,
        "hours_ago": 4.5,
        "is_breached_demo": False
    },
    {
        "title": "Security Alert: Suspicious multiple failed login attempts on Root AWS account",
        "description": "Automated GuardDuty alert detected 85 failed root credential login attempts from unknown foreign IP address. Potential brute-force attack underway.",
        "impact_scope": ImpactScope.ORGANIZATION,
        "business_criticality": BusinessCriticality.SEVERE,
        "requester": {
            "name": "Security Sentinel Bot",
            "email": "soc-alerts@company.com",
            "department": "Information Security",
            "role": "SecOps Automation",
            "is_vip": True
        },
        "manual_category": TicketCategory.SECURITY_ACCESS,
        "assigned_to": None,
        "status": TicketStatus.ESCALATED,
        "hours_ago": 2.8,
        "is_breached_demo": True # Deliberately marked past SLA to demo breach detection
    },
    {
        "title": "Finance ERP Invoice generation crashing with timeout error",
        "description": "When generating end-of-month client tax invoices, the SAP billing connector throws a gateway 504 timeout error. Billing team delayed on 12 key enterprise client accounts.",
        "impact_scope": ImpactScope.TEAM_DEPARTMENT,
        "business_criticality": BusinessCriticality.HIGH,
        "requester": {
            "name": "Elena Rostova",
            "email": "elena.r@company.com",
            "department": "Finance & Accounts",
            "role": "Senior Financial Analyst",
            "is_vip": False
        },
        "manual_category": TicketCategory.FINANCE_BILLING,
        "assigned_to": None,
        "status": TicketStatus.OPEN,
        "hours_ago": 7.0,
        "is_breached_demo": True # SLA Breached (>6h for P2)
    },
    {
        "title": "Figma Enterprise licenses needed for 3 new Product Designers",
        "description": "Three new design hires joining next Monday require Figma professional licenses and access to the shared Design System component library.",
        "impact_scope": ImpactScope.INDIVIDUAL,
        "business_criticality": BusinessCriticality.MEDIUM,
        "requester": {
            "name": "Priya Patel",
            "email": "priya.p@company.com",
            "department": "Product Design",
            "role": "Design Lead",
            "is_vip": False
        },
        "manual_category": TicketCategory.SOFTWARE_APPLICATIONS,
        "assigned_to": {
            "name": "Lisa Wong",
            "email": "lisa.w@support.internal",
            "team": "IT Helpdesk"
        },
        "status": TicketStatus.OPEN,
        "hours_ago": 5.0,
        "is_breached_demo": False
    },
    {
        "title": "3rd Floor Conference Room video screen not displaying HDMI feed",
        "description": "The main monitor in Boardroom Orion is flickering and cannot connect to presenter laptops via HDMI or wireless casting.",
        "impact_scope": ImpactScope.TEAM_DEPARTMENT,
        "business_criticality": BusinessCriticality.MEDIUM,
        "requester": {
            "name": "Marcus Aurelius",
            "email": "marcus@company.com",
            "department": "Executive Office",
            "role": "Chief of Staff",
            "is_vip": False
        },
        "manual_category": TicketCategory.FACILITIES_OFFICE,
        "assigned_to": None,
        "status": TicketStatus.OPEN,
        "hours_ago": 1.2,
        "is_breached_demo": False
    },
    {
        "title": "Ergonomic keyboard and dual monitor arm request for workstation",
        "description": "Requesting an ergonomic split keyboard and dual desk mount arm for workstation #302 to prevent wrist strain.",
        "impact_scope": ImpactScope.INDIVIDUAL,
        "business_criticality": BusinessCriticality.LOW,
        "requester": {
            "name": "Vikram Sethi",
            "email": "vikram.s@company.com",
            "department": "Software Engineering",
            "role": "Frontend Developer",
            "is_vip": False
        },
        "manual_category": TicketCategory.FACILITIES_OFFICE,
        "assigned_to": None,
        "status": TicketStatus.OPEN,
        "hours_ago": 12.0,
        "is_breached_demo": False
    },
    {
        "title": "Query regarding official public holiday calendar for Q4",
        "description": "Can HR please share the official PDF list of upcoming company holidays for the Diwali and Christmas periods?",
        "impact_scope": ImpactScope.INDIVIDUAL,
        "business_criticality": BusinessCriticality.LOW,
        "requester": {
            "name": "Ananya Roy",
            "email": "ananya.r@company.com",
            "department": "Marketing",
            "role": "Content Strategist",
            "is_vip": False
        },
        "manual_category": TicketCategory.HR_PAYROLL,
        "assigned_to": {
            "name": "Lisa Wong",
            "email": "lisa.w@support.internal",
            "team": "HR Operations"
        },
        "status": TicketStatus.RESOLVED,
        "hours_ago": 24.0,
        "is_breached_demo": False
    }
]


async def seed_database():
    """Wipes and populates MongoDB with rich, realistic enterprise tickets."""
    print(f"Connecting to MongoDB at {settings.MONGODB_URI}...")
    client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=5000)
    db = client[settings.MONGODB_DB_NAME]

    # Verify connection
    try:
        await client.admin.command('ping')
        print("Connected to MongoDB successfully.")
    except Exception as e:
        print(f"ERROR: Could not connect to MongoDB. Is mongod running? {e}")
        return

    # Clear old demo tickets
    deleted = await db.tickets.delete_many({})
    print(f"Cleared {deleted.deleted_count} previous tickets.")

    now = datetime.utcnow()
    inserted_docs = []

    for index, item in enumerate(DEMO_TICKETS):
        req_obj = type('Req', (), item["requester"])()
        priority, score, breakdown, category, sla = await PrioritizationEngine.analyze_and_score(
            title=item["title"],
            description=item["description"],
            impact_scope=item["impact_scope"],
            business_criticality=item["business_criticality"],
            requester=req_obj,
            manual_category=item.get("manual_category")
        )

        ticket_id = f"TC-{1001 + index}"
        created_at = now - timedelta(hours=item["hours_ago"])
        
        # Calculate realistic due date based on whether it's an intentional breach demo
        if item.get("is_breached_demo"):
            due_at = now - timedelta(hours=1.5) # Past due
        else:
            due_at = created_at + timedelta(hours=sla.target_hours)

        doc = {
            "ticket_id": ticket_id,
            "title": item["title"],
            "description": item["description"],
            "category": category.value,
            "requester": item["requester"],
            "impact_scope": item["impact_scope"].value,
            "business_criticality": item["business_criticality"].value,
            "priority": priority.value,
            "priority_score": score,
            "priority_breakdown": breakdown.model_dump(),
            "status": item["status"].value,
            "assigned_to": item.get("assigned_to"),
            "sla": {
                "target_hours": sla.target_hours,
                "due_at": due_at,
                "is_breached": due_at < now if item["status"] != TicketStatus.RESOLVED else False
            },
            "timeline": [
                {
                    "timestamp": created_at,
                    "action": "Ticket Ingested & Auto-Prioritized",
                    "actor": "IntelliPrioritizer AI",
                    "note": f"Classified as {priority.value} (Score: {score}/100, SLA: {sla.target_hours}h)"
                }
            ],
            "created_at": created_at,
            "updated_at": created_at
        }

        if item.get("assigned_to"):
            doc["timeline"].append({
                "timestamp": created_at + timedelta(minutes=15),
                "action": f"Assigned to {item['assigned_to']['name']}",
                "actor": "Lead Triage Admin",
                "note": f"Routing to {item['assigned_to']['team']}"
            })

        if item["status"] == TicketStatus.RESOLVED:
            doc["timeline"].append({
                "timestamp": created_at + timedelta(hours=2),
                "action": "Ticket Resolved",
                "actor": "Support Specialist",
                "note": "Shared policy PDF link and closed ticket."
            })

        inserted_docs.append(doc)

    result = await db.tickets.insert_many(inserted_docs)
    print(f"Successfully seeded {len(result.inserted_ids)} realistic service tickets into MongoDB!")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_database())
