from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime


class TicketPriority(str, Enum):
    P1_CRITICAL = "P1_CRITICAL"
    P2_HIGH = "P2_HIGH"
    P3_MEDIUM = "P3_MEDIUM"
    P4_LOW = "P4_LOW"


class TicketStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    PENDING_INFO = "PENDING_INFO"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    ESCALATED = "ESCALATED"


class TicketCategory(str, Enum):
    IT_INFRASTRUCTURE = "IT_INFRASTRUCTURE"
    SOFTWARE_APPLICATIONS = "SOFTWARE_APPLICATIONS"
    SECURITY_ACCESS = "SECURITY_ACCESS"
    HR_PAYROLL = "HR_PAYROLL"
    FINANCE_BILLING = "FINANCE_BILLING"
    FACILITIES_OFFICE = "FACILITIES_OFFICE"
    CUSTOMER_SUPPORT = "CUSTOMER_SUPPORT"
    OTHER = "OTHER"


class ImpactScope(str, Enum):
    INDIVIDUAL = "INDIVIDUAL"       # Only 1 user affected
    TEAM_DEPARTMENT = "TEAM"        # Multiple users / department
    ORGANIZATION = "ORGANIZATION"   # Whole company / customer-facing outage


class BusinessCriticality(str, Enum):
    LOW = "LOW"                     # Non-blocking, trivial request
    MEDIUM = "MEDIUM"               # Minor inconvenience, workarounds exist
    HIGH = "HIGH"                   # Important business process blocked
    SEVERE = "SEVERE"               # Revenue loss, data breach, payroll blockage
