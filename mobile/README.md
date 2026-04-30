# DiraShield Mobile

DiraShield is a Hebrew-first mobile app for Israeli rental protection: deposits, repairs, handover records, and contract friction.

## Run

```bash
cd mobile
npm install
npm run start
```

## MVP Flow

1. Login with Israeli phone number.
2. Tap `פתיחת תיק`.
3. Choose category, enter address/contact, create case.
4. Share formal Hebrew letter with signed evidence summary.
5. Add camera or gallery evidence to a case; each item receives local SHA-256 metadata fingerprinting.
6. Review `Resolution Autopilot` for readiness score, evidence gaps, and the next recommended settlement move.
7. Review `Evidence Trust Ledger` for a chained evidence timeline, trust score, metadata warnings, and shareable proof summary.

## Production Checks

```bash
npm run typecheck
npm audit --audit-level=moderate
```

## Docs

- Product strategy: `docs/PRODUCT_STRATEGY.md`
- Market analysis: `docs/MARKET_ANALYSIS.md`
- Architecture/security/deployment: `docs/ARCHITECTURE.md`
- API reference: `backend-reference/openapi.yaml`
- Database schema: `backend-reference/schema.sql`