# ADR 0009: Demo pública congelada al terminar la simulación

## Estado

Aceptado y aplicado — 2026-10-11, por solicitud explícita del propietario. Despliegue manual, cierre de cuentas y comprobación de ambas cuentas públicas completados.

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

- GitHub: workflow `CI`, id `349549804`, activo después de deshabilitarlo temporalmente durante el cierre. El job `deploy` fue eliminado. La [PR #66](https://github.com/No-Country-simulation/S08-26-equipo-37/pull/66) se integró por squash después de aprobar `validate`, `ml-contract`, `dependency-review`, `pr-title` y CodeQL. El push a `main` también aprobó `validate` y `ml-contract` sin job de despliegue.
- Secretos de despliegue del repositorio eliminados y listado vacío verificado: `COOLIFY_DEPLOY_WEBHOOK`, `COOLIFY_TOKEN`, `CF_ACCESS_CLIENT_ID` y `CF_ACCESS_CLIENT_SECRET`. No se conservaron sus valores ni se revocaron credenciales globales compartidas.
- Token dedicado de Coolify «GitHub Actions deploy - PredictiveMaintenance»: revocado antes del despliegue; su eliminación del listado quedó verificada. El token de otro producto se preservó.
- Backup PostgreSQL: copia conservada en el host de Coolify y descargada localmente en Descargas; 34.119 bytes y cabecera `PGDMP` verificados. SHA-256: `B5A6125D5B75987A68593A2E4F4D75448C773873291D42D4814756A7F2E3979B`. El archivo permanece fuera del repositorio. No se realizó una restauración de prueba.
- PostgreSQL: límites efectivos de 256 MiB y 0,5 CPU verificados en cgroups (`memory.max=268435456`, `cpu.max=50000 100000`); reinicio satisfactorio. `max_connections=20` y `shared_buffers=32MB` verificados con `SHOW`; también se configuraron `work_mem=2MB`, `maintenance_work_mem=32MB` y `effective_cache_size=128MB`.
- Aplicación: límites efectivos de 512 MiB y 0,5 CPU verificados en cgroups (`memory.max=536870912`, `cpu.max=50000 100000`); pool PostgreSQL de cinco conexiones; comando de inicio `npm run start`.
- Coolify quedó fijado al commit `6d9fb01814d2ea12d36c6acf9ff05d0e75efc008`. El despliegue manual `v8lvgc5zwlayyp3unv4ruvse` comenzó el 2026-10-11 a las 20:08:36 de Argentina (23:08:36 UTC), terminó con estado `Success` y duró 5 minutos 53 segundos.
- El tag anotado [v0.1.0-demo-2026-10-11](https://github.com/No-Country-simulation/S08-26-equipo-37/tree/v0.1.0-demo-2026-10-11) se publicó y se verificó que apunta a ese mismo commit servido. Esta evidencia posterior se conserva en una actualización exclusivamente documental; no cambia la versión desplegada.
- `freeze-demo.ts`: previsualización satisfactoria a las 20:15:09 y aplicación satisfactoria a las 20:15:37 de Argentina. Se suspendieron cuatro cuentas anteriores, vencieron cuatro asignaciones y revocaron seis sesiones; se crearon las dos cuentas demo. La transacción comprobó y preservó la identidad activa del propietario y su `SUPER_ADMIN` global ilimitado; no se realizó un ingreso interactivo con su contraseña.
- Navegador: ambas demos completaron login y logout. La cuenta clara mostró ocho equipos, detalle de `M-01`, perfil `VIEWER GLOBAL` de lectura y denegación de `/admin` mediante `/forbidden`. La oscura mostró dashboard e inventario de ocho equipos y perfil de lectura. Se conservaron capturas de ambas apariencias.
- Ausencia de escrituras durante ese recorrido: comparación programática de `n_tup_ins`, `n_tup_upd` y `n_tup_del` en las 14 tablas entre las 20:16:21 y 20:18:03 de Argentina; resultado `changedTables=[]`. Esto acredita esos recorridos públicos, sin incluir las operaciones normales del propietario.
- Coolify: «Manual deployments only» vuelto a verificar después del despliegue. La tarea operativa quedó deshabilitada y con el comando de previsualización sin `--apply`; no hay ejecución automática del cierre.
- Límites de la verificación: no se probó restaurar el backup ni ingresar interactivamente con la contraseña del propietario. No hay métricas de consumo habilitadas para acreditar que los límites de recursos sean el mínimo posible.
