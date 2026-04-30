# PropIntel — SaaS MVP

Multi-tenant property appraisal SaaS:
- **`saas-backend/`** — Node.js + Express + Postgres + Redis production-ready API
- **`frontend/`** — React 18 + Vite SPA (created by `node frontend-bootstrap.mjs`)

> **Note:** the legacy Spark/Vite app at the repo root (`src/`) is a separate
> appraisal prototype. It's untouched by this MVP.

## Quick start

### 1. Backend
```bash
cd saas-backend
cp .env.example .env
docker compose up -d postgres redis
npm install
npm run migrate
npm run dev          # http://localhost:3000
```

### 2. Frontend
```bash
node frontend-bootstrap.mjs   # one-time: scaffolds frontend/
cd frontend
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173
```

### 3. Or full stack via Docker
```bash
cd saas-backend
docker compose up --build
```

## Project layout
```
saas-backend/         Node.js API (multi-tenant, JWT, RBAC, audit log, OWASP)
frontend/             React SPA (created by frontend-bootstrap.mjs)
.github/workflows/    CI for backend + frontend
Makefile.saas         convenience targets
frontend-bootstrap.mjs  generates frontend/ from a single script
```

See `saas-backend/README.md` and `frontend/README.md` for details.
