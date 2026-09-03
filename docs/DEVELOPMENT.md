# Development

## Requirements

- Node.js `24.15.0` LTS (see `.nvmrc`)
- npm `11` or another version compatible with the lockfile
- Docker with Compose v2 for the bundled local PostgreSQL service

## Local setup

```bash
nvm use
npm ci
```

Copy `.env.example` to `.env` with `cp .env.example .env` on macOS/Linux or `Copy-Item .env.example .env` in PowerShell, then run:

```bash
npm run dev:full
```

This validates Node.js, `.env`, `DATABASE_URL`, Docker, Compose, and the Docker daemon before starting PostgreSQL and Next.js. It reports all missing prerequisites together. The home page and health endpoint remain database-independent, so `npm run dev` is still available for work that does not need PostgreSQL.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run dev:full` | Validate setup, start PostgreSQL, and start the development server |
| `npm run setup:check` | Report missing local database prerequisites |
| `npm run db:up` | Start and wait for the local PostgreSQL service |
| `npm run db:down` | Stop local Compose services while preserving database data |
| `npm test` | Run the Node.js test suite |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Check TypeScript without emitting files |
| `npm run check` | Run lint and typecheck |
| `npm run build` | Create a production build |
| `npm start` | Serve a production build |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:validate` | Validate the Prisma schema |
| `npm run db:migrate` | Create and apply a development migration |
| `npm run db:studio` | Open Prisma Studio |

## Development flow

1. Confirm the change does not silently answer a question in `OPEN-QUESTIONS.md`.
2. Deliver the smallest vertical change that can be validated.
3. Keep presentation in `src/app`, domain behavior in a real module under `src/modules`, and database access behind server-only code.
4. Add or update the smallest test that demonstrates non-trivial behavior.
5. Run the Definition of Done commands from `AGENTS.md`.

Server Components are the default. Use a Client Component only for browser APIs, local interactive state, effects, or event handlers. Prefer Server Actions for UI-owned mutations and Route Handlers for HTTP APIs or external integrations.

## Data and Prisma

Do not add a model or migration until the dataset and relevant domain decisions are explicit. When that happens:

1. Update `prisma/schema.prisma`.
2. Run `npm run db:validate` and `npm run db:generate`.
3. Create a named migration with `npm run db:migrate -- --name <description>`.
4. Review generated SQL before applying it outside development.

Generated Prisma Client files stay ignored and are recreated by `postinstall`.

The Compose credentials are local-only. If port `5432` is already in use, stop the conflicting service or configure an external PostgreSQL instance and run `npm run dev` without Compose. If the setup check reports an unavailable daemon, start Docker Desktop or the Docker service and retry.

## Dependencies

Pin direct dependencies and review their licenses and advisories before adding them. ESLint 9 is retained because the official Next.js 16 configuration is not yet reliably compatible with ESLint 10. The `deepmerge-ts` and `mysql2` overrides patch advisories in Prisma CLI transitive dependencies; remove them once Prisma carries fixed versions and all Prisma checks still pass.

## Git

Create atomic Conventional Commits. Inspect `git status`, the unstaged diff, and the staged diff before every commit. Never stage secrets, generated clients, build output, or unrelated changes.
