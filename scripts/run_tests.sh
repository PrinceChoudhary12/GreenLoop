#!/usr/bin/env bash
# GreenLoop Automated Test Runner

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==========================================="
echo "  Running GreenLoop Test Suites            "
echo "==========================================="

# 1. Backend Tests
echo ""
echo "--> Running Backend Tests (pytest)..."
cd "$ROOT_DIR/backend"
if [ -f ".venv/bin/pytest" ]; then
    .venv/bin/pytest tests -v
else
    pytest tests -v
fi

# 2. Frontend Tests
echo ""
echo "--> Running Frontend Tests (Vitest)..."
cd "$ROOT_DIR/frontend"
npm test -- --run

echo ""
echo "==========================================="
echo "  All Test Suites Passed Successfully!     "
echo "==========================================="
