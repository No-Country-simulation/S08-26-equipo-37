# Minutas del equipo

| Campo | Valor |
| --- | --- |
| Proyecto | PredictiveMaintenance (NoCountry) |
| Documento | Minutas compiladas — **orden: más reciente → más antigua** |
| Versión | v1.0 |
| Última actualización | 2026-09-11 |
| Responsable de edición | PM en ejercicio (rotativo) |
| Regla | Se **agrega la minuta nueva arriba**; no se reescriben minutas previas. El historial completo queda en git |

> **Cómo se usa:** §1 es el **estado vigente** (lo que rige hoy); §2 en adelante son las minutas, de la más nueva a la más vieja. Cada minuta nueva entra por PR (`docs(minutes): …`).

---

## 1. Estado vigente

**Decisiones del MVP (aprobadas 2026-09-10) — 11 puntos:**

| # | Decisión | Valor aprobado |
| --- | --- | --- |
| 1 | Familia de máquinas | Mecanizado líneas A/B (tornos, CNC, fresadoras) |
| 2 | Modo de falla objetivo | Binario "falla en 48 h" (profundizar Fallo_Rodamiento después) |
| 3 | Salida del MVP | Estado de salud + probabilidad 48 h + prioridad |
| 4 | Frecuencia de actualización | Diaria (datos horarios) |
| 5 | Criticidad | Columna del dataset (Alta/Media/Baja) + costo de parada editable |
| 6 | Fórmula de prioridad | P(48h) × peso(criticidad) × costo de parada normalizado |
| 7 | Acciones por nivel de salud | Normal → sin acción · Observación → monitorear · Riesgo → intervenir ≤48 h · Parada → en mantenimiento |
| 8 | Estados de alerta | Abierta → En evaluación → Planificada → En ejecución → Cerrada |
| 9 | Cierre de alerta | Resultado + contraste con el evento real |
| 10 | Métricas de éxito | Recall ≥ 70–80 %, falsos positivos acotados, comparación vs. calendario |
| 11 | Validador industrial | Rol a definir (candidato natural: Dutaya) |

