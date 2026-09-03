# Development

## Requirements

- Node.js `24.15.0` LTS (see `.nvmrc`)
- npm `11` or another version compatible with the lockfile
- PostgreSQL only when database work begins

## Local setup

```bash
nvm use
npm ci
npm run dev
```

The home page and health endpoint do not require a database. Copy `.env.example` to an ignored local environment file only when running a database command or code that calls `getPrisma()`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
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

## Dependencies

Pin direct dependencies and review their licenses and advisories before adding them. ESLint 9 is retained because the official Next.js 16 configuration is not yet reliably compatible with ESLint 10. The `deepmerge-ts` and `mysql2` overrides patch advisories in Prisma CLI transitive dependencies; remove them once Prisma carries fixed versions and all Prisma checks still pass.

## Git

Create atomic Conventional Commits. Inspect `git status`, the unstaged diff, and the staged diff before every commit. Never stage secrets, generated clients, build output, or unrelated changes.
