# Development

## Requirements

- Node.js `24.15.0` LTS (see `.nvmrc`)
- npm `11` or another version compatible with the lockfile
- Docker with Compose v2 for the bundled local PostgreSQL service
- Git LFS (`git-lfs`) for the data artifacts stored under `datos/` and `ml/datos/`

## Local setup

```bash
nvm use
npm ci
git lfs install
git lfs pull
```

Copy `.env.example` to `.env` with `cp .env.example .env` on macOS/Linux or `Copy-Item .env.example .env` in PowerShell, then run:

```bash
npm run dev:full
```

This validates Node.js, `.env`, `DATABASE_URL`, Docker, Compose, and the Docker daemon before starting PostgreSQL and Next.js. It reports all missing prerequisites together. `/api/health` remains database-independent; the authenticated dashboard and administration require PostgreSQL, migrations, and bootstrap data. `npm run dev` starts Next.js alone when an existing database is already available.

### Preparación de identidad y administración

Antes del primer ingreso, preparar la base con `npm run db:up` y `npm run db:migrate`. Configurar `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME` y `BOOTSTRAP_ADMIN_PASSWORD` en el `.env` ignorado o en el entorno del proceso, y ejecutar `npm run db:seed`. El script carga `.env`; no asumir que carga automáticamente `.env.local`. La cuenta inicial exige cambiar la contraseña en el primer login. Retirar después las variables `BOOTSTRAP_ADMIN_*` y no guardar la contraseña en comandos ni en el repositorio. Repetir el seed debe conservar el catálogo y las credenciales existentes. La verificación de este flujo se registra en [AUTH-ADMIN.md](./AUTH-ADMIN.md).

El seed registra los equipos del mock como referencias `MACHINE` independientes. No crea una organización, planta o área supuesta. La jerarquía real se carga explícitamente desde administración con `settings.update` global; hasta entonces, probar acceso global o por equipo.

`APP_URL` determina el origen de enlaces de invitación/reset y la configuración segura de la cookie. Usar HTTPS fuera de desarrollo local. SMTP y S3/R2 son opcionales y se configuran con las variables documentadas en `.env.example` y [AUTH-ADMIN.md](./AUTH-ADMIN.md). Probar correo primero con un transporte local; no asumir entrega externa por haber emitido un token. La galería admite URLs externas validadas aunque la carga de archivos no esté configurada.

En este entorno, SMTP ya está configurado en `.env.local`, ignorado por Git, con una contraseña de aplicación independiente autorizada para `no-reply@chenodo.ar`; la conexión TLS y la autenticación se verificaron. Next.js carga ese archivo, pero esto no configura otros entornos ni acredita entrega de mensajes. Las pruebas de invitación/reset e integración siguen registradas por separado. El almacenamiento S3/R2 puede permanecer deshabilitado y no requiere crear infraestructura externa para esta entrega.

### Pruebas de integración locales

`npm test` ejecuta las pruebas unitarias sin requerir una base de datos. La integración de identidad y administración se ejecuta por separado:

```bash
npm run test:integration
```

Antes de ejecutarla, crear la base dedicada `predictive_maintenance_e2e` en PostgreSQL local, aplicar las migraciones existentes y ejecutar `npm run db:seed` apuntando a esa base. Para este seed usar solamente el catálogo, sin variables `BOOTSTRAP_ADMIN_*`: el runner prepara su propio administrador sintético cuando la base no contiene usuarios.

El runner [`scripts/check-identity-integration.ts`](../scripts/check-identity-integration.ts) carga `.env`, exige que `DATABASE_URL` tenga host `127.0.0.1` y reemplaza el nombre de base por `predictive_maintenance_e2e`, terminado en `_e2e`. No crea ni migra la base. Las credenciales y el puerto de conexión proceden del entorno; nunca se imprimen. El comando incluye `--conditions=react-server --import tsx`, y el archivo no se descubre como parte de `npm test`.

Las nueve comprobaciones crean fixtures únicos y verifican invitación/reset de un solo uso, revocación de sesiones, suspensión, límites de permisos/ámbito/vigencia, protección del último administrador global y auditoría sin secretos. El runner borra las variables `SMTP_*` del proceso antes de importar servicios: no envía correo real.

