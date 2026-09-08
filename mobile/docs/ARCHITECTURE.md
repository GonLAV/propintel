# DiraShield Architecture

## Frontend

- Expo React Native with TypeScript.
- RTL Hebrew-first layout using `I18nManager` and right-aligned inputs.
- Local navigation in MVP for speed; replace with React Navigation when route depth grows.
- Secure token storage with `expo-secure-store`.
- Evidence capture via `expo-image-picker` with local SHA-256 metadata fingerprints through `expo-crypto`.
- Current mobile hashes are proof-of-capture metadata fingerprints. Production evidence integrity still requires server-side content hashing after upload.

## Backend

Recommended production backend:

- Node.js 20 + Fastify or Express.
- PostgreSQL for cases, users, evidence metadata, and audit events.
- S3-compatible object storage for evidence files.
- Redis for OTP attempts, rate limiting, and refresh-token rotation state.
- Queue worker for PDF generation, OCR, and notification retries.

Firebase alternative for faster launch:

- Firebase Auth phone OTP.
- Firestore for cases/evidence metadata.
- Cloud Storage for files.
- Cloud Functions for letters/PDF/reminders.

## Database

See `backend-reference/schema.sql` for the production PostgreSQL shape.

Key principles:

- Every case belongs to exactly one user.
- Evidence stores metadata and hashes; binary files live in object storage.
- Audit events record sensitive actions.
- Soft delete user-facing records.

## Authentication

- MVP: Israeli phone OTP.
- Access JWT expires in 15 minutes.
- Refresh token is httpOnly on web, secure storage on mobile, rotated on every use.
- Future: Google/Apple OAuth and lawyer/admin roles.

## Admin Panel

Needed after MVP:

- Review flagged abuse.
- Manage lawyer partners.
- View support cases.
- Re-send OTP or lock abusive accounts.
- View aggregate conversion metrics only; no casual browsing of private evidence.

## Security Best Practices

- OWASP Top 10 protections through strict validation, authorization on every case ID, rate limiting, secure headers, and audit logs.
- Rate limit OTP start/verify by phone, IP, and device fingerprint.
- Validate all request bodies with Zod.
- Store files with private ACLs and short-lived signed URLs.
- Hash evidence content server-side after upload and compare it with the mobile metadata fingerprint.
- Encrypt sensitive PII fields where needed.
- Never trust client-provided user IDs.
- Use structured error envelopes without leaking internals.

## Deployment

### Firebase Fast Path

1. Create Firebase project in `me-west1` or closest supported region.
2. Enable Phone Auth.
3. Deploy Cloud Functions for API endpoints.
4. Configure Cloud Storage private bucket.
5. Publish Expo app with EAS Build.

### AWS Production Path

1. API: ECS Fargate or Lambda behind API Gateway.
2. DB: RDS PostgreSQL.
3. Cache: ElastiCache Redis.
4. Files: S3 with KMS encryption and signed URLs.
5. Notifications: SNS or Twilio Verify for OTP, SES for email.
6. Admin: Next.js app on Vercel or AWS Amplify.

## Folder Structure

```text
mobile/
  App.tsx
  app.json
  package.json
  src/
    components/
    features/
      auth/
      cases/
    lib/
    theme/
  backend-reference/
    openapi.yaml
    schema.sql
  docs/
    ARCHITECTURE.md
    PRODUCT_STRATEGY.md
```