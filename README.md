# GreenLoop

**A socially useful waste-management and recycling platform connecting citizens, collectors, and recycling centers.**

---

## 1. Problem Statement

Modern urban waste management often suffers from inefficient reporting, fragmented collection schedules, lack of visibility into local recycling centers, and poor citizen engagement. Citizens lack transparent mechanisms to request waste pickups or understand their environmental footprint, while municipal collectors struggle with uncoordinated collection workflows.

## 2. Project Vision

GreenLoop bridges the gap between citizens, waste collectors, recycling centers, and municipal authorities. The platform will empower communities to:
- Effortlessly report uncollected waste with geospatial tags.
- Request scheduled pickups for recyclable materials.
- Route and assign collectors efficiently.
- Discover nearby verified recycling centers and drop-off points.
- Track collective ecological impact and recycling achievements.

---

## 3. Current Version & Development Status

- **Current Version**: `v1.0.0`
- **Current Milestone**: `Milestone 01 — Master Architecture & Project Foundation`
- **Status**: **Completed & Verified**

### Feature Status Matrix

| Component / Feature | Status | Milestone |
| :--- | :--- | :--- |
| **Modular Layered Architecture (API, Services, Repositories, ORM)** | **Implemented** | Milestone 01 |
| **FastAPI Backend Core & API v1 Versioning** | **Implemented** | Milestone 01 |
| **Database Connection Pool & Base Entity Models** | **Implemented** | Milestone 01 |
| **Centralized Safe Logging & Error Handling** | **Implemented** | Milestone 01 |
| **System & Database Health Check Endpoints** | **Implemented** | Milestone 01 |
| **React + TypeScript + Vite UI Design Foundation** | **Implemented** | Milestone 01 |
| **Automated Backend (pytest) & Frontend (Vitest) Test Suites** | **Implemented** | Milestone 01 |
| User Registration, Authentication & RBAC | *Planned* | Milestone 02 |
| Waste Reporting & Geo-tagging | *Planned* | Milestone 03 |
| Collector Assignment & Route Scheduling | *Planned* | Milestone 04 |
| Recycling Center Discovery & Resource Directory | *Planned* | Milestone 05 |
| Environmental Impact Analytics & Community Metrics | *Planned* | Milestone 06 |

---

