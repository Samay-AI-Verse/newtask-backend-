# ⚡ IntelliTicket - Intelligent Service Request & Prioritization System

> **Automated AI-Driven Ticket Triage, Blast-Radius Scoring, and SLA Management Backend built with FastAPI and MongoDB.**

---

## 📌 Problem Statement Overview
Organizations receive hundreds of daily service requests from employees and customers (IT outages, payroll failures, VPN drops, facilities issues, routine hardware requests). Manual ticket handling causes:
1. **Urgent & high-impact requests get buried** under trivial requests.
2. **SLA deadlines breach silently**, damaging business operations.
3. **No transparent prioritization logic** for administrators and technicians.

### 💡 The Solution
**IntelliTicket** is an intelligent triage platform that automatically analyzes incoming requests across 4 dimensions:
1. **Urgency Phrasing & Sentiment (0–30 pts)** — Detects words like *outage, system down, payroll locked, breach, emergency*.
2. **Impact Scope / Blast Radius (0–30 pts)** — Distinguishes between *Individual (10)*, *Team/Dept (20)*, and *Organization-Wide (30)*.
3. **Business Criticality (0–30 pts)** — Evaluates *Low (5)*, *Medium (14)*, *High (22)*, and *Severe (30)* impact on business operations.
4. **Requester VIP Weighting (0–10 pts)** — Grants priority boost to critical stakeholders.

**Composite Priority Index (0–100) & Dynamic SLAs:**
- 🚨 **P1 Critical (Score 75–100)** ➔ **2-Hour SLA**
- ⚠️ **P2 High (Score 55–74)** ➔ **6-Hour SLA**
- 🔷 **P3 Medium (Score 35–54)** ➔ **24-Hour SLA**
- ⚪ **P4 Low (Score 0–34)** ➔ **72-Hour SLA**

---

## 🗂️ Project Architecture

```
Task new/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI application setup, Lifespan, CORS, UI mount
│   ├── config.py                   # Pydantic Settings & environment variables
│   ├── database.py                 # Motor Async MongoDB connection & index setup
│   ├── models/
│   │   ├── __init__.py
│   │   └── ticket_model.py         # Domain Enums (Priority, Status, Category, Scope)
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── ticket_schema.py        # Pydantic request/response validation schemas
│   ├── services/
│   │   ├── __init__.py
│   │   ├── prioritization_engine.py# AI/Heuristic Scoring & SLA calculation engine
│   │   └── ticket_service.py       # MongoDB CRUD, aggregation metrics, and filters
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── tickets.py              # Ingest, list, search, status, notes, & seed APIs
│   │   └── analytics.py            # Real-time dashboard KPI analytics API
│   └── static/
│       └── index.html              # Built-in live visual demo UI & dashboard
├── scripts/
│   ├── seed_data.py                # Populates realistic enterprise service tickets
│   └── test_connection.py         # Validates local MongoDB connectivity
├── .env.example                    # Sample environment variables
├── .env                            # Active environment configuration
├── requirements.txt                # Python dependencies
├── setup.bat                       # 1-Click venv creation and dependency installer
├── start_mongo.bat                 # 1-Click MongoDB launcher
├── seed_db.bat                     # 1-Click demo data seeder
├── run_server.bat                  # 1-Click FastAPI server runner
└── README.md                       # Complete documentation
```

---

## 🚀 Quick Setup & Execution (Windows)

### Option A: Using 1-Click Batch Files (Recommended)
1. Double-click `setup.bat` to create `venv` and install dependencies.
2. Double-click `start_mongo.bat` (or ensure MongoDB service is running).
3. Double-click `seed_db.bat` to insert realistic demo tickets.
4. Double-click `run_server.bat` to start the backend.

### Option B: Using Terminal Commands
```powershell
# 1. Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Seed demo data into MongoDB
python scripts/seed_data.py

# 4. Start FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

---

## 🌐 Live URLs
- **Interactive Visual Demo UI**: `http://127.0.0.1:8000/`
- **Interactive Swagger API Docs**: `http://127.0.0.1:8000/docs`
- **ReDoc API Specifications**: `http://127.0.0.1:8000/redoc`

---

## 🔌 Core API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/tickets` | Ingests request & executes Intelligent Prioritization Engine |
| `GET` | `/api/v1/tickets` | Lists tickets with filtering (priority, status, search, SLA breach) |
| `GET` | `/api/v1/tickets/{id}` | Fetches ticket details, score breakdown, and audit timeline |
| `PATCH`| `/api/v1/tickets/{id}/status` | Updates ticket lifecycle (In Progress, Resolved, Escalated) |
| `PATCH`| `/api/v1/tickets/{id}/assign` | Assigns ticket to support engineer/team |
| `POST` | `/api/v1/tickets/{id}/notes` | Appends investigation/triage notes to audit trail |
| `GET` | `/api/v1/analytics/dashboard` | Aggregates queue health, SLA risks, and category distribution |
| `POST` | `/api/v1/tickets/seed` | Resets and seeds realistic enterprise tickets |
| `GET` | `/health` | System health check and database connectivity |
