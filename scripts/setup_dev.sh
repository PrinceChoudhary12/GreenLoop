#!/usr/bin/env bash
# GreenLoop Development Setup Script

set -e

echo "==========================================="
echo "  Setting up GreenLoop Development Env     "
echo "==========================================="

# Root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# 1. Backend Setup
echo ""
echo "--> Configuring Backend..."
cd "$ROOT_DIR/backend"

if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv .venv
fi

echo "Activating virtual environment & installing dependencies..."
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

if [ ! -f ".env" ]; then
    echo "Creating backend .env from .env.example..."
    cp .env.example .env
fi

# 2. Frontend Setup
echo ""
echo "--> Configuring Frontend..."
cd "$ROOT_DIR/frontend"

echo "Installing frontend dependencies..."
npm install

if [ ! -f ".env" ]; then
    echo "Creating frontend .env from .env.example..."
    cp .env.example .env
fi

echo ""
echo "==========================================="
echo "  GreenLoop Environment Setup Complete!    "
echo "==========================================="
echo ""
echo "To run backend:"
echo "  cd backend && source .venv/bin/activate && python run.py"
echo ""
echo "To run frontend:"
echo "  cd frontend && npm run dev"
echo ""
