# Roadmap

## Criterio de planificación

### Hechos conocidos

- La base técnica está construida: la aplicación compila, tiene CI (tests, lint, typecheck, build, integridad del dataset y control de artefactos) y despliegue automático a producción.
- El dataset definitivo existe, está versionado en Git LFS y se valida automáticamente en CI. Lo que falta no es el dato, sino su **validación industrial**.
- La promesa predictiva no puede fijarse antes de explorar los datos. La exploración ya se hizo y sus límites están documentados en [`MODEL-LIMITATIONS.md`](./MODEL-LIMITATIONS.md).

### Hipótesis

La secuencia siguiente es una ruta incremental para validar valor con el menor alcance posible. No constituye un compromiso de funcionalidades ni fechas y puede cambiar con la evidencia.

### Decisión

Cada fase debe producir un resultado verificable y cerrar solo cuando cumple su criterio de salida. No se avanza para compensar una pregunta P0 que afecte directamente a la fase siguiente.

## Estado a 2026-09-20

Esta tabla registra **evidencia**, no cierres: el cierre de cada fase lo confirma el equipo en reunión. Existe para que el roadmap no se lea entero en futuro cuando parte ya está hecha.

| Fase | Evidencia disponible | Cierre |
| --- | --- | --- |
| **F0** Bootstrap técnico | La app instala, compila y pasa sus comprobaciones; CI verde; health check independiente de la base; deploy automático | Criterio cumplido |
| **F1** Exploración del dataset | Diccionario en [`../ml/README.md`](../ml/README.md), generador reproducible (SEED 42), dataset v2 validado en CI, problema elegido (falla binaria a 48 h). Falta el perfil contra la ground truth ([#10](../../issues/10)) | Criterio casi cumplido |
| **F2** Inventario de máquinas | Catálogo de las 25 máquinas en la interfaz, sobre datos simulados. El seed sobre base real no existe ([#16](../../issues/16)) | Pendiente |
| **F3** Visualización de sensores | Vista temporal con unidades y manejo de nulos, con datos simulados ([#17](../../issues/17)) | Parcial |
| **F4** Baseline de condición | LightGBM con PR-AUC 0,842 y partición temporal; limitaciones documentadas. Faltan matriz de confusión, split por máquina y comparación contra el calendario ([#13](../../issues/13)) | Parcial |
| **F5** Priorización de riesgo | Lista priorizada en la interfaz, con un índice que **no** es una probabilidad ([#18](../../issues/18)) | Parcial |
| **F6** Alertas | No iniciada. El centro de notificaciones de la PWA es simulado ([#20](../../issues/20)) | Pendiente |
| **F7** Feedback de mantenimiento | No iniciada ([#21](../../issues/21)) | Pendiente |
| **F8** Validación del MVP | No iniciada. El validador industrial sigue sin asignar ([#24](../../issues/24)) | Pendiente |

## Fase 0 — Bootstrap técnico

**Resultado:** aplicación Next.js ejecutable, configuración mínima, documentación operativa, validaciones automáticas y health check independiente de la base de datos.

**Criterio de salida:** el proyecto se instala, compila y pasa sus comprobaciones documentadas sin modelos de dominio inventados.

## Fase 1 — Exploración del dataset

**Resultado:** inventario, diccionario, perfil de calidad, cobertura temporal, etiquetas y análisis de viabilidad para cada promesa predictiva candidata.

**Criterio de salida:** se decide, con evidencia, qué problema puede abordar el MVP o se documenta que los datos todavía no lo permiten.

## Fase 2 — Inventario de máquinas

**Resultado:** catálogo mínimo de equipos basado en identificadores y atributos realmente disponibles.

**Criterio de salida:** sensores, eventos e intervenciones pueden vincularse de forma trazable con el nivel de activo elegido.

## Fase 3 — Visualización de sensores

**Resultado:** vista temporal mínima de variables reales por equipo, con unidades, faltantes y contexto operativo cuando exista.

**Criterio de salida:** mantenimiento puede inspeccionar una señal y verificar que los datos representados son comprensibles y confiables.

## Fase 4 — Baseline de condición o anomalía

**Resultado:** baseline reproducible para la salida que los datos permitan, acompañado por una referencia simple y evaluación fuera de muestra.

**Criterio de salida:** el comportamiento, las limitaciones y la carga de falsos positivos son entendidos por el equipo y por mantenimiento.

## Fase 5 — Priorización de riesgo

**Resultado:** ordenamiento de equipos para revisión. Solo incorporará criticidad si su definición y fuente fueron resueltas.

**Criterio de salida:** la lista priorizada resulta más útil para decidir revisiones que la referencia operativa acordada.

## Fase 6 — Alertas

**Resultado:** señal accionable con umbral, motivo, estado y trazabilidad mínimos; no se asume tiempo real.

**Criterio de salida:** cada alerta conduce a una acción definida y puede cerrarse o descartarse con un motivo.

## Fase 7 — Feedback de mantenimiento

**Resultado:** registro mínimo de revisión, hallazgo e intervención vinculado con la señal que la originó.

**Criterio de salida:** el equipo puede distinguir señales útiles, falsas alarmas y resultados todavía desconocidos para mejorar la evaluación.

## Fase 8 — Validación del MVP

**Resultado:** piloto sobre el alcance acordado y evaluación contra los criterios de éxito definidos en P0.

**Criterio de salida:** existe evidencia para continuar, ajustar la promesa o detener el enfoque; las limitaciones quedan explícitas.
