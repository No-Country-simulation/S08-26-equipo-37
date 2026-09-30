# ADR 0008: Persistencia del MVP por máquina y hora

## Status

Aceptado — 2026-09-30. El schema está en `prisma/schema.prisma`, validado con Prisma 7.10 (`db:validate`, `db:generate` y `typecheck`). La migración todavía no se generó.

Esta decisión reemplaza, para el dominio de mantenimiento del MVP, la consecuencia de [ADR 0002](./0002-prisma-postgresql.md) que aplazaba los modelos de negocio. PostgreSQL y Prisma siguen vigentes.

## Context

El dataset del MVP tiene una fila por máquina y por hora. El esquema conceptual anterior modelaba canales de sensor, lecturas escalares, RUL y diagnóstico de modo de falla. Esa forma no coincide con los datos disponibles ni con el alcance acordado para esta fase.

La identidad, las sesiones, los permisos y la presentación de equipos ya viven en el mismo schema. Hacía falta agregar el dominio predictivo sin abrir un segundo modelo de usuario ni rediseñar la autenticación.

## Decision

1. **Una fila de `LecturaMaquinaHora` es una máquina en una hora.** La unicidad es `@@unique([activoId, fechaHora])`. Los ocho sensores son opcionales: un faltante se guarda como `NULL` y no como `0`. La fila se conserva aunque `estadoOperativo` sea apagado.
2. **`Activo` guarda solo datos relativamente estables.** Identificador de planta (`codigoIdentificador`, el `id_maquina` del dataset), tipo, modelo, marca, línea, antigüedad, criticidad, costo de parada y potencia nominal. Horas de operación, ciclos, horas desde el último mantenimiento y conteo de fallas previas viven en la lectura de esa hora.
3. **La base guarda lo observado y la inferencia real.** No se persisten `target_falla_48h`, `target_tipo_falla`, `target_rul_horas`, `target_estado_salud` ni features derivadas (`roll_mean`, `roll_std`, `mes`, `dia_semana`, `vibracion_critica`, `temperatura_critica`). `codigo_alarma_plc` tampoco entra en estas tablas. `EventoFalla` representa un hecho real, construible después desde `falla_inicio_disparo` y `falla_estado_causa`.
4. **`PrediccionIA` es una inferencia del modelo, no una etiqueta del dataset.** Como mínimo: activo, fecha de cálculo, versión del modelo, falla predicha a 48 h y probabilidad. `estadoSaludSugerido`, `umbralAlerta` y `variablesExplicativas` quedan opcionales. `POST /api/v1/predict/falla` no devuelve estado de salud, umbral ni explicación; devuelve además `score_dashboard`, `alerta_estado` y `color_hex`, que no se guardan. La aplicación debe informar `versionModelo` al persistir, porque el endpoint no lo envía. No hay RUL en este MVP.
5. **La alerta, la revisión humana y la orden son objetos distintos.** Una predicción puede abrir una `Alerta`. `RevisionAlerta` registra quién decidió, qué decidió (`VALIDADA`, `CORREGIDA` o `DESCARTADA`) y el motivo, aunque no exista orden. `OrdenTrabajo` es opcional y puede nacer de una alerta validada. Ninguna alerta crea una intervención por sí sola.
6. **Una máquina tiene como máximo una alerta activa.** Activa significa `closedAt` nulo. PostgreSQL lo garantiza con un índice único parcial (`uq_alerta_activa_por_activo`), habilitado en Prisma con `previewFeatures = ["partialIndexes"]`. Cerrar la alerta debe escribir `estado = CERRADA` y `closedAt` juntos. El resultado (`CORRECTA`, `FALSO_POSITIVO`, `DESCARTADA`) solo se completa al cerrar.
7. **Las personas son `User`.** No existe un modelo `Usuario`. Las asignaciones de alerta, las revisiones y el técnico de la orden apuntan a `User`. `MachinePresentation` sigue unido por `machineRef` y no por una clave foránea a `Activo`.
8. **Los modelos nuevos usan nombres en español y columnas `snake_case`.** Los modelos de identidad permanecen en inglés. No hay un renombre global.

Quedan fuera: subensambles, componentes, robots, instrumentos portátiles, `DiagnosticoModoFalla`, RUL continuo, CMMS, streaming y cambios al modelo de ML.

## Consequences

- El cliente Prisma ya conoce el dominio. La aplicación todavía no lee ni escribe estas tablas, y la base no tiene la migración.
- `MachinePresentation` y `Activo` pueden referirse a la misma máquina con identificadores distintos hasta que exista un vínculo explícito.
- El camino por el que una predicción entra al producto (lote hacia PostgreSQL o servicio desplegado) sigue abierto en [`OPEN-QUESTIONS.md`](../OPEN-QUESTIONS.md).
- Las preguntas P0 de producto —definición operativa de falla, umbral de alerta y promesa de probabilidad— no quedan cerradas por este schema.

## Alternatives considered

- **Canal de sensor y lectura escalar:** el dataset no trae esa granularidad. Obligaría a inventar canales.
- **Guardar odómetros solo en `Activo`:** se pierde el historial hora a hora.
- **Hacer obligatorio `estadoSaludSugerido`:** la API actual no lo entrega y el schema obligaría a inventar un valor.
- **Unicidad de alerta solo con `prediccionId`:** dos predicciones distintas podrían abrir dos alertas activas para la misma máquina.
- **Renombrar `User` y el resto de la identidad al español:** el cambio no aporta al MVP y rompe el módulo ya implementado.
