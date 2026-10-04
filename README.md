# 🤖📈 PredictiveMaintenance 🏭🔧

Technical foundation for an industrial maintenance support application. The intended MVP will help maintenance teams identify machines showing deterioration signals, understand the variables involved, and decide what to inspect first.

The predictive promise still requires validation against the available data. The application currently includes a dashboard with simulated data, equipment details, authentication, and a back office for user management, roles, access control, auditing, and presentation management. The `ml/` workspace contains experiments and an inference prototype that are not yet integrated with the application.

## Current state

- Next.js full-stack application using the App Router
- Server-first modular monolith
- PostgreSQL through Prisma for identity, access, audit, and machine presentation
- Email/password login, revocable sessions, invitations, password recovery, and permissions by scope and validity
- Administrative users, roles, access assignments, audit, and machine presentation over the existing mock inventory
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
| ESLint | `10.11.0` |
| Prisma ORM | `7.10.0` |
| PostgreSQL driver | `pg 8.23.0` |
| Zod | `4.5.4` |

## Requirements

- Node.js from `.nvmrc`
- npm compatible with `package-lock.json`
- Docker with Compose v2 for the bundled local PostgreSQL service
- Git LFS (`git-lfs`) for the dataset stored under `datos/`

## Setup

```bash
git clone https://github.com/No-Country-simulation/S08-26-equipo-37.git
cd S08-26-equipo-37
nvm use
npm ci
git lfs install
git lfs pull
```

