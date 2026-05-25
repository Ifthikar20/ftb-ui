#!/bin/bash
# ═══════════════════════════════════════════════════════
#  FetchBot — Dev Runner
#  Starts both the Django API and Vue.js frontend
# ═══════════════════════════════════════════════════════

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
# This repo IS the frontend.
FRONTEND_DIR="$ROOT_DIR"
# The Django API lives outside this repo. Defaults to a sibling
# directory; override with FTB_API_DIR=/path/to/ftb-api-26 ./dev.sh
API_DIR="${FTB_API_DIR:-$ROOT_DIR/../ftb-api-26}"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

echo ""
echo -e "${BLUE}${BOLD}  ╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}${BOLD}  ║        🤖 FetchBot Dev Runner        ║${NC}"
echo -e "${BLUE}${BOLD}  ╚══════════════════════════════════════╝${NC}"
echo ""

# ── Check prerequisites ──
echo -e "${YELLOW}▸ Checking prerequisites...${NC}"

if ! command -v node &>/dev/null; then
    echo -e "${RED}  ✗ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Node $(node --version)${NC}"

# The backend is optional — the frontend runs with placeholder data if
# the API directory isn't present.
RUN_BACKEND=1
if [ ! -d "$API_DIR" ]; then
    echo -e "${YELLOW}  ⚠ Backend not found at: $API_DIR${NC}"
    echo -e "${YELLOW}    Starting frontend only. Set FTB_API_DIR to enable the API.${NC}"
    RUN_BACKEND=0
elif ! command -v python3 &>/dev/null; then
    echo -e "${YELLOW}  ⚠ Python 3 not found — starting frontend only.${NC}"
    RUN_BACKEND=0
else
    echo -e "${GREEN}  ✓ Python $(python3 --version | cut -d' ' -f2)${NC}"
fi

# ── Setup Backend ──
if [ "$RUN_BACKEND" -eq 1 ]; then
    echo ""
    echo -e "${YELLOW}▸ Setting up backend...${NC}"

    # Create .env if it doesn't exist
    if [ ! -f "$API_DIR/.env" ] && [ -f "$API_DIR/.env.example" ]; then
        echo -e "  Creating .env from .env.example..."
        cp "$API_DIR/.env.example" "$API_DIR/.env"
        echo -e "${GREEN}  ✓ Created .env${NC}"
    fi

    # Create virtualenv if needed
    if [ ! -d "$API_DIR/venv" ]; then
        echo -e "  Creating virtual environment..."
        python3 -m venv "$API_DIR/venv"
        echo -e "${GREEN}  ✓ Created venv${NC}"
    fi

    # Activate venv and install deps
    source "$API_DIR/venv/bin/activate"

    if [ ! -f "$API_DIR/venv/.deps_installed" ]; then
        echo -e "  Installing Python dependencies..."
        pip install -q -r "$API_DIR/requirements/dev.txt" 2>/dev/null
        touch "$API_DIR/venv/.deps_installed"
        echo -e "${GREEN}  ✓ Dependencies installed${NC}"
    else
        echo -e "${GREEN}  ✓ Dependencies already installed${NC}"
    fi

    # Run migrations
    echo -e "  Running migrations..."
    cd "$API_DIR"
    if python manage.py migrate --settings=config.settings.dev --run-syncdb 2>/dev/null; then
        echo -e "${GREEN}  ✓ Migrations applied${NC}"
    else
        echo -e "${YELLOW}  ⚠ Migrations skipped — PostgreSQL may not be ready yet${NC}"
        echo -e "${YELLOW}    Server will start but some features may need a restart after DB is up${NC}"
    fi

    # Seed data
    echo -e "  Seeding demo data..."
    python manage.py seed_demo_data --settings=config.settings.dev 2>/dev/null || true
    echo -e "${GREEN}  ✓ Seed data ready${NC}"
fi

# ── Setup Frontend ──
echo ""
echo -e "${YELLOW}▸ Setting up frontend...${NC}"

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "  Installing Node dependencies..."
    cd "$FRONTEND_DIR"
    npm install --silent 2>/dev/null
    echo -e "${GREEN}  ✓ Node modules installed${NC}"
else
    echo -e "${GREEN}  ✓ Node modules already installed${NC}"
fi

# ── Start servers ──
echo ""
echo -e "${BLUE}${BOLD}▸ Starting servers...${NC}"
echo ""

BACKEND_PID=""

# Cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    deactivate 2>/dev/null || true
    echo -e "${GREEN}✓ All servers stopped.${NC}"
    exit 0
}
trap cleanup INT TERM

# Start Django backend
if [ "$RUN_BACKEND" -eq 1 ]; then
    cd "$API_DIR"
    source "$API_DIR/venv/bin/activate"
    python manage.py runserver 8000 --settings=config.settings.dev 2>&1 &
    BACKEND_PID=$!
fi

# Start Vue frontend
cd "$FRONTEND_DIR"
npm run dev 2>&1 &
FRONTEND_PID=$!

# Wait for servers to be ready
echo -e "  Waiting for servers..."
if [ "$RUN_BACKEND" -eq 1 ]; then
    for i in $(seq 1 15); do
      if curl -s -o /dev/null http://localhost:8000/health/ 2>/dev/null || curl -s -o /dev/null http://localhost:8000/admin/ 2>/dev/null; then
        break
      fi
      sleep 1
    done
fi

for i in $(seq 1 10); do
  if curl -s -o /dev/null http://localhost:5173/ 2>/dev/null; then
    break
  fi
  sleep 1
done

echo ""
echo -e "${GREEN}${BOLD}  ══════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✓ FetchBot is running!${NC}"
echo -e "${GREEN}${BOLD}  ══════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}Frontend:${NC}  http://localhost:5173"
if [ "$RUN_BACKEND" -eq 1 ]; then
    echo -e "  ${BOLD}Backend:${NC}   http://localhost:8000"
    echo -e "  ${BOLD}API Docs:${NC}  http://localhost:8000/api/schema/swagger/"
    echo ""
    echo -e "  ${BOLD}Login Credentials:${NC}"
    echo -e "  ─────────────────────────────────────────"
    echo -e "  ${BOLD}Admin:${NC}  admin@growthpilot.io  /  AdminPass123!"
    echo -e "  ${BOLD}Demo:${NC}   demo@example.com      /  DemoPass123!"
fi
echo ""

# Auto-login: get JWT and open browser with token
if [ "$RUN_BACKEND" -eq 1 ]; then
    echo -e "${YELLOW}▸ Auto-logging in as demo user...${NC}"
    LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/auth/login/ \
      -H "Content-Type: application/json" \
      -d '{"email":"demo@example.com","password":"DemoPass123!"}' 2>/dev/null)

    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',d).get('access',''))" 2>/dev/null)

    if [ -n "$ACCESS_TOKEN" ]; then
      echo -e "${GREEN}  ✓ Logged in as demo@example.com${NC}"
      open "http://localhost:5173/login?auto_token=${ACCESS_TOKEN}" 2>/dev/null || \
      xdg-open "http://localhost:5173/login?auto_token=${ACCESS_TOKEN}" 2>/dev/null || true
    else
      echo -e "${YELLOW}  ⚠ Auto-login failed, opening login page...${NC}"
      open "http://localhost:5173/login" 2>/dev/null || \
      xdg-open "http://localhost:5173/login" 2>/dev/null || true
    fi
else
    open "http://localhost:5173/" 2>/dev/null || \
    xdg-open "http://localhost:5173/" 2>/dev/null || true
fi

echo ""
echo -e "  ${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

wait
