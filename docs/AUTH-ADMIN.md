# Identidad y administración

La incorporación de autenticación, usuarios, roles, accesos, auditoría y presentación de equipos fue solicitada explícitamente el 2026-09-27. La arquitectura se registra en [ADR 0007](./adr/0007-identity-administration.md). La entrega funcional local está validada; la sección final distingue la evidencia automatizada, de navegador y de correo, sin acreditar un despliegue en producción.

## Límites de la entrega

El backoffice administra identidad y presentación sobre los equipos del mock. No agrega telemetría, sensores, predicciones, órdenes de trabajo, ERP/CMMS, notificaciones push, tiempo real, SSO ni MFA. Los permisos de alertas describen capacidades del catálogo; por sí solos no implementan las operaciones de un backend de mantenimiento.

La persistencia de acceso no valida el modelo industrial propuesto en otros documentos. `AccessResource` contiene referencias de autorización, mientras `MachinePresentation` y `MachineImage` contienen personalización. No se crean plantas ni organizaciones ficticias para completar el seed.

## Componentes y datos

| Componente | Responsabilidad |
| --- | --- |
| `src/modules/identity` | Credenciales, sesiones, invitaciones, recuperación, política de permisos, referencias y auditoría |
| `src/modules/admin` | Usuarios, roles, asignaciones, resumen administrativo y consulta de auditoría |
| `src/modules/machine-presentation` | Personalización, galería, validación de imágenes y almacenamiento opcional |
| `src/app` | Server Components y acciones que coordinan los casos de uso; sin acceso directo a Prisma |
| `prisma/schema.prisma` | `User`, `Session`, `Role`, `Permission`, `RolePermission`, `UserRoleAssignment`, `AccessResource`, `Invitation`, `PasswordResetToken`, `AuthRateLimit`, `MachinePresentation`, `MachineImage`, `AuditLog` |

El usuario guarda identidad, estado, fechas de acceso y cambio de contraseña y el indicador de cambio obligatorio. Sus asignaciones son múltiples; los permisos efectivos no se guardan en la cookie ni dependen de un nombre de rol. Las respuestas enviadas a componentes cliente deben excluir `passwordHash` y tokens.

## Preferencia de apariencia

Desde **Mi perfil → Apariencia**, cada usuario puede guardar el tema **Claro** u **Oscuro**. `User.theme` usa un enum con `light` por defecto, también para cuentas existentes. La preferencia acompaña la cuenta entre sesiones y dispositivos; una visita sin sesión usa claro, independientemente del tema del sistema operativo.

La preferencia se presenta como una fila compacta con opciones agrupadas y guardado explícito. Los paneles del perfil comparten ancho; en móvil se apilan los controles conservando áreas táctiles de al menos 44 px.

La acción valida el valor con Zod y deriva el usuario exclusivamente de la sesión. Sólo actualiza su preferencia, incluso cuando tiene pendiente cambiar la contraseña, sin modificar permisos. El layout y el viewport leen el mismo usuario mediante caché de React limitada al render; el HTML inicial incluye el tema y no depende de un efecto del navegador. Al guardar se revalida el layout para aplicar la elección en la misma respuesta. La migración `20260929195310_user_theme_preference` debe aplicarse antes de servir esta versión.

La comprobación de integración cubre el valor inicial, persistencia, aislamiento entre cuentas y rechazo de valores inválidos y cuentas suspendidas.

Validado el 29/09/2026: 36 tests, 10 comprobaciones de integración, lint, typecheck, build y generación/validación de Prisma. En navegador se comprobó claro → oscuro → claro sin recarga, persistencia al navegar/recargar/reingresar, otra cuenta y visitas sin sesión en claro, y el perfil/dashboard oscuro en escritorio y móvil de 390 px.

## Acceso y vigencia

La fuente del catálogo es [`catalog.ts`](../src/modules/identity/catalog.ts). El seed debe ser idempotente: repetirlo no duplica permisos, roles ni referencias y no reinicia la contraseña de una cuenta existente.

| Rol de sistema | Capacidades iniciales |
| --- | --- |
| `SUPER_ADMIN` | Todos los permisos del catálogo |
| `ADMIN` | Administración y operación, excepto `settings.update` y `roles.manage_permissions` |
| `PLANT_MANAGER` | Supervisión y edición de presentación e imágenes dentro de su ámbito |
| `SUPERVISOR` | Lectura, reconocimiento y cambio de estado de alertas, y asignación de alertas |
| `TECHNICIAN` | Lectura, reconocimiento y cambio de estado de alertas |
| `VIEWER` | Dashboard, lista y detalle de equipos, alertas y actividad |

Los nombres anteriores no otorgan accesos por sí mismos. Cada comprobación usa la clave del permiso, una asignación vigente y un contexto de recurso resuelto en servidor.

