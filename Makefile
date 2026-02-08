# Jetbeans Development Makefile
# Ensures local services are running to avoid cloud usage costs

.PHONY: dev dev-all inngest db db-local db-stop services check help

# Default target
help:
	@echo "Jetbeans Development Commands"
	@echo ""
	@echo "  make dev        - Start Next.js dev server only"
	@echo "  make dev-all    - Start everything (Next.js + Inngest + DB check)"
	@echo "  make inngest    - Start Inngest dev server"
	@echo "  make services   - Start Inngest in background"
	@echo "  make check      - Check if all services are running"
	@echo "  make db-local   - Start local Postgres via Docker"
	@echo "  make db-stop    - Stop local Postgres"
	@echo ""

# Start Next.js dev server
dev:
	cd apps/admin && pnpm dev

# Start Inngest dev server (foreground)
inngest:
	@echo "Starting Inngest dev server..."
	@echo "Dashboard: http://localhost:8288"
	npx inngest-cli@latest dev -u http://localhost:3000/api/inngest

# Start all services together using concurrently
dev-all: check-inngest
	@echo "Starting all development services..."
	pnpm --filter admin exec concurrently \
		--names "next,inngest" \
		--prefix-colors "cyan,magenta" \
		"pnpm dev" \
		"npx inngest-cli@latest dev -u http://localhost:3000/api/inngest"

# Check if Inngest is accessible, start if not
check-inngest:
	@curl -s http://localhost:8288 > /dev/null 2>&1 || echo "Note: Inngest will start with dev server"

# Start background services
services:
	@echo "Starting Inngest in background..."
	@npx inngest-cli@latest dev -u http://localhost:3000/api/inngest &
	@echo "Inngest dashboard: http://localhost:8288"

# Check service status
check:
	@echo "Checking services..."
	@echo ""
	@echo "Inngest (localhost:8288):"
	@curl -s http://localhost:8288 > /dev/null 2>&1 && echo "  ✓ Running" || echo "  ✗ Not running - run 'make inngest'"
	@echo ""
	@echo "Next.js (localhost:3000):"
	@curl -s http://localhost:3000 > /dev/null 2>&1 && echo "  ✓ Running" || echo "  ✗ Not running - run 'make dev'"
	@echo ""
	@echo "Database:"
	@if [ -n "$$DATABASE_URL" ]; then \
		if echo "$$DATABASE_URL" | grep -q "localhost\|127.0.0.1"; then \
			echo "  ✓ Using local database"; \
		else \
			echo "  ! Using remote database (Neon)"; \
			echo "    Run 'make db-local' to use local Postgres"; \
		fi \
	else \
		echo "  ? DATABASE_URL not set"; \
	fi

# Local Postgres via Docker (optional - to avoid Neon usage)
db-local:
	@echo "Starting local Postgres..."
	docker run -d \
		--name jetbeans-postgres \
		-e POSTGRES_USER=postgres \
		-e POSTGRES_PASSWORD=postgres \
		-e POSTGRES_DB=jetbeans \
		-p 5432:5432 \
		postgres:16-alpine
	@echo ""
	@echo "Local Postgres running!"
	@echo "Connection string: postgresql://postgres:postgres@localhost:5432/jetbeans"
	@echo ""
	@echo "To use locally, update your .env.local:"
	@echo "  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jetbeans"
	@echo ""
	@echo "Then run migrations: pnpm db:push"

db-stop:
	@echo "Stopping local Postgres..."
	docker stop jetbeans-postgres 2>/dev/null || true
	docker rm jetbeans-postgres 2>/dev/null || true
	@echo "Done"

# Quick start for daily development
start:
	@echo "Quick start - checking services and starting dev..."
	@make check
	@echo ""
	@read -p "Start dev server? [Y/n] " confirm && [ "$$confirm" != "n" ] && make dev-all
