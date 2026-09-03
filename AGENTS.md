# PredictiveMaintenance operating guide

## Project context

PredictiveMaintenance is an industrial maintenance support application. Its eventual purpose is to transform sensor data and maintenance history into useful information for detecting deterioration signals, prioritizing equipment, and planning interventions.

The definitive predictive scope depends on the available dataset. Do not promise a failure probability, remaining useful life, or any other predictive output until the data supports it.

## Read before developing

1. Read `README.md` and the relevant files under `docs/`.
2. Check `docs/OPEN-QUESTIONS.md`; do not silently answer an open product question.
3. Inspect `git status` and existing patterns before editing.

## MVP principles

Favor simplicity, vertical deliveries, early validation, and decisions grounded in available data. Avoid overengineering, premature infrastructure, speculative abstractions, premature microservices, and realtime behavior without a demonstrated need.

## Development rules

- Keep TypeScript in strict mode. Do not use `any` unless an exceptional case is documented.
- Validate external input with Zod at trust boundaries.
- Keep business logic outside React components.
- Use Server Components by default and add `"use client"` only for browser state, effects, or event handlers.
- Use Server Actions for internal UI mutations when appropriate and Route Handlers for APIs or external integrations.
- Do not access Prisma from UI components. Database access stays in server-only infrastructure code.
- Do not add a dependency without a current, concrete need.
- Do not invent business rules, domain tables, or data contracts from hypotheses.
- Keep functions small, names explicit, and existing useful comments intact.
- Reuse the established solution for a problem unless a different pattern has a documented reason.
- Keep secrets in environment variables and never expose them to Client Components.

## Definition of Done

Before considering a task complete, run:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Run database-specific checks when Prisma changes:

```bash
npm run db:generate
npm run db:validate
```

## Git conventions

Use atomic [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <imperative lowercase description>
```

Prefer `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, or `style`. Do not combine unrelated changes or commit generated files, secrets, temporary outputs, or `node_modules`.

## Documentation maintenance

Update the relevant document for every important architectural decision. Add an ADR under `docs/adr/` when a decision has meaningful alternatives or lasting consequences.

## Self-improving knowledge

Agents may record only durable, concrete lessons such as a library incompatibility, a required command, a repeatedly problematic pattern, framework-specific behavior, or a useful repository convention. Keep entries short and remove obsolete ones.

Do not use this section to change the product objective, MVP scope, security posture, primary stack, architecture, database choice, external contracts, or business decisions. Those changes require an explicit decision and, when appropriate, an ADR.

<!-- SELF-IMPROVING:START -->

- Next.js 16 maintains the `nextjs-agent-rules` block below when `next dev` runs; keep it committed so local development does not dirty the working tree.
- `eslint-config-next@16.3.4` is not reliably compatible with ESLint 10; retain ESLint 9 until upstream support is verified.
- Prisma packages are pinned to stable `7.10.0` because the npm `latest` tag currently targets a release candidate. Re-run Prisma checks and `npm audit` before changing the security overrides.

<!-- SELF-IMPROVING:END -->

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