- Ámbitos: `GLOBAL`, `ORGANIZATION`, `PLANT`, `AREA`, `MACHINE`. `GLOBAL` requiere `scopeRef = null`; cualquier otro ámbito requiere una referencia registrada.
- El parentesco explícito permite que un permiso de planta alcance áreas o equipos de esa planta. Un identificador enviado por el cliente no prueba esa pertenencia.
- `validFrom` es inclusivo y `validUntil` exclusivo; `null` significa sin límite en ese extremo. Los intervalos inválidos o vencidos no autorizan. Los formularios administrativos expresan las fechas en UTC.
- Las asignaciones se muestran como Activo, Pendiente, Vencido o Suspendido según fechas y estado del usuario. Una cuenta invitada no tiene acceso operativo.
- `can(actor, permission, resource)` autoriza un recurso. Sin contexto, sólo una asignación global puede satisfacerlo. `hasAnyPermission` sirve para navegación, nunca para autorizar registros.
- `canDelegate` exige que cada permiso delegado y `users.manage_access` estén cubiertos durante todo el intervalo solicitado por una asignación propia vigente del mismo ámbito o superior. Una concesión temporal no permite delegar acceso ilimitado; ámbitos o períodos parciales no se suman para ampliar autoridad.
- `mustChangePassword` impide permisos operativos hasta completar el cambio. Suspender una cuenta bloquea el acceso aunque conserve una cookie.

La lectura de una cuenta requiere cobertura de sus ámbitos con el permiso de consulta; no exige poseer sus permisos operativos. Las mutaciones sensibles comprueban además los privilegios y la vigencia restante de las asignaciones del destinatario: un administrador temporal no puede controlar una identidad con autoridad de mayor duración. La autorización se vuelve a evaluar en las mutaciones, no sólo al renderizar el formulario.

## Credenciales y entrega de enlaces

Las contraseñas de 12 a 128 caracteres se derivan con `scrypt` y sal aleatoria. Las sesiones usan un token aleatorio de 32 bytes y PostgreSQL conserva su SHA-256, con vencimiento de siete días. La cookie `pm_session` es `HttpOnly`, `SameSite=Lax` y `Secure` cuando `APP_URL` usa HTTPS. `APP_URL` debe ser un origen sin ruta, credenciales, query ni fragmento; HTTP sólo se admite en desarrollo local.

Las invitaciones duran 48 horas y los enlaces de recuperación 30 minutos. Una nueva emisión invalida los enlaces anteriores pendientes para esa finalidad. El consumo comprueba estado y vencimiento, marca el token como usado dentro de la transacción y cambia la contraseña; no basta con que la pantalla haya validado el enlace antes. El cambio de contraseña invalida sesiones y enlaces de recuperación pendientes.

El transporte usa `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM`, `SMTP_USER` y `SMTP_PASSWORD` del servidor. El remitente autorizado `no-reply@chenodo.ar` se verificó activo en hPanel el 2026-09-27: Hostinger indica `smtp.hostinger.com`, puerto `465`, TLS/SSL (`SMTP_SECURE=true`) y el correo completo como usuario. El buzón tiene 2FA; se creó con autorización una contraseña de aplicación independiente «PredictiveMaintenance» y se guardó únicamente en `.env.local`, ignorado por Git. La credencial «CheNodo VPS» del otro producto quedó intacta. TLS y autenticación SMTP se verificaron. Los dos mensajes de prueba fueron aceptados por SMTP y hPanel los mostró como entregados; Gmail confirmó la invitación en Spam y la recuperación en Recibidos, ambas con hora visible 11:19. La recepción de la invitación en Spam no acredita llegada a la bandeja principal.

Si SMTP no está disponible, un administrador autorizado puede copiar el enlace de invitación. Esto no debe convertirse en una devolución de tokens en la recuperación pública: `/forgot-password` responde sin revelar si el correo existe. Ningún enlace sensible debe persistirse en logs, auditoría o documentación.

## Recursos e imágenes

El seed registra las referencias de los equipos existentes y deja vacío su parentesco hasta cargar datos reales. La edición de la jerarquía requiere `settings.update` global. Deben rechazarse referencias desconocidas, ciclos y relaciones incompatibles; renombrar una referencia no puede ampliar permisos silenciosamente.

`MachinePresentation.machineRef` identifica el equipo del mock. El nombre visible y la descripción son opcionales; la galería permite texto alternativo, imagen principal, orden y eliminación de referencias. La ausencia de personalización conserva la vista de respaldo y no oculta un equipo autorizado.