> El detalle para completar y firmar está en [`SPEC-MVP-PARAMETERS.md`](./SPEC-MVP-PARAMETERS.md) ([#12](../../issues/12)).

**Dataset:** la versión actual (`datos/dataset_mantenimiento_predictivo_realista.csv`, PR [#9](../../pull/9), commit `c8a224a`) se considera **versión final** para comenzar a definir los parámetros de la aplicación. Vive en **Git LFS** y su integridad se valida en CI ([#34](../../issues/34)).

**Roles en ejercicio:**

| Rol | Persona | Nota |
| --- | --- | --- |
| PM / coordinación | `Fttab101` | Aceptado por 1 semana → se revisa y se evalúa rotación en cada sprint meet |
| Referentes DS | Dutaya + Pedro | Datos, modelo, métricas |
| Software engineer | Seba | Frontend/backend, repo y deploy |
| En formación DS | Lucas | Aprende con los referentes DS |
| Integrante | Denisse | Experiencia en datos, Python y SQL |
| Integrante | Diego | Canal de voz; a integrar con tarea de dúo |
| — | Karina | **Se retiró del proyecto (2026-09-08)** |

**Herramientas:** tablero [GitHub Projects #505](https://github.com/orgs/No-Country-simulation/projects/505) para el seguimiento · canales `#data_analist` y `#software_engineer` · documentación en [`docs/`](./README.md).

**Próxima reunión:** **lunes 14/09/2026, 12:00 (Argentina) — Sprint meet obligatorio.**

**Foco de la semana:** completar los parámetros del MVP ([#12](../../issues/12)) · maqueta de frontend al repo ([#22](../../issues/22)) · tablero ordenado ([#27](../../issues/27)).

---

## 2. Minuta — Reunión 2026-09-10 (decisiones del MVP y roles)

| Campo | Valor |
| --- | --- |
| Fecha y hora | Jueves 10/09/2026, 11:00 (Argentina) / 16:00 (España) |
| Modalidad | Voz |
| Asistentes | Dutaya, Seba, Pedro, PM (en ejercicio) |
| Ausentes | Denisse, Lucas, Diego |
| Registro | Sin transcripción; minuta reconstruida de memoria — completar lo que falte |

**Temas tratados y acuerdos**

1. **Decisiones del MVP:** se aprobaron los **11 puntos** (los del cuadro de §1).
2. **Stack:** se repasó el stack del proyecto y las **limitaciones** existentes, con foco en lograr un **MVP funcional, presentable y en tiempo**.
3. **Dataset:** se revisó el **procedimiento de aprobación** de lo subido por Dutaya para incorporarlo al repo. Se definió que **esta versión del dataset es la final** para comenzar a definir los parámetros de la aplicación.
4. **Diseño / producto:** existe una **maqueta de pantalla inicial** (compartida por Discord) que presentará los parámetros que se elijan durante la semana. **Seba subirá una maqueta del frontend al repo** para que el equipo opine.
5. **Roles:** Pedro propuso al PM actual para el rol de **coordinación/PM por una semana**; fue aceptado, con revisión y evaluación de rotación en la próxima reunión. **Dutaya y Pedro** quedan como referentes de **DS**; **Seba** como **software engineer**.
6. **Organización:** se elige **GitHub Projects** para el seguimiento de tareas. Pedro sugirió separar los temas por canal con **#data_analist** y **#software_engineer** (aceptado).
7. **Próxima reunión:** lunes **14/09 a las 12:00 (Argentina)** — Sprint meet **obligatorio**.

**Acciones**

| # | Acción | Responsable | Estado |
| --- | --- | --- | --- |
| A1 | Definir los parámetros de la aplicación sobre el dataset final | DS (Dutaya + Pedro) | Abierta — [#12](../../issues/12) + [`SPEC-MVP-PARAMETERS.md`](./SPEC-MVP-PARAMETERS.md) |
| A2 | Subir la maqueta de frontend al repo para opinión del equipo | Seba | Abierta — [#22](../../issues/22) |
| A3 | Cargar y ordenar las tareas del sprint en GitHub Projects | PM + células | ✅ **Hecho (10/09)** — 12 labels, 5 campos, 20 issues con campos asignados. Resta: 4 vistas + Prioridad |
| A4 | Definir el rol de validador industrial (punto 11) | Equipo | Abierta — [#24](../../issues/24) |

**Pendiente de completar:** si estuviste en la reunión y recordás algún tema que no figura acá, agregalo por PR o avisá al PM.

---

## 3. Minuta — Kick-off / Arranque organizativo (S0, 2026-09-03)

> *Reconstruida a partir de los documentos de arranque del equipo (no es acta literal).*

| Campo | Valor |
| --- | --- |
| Fecha | Semana 0 — 03/09/2026 |
| Carácter | Propuesta de arranque + primera alineación del equipo |

**Acuerdos / lineamientos**

1. **Modalidad de trabajo:** equipo 100 % remoto y asincrónico; ficha técnica de presentación por integrante.
2. **Estructura de células propuesta:** Coordinación general → **Data Science & IA**, **Backend & Datos**, **Frontend & UI/UX**.
3. **Herramientas:** comunicación por Discord (canales por célula + general) · gestión en GitHub Projects · repositorio con ramas protegidas y carpeta `/docs`.
4. **Primeros pasos (Semana 1):** DS evalúa y carga el dataset base (EDA); Backend inicializa el proyecto y ejecuta migraciones; Frontend prototipa la pantalla principal (matriz de criticidad + detalle de activo).
5. **Documentación base:** alcance y fundamentos de planta, ontología PdM, esquema conceptual de datos y fuentes/datasets.

---

## Anexo — Reglas de uso de este documento

1. **Orden:** la minuta más nueva va **arriba** de las anteriores.
2. **Append-only:** no se reescribe el pasado; las correcciones se agregan como nota en la minuta nueva.
3. **Una minuta = un PR** (`docs(minutes): add 2026-09-14 sprint meet`): así cada reunión queda con autor, fecha y diff.
4. **Trazabilidad de decisiones:** cuando una decisión reemplaza a otra, se marca con "**reemplaza a…**" en §1.
5. **Cierre de cada minuta:** fecha, asistentes, ausentes, temas, acuerdos, acciones (responsable + estado) y pendientes.
6. **Sincronización:** toda decisión aprobada debe reflejarse también en [`SPEC-MVP-PARAMETERS.md`](./SPEC-MVP-PARAMETERS.md), [`PRODUCT.md`](./PRODUCT.md) y [`DATA-STRATEGY.md`](./DATA-STRATEGY.md).