Los fixtures quedan en la base dedicada y sus datos de acceso sintéticos se guardan en `.cache/e2e-fixtures.json`, ignorado por Git. Las ejecuciones siguientes reutilizan su administrador; conservar ese archivo junto a la base y mantener un solo administrador global permanente para comprobar su protección. El viewer de revisión queda limitado a `MACHINE M-01`, y los enlaces de prueba usan `http://127.0.0.1:3001`. No se levantan automáticamente un servidor web ni un transporte SMTP. La evidencia de integración, navegador y entrega externa se registra por separado en [AUTH-ADMIN.md](./AUTH-ADMIN.md#validación-y-pendientes).

## Dataset (Git LFS)

`datos/dataset_mantenimiento_predictivo_realista.csv` is stored with **Git LFS** (see `.gitattributes`). Without `git-lfs` installed, a clone, a repository ZIP download and `raw.githubusercontent.com` all return a three-line **pointer** instead of the CSV:

```
version https://git-lfs.github.com/spec/v1
oid sha256:c0614c789eef72d937a93767be22bb73ff5e32fda82ba7e97ca40ad3b383bcac
size 16768593
```

Install once per machine and pull the objects:

```bash
sudo pacman -S git-lfs   # Arch / EndeavourOS
# sudo apt install git-lfs   # Debian / Ubuntu
# brew install git-lfs       # macOS

git lfs install   # once per user
git lfs pull      # download the real file contents
```

Quick checks:

```bash
wc -c datos/dataset_mantenimiento_predictivo_realista.csv    # 16768593 (a pointer is ~133 bytes)
head -1 datos/dataset_mantenimiento_predictivo_realista.csv  # fecha_hora,id_maquina,...
```

If you only need the file and cannot install LFS, open it in the GitHub web UI and use **Download raw file**: that link serves the real content.

### Every data artifact goes through LFS

`.gitattributes` tracks **all** `*.csv` and `*.parquet` files with Git LFS. The rule is by extension on purpose: an earlier version matched only `datos/`, and a 16 MB duplicate of the dataset was committed under `ml/datos/` as a regular blob (PR #44), where it is copied into every clone from then on.

`npm run artifacts:validate` fails when a tracked data or model artifact exceeds 512 KiB, which means it bypassed LFS. It reads blob sizes from the Git index, so it needs neither `git-lfs` nor a download, and the `CI` workflow runs it on every pull request. Removing a file that already reached the history needs a rewrite of that history, so the check runs before the merge instead.

| Path | Contents | LFS |
| --- | --- | --- |
| `datos/dataset_mantenimiento_predictivo_realista.csv` | Canonical dataset (72,000 rows) | Yes — pointer in the index |
| `ml/datos/dataset_limpio.parquet` | Cleaned dataset produced by the notebooks | Yes — pointer in the index |

Do not keep a second copy of the dataset inside `ml/`: notebooks read the canonical CSV from its published URL or from `datos/`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run dev:full` | Validate setup, start PostgreSQL, and start the development server |
| `npm run setup:check` | Report missing local database prerequisites |
| `npm run data:validate` | Validate dataset integrity (fails when the file is a Git LFS pointer) |
| `npm run artifacts:validate` | Fail when a data or model artifact was committed without Git LFS |
| `npm run db:up` | Start and wait for the local PostgreSQL service |
| `npm run db:down` | Stop local Compose services while preserving database data |
| `npm test` | Run the Node.js test suite |
| `npm run test:integration` | Check identity/admin cases against the prepared local `predictive_maintenance_e2e` database, without SMTP |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Check TypeScript without emitting files |
| `npm run check` | Run lint and typecheck |
| `npm run build` | Create a production build |
| `npm start` | Serve a production build |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:validate` | Validate the Prisma schema |
| `npm run db:migrate` | Create and apply a development migration |
| `npm run db:seed` | Bootstrap identity permissions, system roles, machine references, and the initial administrator |
| `npm run db:studio` | Open Prisma Studio |

## Development flow

1. Confirm the change does not silently answer a question in `OPEN-QUESTIONS.md`.
2. Deliver the smallest vertical change that can be validated.
3. Keep presentation in `src/app`, domain behavior in a real module under `src/modules`, and database access behind server-only code.
4. Add or update the smallest test that demonstrates non-trivial behavior.
5. Run the Definition of Done commands from `AGENTS.md`.

Server Components are the default. Use a Client Component only for browser APIs, local interactive state, effects, or event handlers. Prefer Server Actions for UI-owned mutations and Route Handlers for HTTP APIs or external integrations.

## Data and Prisma

Identity, administration, audit, and presentation persistence are explicitly approved in [ADR 0007](./adr/0007-identity-administration.md). The MVP maintenance schema is in `prisma/schema.prisma` and [ADR 0008](./adr/0008-mvp-machine-hour-persistence.md). It is validated, and the migration is not created yet. For an approved schema change:

1. Update `prisma/schema.prisma`.
2. Run `npm run db:validate` and `npm run db:generate`.
3. Create a named migration with `npm run db:migrate -- --name <description>`.
4. Review generated SQL before applying it outside development.

Generated Prisma Client files stay ignored and are recreated by `postinstall`.

The Compose credentials are local-only. If port `5432` is already in use, stop the conflicting service or configure an external PostgreSQL instance and run `npm run dev` without Compose. If the setup check reports an unavailable daemon, start Docker Desktop or the Docker service and retry.

En la máquina Windows usada para esta entrega, el engine de Prisma falló al conectar con `localhost`, mientras la misma base respondió con `127.0.0.1`. Si se reproduce ese caso, cambiar únicamente el host de `DATABASE_URL` a `127.0.0.1` y repetir la comprobación. Es una observación de este entorno, no un requisito general de PostgreSQL ni motivo para cambiar credenciales o abrir acceso público.

## Dependencies

Pin direct dependencies and review their licenses and advisories before adding them. ESLint 10 uses `@next/eslint-plugin-next` directly with compatible configs in `eslint.config.mjs`; `eslint-config-next@16.3.4` pulls incompatible plugins (see `AGENTS.md`). The `deepmerge-ts` and `mysql2` overrides patch advisories in Prisma CLI transitive dependencies; remove them once Prisma carries fixed versions and all Prisma checks still pass.

## Git

Create atomic Conventional Commits. Inspect `git status`, the unstaged diff, and the staged diff before every commit. Never stage secrets, generated clients, build output, or unrelated changes.
