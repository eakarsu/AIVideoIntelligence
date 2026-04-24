#!/bin/bash

# ============================================
# Vigilance AI - Video Intelligence Platform
# Start Script with Auto-Reload
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo -e "${PURPLE}"
echo "╔═══════════════════════════════════════════╗"
echo "║       VIGILANCE AI                        ║"
echo "║   AI-Powered Video Intelligence Platform  ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# Load env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo -e "${GREEN}✓ Environment loaded${NC}"
else
  echo -e "${RED}✗ .env file not found${NC}"
  exit 1
fi

BACKEND_PORT=${BACKEND_PORT:-4000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Clean up used ports
echo -e "${YELLOW}Cleaning up ports ${BACKEND_PORT} and ${FRONTEND_PORT}...${NC}"
lsof -ti:${BACKEND_PORT} 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:${FRONTEND_PORT} 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1
echo -e "${GREEN}✓ Ports cleaned${NC}"

# Check PostgreSQL
echo -e "${CYAN}Checking PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
  echo -e "${RED}✗ PostgreSQL not found. Please install it.${NC}"
  exit 1
fi

if ! pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} &>/dev/null; then
  echo -e "${YELLOW}Starting PostgreSQL...${NC}"
  if command -v brew &> /dev/null; then
    brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
    sleep 2
  fi
fi

if pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} &>/dev/null; then
  echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
  echo -e "${RED}✗ PostgreSQL is not running. Please start it manually.${NC}"
  exit 1
fi

# Create database if not exists
echo -e "${CYAN}Setting up database...${NC}"
psql -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME:-video_intelligence}'" 2>/dev/null | grep -q 1 || \
  createdb -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} ${DB_NAME:-video_intelligence} 2>/dev/null
echo -e "${GREEN}✓ Database ready${NC}"

# Install dependencies
echo -e "${CYAN}Installing backend dependencies...${NC}"
cd "$PROJECT_DIR/backend"
npm install --silent 2>&1 | tail -1
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

echo -e "${CYAN}Installing frontend dependencies...${NC}"
cd "$PROJECT_DIR/frontend"
npm install --silent 2>&1 | tail -1
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

# Seed database
echo -e "${CYAN}Seeding database with sample data...${NC}"
cd "$PROJECT_DIR/backend"
node seed.js
echo -e "${GREEN}✓ Database seeded${NC}"

# Ensure ports are free before starting servers
lsof -ti:${BACKEND_PORT} 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:${FRONTEND_PORT} 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

# Start backend with nodemon (auto-reload)
echo -e "${BLUE}Starting backend on port ${BACKEND_PORT} with auto-reload...${NC}"
cd "$PROJECT_DIR/backend"
npx nodemon server.js &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: ${BACKEND_PID})${NC}"

# Start frontend with Vite (hot-reload built-in)
echo -e "${BLUE}Starting frontend on port ${FRONTEND_PORT} with hot-reload...${NC}"
cd "$PROJECT_DIR/frontend"
npx vite --port ${FRONTEND_PORT} &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: ${FRONTEND_PID})${NC}"

# Cleanup on exit
cleanup() {
  echo -e "\n${YELLOW}Shutting down...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  lsof -ti:${BACKEND_PORT} 2>/dev/null | xargs kill -9 2>/dev/null || true
  lsof -ti:${FRONTEND_PORT} 2>/dev/null | xargs kill -9 2>/dev/null || true
  echo -e "${GREEN}✓ Shutdown complete${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

echo ""
echo -e "${PURPLE}════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Application is starting up!${NC}"
echo -e ""
echo -e "  ${CYAN}Frontend:${NC}  http://localhost:${FRONTEND_PORT}"
echo -e "  ${CYAN}Backend:${NC}   http://localhost:${BACKEND_PORT}"
echo -e ""
echo -e "  ${YELLOW}Login:${NC}     admin@vigilance.ai / password123"
echo -e ""
echo -e "  ${BLUE}Auto-reload enabled for both servers${NC}"
echo -e "${PURPLE}════════════════════════════════════════════${NC}"
echo ""

# Wait for processes
wait
