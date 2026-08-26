# GreenLoop — Technology Decisions & Rationale

This document details key architectural choices made during **Milestone 01 (Master Architecture & Project Foundation)**.

---

## 1. Backend: FastAPI (Python 3.9+)

### Why FastAPI?
- **High Performance**: Asynchronous ASGI framework built on Starlette and Pydantic.
- **Type Safety & Auto-Documentation**: OpenAPI (Swagger/ReDoc) generated automatically from Python type hints and Pydantic schemas.
- **Dependency Injection**: First-class dependency injection system for database sessions, authentication, and service locators.

---

## 2. ORM & Database: SQLAlchemy 2.0 + SQLite

### Why SQLAlchemy 2.0 with Declarative Models?
- **PostgreSQL Ready**: Standard declarative mapping allows switching from SQLite (local dev) to PostgreSQL (production) with zero schema code changes.
- **Repository Pattern Compatibility**: Clean separation of persistence logic from service layers.

---

## 3. Frontend: React 19 + TypeScript + Vite

### Why Vite + React + TypeScript?
- **Speed & Developer Experience**: Instant Hot Module Replacement (HMR) and optimized build times via esbuild/Rollup.
- **Type Safety**: End-to-end interface alignment between backend Pydantic schemas and frontend TypeScript interfaces.
- **Standard Component Paradigm**: Modular, reusable UI structure.

---

## 4. Styling: Vanilla CSS with Custom Properties (Design Tokens)

### Why Vanilla CSS Tokens?
- **Zero Runtime Overhead & Maximum Control**: No build plugin baggage or version lock-in.
- **Clean Design System**: Centralized color palette (Nature + Technology + Community + Trust), fluid typography, and consistent spacing variables.
- **Responsive & Accessible**: Native media queries, clear focus indicators, and semantic HTML structure.

---

## 5. Testing: Pytest (Backend) & Vitest + React Testing Library (Frontend)

### Rationale
- **Pytest**: Industry standard in Python with rich fixture support and async testing (`pytest-asyncio`).
- **Vitest**: Native Vite test runner sharing the same config and transform pipeline for ultra-fast unit testing.
