# 🚀 IntelliTicket Deployment & Operations Manual

This guide walks you through deploying **IntelliTicket** (FastAPI Backend + Modern Frontend + MongoDB) in development and production environments.

---

## 🏗️ Architecture Overview

- **Frontend**: Responsive Single Page App (Vanilla ES6+, Chart.js, Glassmorphic Design System) served directly via FastAPI StaticFiles at `/`.
- **Backend**: FastAPI with async route handlers, Pydantic v2 schemas, and Lifespan MongoDB connection manager.
- **Database**: MongoDB (via Motor async driver).
- **Prioritization Engine**: In-memory rule & NLP heuristic engine calculating dynamic 0–100 scores and SLA deadlines.

---

## 🛠️ Option 1: One-Click Local Docker Deployment (Recommended)

Run the complete stack (FastAPI + MongoDB + UI) with a single command:

```bash
# Start all services in the background
docker-compose up -d --build

# View container logs
docker-compose logs -f web

# Stop all services
docker-compose down
```

Once started, open:
- **Interactive Web App**: [http://localhost:8000/](http://localhost:8000/)
- **Swagger API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## ☁️ Option 2: Cloud Deployment (Render, Railway, Fly.io)

### 1. Configure MongoDB Atlas (Free Cloud Database)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas/database) and create a free M0 cluster.
2. Under **Database Access**, create a user with read/write permissions.
3. Under **Network Access**, add `0.0.0.0/0` (allow all IP addresses for cloud server).
4. Copy your Connection String URI (e.g. `mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority`).

### 2. Deploy to Render
1. Push this repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), click **New +** ➔ **Web Service**.
3. Connect your GitHub repository.
4. Set Build & Start commands:
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Under **Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `MONGODB_URI` | `mongodb+srv://<user>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority` |
   | `MONGODB_DB_NAME` | `intelliticket_db` |
   | `APP_ENV` | `production` |
   | `DEBUG` | `False` |
   | `CORS_ORIGINS` | `*` |
6. Click **Deploy Web Service**. Render will automatically build and host the full-stack app.

### 3. Deploy to Railway
1. Click **New Project** ➔ **Deploy from GitHub repo**.
2. Add MongoDB database service from Railway plugins OR set the `MONGODB_URI` variable pointing to MongoDB Atlas.
3. Railway automatically detects `Dockerfile` or `requirements.txt` and deploys.

---

## 💻 Option 3: Local Windows Native Execution

### Step 1: Install Dependencies
```powershell
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2: Start MongoDB
Ensure local MongoDB service is running on `mongodb://localhost:27017` (or run `start_mongo.bat`).

### Step 3: Seed Realistic Demo Data
```powershell
python scripts/seed_data.py
```

### Step 4: Run FastAPI Server
```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

---

## ⚙️ Environment Variables Reference

| Variable | Default | Purpose |
|---|---|---|
| `APP_NAME` | `IntelliTicket - Intelligent Service Request...` | Application branding name |
| `APP_ENV` | `development` | `development` or `production` |
| `DEBUG` | `True` | FastAPI debug mode flag |
| `PORT` | `8000` | Port to bind server |
| `HOST` | `127.0.0.1` | Network interface host (`0.0.0.0` for Docker/Cloud) |
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DB_NAME`| `intelliticket_db` | Target MongoDB database name |
| `SLA_P1_HOURS` | `2` | Resolution SLA target for Critical P1 |
| `SLA_P2_HOURS` | `6` | Resolution SLA target for High P2 |
| `SLA_P3_HOURS` | `24` | Resolution SLA target for Medium P3 |
| `SLA_P4_HOURS` | `72` | Resolution SLA target for Low P4 |
| `CORS_ORIGINS` | `*` | Allowed CORS origins for API |

---

## 🔍 Verification & Health Check

Verify deployment health:
```bash
curl http://localhost:8000/health
```
Expected Response:
```json
{
  "status": "healthy",
  "database": "connected",
  "database_name": "intelliticket_db",
  "environment": "production"
}
```
