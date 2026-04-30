# PropIntel SaaS Backend

Production-ready, multi-tenant SaaS backend for property appraisal.
Stack: **Node.js 20 + Express + PostgreSQL 16 + Redis 7**.

## Highlights
- Clean layered architecture: `routes → controllers → services → repositories`
- API versioning under `/api/v1`
- Multi-tenant isolation (tenant_id on every domain table + JWT-bound tenant)
- JWT access tokens (HS256) + opaque rotating refresh tokens with reuse detection
- RBAC: `owner | admin | member | viewer`
- Helmet, strict CORS allowlist, zod validation, Redis-backed rate limiting (IP + user + auth)
- AES-256-GCM field-level encryption helper for PII
- Structured pino JSON logs + request correlation ID
- Audit log table for sensitive actions
- Soft-delete on all critical entities
- Multi-stage Docker image, docker-compose stack, GitHub Actions CI

## Quick start
```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npm run migrate
npm run dev
# health
curl http://localhost:3000/healthz
```

## Scripts
| Command | Purpose |
|---|---|
| `npm run dev` | start with nodemon |
| `npm start` | start production server |
| `npm run migrate` | apply migrations (node-pg-migrate, raw SQL in `sql/`) |
| `npm run migrate:down` | revert one migration |
| `npm test` | run jest (unit + integration) |
| `npm run lint` | eslint (airbnb-base) |

## Environment
See `.env.example`. **Required in production:** `DATABASE_URL`, `REDIS_URL`,
`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY` (64 hex chars), `COOKIE_SECRET`.

## API
All endpoints (except `/healthz`, `/readyz`, `/api/v1/auth/*`) require
`Authorization: Bearer <accessToken>`.

```
POST   /api/v1/auth/register            { email, password, fullName, tenantName, tenantSlug }
POST   /api/v1/auth/login               { email, password, tenantSlug? }
POST   /api/v1/auth/refresh             { refreshToken }
POST   /api/v1/auth/logout              { refreshToken }
GET    /api/v1/auth/me

GET    /api/v1/tenants/me
PATCH  /api/v1/tenants/me               (owner)

GET    /api/v1/users
GET    /api/v1/users/:id
PATCH  /api/v1/users/:id                (owner|admin)
PATCH  /api/v1/users/:id/role           (owner|admin)
DELETE /api/v1/users/:id                (owner|admin)

GET    /api/v1/properties
POST   /api/v1/properties               (owner|admin|member)
GET    /api/v1/properties/:id
PATCH  /api/v1/properties/:id           (owner|admin|member)
DELETE /api/v1/properties/:id           (owner|admin)

GET    /api/v1/valuations
POST   /api/v1/valuations               { propertyId, method, inputs? }
GET    /api/v1/valuations/:id
DELETE /api/v1/valuations/:id           (owner|admin)

GET    /api/v1/reports
POST   /api/v1/reports                  { valuationId, title, format }
GET    /api/v1/reports/:id
DELETE /api/v1/reports/:id              (owner|admin)
```

## Security notes
- Passwords: bcrypt (cost 12 by default).
- Refresh tokens: 48-byte opaque, sha256-hashed at rest, rotated per use, reuse → revoke family.
- Tenant isolation: every repository query filters by `tenant_id`. The `enforceTenant`
  middleware blocks requests that try to override `tenantId` via path/query/body.
- All sensitive actions write to `audit_logs` (see `src/utils/audit.js`).
- Generic 401 message on auth failure to avoid user enumeration.
- `helmet` + strict CORS allowlist + `x-powered-by` disabled.

## Project structure
```
saas-backend/
├── src/
│   ├── config/        # env, logger, db, redis
│   ├── middleware/    # correlationId, httpLogger, auth, tenant, validate, rateLimiter, errorHandler
│   ├── utils/         # errors, jwt, encryption, audit, pagination
│   ├── api/v1/
│   │   ├── routes/        controllers/   services/    repositories/    validators/
│   ├── app.js          # express wiring
│   └── server.js       # bootstrap + graceful shutdown
├── sql/               # node-pg-migrate raw SQL migrations
├── tests/             # unit + integration (jest + supertest)
├── Dockerfile
└── docker-compose.yml
```

## Migrations
Raw-SQL migrations in `sql/`, applied with `node-pg-migrate`:
```bash
npm run migrate           # up
npm run migrate:down      # roll back one
```

## Testing
```bash
npm test                  # jest with coverage
```
Integration tests mock the DB/Redis layer so they run without infrastructure.
For full e2e, run `docker compose up` first and run jest with real env.

## Production
- Build: `docker build -t propintel-api .`
- Run: `docker compose up --build`
- Behind a reverse proxy: set `TRUST_PROXY=1`, `COOKIE_SECURE=true`, set strong secrets.
