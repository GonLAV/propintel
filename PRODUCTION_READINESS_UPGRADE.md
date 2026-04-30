# Production Readiness Upgrade

This pass hardens the existing Spark appraisal prototype and MVP backend without replacing the broader SaaS backend work already present in `saas-backend/`.

## Major Changes

### Central Runtime Configuration

Frontend API URL resolution now lives in `src/lib/runtimeConfig.ts`.

Before:

```ts
const apiBaseURL = import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:3001'
```

After:

```ts
const apiBaseURL = getMvpApiBaseUrl()
```

Why: backend-connected components no longer carry duplicated environment fallback logic, and the shared `createAPIClient()` default points to the MVP API port used by `backend/server.mjs`.

Supported frontend variables, in priority order:

1. `VITE_MVP_API_BASE_URL`
2. `VITE_API_BASE_URL`
3. `VITE_API_URL`
4. `http://localhost:3001`

### Safer API Client

`src/lib/apiClient.ts` now normalizes base URLs, enforces request timeouts, handles `204` responses, parses non-JSON responses safely, and surfaces structured errors through `APIClientError`.

Before:

```ts
const error = await response.json().catch(() => ({ message: response.statusText }))
throw new Error(error.message || `HTTP ${response.status}`)
```

After:

```ts
throw new APIClientError(message, {
  status: response.status,
  code,
  requestId,
  details,
})
```

Why: production UI and observability need status codes, request IDs, and validation details to debug real user failures.

### MVP Backend Hardening

`backend/server.mjs` now includes:

- Request IDs via `x-request-id`
- Basic security headers
- Strict CORS allowlist via `CORS_ORIGINS`
- Smaller JSON payload limit via `JSON_LIMIT` defaulting to `2mb`
- Bounded ingestion/comparable/report input sizes
- Sanitization for IDs, strings, numeric fields, and report metadata
- Structured API errors: `{ error: { code, message, requestId } }`
- Bounded in-memory retention for comparable runs, reports, and audit events

Before:

```js
app.use(cors())
app.use(express.json({ limit: '10mb' }))
```

After:

```js
app.use(cors({ origin: corsOrigin, maxAge: 600 }))
app.use(express.json({ limit: JSON_LIMIT }))
```

Why: open CORS and unbounded request sizes are not acceptable for a real API, especially one processing property and appraisal data.

### Safer File Persistence

`backend/persistence.mjs` now writes ingestion history atomically through a temporary file and caps retained runs.

Before:

```js
await fsp.writeFile(ingestionRunsPath, JSON.stringify(doc, null, 2), 'utf8')
```

After:

```js
await fsp.writeFile(tempPath, JSON.stringify(doc, null, 2), 'utf8')
await fsp.rename(tempPath, ingestionRunsPath)
```

Why: direct writes can leave a corrupted JSON file if the process exits mid-write.

## Test Discovery Hygiene

Root Vitest now only discovers tests under `src/**/*.test.{ts,tsx}` and explicitly excludes generated worktree copies and the separate SaaS backend package. This keeps `npm run test` focused on the Spark frontend/root TypeScript test suite instead of accidentally running duplicated `__wt` files or Jest-oriented backend tests.

## Production Build Reliability

The Vite build was hanging while transforming the `@phosphor-icons/react` barrel, which imports the entire CSR icon set plus the SSR bundle. The root Vite config now rewrites named Phosphor imports to per-icon CSR subpath imports during build, preserving the Spark icon fallback proxy while avoiding the full barrel transform cost.

Tailwind source scanning is also explicitly bounded to the root frontend app. The unused raw `coarse`, `fine`, and `pwa` screen aliases were removed because Tailwind v4 was applying them as invalid `.container` breakpoints.

## Release Quality Gates

The repository now uses `.github/workflows/ci-cd.yml` as the canonical pull-request gate. It can also be run manually with `workflow_dispatch` before a release.

The workflow validates:

- Root Spark app: `npm ci`, `npm run lint`, `npm test`, and `npm audit --audit-level=moderate`
- Premium frontend: `npm ci`, `npm run test`, `npm run typecheck`, `npm run security`, and `npm run build`
- Mobile app: `npm ci`, `npm run typecheck`, and `npm audit --audit-level=moderate`
- SaaS backend: `npm ci`, `npm run lint`, `npm run test:coverage`, and `npm audit --audit-level=moderate`

`.github/workflows/codeql.yml` runs JavaScript/TypeScript CodeQL with `security-extended` and `security-and-quality` queries on pushes, pull requests, a weekly schedule, and manual dispatch.

Both workflows use concurrency cancellation so newer pushes supersede stale runs for the same PR or branch. Dependabot is configured for the root app, `frontend/`, `mobile/`, `saas-backend/`, GitHub Actions, and devcontainers.

## Security Disclosure Policy

`SECURITY.md` is project-specific and directs maintainers to keep vulnerability reports private, avoid production data in reproductions, rotate secrets after suspected exposure, and validate fixes through the CI and CodeQL gates.

## Production Gaps Still To Close

These are critical before running real users at scale:

1. Choose one canonical backend. The repo currently has both the MVP backend in `backend/` and the fuller SaaS backend in `saas-backend/`.
2. Move appraisal persistence from Spark KV/file JSON to PostgreSQL with tenant isolation, backups, and migrations.
3. Add authentication/authorization to the root Spark app or migrate app flows to the SaaS backend auth model.
4. Persist audit logs in a tamper-resistant store. In-memory audit is not regulatory-grade.
5. Add production observability: central logs, metrics, traces, alerting, and error reporting.
6. Add e2e tests for valuation workflows, government API failures, report generation, and permission boundaries.
7. Replace synthetic/demo comparables in professional flows or label them as unverified everywhere.
8. Add secret management and environment validation for all external APIs.

## Recommended Direction

Use `saas-backend/` as the production backend foundation, then progressively migrate the root Spark app’s high-value workflows to authenticated SaaS endpoints. Keep `backend/` as a local MVP/demo service only, now with safer defaults.