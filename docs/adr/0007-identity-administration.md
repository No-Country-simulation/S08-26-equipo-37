# ADR 0007: Identidad, administración y presentación de equipos

## Status

Aceptado — 2026-09-27. La decisión responde al requerimiento explícito de incorporar autenticación y backoffice. La aceptación de esta arquitectura no implica que su implementación, despliegue o proveedores externos estén validados; el seguimiento está en [AUTH-ADMIN.md](../AUTH-ADMIN.md).

## Context

El dashboard usa un inventario estático de equipos y todavía no tiene un contrato integrado con el modelo predictivo. La administración de personas, permisos e imágenes necesita persistencia ahora, pero no justifica adelantar el modelo técnico de máquinas, telemetría o mantenimiento. El acceso debe poder limitarse por organización, planta, área o equipo y por tiempo, sin permitir que un administrador delegado amplíe su propia autoridad.

## Decision

1. **Mantener un único monolito Next.js y PostgreSQL.** `identity` concentra credenciales, sesiones, tokens, permisos y auditoría; `admin` implementa los casos de uso del backoffice; `machine-presentation` administra el nombre visible, la descripción y la galería del inventario existente. Los módulos son server-only salvo sus tipos y funciones puras de validación/política.
2. **Usar sesiones opacas revocables en base de datos.** El navegador recibe un token aleatorio en una cookie `HttpOnly`; PostgreSQL guarda su hash y vencimiento. Las contraseñas usan `scrypt` de Node.js con sal aleatoria. Invitaciones y recuperación usan tokens aleatorios hasheados, con vencimiento y consumo único transaccional. El cambio de contraseña invalida sesiones previas. No se agrega un servicio de identidad, JWT autónomos, SSO ni MFA en esta entrega.
3. **Autorizar por permiso, ámbito y vigencia.** Los seis roles de sistema son conjuntos iniciales de permisos, no excepciones por nombre. Una política pura central evalúa el usuario activo, el cambio obligatorio de contraseña, la asignación vigente y su ámbito. Ocultar una opción del menú nunca reemplaza la autorización de lecturas y mutaciones en el servidor.
4. **Persistir referencias de acceso independientes del dominio técnico.** `AccessResource` registra referencias `ORGANIZATION`, `PLANT`, `AREA` y `MACHINE` y su parentesco explícito. `GLOBAL` se representa por una asignación sin referencia. La ascendencia se resuelve desde la base, no desde datos enviados por el navegador. El seed registra solamente las referencias `MACHINE` del mock; no inventa organizaciones, plantas ni áreas. La carga de una jerarquía real exige `settings.update` global.
5. **Limitar la delegación a la autoridad existente.** Para otorgar un acceso, el actor debe tener `users.manage_access` y cada permiso solicitado en el mismo ámbito o uno superior durante todo el intervalo delegado. No se unen períodos parciales ni ámbitos menores para construir una asignación mayor. Los roles de sistema permanecen protegidos y no existe autoelevación desde el perfil.
6. **Separar presentación de datos industriales.** `MachinePresentation` se relaciona mediante `machineRef`; `MachineImage` guarda URL y metadatos, nunca binarios. Las imágenes pueden ser URLs públicas HTTPS o archivos JPEG, PNG y WEBP de hasta 5 MiB enviados a almacenamiento S3 compatible, incluido R2, cuando esté configurado. El dashboard conserva su presentación de respaldo cuando no hay personalización.
7. **Usar SMTP configurable y registrar cambios sensibles.** El transporte SMTP no determina la política de identidad. Una invitación puede entregarse mediante un enlace copiable por un administrador autorizado cuando no haya envío disponible. La recuperación pública mantiene una respuesta genérica. La auditoría guarda actor, acción, entidad, ámbito y cambios relevantes sin contraseñas, hashes ni tokens.

## Consequences

- Las pantallas protegidas requieren PostgreSQL, migraciones, catálogo de permisos y un usuario inicial. `/api/health` continúa independiente de la base de datos.
- Suspensiones y cambios de acceso pueden aplicarse sin esperar a que expire una credencial autocontenida. Esto requiere consultar el estado vigente del usuario y sus asignaciones.
- Los equipos sin padre registrado admiten acceso global o por su referencia individual. Un permiso de planta no alcanza equipos hasta que la relación esté cargada explícitamente.
- La personalización no modifica sensores, alertas, modelos predictivos ni el inventario técnico. El contrato del backend de mantenimiento sigue abierto.
- SMTP y almacenamiento son integraciones opcionales que deben verificarse por separado. Eliminar una referencia de la galería no elimina un objeto del proveedor; su limpieza y retención requieren una política operativa.
- La aplicación asume responsabilidad por pruebas de credenciales, revocación, tokens de un solo uso, aislamiento entre ámbitos y no escalada. La [matriz de verificación](../AUTH-ADMIN.md#matriz-de-requisitos-verificables) distingue implementación de evidencia de prueba.

## Alternatives considered

- **JWT autocontenidos:** la revocación inmediata de suspensiones, cambios de contraseña y accesos requeriría igualmente estado adicional. Las sesiones opacas cubren el requisito con menos mecanismos.
- **Proveedor externo o microservicio de identidad:** no hay una necesidad concreta de SSO o independencia operativa que justifique ampliar el despliegue actual.
- **Crear ya el dominio completo de máquinas, plantas y sensores:** adelantaría decisiones pendientes del equipo. Las referencias de autorización y la presentación cubren este requerimiento sin resolverlas por suposición.
- **Guardar imágenes en PostgreSQL o en el filesystem del contenedor:** los metadatos en PostgreSQL y el almacenamiento opcional de objetos evitan acoplar archivos al ciclo de despliegue y al volumen de la base.