Las URLs externas admitidas son públicas, HTTPS, sin credenciales y con extensión JPEG, PNG o WEBP; no se descargan en el servidor. La carga de archivos exige almacenamiento configurado, límite de 5 MiB y comprobación de firma JPEG/PNG/WEBP. SVG queda excluido. La comprobación de firma no equivale a decodificar o sanear completamente la imagen.

El almacenamiento opcional usa `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_REGION`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_ACCESS_KEY_ID`, `OBJECT_STORAGE_SECRET_ACCESS_KEY` y `OBJECT_STORAGE_PUBLIC_URL`. PostgreSQL sólo conserva URL y metadatos. Borrar una imagen de la galería borra su referencia; la limpieza física de objetos, incluidos posibles objetos huérfanos si falla la persistencia posterior a una subida, queda pendiente de una política del proveedor.

## Matriz de requisitos verificables

La columna de comprobación describe lo necesario para cerrar cada requisito; no afirma que la prueba ya se haya ejecutado. La evidencia automatizada y manual se registra en la sección siguiente.

| Requisito | Punto de implementación o ruta prevista | Comprobación de aceptación |
| --- | --- | --- |
| Inicio y cierre de sesión | `/login`, `/logout`; `identity/auth.ts`, `identity/service.ts` | Cuenta activa ingresa; credencial inválida, invitada o suspendida no ingresa; logout invalida la sesión |
| Sesión protegida | `Session`, cookie `pm_session` | Token en DB hasheado, expiración efectiva, atributos de cookie correctos en HTTPS y ausencia de hashes en respuestas |
| Perfil sin autoelevación | `/profile` | Ver identidad, roles y ámbitos; cambiar contraseña propia y cerrar sesión; no editar privilegios |
| Cambio obligatorio de contraseña | `mustChangePassword`, política central | Login conduce a cambio de contraseña; no se accede al dashboard o backoffice antes de completarlo |
| Recuperación | `/forgot-password`, `/reset-password/[token]` | Respuesta pública genérica; token vencido o consumido falla; éxito invalida sesiones anteriores |
| Invitación | `/invite/[token]` | Token hasheado y único, vencimiento, activación sólo de cuenta invitada y rechazo del segundo consumo |
| Catálogo idempotente | `identity/catalog.ts`, seed | Existen seis roles de sistema y todos los permisos; repetir el seed no duplica ni reinicia credenciales |
| RBAC | `identity/policy.ts` | Viewer global puede leer y no administrar; permiso ausente deniega aunque el nombre del rol sea administrativo |
| Ámbitos | `AccessResource`, `identity/resources.ts` | Un acceso de planta A no lee ni modifica planta B; un recurso desconocido o sin ascendencia comprobada no hereda permisos |
| Vigencia | `UserRoleAssignment`, `assignmentState` | Inicio exacto autoriza, fin exacto deniega, futuro queda pendiente, suspendido no opera |
| No escalada | `canDelegate`, casos de uso de administración | Actor limitado no concede global, más permisos, otros ámbitos ni más tiempo; no combina intervalos para ampliar derechos |
| Datos filtrados en servidor | Lecturas de dashboard, usuarios, accesos, máquinas y auditoría | La respuesta no contiene registros de otros ámbitos, aunque se manipulen filtros, URL o formularios |
| Resumen administrativo | `/admin` | Conteos y acciones recientes corresponden exclusivamente a la información autorizada |
| Directorio de usuarios | `/admin/users`, `/admin/users/new`, `/admin/users/[userId]` | Buscar, crear, invitar, editar, suspender, reactivar y pedir cambio/reset con permisos; sin borrado físico |
| Roles | `/admin/roles`, `/admin/roles/[roleId]` | Matriz de permisos y CRUD de roles personalizados; roles de sistema protegidos; cambios no elevan usuarios indirectamente |
| Asignaciones | `/admin/access` | Altas, cambios y revocaciones con usuario, rol, ámbito y fechas; filtros por estado, máquina y vigencia |
| Jerarquía explícita | `AccessResource`, administración de configuración | Sólo `settings.update` global modifica parentescos; seed no crea plantas u organizaciones ficticias |
| Inventario administrativo | `/admin/machines`, `/admin/machines/[machineRef]` | Lista autorizada de equipos existentes con referencia, estado y presentación; sin editar datos técnicos |
| Presentación | `machine-presentation/service.ts` | Nombre y descripción se guardan con permiso; dashboard y detalle conservan respaldo sin personalización |
| Galería | `MachineImage`, acciones de imágenes | Agregar URL/subir archivo, texto alternativo, principal, orden y eliminar con confirmación; equipos aislados entre sí |
| Validación de archivos | `machine-presentation/validation.ts`, `storage.ts` | Rechazar SVG, firma inválida, URL no permitida y archivo mayor a 5 MiB; carga deshabilitada sin proveedor |
| Auditoría | `/admin/audit`, `identity/audit.ts` | Registrar cambios de usuarios, roles, accesos, contraseñas y presentación; filtrar ámbitos; no persistir secretos |
| Autorización de mutaciones | Server Actions y casos de uso server-only | Llamar una acción directamente no elude permisos; suspensión o revocación después de abrir el formulario surte efecto |
| Navegación y formularios | Shell, perfil y backoffice | Nombre/avatar o iniciales, acceso admin según permisos, logout, tablas y confirmaciones usables en escritorio y móvil |
| Transporte de correo | SMTP y enlace de invitación | Enlace recibido apunta a `APP_URL`; SMTP local y externo se prueban por separado; fallback no expone tokens públicamente |

## Validación y pendientes

Estado al **2026-09-27: entrega funcional local completada**. La evidencia y los límites de cobertura son los siguientes.

### Comprobaciones automatizadas y base de datos

- [x] `npm test`: 36 pruebas unitarias aprobadas, incluidas autorización, ámbitos, vigencia, filtrado de datos y validación.
- [x] `npm run test:integration`: 9 comprobaciones aprobadas contra `predictive_maintenance_e2e` en `127.0.0.1`, con SMTP deshabilitado por el runner.
- [x] `npm run lint`, `npm run typecheck` y `npm run build` aprobados.
- [x] `npm run db:generate` y `npm run db:validate` aprobados.
- [x] Migración revisada y aplicada en la base local; seed ejecutado dos veces sin duplicar el catálogo ni modificar credenciales existentes.

La integración ejercita directamente los casos de uso y verifica: protección del último administrador global con rollback; invitación con token hasheado y activación de un solo uso; reset de un solo uso con revocación de todas las sesiones; cambio de contraseña que revoca sesiones y enlaces de reset pendientes; suspensión que impide autenticar; rechazo de permisos o ámbitos superiores; preservación de cuentas de otra planta; límites de administración temporal; y auditoría sin credenciales ni enlaces de acceso. Los datos sintéticos se conservan en el archivo ignorado `.cache/e2e-fixtures.json` para la revisión de interfaz. Ver [ejecución de integración local](./DEVELOPMENT.md#pruebas-de-integración-locales).

### Comprobaciones en navegador

La aplicación se probó localmente en `http://127.0.0.1:3001`, con la base dedicada de pruebas:

