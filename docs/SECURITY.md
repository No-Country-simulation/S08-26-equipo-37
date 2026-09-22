# Security

This bootstrap applies only the controls justified by its current scope. Authentication, authorization, user data, and production database access have not been designed yet.

## Secrets and configuration

- Store secrets only in environment variables or the deployment platform's secret store.
- Never commit `.env`, `.env.local`, database credentials, API keys, deploy webhooks, or tokens.
- Keep `COOLIFY_DEPLOY_WEBHOOK` and `COOLIFY_TOKEN` in GitHub Actions secrets.
- Keep `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` in GitHub Actions secrets.
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

## ML prototype (`ml/api`)

The prediction prototype is not part of the deployment yet (see `ARCHITECTURE.md`), so it does not extend the production trust boundary today. The controls it would need are recorded here so they are not rediscovered when it is deployed.

- **No authentication and no rate limiting.** Any client that can reach it can call `/api/v1/predict/falla`.
- **The model is loaded with `joblib.load`, which deserializes pickle and runs code while loading.** The artifact is tracked in git ([ADR 0006](./adr/0006-binary-artifacts.md)), so anyone able to write to the repository can execute code inside the inference process. Treat the artifact as executable content: pin its integrity, and prefer a format that does not deserialize code if it is ever served from a path the team does not control.
- **Input validation is structural only.** Pydantic checks types, not ranges or history length. The endpoint computes rolling windows and fills missing values with zero, so a short or partial payload returns a plausible probability instead of an error.
- **The Python dependencies get no advisory updates.** `.github/dependabot.yml` covers `npm` and `github-actions` only, so the 60 pinned packages in `ml/api/requirements.txt` are never checked. That file is a freeze of the whole notebook environment — roughly half of it is Jupyter and plotting tooling the service does not import — so split the runtime set from the experiment set before enabling coverage, otherwise it will produce a stream of unrelated pull requests.
- The service reads the dataset and the model from the repository and does not touch PostgreSQL, so database credentials are not inside its trust boundary.

## Deferred controls

Authentication, authorization, rate limiting, audit logs, backup policy, data classification, and retention rules require concrete product and data decisions. Add them when those trust boundaries exist, not as speculative infrastructure.

Report suspected exposure immediately, revoke affected credentials, preserve relevant logs, and document the remediation without copying secrets into issues or commits.
