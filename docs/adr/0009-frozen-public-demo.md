# ADR 0009: Demo pública congelada al terminar la simulación

## Estado

Aceptado — 2026-10-11, por solicitud explícita del propietario. Despliegue y comprobación de las cuentas públicas pendientes de la evidencia operativa de esta entrega.

## Contexto

La simulación terminó. Se conserva la aplicación online para mostrar el dashboard y el detalle de equipos con datos simulados. El propietario solicitó impedir escrituras del resto, revocar sus accesos anteriores, publicar cuentas de lectura, detener despliegues automáticos y reducir los recursos del servicio.

## Decisión

- `DEMO_OWNER_EMAIL=impulseguarddev@gmail.com` activa el modo de demostración en el servidor. Sólo esa identidad conserva capacidad de escritura y autenticación normal. Sus credenciales, asignaciones y sesiones existentes se preservan.
- Se provisionan dos cuentas públicas `VIEWER` globales: `demo.light@example.com` y `demo.dark@example.com`, con apariencia clara y oscura respectivamente. La contraseña pública de la demostración está en el README; las cuentas tienen `passwordHash = null`, por lo que esa contraseña no habilita un ingreso normal si se desactiva el modo demo.
- La cookie `pm_demo=light|dark` selecciona exclusivamente una de esas dos cuentas públicas. No es un secreto ni autentica al propietario. La cuenta se consulta en servidor y debe estar activa; el actor se limita a los permisos de lectura del catálogo, incluso si accidentalmente recibe un rol más amplio.
- Login demo, navegación y logout demo no escriben en PostgreSQL. El servidor bloquea sus mutaciones de cuenta y los permisos de administración, presentación e imágenes. La interfaz comunica el modo de lectura. La autenticación y recuperación dirigidas a la cuenta propietaria conservan sus límites de intentos persistidos, incluso ante intentos fallidos; se preserva esa protección.
- Las cuentas anteriores se suspenden; sus asignaciones se vencen, sus sesiones se revocan y sus enlaces de recuperación pendientes caducan. También caducan las invitaciones pendientes. Se preservan usuarios, asignaciones, historial, imágenes y datos de negocio. El cierre queda registrado en auditoría.
- La base no se configura globalmente como `READ ONLY`, ya que el propietario conserva administración, sesiones y recuperación. La restricción pública se aplica en los límites de autenticación y autorización. La credencial PostgreSQL debe seguir siendo privada y los accesos directos al servidor son una frontera separada.
- La versión desplegada se fija a un commit; se elimina el job de despliegue de GitHub Actions y se desactiva el despliegue automático de Coolify. Las validaciones pueden seguir ejecutándose sin publicar. Los límites de recursos se aplican únicamente a esta aplicación y a su PostgreSQL; se comprueba la salud del servicio, sin afirmar un mínimo óptimo mientras no haya métricas de consumo.
- Se retiran del repositorio las cuatro credenciales que usaba el despliegue automático. No se modifican permisos de colaboradores de GitHub ni credenciales globales de Cloudflare compartidas con otros servicios: la revocación de usuarios corresponde a la aplicación.

## Operación de cierre

1. Conservar un backup de PostgreSQL y registrar el commit actualmente servido antes de cambiar cuentas o despliegue.
2. Configurar `DEMO_OWNER_EMAIL` en el entorno de la aplicación y de la operación, manteniendo `DATABASE_URL` en el almacén de secretos. La contraseña pública demo no requiere variable de entorno.
3. Ejecutar una previsualización y revisar los conteos:

   ```bash
   node --conditions=react-server --import tsx scripts/freeze-demo.ts
   ```

4. Ejecutar una sola vez con `--apply`. La transacción serializable exige que el propietario exista, esté activo, tenga contraseña establecida y un `SUPER_ADMIN` global sin vencimiento que cubra todo el catálogo. También exige que `VIEWER` contenga exactamente los permisos de lectura. Si una condición falla, no aplica el cierre. Si hace falta repetir la operación, reutiliza las cuentas y asignaciones demo existentes.
5. Arrancar normalmente con `npm run start`, sin migraciones ni seed automáticos. Ejecutar el cierre mediante una tarea manual de Coolify después de desplegar el script. No debe volver a suspender usuarios en cada reinicio.
6. Verificar los dos ingresos públicos, ausencia de acceso al backoffice, rechazo de cambios, conservación del ingreso propietario, ausencia de nuevas filas por visitas públicas y el health endpoint. Fijar el commit en Coolify y verificar que los push no despliegan.

La comprobación local del script, sin conexión a la base, se ejecuta con:

```bash
node --conditions=react-server --import tsx scripts/freeze-demo.ts --self-check
```

Para retomar desarrollo se necesita una decisión explícita: conservar el backup, elegir un nuevo commit, revisar qué cuentas y permisos se reactivan y restaurar deliberadamente los mecanismos de despliegue. Quitar la variable no reactiva las cuentas suspendidas ni restaura asignaciones vencidas.

## Alternativas y consecuencias

Una cuenta `VIEWER` convencional seguiría escribiendo sesiones, intentos de login y preferencias; no satisface el cierre público sin escrituras. Una base totalmente de lectura impediría la administración del propietario. Exportar todo a HTML estático requeriría sustituir los flujos de autenticación y lectura existentes.

La selección pública por cookie permite una demo pequeña sin sesiones persistidas por visitante. Cualquiera puede seleccionar estas cuentas públicas, por lo que sólo deben exponer la información destinada a la demostración. Esto no convierte la base, el panel de Coolify ni el backoffice en recursos públicos.

## Evidencia operativa — 2026-10-11

- GitHub: workflow `CI`, id `349549804`, deshabilitado temporalmente mediante API; estado confirmado `disabled_manually`. No había ejecuciones CI en curso al deshabilitarlo. El commit de esta entrega elimina el job `deploy`.
- Secretos de despliegue del repositorio eliminados y listado vacío verificado: `COOLIFY_DEPLOY_WEBHOOK`, `COOLIFY_TOKEN`, `CF_ACCESS_CLIENT_ID` y `CF_ACCESS_CLIENT_SECRET`. No se conservaron sus valores ni se revocaron credenciales globales compartidas.
- Token dedicado de Coolify «GitHub Actions deploy - PredictiveMaintenance»: revocado antes del despliegue; su eliminación del listado quedó verificada. El token de otro producto se preservó.
- Backup PostgreSQL: operación completada en el host por Coolify; tamaño informado 33,32 KB. No se acredita una restauración de prueba.
- PostgreSQL: límite configurado de 256 MiB y 0,5 CPU; `max_connections=20`, `shared_buffers=32MB`, `work_mem=2MB`, `maintenance_work_mem=32MB` y `effective_cache_size=128MB`. Reinicio completado satisfactoriamente.
- Aplicación: límite configurado de 512 MiB y 0,5 CPU; pool PostgreSQL de cinco conexiones; comando de inicio `npm run start`. Aplicación de los límites y comprobación de salud pendientes del despliegue.
- Pendiente: commit/tag definitivo, aplicación del cierre de cuentas en PostgreSQL, despliegue manual, cuentas públicas verificadas, límites efectivos de la aplicación y estado final de CI. No hay métricas de consumo habilitadas para acreditar que los límites sean el mínimo posible.
