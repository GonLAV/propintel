# Copilot instructions (spark-template / appraisal platform)

## Project snapshot
- Frontend is a Vite + React 19 + TypeScript app using **GitHub Spark** (`@github/spark`) and Tailwind CSS v4.
- UI primitives live in `src/components/ui/*` (shadcn-style + Radix). Prefer reusing these over ad-hoc markup.
- Domain focus: Israeli appraisal/AVM tooling (valuation engines, calculators, government data integrations).

## Key architecture & where to look
- App entry: `src/main.tsx` (Spark init, global CSS, `ErrorBoundary`).
- Main composition/tab routing: `src/App.tsx`.
- Persistent client-side state uses Spark KV: `useKV` from `@github/spark/hooks` (see `src/App.tsx`).
- Real data.gov.il transactions + basic comparative valuation: `src/lib/dataGovAPI.ts` (fetch → normalize → `calculateBasicValuation` → prompt generation).
- Core valuation math (comparables/cost/income + reconciliation + quality checks): `src/lib/valuationEngine.ts`.
- More advanced “professional” AVM logic: `src/lib/professionalAVM.ts`.
- Government integrations are split by source and sometimes unified (e.g. `src/lib/unifiedGovAPI.ts`).

## Conventions you must follow
- Imports: use `@/…` alias (configured in `vite.config.ts` + `tsconfig.json`).
- Class names: compose with `cn()` from `src/lib/utils.ts`.
- Styling: do not hardcode new colors; rely on theme tokens/variables (`src/styles/theme.css`, `theme.json`, `tailwind.config.js`).

## AI usage (Spark)
- AI calls are done via `window.spark.llm(prompt, model, jsonMode?)` in components.
- When you need structured output, request strict JSON and call with `jsonMode=true`, then parse/validate.
- Never claim AI-generated comparables/addresses are real. If generating synthetic data, label it explicitly as unverified.
- For “real-data” flows (e.g. data.gov valuation), prompts must forbid adding external facts and must not invent addresses.

## Dev workflows (what actually exists)
- Frontend:
  - `npm run dev`
  - `npm run build` (runs `tsc -b --noCheck && vite build`)
  - `npm run lint`
- Docker/Makefile:
  - `docker-compose.yml` and `Makefile` assume a `backend/` folder exists, but the repo currently only contains `backend.example.ts`.
  - To create a backend, follow `BACKEND_SETUP.md` (copy `backend.example.ts` into your new `backend/`).

## Testing notes
- There are Vitest-style tests in `src/lib/valuationEngine.test.ts`, but `package.json` currently has no `test` script.
- If you add/enable tests, align with Vitest and update scripts/config accordingly (don’t invent a Jest setup).
