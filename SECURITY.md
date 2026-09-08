# Security Policy

PropIntel handles appraisal, property, finance, and workflow data. Treat all vulnerability reports and suspected data exposure as sensitive.

## Supported Branches

Security fixes are prioritized for `main` and active release branches. Feature branches may receive security changes when the issue affects code that is planned for merge.

## Reporting A Vulnerability

Do not open a public GitHub issue, discussion, or pull request for a security vulnerability.

Use GitHub private vulnerability reporting for this repository when available. If private reporting is unavailable, contact the repository owner directly and include only the minimum sensitive detail needed to triage the issue.

Include:

- Affected package or surface: root Spark app, `frontend/`, `mobile/`, `backend/`, or `saas-backend/`
- Vulnerability class, such as authentication bypass, injection, XSS, SSRF, insecure direct object reference, or sensitive data exposure
- Reproduction steps using non-production data
- Impact assessment and affected roles or tenants
- Relevant commit, branch, endpoint, or route

## Handling Standards

- Triage high-impact reports within 2 business days.
- Avoid sharing exploit details outside maintainers until a fix is available.
- Patch root cause first, then add regression tests or automated checks.
- Rotate secrets immediately if credentials, tokens, cookies, API keys, or encryption keys may have been exposed.
- Validate fixes through the quality gates in `.github/workflows/ci-cd.yml` and CodeQL in `.github/workflows/codeql.yml`.

## Security Baseline

Before release, maintainers must confirm:

- Authentication and authorization are enforced on protected surfaces.
- User-controlled input is validated with typed schemas or bounded sanitizers.
- No logs, client payloads, audit events, or screenshots expose secrets, tokens, private keys, or raw sensitive financial data.
- CORS, cookies, session lifetime, rate limiting, and security headers are configured for the deployment environment.
- Dependency audits and CodeQL are clean or have accepted, documented exceptions.

## Test Data

Use synthetic or explicitly anonymized data for security reports and reproduction. Do not submit real customer records, credentials, government identifiers, private addresses, or financial documents unless maintainers explicitly request a secure transfer method.