## 4. Technology Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.9+)
- **Server**: [Uvicorn](https://www.uvicorn.org/) (ASGI)
- **Data Validation & Settings**: [Pydantic v2](https://docs.pydantic.dev/) & [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- **ORM & Data Access**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/)
- **Database**: SQLite (Local Development) &rarr; PostgreSQL (Production target)
- **Testing**: [Pytest](https://docs.pytest.org/), [pytest-asyncio](https://github.com/pytest-dev/pytest-asyncio), [HTTPX](https://www.python-httpx.org/)

### Frontend
- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vite.dev/)
- **Styling**: Vanilla CSS Design Tokens (Nature + Tech + Community + Trust design system)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Testing**: [Vitest](https://vitest.dev/), [React Testing Library](https://testing-library.com/), [jsdom](https://github.com/jsdom/jsdom)

---

## 5. Repository Structure

```
GreenLoop/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── endpoints/
│   │   │   │   │   └── health.py          # /api/v1/health endpoint
│   │   │   │   └── router.py              # API v1 aggregated router
│   │   ├── core/
│   │   │   ├── config.py                  # Pydantic BaseSettings
│   │   │   ├── exceptions.py              # Centralized exception handlers
│   │   │   └── logging.py                 # Structured logging & log masking
│   │   ├── db/
│   │   │   ├── base.py                    # Metadata registry
│   │   │   └── session.py                 # SQLAlchemy session engine & get_db
│   │   ├── models/
│   │   │   └── base.py                    # BaseEntity, TimestampMixin
│   │   ├── repositories/
│   │   │   └── base.py                    # Generic repository pattern
│   │   ├── schemas/
│   │   │   └── health.py                  # HealthResponse schemas
│   │   ├── services/
│   │   │   └── health.py                  # Health check business logic
│   │   └── main.py                        # FastAPI application factory
│   ├── tests/
│   │   ├── conftest.py                    # Pytest in-memory test DB & client
│   │   ├── test_config.py                 # Settings unit tests
│   │   ├── test_exceptions.py             # Error response unit tests
│   │   └── test_health.py                 # Health probe integration tests
│   ├── .env.example                       # Backend environment template
│   ├── pytest.ini                         # Pytest configuration
│   ├── requirements.txt                   # Pinned backend dependencies
│   └── run.py                             # Development server runner
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/                    # Reusable Button, Card, StatusBadge
│   │   │   └── layout/                    # Header, Footer, App Layout
│   │   ├── pages/
│   │   │   └── Home.tsx                   # System health & architectural overview
│   │   ├── services/
│   │   │   └── api.ts                     # Typed REST API service
│   │   ├── styles/                        # CSS design tokens & base rules
│   │   ├── test/                          # Vitest component test suites
│   │   ├── types/                         # TypeScript interfaces
│   │   ├── App.tsx                        # Main application container
│   │   ├── index.css                      # Master style entrypoint
│   │   └── main.tsx                       # React DOM root
│   ├── .env.example                       # Frontend environment template
│   ├── package.json                       # Dependencies & scripts
│   ├── tsconfig.json                      # TypeScript configuration
│   └── vite.config.ts                     # Vite build & test configuration
│
├── docs/
│   ├── ARCHITECTURE.md                    # Detailed architectural specification
│   ├── DEVELOPMENT.md                     # Step-by-step local developer guide
│   └── TECH_DECISIONS.md                  # Rationale behind stack choices
│
├── scripts/
│   ├── setup_dev.sh                       # One-step environment setup
│   └── run_tests.sh                       # Cross-stack automated test runner
│
├── .gitignore                             # Ignored files (secrets, caches, db)
└── README.md                              # Master project documentation
```

---

## 6. Local Setup & Execution

### Quick Start (Automated)

```bash
# Clone the repository and navigate into it
cd GreenLoop

# Run the automated environment setup script
./scripts/setup_dev.sh
```

---

### Manual Setup

#### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment configuration
cp .env.example .env

# Run FastAPI backend
python run.py
```

- **Backend API**: `http://127.0.0.1:8000`
- **Swagger Documentation**: `http://127.0.0.1:8000/docs`
- **ReDoc Documentation**: `http://127.0.0.1:8000/redoc`
- **Root Health Check**: `http://127.0.0.1:8000/health`

#### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment configuration
cp .env.example .env

# Run Vite dev server
npm run dev
```

- **Frontend App**: `http://localhost:5173`

---

## 7. Running Automated Tests

Run the complete test suite across both backend and frontend:

```bash
./scripts/run_tests.sh
```

### Backend Tests (pytest)
```bash
cd backend
source .venv/bin/activate
pytest -v
```

### Frontend Tests (Vitest)
```bash
cd frontend
npm test -- --run
```

---

## 8. Health Check Specification

GreenLoop provides both root and versioned health endpoints for deployment monitoring and load balancer probes:

### `GET /health` or `GET /api/v1/health`

**Response Example (HTTP 200 OK):**
```json
{
  "status": "healthy",
  "app_name": "GreenLoop",
  "version": "1.0.0",
  "environment": "development",
  "components": {
    "database": {
      "status": "healthy",
      "details": "Database connection active and responsive"
    }
  }
}
```

---

## 9. Development Guidelines & Security Hygiene

1. **Layered Separation of Concerns**: Route handlers delegate to services; services communicate through repositories; repositories access the database through SQLAlchemy models.
2. **Zero Secrets in Code**: All configuration is derived from `.env` via `Pydantic Settings`. Never commit `.env` files.
3. **Safe Logging**: The custom log filter automatically masks keys matching passwords, tokens, API keys, and authorization headers.
4. **Clean Error Handling**: Never return raw database exceptions or internal stack traces to API clients. Use `AppException` subclasses.
5. **No Premature Feature Implementation**: Milestone 01 establishes the stable, tested foundation. Future business logic will be implemented sequentially in upcoming milestones.
