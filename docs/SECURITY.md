# Security

This bootstrap applies only the controls justified by its current scope. Authentication, authorization, user data, and production database access have not been designed yet.

## Secrets and configuration

- Store secrets only in environment variables or the deployment platform's secret store.
- Never commit `.env`, `.env.local`, database credentials, API keys, deploy webhooks, or tokens.
- Keep `COOLIFY_DEPLOY_WEBHOOK` and `COOLIFY_TOKEN` in GitHub Actions secrets.
- Never expose server variables through `NEXT_PUBLIC_*` unless their disclosure is intentional.

## Trust boundaries

- Validate external input with Zod before using it.
- Return controlled errors from Route Handlers and Server Actions; do not expose stack traces or internal connection details.
- Keep Prisma and database credentials in server-only modules. UI components must not query Prisma directly.
- Collect and retain only data required for an agreed product outcome.

## Database

Use a dedicated PostgreSQL role with the least privileges required by the application. Separate migration privileges from runtime privileges when production database work begins. Do not enable public database access merely for developer convenience.

## Dependencies and delivery

- Commit the lockfile and use `npm ci` in CI and deployments.
- Review dependency advisories and update deliberately; do not apply breaking automated fixes without validation.
- CI must pass tests, lint, typecheck, and build before it can trigger deployment.
- Keep deploy tokens scoped to deployment and rotate them if exposed.

## Deferred controls

Authentication, authorization, rate limiting, audit logs, backup policy, data classification, and retention rules require concrete product and data decisions. Add them when those trust boundaries exist, not as speculative infrastructure.

Report suspected exposure immediately, revoke affected credentials, preserve relevant logs, and document the remediation without copying secrets into issues or commits.
