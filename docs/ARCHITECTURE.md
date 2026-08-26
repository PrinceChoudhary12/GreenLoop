# GreenLoop — Architecture Overview

## 1. Architectural Philosophy

GreenLoop follows a **clean, modular, layered architecture** designed for high maintainability, testability, and clear separation of concerns.

```
┌────────────────────────────────────────────────────────┐
│             Presentation Layer (React + Vite)          │
│    Components  │  Pages  │  Layouts  │  API Client     │
└─────────────────────────┬──────────────────────────────┘
                          │ JSON / REST HTTP
┌─────────────────────────▼──────────────────────────────┐
│                  API Layer (FastAPI)                   │
│   Endpoints (/api/v1/...) │ Exception Handlers │ CORS  │
└─────────────────────────┬──────────────────────────────┘
                          │ Validated Requests (Schemas)
┌─────────────────────────▼──────────────────────────────┐
│                    Service Layer                       │
│    Business Logic │ Domain Rules │ System Health       │
└─────────────────────────┬──────────────────────────────┘
                          │ Domain Entities
┌─────────────────────────▼──────────────────────────────┐
│               Repository & Data Access Layer           │
│     Generic Repository Pattern │ SQLAlchemy ORM        │
└─────────────────────────┬──────────────────────────────┘
                          │ SQL Queries
┌─────────────────────────▼──────────────────────────────┐
│              Database (SQLite -> PostgreSQL)           │
└────────────────────────────────────────────────────────┘
```

## 2. Backend Layer Breakdown

1. **`app/core/`**:
   - **`config.py`**: Pydantic Settings for centralized, type-safe environment configuration.
   - **`logging.py`**: Clean, standardized logging with sensitive token/password filtering.
   - **`exceptions.py`**: Unified exception handling, returning consistent `{ "error": { "code", "message", "details" } }` structures.

2. **`app/db/` & `app/models/`**:
   - **`session.py`**: Engine lifecycle, connection pool configuration, and per-request scoped session dependency (`get_db`).
   - **`base.py` / `models/base.py`**: SQLAlchemy 2.0 `DeclarativeBase` with timestamp mixins (`created_at`, `updated_at`).

3. **`app/repositories/`**:
   - Generic repository interface (`BaseRepository[T]`) encapsulating database access.
   - Isolates SQLAlchemy query syntax from business workflows.

4. **`app/schemas/`**:
   - Pydantic models for request parsing, data validation, and serialization.

5. **`app/services/`**:
   - Contains business logic and orchestration. No direct knowledge of HTTP status codes or request headers.

6. **`app/api/`**:
   - Versioned routing (`/api/v1/`). Handles HTTP routing, input validation via dependencies, and mapping service responses.

## 3. Frontend Architecture

1. **`src/components/common/`**: Reusable primitive components (`Button`, `Card`, `StatusBadge`).
2. **`src/components/layout/`**: Structural layout frames (`Header`, `Footer`, `Layout`).
3. **`src/pages/`**: View composition and state aggregation.
4. **`src/services/`**: Centralized HTTP API client with typed response handling.
5. **`src/styles/`**: Vanilla CSS tokens (`variables.css`, `base.css`, `layout.css`) establishing the calm, environmentally inspired GreenLoop visual identity.

## 4. Scalability & Migration Path

- **Database**: The ORM structure and repository abstractions make transitioning from SQLite to PostgreSQL a matter of changing `DATABASE_URL` in `.env`.
- **API Versioning**: Every domain route is encapsulated under `/api/v1/`, ensuring backward compatibility for future API iterations.
- **Statelessness**: The backend maintains no in-memory session state, allowing horizontal replication behind load balancers.
