# Security

Identity, authorization, and administrative audit now have an explicit scope in [ADR 0007](./adr/0007-identity-administration.md). Implementation acceptance is tracked in [AUTH-ADMIN.md](./AUTH-ADMIN.md); it must not be inferred from this design document. Production database operations still require deployment-specific configuration.

## Secrets and configuration

- Store secrets only in environment variables or the deployment platform's secret store.
- Never commit `.env`, `.env.local`, database credentials, API keys, deploy webhooks, or tokens.
- Keep `COOLIFY_DEPLOY_WEBHOOK` and `COOLIFY_TOKEN` in GitHub Actions secrets.
- Keep `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` in GitHub Actions secrets.
- Never expose server variables through `NEXT_PUBLIC_*` unless their disclosure is intentional.
- SMTP and object-storage credentials are server-only secrets. Do not paste invitation/reset links or bootstrap passwords into logs, issues, or screenshots. Do not rotate a mailbox password shared with another product without coordinating that change.

## Trust boundaries

- Validate external input with Zod before using it.
- Return controlled errors from Route Handlers and Server Actions; do not expose stack traces or internal connection details.
- Keep Prisma and database credentials in server-only modules. UI components must not query Prisma directly.
- Collect and retain only data required for an agreed product outcome.

## Identidad y autorización

Las contraseñas se derivan con `scrypt` de Node.js y sal aleatoria. La aplicación conserva hashes de tokens de sesión, invitación y recuperación, no los tokens originales. La cookie de sesión es `HttpOnly` y `SameSite=Lax`; producción debe usar `APP_URL` HTTPS para activar `Secure`. Las sesiones vencen y el cambio de contraseña invalida las previas. Una cuenta suspendida o pendiente de activación no obtiene acceso operativo.

La política central evalúa permiso, ámbito y vigencia. El contexto del recurso y sus ancestros se resuelve desde `AccessResource` en servidor. Las consultas filtran los registros autorizados y las mutaciones comprueban de nuevo el usuario y sus asignaciones vigentes. `hasAnyPermission` sólo controla navegación; no sustituye `can` para un recurso ni `canDelegate` para otorgar accesos. El nombre de un rol nunca evita estas comprobaciones.

El consumo de invitaciones y resets debe ser transaccional y de un solo uso. La recuperación pública usa una respuesta genérica, incluso cuando no existe una cuenta activa. El límite de intentos persistido protege login, solicitudes de reset, consumo de tokens y cambio de contraseña por identificador; no es una protección perimetral general contra tráfico distribuido. El catálogo y los límites concretos están documentados en [AUTH-ADMIN.md](./AUTH-ADMIN.md).

La auditoría registra cambios sensibles con actor, entidad y ámbito, excluyendo contraseñas, hashes, tokens, cookies y secretos. Las vistas de auditoría también requieren autorización por ámbito. Los controles deben verificarse mediante acciones directas además de la navegación normal de la UI.

## Imágenes y proveedores externos

La galería guarda URLs y metadatos. Las URLs externas se validan sin descargarlas desde el servidor. Las cargas admiten JPEG, PNG y WEBP hasta 5 MiB y verifican firma; no admiten SVG. La validación de firma no constituye un saneamiento completo del contenido. El almacenamiento S3 compatible sólo se habilita con configuración completa, y las credenciales no llegan al navegador.

Eliminar una referencia de galería no borra el objeto del proveedor. La retención y limpieza de objetos huérfanos deben definirse junto con backups y ciclo de vida de datos. La entrega SMTP y la carga real de archivos requieren pruebas independientes de las pruebas locales de identidad.

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

Backup policy, data classification, retention and cleanup of audit/session/token/rate-limit records, object-storage lifecycle, and production monitoring remain operational decisions. Authentication and administrative audit are now in scope; SSO and MFA are not part of this delivery. Do not treat passing local tests as evidence that deployment credentials, SMTP delivery, storage access, or recovery procedures work in production.

Report suspected exposure immediately, revoke affected credentials, preserve relevant logs, and document the remediation without copying secrets into issues or commits.