- Inicio de sesión con credencial inválida y válida, cierre de sesión, respuesta genérica de recuperación y formulario de invitación con un enlace válido.
- Cambio obligatorio del fixture: el login redirige a `/profile?password=required`; intentar abrir `/` vuelve a ese formulario hasta completar el cambio.
- Búsqueda y suspensión de usuarios; creación de rol personalizado, matriz y detalle de permisos; filtro de estado de accesos; consulta de auditoría.
- Edición y guardado de presentación de equipos; carga visible de dos URLs WebP reales; selección de principal, cambio de orden, eliminación y recuperación de la ilustración de respaldo al quitar la última imagen; cambios reflejados en el dashboard.
- Vista de 390 × 844 en usuarios, perfil, auditoría y detalle de equipo, sin desbordamiento horizontal.
- Un `VIEWER` con único ámbito `MACHINE M-01` ve una máquina, una alerta y actividad filtrada. No aparece el menú administrativo; `/admin` devuelve acceso denegado, `M-02` devuelve 404 y `M-01` permite ver el detalle.

El consumo de invitación, reset, segundo consumo rechazado, cambio de contraseña y revocación de sesiones están acreditados por las pruebas de integración. No se presentan como recorridos completos automatizados de navegador.

### Entrega de correo

- [x] Configuración local con credencial de aplicación independiente, conexión TLS y autenticación SMTP verificadas.
- [x] Dos envíos de prueba aceptados por SMTP; hPanel mostró ambos como **Entregado**.
- [x] Recepción confirmada en Gmail: invitación en **Spam** y recuperación en **Recibidos**, con hora visible 11:19.

Esta evidencia corresponde al transporte externo usado por los dos envíos autorizados. El runner de integración elimina `SMTP_*` antes de importar los servicios y no envía mensajes; no se realizó una captura adicional con un servidor SMTP local.

Almacenamiento opcional: S3/R2 está sin configurar y la carga de archivos permanece deshabilitada. No bloquea esta entrega, que admite URLs externas; la carga y lectura real deben comprobarse si se habilita un proveedor.

Las verificaciones locales no acreditan despliegue en producción. La retención de auditoría, limpieza de sesiones/tokens/rate limits, eliminación física de imágenes, backups y gestión operativa de credenciales deben acordarse antes de operación sostenida; siguen registradas en [OPEN-QUESTIONS.md](./OPEN-QUESTIONS.md).
