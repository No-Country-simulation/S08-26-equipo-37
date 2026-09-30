# Preguntas abiertas

Las preguntas se priorizan por su impacto sobre el producto y los datos. Una pregunta P0 abierta no impide desarrollar trabajo independiente, pero ningún agente debe resolverla mediante una suposición silenciosa.

## Persistencia del MVP

[ADR 0008](./adr/0008-mvp-machine-hour-persistence.md) fija las tablas: una fila por máquina y hora, predicción separada del evento real, y alerta con revisión humana. No cierra la definición operativa de falla, el umbral de alerta, si la salida se muestra como probabilidad, ni cómo llega una predicción al producto.

## P0 — define la promesa del MVP

1. ¿Qué familia de máquinas será utilizada?
2. ¿Qué significa exactamente una falla?
3. ¿Cuál es el modo de falla objetivo?
4. ¿Se predice máquina, componente o tipo de falla?
5. ¿Cuál es el dataset?
6. ¿Cuántas fallas etiquetadas contiene?
7. ¿Qué sensores están disponibles?
8. ¿Qué frecuencia tienen?
9. ¿Cuál es el horizonte útil de anticipación?
10. ¿Mostraremos `anomaly score`, `risk score` o probabilidad? El modelo ya entrega una probabilidad (`predict_proba` en `ml/notebooks/03_modelado`), mientras el prototipo de interfaz muestra un índice de condición que **no** es una probabilidad (`src/features/maintenance/types.ts`). Sigue abierta, pero ahora puede resolverse con esa evidencia.
11. ¿Cómo se determina la criticidad?
12. ¿Qué acción debería realizar mantenimiento ante una alerta?
13. ¿Cómo se mide el éxito del MVP?

## P1 — define el flujo operativo

- ¿Quién es la persona usuaria principal y qué decisión toma hoy?
- ¿Qué estados operativos, cargas o condiciones ambientales deben contextualizar las señales?
- ¿Cómo se relacionan los identificadores de máquinas, sensores, fallas e intervenciones?
- ¿Con qué latencia y periodicidad llegan los datos, y en qué formato?
- ¿Qué explicación mínima necesita mantenimiento para confiar en una prioridad?
- ¿Qué costos tienen una falsa alarma y una falla no detectada?
- ¿Qué máquinas y usuarios participarán en la validación del MVP?
- ¿Quién revisará las etiquetas y confirmará el resultado de una alerta?
- ¿Cómo llega una predicción al producto: puntuación por lote hacia PostgreSQL, un servicio desplegado aparte, u otra forma? El prototipo de `ml/api` existe pero hoy no se despliega ni tiene contrato con la aplicación, y extraerlo como servicio requiere un ADR (ver `ARCHITECTURE.md`).

## P2 — decisiones posteriores a la validación

- ¿Cuál es la jerarquía real de organizaciones, plantas, áreas y equipos, y quién mantiene sus referencias? El mecanismo de autorización ya está definido, pero el seed no inventa estas relaciones.
- ¿Se requieren notificaciones, exportaciones o integraciones externas?
- ¿Existe una necesidad demostrada de actualización en tiempo real?
- ¿Cuánto tiempo deben conservarse datos, predicciones y feedback?
- ¿Qué plantas, organizaciones y familias de máquinas participarán realmente? La capacidad de asignar ámbitos no define el alcance operativo ni los datos de cada organización.

## Decisión explícita: identidad y administración

El requerimiento del 2026-09-27 resolvió los roles iniciales, permisos, ámbitos y vigencia para una primera operación compartida. Se registran en [ADR 0007](./adr/0007-identity-administration.md) y [AUTH-ADMIN.md](./AUTH-ADMIN.md). Esta decisión no resuelve las preguntas P0 del producto predictivo ni adopta un modelo técnico de máquinas.

La credencial de aplicación independiente para `no-reply@chenodo.ar` ya se configuró en el `.env.local` ignorado y se verificaron TLS y autenticación SMTP. Se autorizó el destinatario para pruebas de invitación y recuperación. No se cambió la credencial del otro producto.

La validación local, la integración y los envíos externos están registrados en [AUTH-ADMIN.md](./AUTH-ADMIN.md#validación-y-pendientes). Gmail recibió la recuperación en Entrada y clasificó la invitación como Spam. Estas comprobaciones no configuran ni acreditan un despliegue de producción.

Para operación posterior siguen abiertas:

- ¿Se habilitará la carga de archivos en almacenamiento S3 compatible o R2? Es opcional: mientras no se configure, la galería admite URLs externas validadas. No bloquea esta entrega ni implica crear infraestructura externa.
- ¿Qué retención y limpieza se aplicará a auditoría, sesiones, tokens, límites de intentos y objetos de imágenes, y qué backups y recuperación se requieren?

Cuando se resuelva una pregunta, la respuesta debe registrar evidencia, responsable e impacto en el documento correspondiente o en un ADR si la decisión es arquitectónica.
