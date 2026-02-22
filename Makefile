# Makefile for Appraisal Platform Development

.PHONY: help install dev build test lint format clean docker-build docker-up docker-down deploy

help:
	@echo "Appraisal Platform - Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install         - Install dependencies"
	@echo "  make setup          - Setup environment (.env)"
	@echo ""
	@echo "Development:"
	@echo "  make dev            - Start dev server (frontend)"
	@echo "  make dev-backend    - Start backend dev server"
	@echo "  make dev-all        - Start frontend + backend + db with Docker"
	@echo ""
	@echo "Building & Testing:"
	@echo "  make build          - Build for production"
	@echo "  make test           - Run tests"
	@echo "  make test-watch     - Run tests in watch mode"
	@echo "  make lint           - Run ESLint"
	@echo "  make format         - Format code with Prettier"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build   - Build Docker images"
	@echo "  make docker-up      - Start Docker containers"
	@echo "  make docker-down    - Stop Docker containers"
	@echo "  make docker-logs    - View container logs"
	@echo ""
	@echo "Database:"
	@echo "  make db-init        - Initialize database"
	@echo "  make db-migrate     - Run migrations"
	@echo "  make db-seed        - Seed test data"
	@echo "  make db-backup      - Backup database"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy-dev     - Deploy to development"
	@echo "  make deploy-staging - Deploy to staging"
	@echo "  make deploy-prod    - Deploy to production"
	@echo ""
	@echo "Utils:"
	@echo "  make clean          - Remove build artifacts"
	@echo "  make health         - Check system health"

# ======================
# SETUP
# ======================

install:
	npm install
	cd backend && npm install

setup:
	@if [ ! -f .env ]; then \
		echo "Creating .env from .env.example..."; \
		cp .env.example .env; \
		echo "⚠️  Please edit .env with your values"; \
	else \
		echo "✓ .env already exists"; \
	fi

clean:
	rm -rf dist build node_modules
	cd backend && rm -rf dist node_modules
	find . -type d -name ".next" -exec rm -rf {} +
	find . -type d -name "__pycache__" -exec rm -rf {} +

# ======================
# DEVELOPMENT
# ======================

dev:
	npm run dev

dev-backend:
	cd backend && npm run dev

dev-all:
	@echo "Starting full stack with Docker..."
	docker-compose up -d
	@echo ""
	@echo "✓ Frontend: http://localhost:5173"
	@echo "✓ Backend:  http://localhost:3000"
	@echo "✓ Database: localhost:5432"
	@echo ""
	@echo "View logs: docker-compose logs -f"
	@echo "Stop all:  make docker-down"

# ======================
# BUILD & TEST
# ======================

build:
	@echo "Building frontend..."
	npm run build
	@echo "✓ Frontend built"

test:
	npm run test

test-watch:
	npm run test:watch

lint:
	npm run lint

format:
	npm run format
	cd backend && npm run format

check: lint test
	@echo "✓ All checks passed"

# ======================
# DOCKER
# ======================

docker-build:
	@echo "Building Docker images..."
	docker-compose build
	@echo "✓ Images built"

docker-up:
	@echo "Starting containers..."
	docker-compose up -d
	@echo "✓ Containers running"
	@echo ""
	@echo "Access:"
	@echo "  Frontend:  http://localhost:5173"
	@echo "  Backend:   http://localhost:3000"
	@echo "  Database:  localhost:5432"
	@echo "  Redis:     localhost:6379"
	@echo ""
	@echo "Logs: docker-compose logs -f"

docker-down:
	@echo "Stopping containers..."
	docker-compose down
	@echo "✓ Containers stopped"

docker-logs:
	docker-compose logs -f

docker-ps:
	docker-compose ps

# ======================
# DATABASE
# ======================

db-init:
	@echo "Initializing database..."
	docker-compose up -d postgres
	@sleep 3
	docker-compose exec postgres psql -U postgres -d appraisal_db < DB_SCHEMA.md
	@echo "✓ Database initialized"

db-migrate:
	@echo "Running migrations..."
	# Add migration commands here
	@echo "✓ Migrations complete"

db-seed:
	@echo "Seeding test data..."
	docker-compose exec postgres psql -U postgres -d appraisal_db < seeds/test-data.sql
	@echo "✓ Test data seeded"

db-backup:
	@echo "Backing up database..."
	docker-compose exec postgres pg_dump -U postgres appraisal_db | gzip > backups/db_$(shell date +%Y%m%d_%H%M%S).sql.gz
	@echo "✓ Backup complete: backups/db_$(shell date +%Y%m%d_%H%M%S).sql.gz"

db-restore:
	@echo "Enter backup filename:"
	@read BACKUP; \
	docker-compose exec -T postgres gunzip < $$BACKUP | psql -U postgres appraisal_db
	@echo "✓ Restore complete"

# ======================
# DEPLOYMENT
# ======================

deploy-dev:
	@echo "Deploying to development..."
	git push origin main
	# Add your CI/CD trigger here
	@echo "✓ Deployment started"

deploy-staging:
	@echo "Deploying to staging..."
	git tag staging-$(shell date +%Y%m%d_%H%M%S)
	git push origin staging-*
	@echo "✓ Deployment started"

deploy-prod:
	@echo "⚠️  Production deployment"
	@echo "Are you sure? [y/N]"
	@read CONFIRM; \
	if [ "$$CONFIRM" = "y" ]; then \
		git tag release-$(shell date +%Y%m%d_%H%M%S); \
		git push origin release-*; \
		echo "✓ Deployment initiated"; \
	else \
		echo "✗ Cancelled"; \
	fi

# ======================
# UTILITIES
# ======================

health:
	@echo "Checking system health..."
	@echo ""
	@echo "Frontend:"
	@curl -s http://localhost:5173 > /dev/null && echo "  ✓ Running" || echo "  ✗ Not running"
	@echo "Backend:"
	@curl -s http://localhost:3000/health > /dev/null && echo "  ✓ Running" || echo "  ✗ Not running"
	@echo "Database:"
	@docker-compose exec postgres pg_isready -U postgres > /dev/null 2>&1 && echo "  ✓ Running" || echo "  ✗ Not running"
	@echo "Redis:"
	@docker-compose exec redis redis-cli ping > /dev/null 2>&1 && echo "  ✓ Running" || echo "  ✗ Not running"

logs:
	docker-compose logs -f

versions:
	@echo "Node.js: $$(node --version)"
	@echo "npm: $$(npm --version)"
	@echo "TypeScript: $$(npx tsc --version)"
	@echo "Docker: $$(docker --version)"
	@echo "PostgreSQL: $$(psql --version)"

# ======================
# GIT
# ======================

status:
	git status

commit:
	@echo "Commit message:"
	@read MSG; \
	git add -A && git commit -m "$$MSG"

push:
	git push origin $$(git rev-parse --abbrev-ref HEAD)

pull:
	git pull origin $$(git rev-parse --abbrev-ref HEAD)

.DEFAULT_GOAL := help