The dataset under `datos/` is stored with **Git LFS**. Without `git-lfs`, the CSV appears as a three-line pointer instead of the file (see [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md#dataset-git-lfs)).

Create the ignored local environment file:

```bash
# macOS or Linux
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

For the first startup, configure the following variables in the ignored `.env` file, using `.env.example` as a reference:

* `BOOTSTRAP_ADMIN_EMAIL`
* `BOOTSTRAP_ADMIN_NAME`
* `BOOTSTRAP_ADMIN_PASSWORD` — a password between 12 and 128 characters

Do not use an example password or include credentials in commands, commits, or documentation.

Then, prepare the database and start the application:

```bash
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

The seed creates the initial administrator only if the email does not already exist and requires the administrator to change the password on first login.

After the bootstrap process, remove the `BOOTSTRAP_ADMIN_*` variables from your local configuration. Subsequent runs preserve existing accounts and permissions. When the database is already prepared, `npm run dev:full` can be used to start PostgreSQL and Next.js together.

Open `http://127.0.0.1:3000`, which matches `APP_URL`, and verify the health endpoint at `http://127.0.0.1:3000/api/health`.

The dashboard and back office require a database connection, while the health endpoint remains independent. `npm run dev` starts only Next.js and can be used when a database is already available.

For the complete setup instructions, including the Prisma connection considerations on Windows, see [DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Environment variables

`DATABASE_URL` is required for the bundled PostgreSQL workflow. `.env.example` already matches the local Compose service; copy it without placing real credentials in the repository. An external PostgreSQL URL can be used without Docker by starting the app with `npm run dev`.

`APP_URL` defines the origin used for access links and must use HTTPS in production.

SMTP is configured through server-side environment variables. Local credentials can be stored in `.env.local`, which is ignored by Git and automatically loaded by Next.js.

Image uploads to S3/R2 are optional. If no storage provider is configured, validated external URLs can be used instead.

See [AUTH-ADMIN.md](docs/AUTH-ADMIN.md) for configuration details, limits, and evidence from local validation.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local development |
| `npm run dev:full` | Validate setup, start PostgreSQL, and start local development |
| `npm run setup:check` | Report missing local database prerequisites |
| `npm run db:up` | Start and wait for the local PostgreSQL service |
| `npm run db:down` | Stop local Compose services while preserving database data |
| `npm test` | Run tests with Node.js |
| `npm run test:integration` | Run identity and administration checks against the dedicated local E2E database |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run strict TypeScript checks |
| `npm run check` | Run lint and typecheck |
| `npm run build` | Create the production build |
| `npm start` | Serve the production build |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:validate` | Validate the Prisma schema |
| `npm run db:migrate` | Create and apply a development migration |
| `npm run db:seed` | Seed permissions, system roles, machine references, and an optional initial administrator |
| `npm run db:studio` | Open Prisma Studio |

`npm run test:integration` requires PostgreSQL running on `127.0.0.1` and the dedicated `predictive_maintenance_e2e` database to be migrated and seeded with the catalog data.

The test runner enforces the `_e2e` database suffix, keeps synthetic fixtures in `.cache/`, and disables SMTP. These tests are not part of `npm test`.

See [Local integration tests](docs/DEVELOPMENT.md#pruebas-de-integración-locales) for more details.

## Structure

```text
src/app/             Next.js routes and presentation
src/modules/         Identity, administration, machine presentation, and maintenance read models
src/lib/             Environment and server-only infrastructure
prisma/              Identity, authorization, audit, and presentation schema and migrations
test/                Small runnable behavior checks
docs/                Product, data, architecture, delivery, and security decisions
docs/adr/            Architecture Decision Records
```

The UI must not access Prisma directly. Requests flow from Next.js presentation or HTTP boundaries into application/domain code and then into server-only infrastructure. Server Components are the default; Client Components require a browser-specific need.

## Prisma

Prisma Client is generated during `npm ci`. Generation and schema validation work without a configured database; migrations and runtime queries require `DATABASE_URL`.

Identity and presentation models are defined in [ADR 0007](docs/adr/0007-identity-administration.md). `AccessResource` stores authorization references and their explicit hierarchy; the seed registers only mock machines without inventing plants or organizations. No technical machine, sensor, reading, alert, prediction, maintenance, failure, or component model exists yet. Those tables still require dataset and domain decisions.

## CI and deployment

GitHub Actions runs installation, tests, lint, typecheck, and build on pull requests and relevant pushes. A successful push to `main` then triggers Coolify; deployment secrets remain in GitHub, never in this repository.

Deployment target: `https://predictive-maintenance.smacaya.tech`.

## Documentation

**Entry point: [`docs/README.md`](docs/README.md)** — index of the whole project documentation.

- [`docs/BACKLOG.md`](docs/BACKLOG.md): what every task means and how it is considered done
- [`docs/SPEC-MVP-PARAMETERS.md`](docs/SPEC-MVP-PARAMETERS.md): MVP parameters to be agreed (target, features, metrics, threshold)
- [`docs/MINUTES.md`](docs/MINUTES.md): compiled meeting minutes (newest first)
- [`docs/PRODUCT.md`](docs/PRODUCT.md): facts, hypotheses, scope, and product decisions
- [`docs/DATA-STRATEGY.md`](docs/DATA-STRATEGY.md): dataset requirements and predictive options
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): server-first modular monolith
- [`docs/AUTH-ADMIN.md`](docs/AUTH-ADMIN.md): identity, administration, setup boundaries, and acceptance checks
- [`docs/OPEN-QUESTIONS.md`](docs/OPEN-QUESTIONS.md): prioritized unresolved decisions
- [`docs/ROADMAP.md`](docs/ROADMAP.md): incremental phases without invented dates
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md): local workflow, commands and Git LFS
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

## Project Limitations and Open Questions

The initial blockers were the machine family, exact failure definition and target, real dataset, available sensors and sampling frequency, label quality, useful prediction horizon, output type, criticality rules, maintenance response, and measurable MVP success. See `docs/OPEN-QUESTIONS.md` for the questions that needed to be addressed before implementing domain behavior or database tables.

## Team

This project was developed collaboratively using the Agile Scrum methodology within the No Country environment (S08-26-equipo-37).

The team consisted of:

* **Héctor Medina Rodríguez** — Project Manager & Data Analyst
* **Sebastian Macaya** — Software Engineer
* **Pedro L. Acosta Pérez** — Data Analyst & Project Manager
* **Flavio Taya Ramos** — Machine Learning Engineer
* **Diego Borges Salces** — Backend Developer
