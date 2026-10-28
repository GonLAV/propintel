# PropIntel — SaaS MVP

Multi-tenant property appraisal SaaS:
- **`saas-backend/`** — Node.js + Express + Postgres + Redis production-ready API
- **`frontend/`** — Next.js 16 app (originally scaffolded by `node frontend-bootstrap.mjs`, since rebuilt substantially — see `app/appraiser/*` for the real Hebrew/RTL appraiser experience)

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
cd frontend
cp .env.example .env
npm install
npm run dev                   # http://localhost:3002
```

### 3. Or full stack via Docker
```bash
cd saas-backend
docker compose up --build
```

## Project layout
```
saas-backend/         Node.js API (multi-tenant, JWT, RBAC, audit log, OWASP)
frontend/             Next.js 16 app (originally scaffolded by frontend-bootstrap.mjs)
.github/workflows/    CI for backend + frontend
Makefile.saas         convenience targets
frontend-bootstrap.mjs  generates frontend/ from a single script
```

See `saas-backend/README.md` and `frontend/README.md` for details.
