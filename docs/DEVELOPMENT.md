# GreenLoop — Local Development Guide

## Prerequisites

- **Python**: 3.9+
- **Node.js**: 18+ (Node 20+ recommended)
- **npm**: 9+
- **Git**

---

## 1. Automated Setup

Run the setup helper script:

```bash
chmod +x scripts/setup_dev.sh
./scripts/setup_dev.sh
```

---

## 2. Manual Setup

### Backend Setup

1. Create and activate a virtual environment:
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   ```

4. Run the FastAPI development server:
   ```bash
   python run.py
   # Or using uvicorn directly:
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

- API Server: `http://127.0.0.1:8000`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`
- Health Endpoint: `http://127.0.0.1:8000/health`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   ```

4. Start the Vite dev server:
   ```bash
   npm run dev
   ```

- Frontend App: `http://localhost:5173`

---

## 3. Running Automated Tests

Run all tests via script:
```bash
./scripts/run_tests.sh
```

Or run individually:

### Backend Tests (pytest)
```bash
cd backend
source .venv/bin/activate
pytest -v
```

### Frontend Tests (Vitest)
```bash
cd frontend
npm test
```

---

## 4. Code Quality & Standards

- Follow PEP 8 style for Python backend code.
- Always include type hints on functions and models.
- Maintain responsive, accessible CSS using standard CSS custom properties.
- Do not commit `.env` or temporary files.
