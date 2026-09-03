# PredictiveMaintenance

Technical foundation for an industrial maintenance support application. The intended MVP will help maintenance teams identify machines showing deterioration signals, understand the variables involved, and decide what to inspect first.

The predictive promise is not defined yet: it must be justified by the real dataset. This repository currently contains the technical bootstrap, not product features or a trained model.

## Current state

- Next.js full-stack application using the App Router
- Server-first modular monolith
- PostgreSQL selected through Prisma, with no speculative business models
- Local PostgreSQL through Docker Compose with an actionable setup check
- Database-independent health endpoint at `GET /api/health`
- Node.js tests and GitHub Actions validation

## Stack

| Component | Version |
| --- | --- |
| Node.js | `24.15.0` LTS |
| Next.js | `16.3.4` |
| React | `19.2.8` |
| TypeScript | `5.9.3` (strict) |
| Tailwind CSS | `4.3.3` |
| ESLint | `9.39.5` |
| Prisma ORM | `7.10.0` |
| PostgreSQL driver | `pg 8.23.0` |
| Zod | `4.5.4` |

## Requirements

- Node.js from `.nvmrc`
- npm compatible with `package-lock.json`
- Docker with Compose v2 for the bundled local PostgreSQL service

## Setup

```bash
git clone https://github.com/No-Country-simulation/S08-26-equipo-37.git
cd S08-26-equipo-37
nvm use
npm ci
```

Create the ignored local environment file:

```bash
# macOS or Linux
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

Then start PostgreSQL and the application together:

```bash
npm run dev:full
```

The command reports every missing prerequisite before starting PostgreSQL. Open `http://localhost:3000` and check readiness at `http://localhost:3000/api/health`. For UI or health-endpoint work that does not need PostgreSQL, use `npm run dev` instead.

## Environment variables

`DATABASE_URL` is required for the bundled PostgreSQL workflow. `.env.example` already matches the local Compose service; copy it without placing real credentials in the repository. An external PostgreSQL URL can be used without Docker by starting the app with `npm run dev`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local development |
| `npm run dev:full` | Validate setup, start PostgreSQL, and start local development |
| `npm run setup:check` | Report missing local database prerequisites |
| `npm run db:up` | Start and wait for the local PostgreSQL service |
| `npm run db:down` | Stop local Compose services while preserving database data |
| `npm test` | Run tests with Node.js |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run strict TypeScript checks |
| `npm run check` | Run lint and typecheck |
| `npm run build` | Create the production build |
| `npm start` | Serve the production build |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:validate` | Validate the Prisma schema |
| `npm run db:migrate` | Create and apply a development migration |
| `npm run db:studio` | Open Prisma Studio |

## Structure

```text
src/app/             Next.js routes and presentation
src/modules/         Domain modules, created only when a real slice exists
src/lib/             Environment and server-only infrastructure
prisma/              Database schema; intentionally contains no business models
test/                Small runnable behavior checks
docs/                Product, data, architecture, delivery, and security decisions
docs/adr/            Architecture Decision Records
```

The UI must not access Prisma directly. Requests flow from Next.js presentation or HTTP boundaries into application/domain code and then into server-only infrastructure. Server Components are the default; Client Components require a browser-specific need.

## Prisma

Prisma Client is generated during `npm ci`. Generation and schema validation work without a configured database; migrations and runtime queries require `DATABASE_URL`.

No machine, sensor, reading, alert, prediction, maintenance, failure, or component model exists yet. The dataset and domain decisions must come first.

## CI and deployment

GitHub Actions runs installation, tests, lint, typecheck, and build on pull requests and relevant pushes. A successful push to `main` then triggers Coolify; deployment secrets remain in GitHub, never in this repository.

Deployment target: `https://predictive-maintenance.smacaya.tech`.

## Documentation

- [`docs/PRODUCT.md`](docs/PRODUCT.md): facts, hypotheses, scope, and product decisions
- [`docs/DATA-STRATEGY.md`](docs/DATA-STRATEGY.md): dataset requirements and predictive options
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): server-first modular monolith
- [`docs/OPEN-QUESTIONS.md`](docs/OPEN-QUESTIONS.md): prioritized unresolved decisions
- [`docs/ROADMAP.md`](docs/ROADMAP.md): incremental phases without invented dates
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md): local workflow and commands
- [`docs/SECURITY.md`](docs/SECURITY.md): current security boundaries
- [`docs/adr/`](docs/adr/): accepted architectural decisions
- [`AGENTS.md`](AGENTS.md): operating rules for developers and coding agents

## Contributing

Read `AGENTS.md` and the relevant documentation before changing code. Keep changes small, preserve TypeScript strictness, validate external input with Zod, and run:

```bash
npm test
npm run check
npm run build
```

Use atomic Conventional Commits in the form `<type>(<scope>): <imperative lowercase description>`.

## Decisions needed next

The first blockers are the machine family, exact failure definition and target, real dataset, available sensors and sampling frequency, label quality, useful prediction horizon, output type, criticality rules, maintenance response, and measurable MVP success. See `docs/OPEN-QUESTIONS.md` before implementing domain behavior or tables.
