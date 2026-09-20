# Alcance, Fundamentos y Decisiones — PredictiveMaintenance (PdM)

| Campo | Valor |
|---|---|
| Proyecto | PredictiveMaintenance (NoCountry) |
| Fecha | 2026-09-10 |
| Versión | v1.0 — documento consolidado con decisiones del MVP **aprobadas** |
| Estado | Vigente. Fusiona el documento de Fundamentos de Planta con la síntesis de alcance y decisiones |
| Fuentes | Ver Anexo A (inventario de documentos) |
| Ubicación | `docs/SCOPE.md` |
| Minutas asociadas | [`MINUTES.md`](./MINUTES.md) · [`BACKLOG.md`](./BACKLOG.md) · [`SPEC-MVP-PARAMETERS.md`](./SPEC-MVP-PARAMETERS.md) |

**Historial de cambios**

- **v0.1 → v0.2** (2026-09-08): incorpora el commit de Dutaya (`46a3b4c`) con el dataset **v2 estandarizado**, el **data dictionary oficial** (`datos/README.md`) y el **script generador con ground truth**; incorpora el repo público `No-Country-simulation/S08-26-equipo-37`. Cierra los 4 pendientes externos 🔴 y resuelve las tensiones de arquitectura vía ADR.
- **v0.2 → v1.0** (2026-09-10): **fusión con `[GEN] ALIGN - Fundamentos de Planta y Alcance Operativo v1.0`** (§4 ampliado: filosofía de mantenimiento, criticidad y dimensionamiento, captura híbrida, human-in-the-loop, módulos y entregables) + **cierre de las 11 decisiones del MVP** aprobadas en la reunión del 10/09 + roles y herramientas vigentes + **Anexo C: convención de nombres**. El nombre del archivo deja de llevar versión (link estable).

## Documentos relacionados

| Documento | Enlace |
|---|---|
| **Minutas del equipo** | [`MINUTES.md`](./MINUTES.md) |
| **Modelo de datos (esquema E-R)** | [`DATA-MODEL.md`](./DATA-MODEL.md) |
| **Ontología y taxonomía PdM** | [`DOMAIN-ONTOLOGY.md`](./DOMAIN-ONTOLOGY.md) |
| **Estrategia de datos y datasets** | [`DATA-STRATEGY.md`](./DATA-STRATEGY.md) |
| **Tablero del proyecto** | [GitHub Projects #505](https://github.com/orgs/No-Country-simulation/projects/505) |
| **Guía de desarrollo y Git LFS** | [`DEVELOPMENT.md`](./DEVELOPMENT.md) |

---

## 1. Resumen ejecutivo

PredictiveMaintenance es una plataforma de **mantenimiento predictivo industrial**: a partir de datos de sensores/telemetría + historial de mantenimiento, detecta señales de deterioro en máquinas, estima la probabilidad de falla en una ventana de **48 h** y ayuda al responsable de mantenimiento a **priorizar y planificar intervenciones** antes de una parada inesperada.

- Contexto: proyecto dentro de la **Simulación Laboral No Country** (5 semanas, 31 ago – 06 oct 2026) → **deadline corto, MVP demostrable**.
- Usuario principal: **responsable/líder de mantenimiento**. Decisión que habilita: *"¿a qué máquina intervengo y en qué orden?"*.
- Datos: **dataset sintético de "Dutaya" v2** (72.000 filas máquina-hora, 25 máquinas, 30 columnas, targets de falla 48 h / tipo / RUL / estado de salud) + diccionario oficial + script generador con SEED=42. Datasets públicos de control (AI4I 2020, NASA C-MAPSS).
- Repo del equipo (público): `https://github.com/No-Country-simulation/S08-26-equipo-37` — bootstrap **Next.js 16 fullstack + Prisma 7 + PostgreSQL 17 + Docker + CI** con docs/ADRs (monolito modular, server-first, sin tiempo real prematuro). **Fase 0 (bootstrap) prácticamente lista; el esquema Prisma está vacío a propósito** hasta validar decisiones.
- MVP acotado: clasificación binaria de riesgo "falla ≤ 48 h" por máquina-hora + estado de salud + priorización económica. RUL fino, por componente, CMMS real y datos reales → **fase 2+**.
- **Decisiones del MVP: aprobadas** (los 11 puntos) en la reunión del **2026-09-10**; roles vigentes: **PM en ejercicio (1 semana, rotativo)**, **referentes DS: Dutaya + Pedro**, **software engineer: Seba**. Seguimiento en **GitHub Projects** y canales **#data_analist** / **#software_engineer**. Próxima reunión: **lunes 14/09, 12:00 ARG**.
- Este documento reúne el **marco de dominio de planta** (§4), el **alcance**, los **datos**, la **arquitectura** y las **decisiones** del MVP en un único lugar.

---

## 2. Contexto y marco temporal

- Programa: Simulación Laboral No Country, 5 semanas (S0–S4), 31 ago → 06 oct 2026. Empresas observan el desempeño en tiempo real.
- Equipo 100% remoto y asincrónico → convenciones claras y arranque organizado (ver §9).
- El proyecto trabaja para una "empresa real" (Dutaya provee el dataset sintético y el script generador; valida supuestos industriales). Sin relación laboral.

---

## 3. Problema de negocio y criterio de éxito

**Empresa**: industrial, con máquinas de mecanizado y producción — tornos, fresadoras, centros de mecanizado CNC, rectificadoras, taladros, equipos de corte, compresores, sistemas hidráulicos, equipos auxiliares.

**Datos disponibles** (por equipamiento): temperatura, vibración, presión, velocidad, horas de funcionamiento, consumo energético, ciclos, alarmas, paradas, errores, intervenciones de mantenimiento + **historial de mantenimiento**.

**Dolores (7)**: paradas inesperadas sin alerta; calendario que no refleja el estado real; mantenimiento correctivo reactivo; costos por mantenimiento innecesario; dificultad de interpretar datos de sensores; información histórica desconectada; dificultad para priorizar y ausencia de indicadores predictivos.

**Criterio de éxito (textual)**: un responsable de mantenimiento entra al sistema y, sin analizar manualmente grandes cantidades de datos, identifica qué máquinas tienen mayor riesgo de falla, comprende las señales que justifican ese riesgo y prioriza intervenciones antes de una parada inesperada.

---

## 4. Fundamentos de dominio y planta

> **Este apartado proviene del documento de fundamentos de planta** (fusionado acá). Se conserva el marco de dominio que fundamenta el alcance del MVP.

### 4.1 Sentido del documento de fundamentos

Referencia técnica y operativa para la alineación del equipo multidisciplinario (Data Science, Backend, Frontend/UX, DevOps). Reúne el conocimiento recogido en **sesiones de consulta con especialistas de planta de procesamiento continuo** (industria de aceites, alimentos y piensos para animales) y su articulación con el backlog técnico, la matriz de mecanizado industrial y los requerimientos del proyecto NoCountry.

**Propósito:** evitar diseñar modelos o arquitecturas teóricas desconectadas de las restricciones físicas, las rutinas de inspección, las capacidades logísticas y los criterios de costo/beneficio reales de una planta en operación.

### 4.2 Filosofía de mantenimiento (evolución de las estrategias)

| Estrategia | Mecanismo | Impacto operativo |
|---|---|---|
| **Correctivo (reactivo)** | Se interviene el equipo solo tras la falla o parada no programada | Detenciones intempestivas en línea continua, cuellos de botella, riesgo de seguridad, sobrecostos por reparación de emergencia y logística acelerada de repuestos |
| **Preventivo (calendario / horas de uso)** | Intervenciones, lubricaciones o reemplazos según intervalos fijos de tiempo o ciclos indicados por el fabricante | Reduce fallas catastróficas, pero genera ineficiencias: reemplazo prematuro de componentes con vida útil saludable o fallas aleatorias antes de la fecha de servicio |
| **Predictivo (CBM — Condition-Based Maintenance)** | Monitoreo continuo o periódico de parámetros físicos (vibración, temperatura, resistencia dieléctrica, consumo eléctrico) para detectar la fase de degradación inicial **antes del punto de falla funcional (curva P-F)** | Maximiza la utilización de la vida útil real de los activos, elimina paradas no programadas y permite agendar intervenciones en las ventanas de parada técnica planificada |

### 4.3 Criticidad, dimensionamiento y gestión de activos

La estrategia de monitoreo **no se aplica de forma homogénea**: la asignación de sensorización responde a una evaluación estricta de costo-beneficio según criticidad y facilidad de reemplazo.

- **Motores de baja potencia (4–5 HP):** estrategia de **sustitución directa con stock en almacén** (*run-to-failure controlado*). Son estandarizados, de bajo costo y rápida sustitución; no justifican infraestructura fija de monitoreo. Se gestionan con rutinas de inspección visual y disponibilidad de repuestos en pañol.
- **Motores de alta potencia y criticidad (100–300 HP):** **monitoreo predictivo intensivo** y preservación extrema de vida útil. Representan el corazón del proceso productivo continuo (extrusores, prensas, bombas principales): un fallo no programado paraliza la planta y su desmontaje/reparación exige grúas, personal especializado y varios días de parada. Objetivo: agotar la vida útil remanente dentro de márgenes de seguridad y programar el mantenimiento en paradas generales planificadas.
- **En el MVP** la criticidad se simplifica a **Alta / Media / Baja** (columna del dataset) + `costo_parada_hora_usd` (editable por máquina como regla de negocio).
- La **matriz exhaustiva de activos, instrumental de campo e indicadores físicos** se detalla en [`DOMAIN-ONTOLOGY.md`](./DOMAIN-ONTOLOGY.md) (taxonomía) y [`DATA-MODEL.md`](./DATA-MODEL.md) (esquema conceptual).

### 4.4 Arquitectura de captura híbrida y modelo Human-in-the-Loop

Para conciliar factibilidad técnica y económica en toda la planta, el sistema no depende de una única fuente:

1. **Telemetría automática continua (sensores IoT fijos)** en activos críticos de Categoría A (motores 100–300 HP y líneas de producción continua): vibración RMS, temperatura en rodamiento y consumo de corriente.
2. **Inspecciones periódicas y rondas de campo** con instrumental portátil (megóhmetro, cámaras termográficas, pinzas amperimétricas en tableros, bancos de capacitores y motores secundarios) e **integración de robots de inspección autónomos** (rutinas nocturnas o zonas de difícil acceso, captura acústica y térmica).
3. **Registros históricos y gestión manual**: integración con CMMS/ERP (logs de mantenimiento, partes de avería, historial de repuestos).

**Regla operativa Human-in-the-Loop:** ninguna alerta automática genera una orden de detención o reparación de forma directa. La plataforma emite un **pre-informe de diagnóstico**; un experto humano (técnico/analista de mantenimiento) evalúa la recomendación, examina las variables que justifican la alerta (ej. subida de temperatura acompañada de caída en MΩ) y **valida, corrige o programa la Orden de Trabajo**.

### 4.5 Convergencia con el backlog NoCountry

Los fundamentos provienen de una **planta de procesamiento continuo**, mientras el backlog oficial corresponde a una **empresa de mecanizado** (tornos, fresadoras, centros CNC, rectificadoras, compresores).

**Decisión:** el MVP se diseña para la empresa de mecanizado del backlog, tomando prestada del dominio continuo la riqueza conceptual (modos de falla, estados de salud) donde aporte valor sin inflar el alcance.

**Necesidad de negocio que resuelve:** eliminar la incertidumbre — reemplazar decisiones basadas en intuición o calendarios rígidos por diagnósticos basados en datos de condición real.

**Las 4 preguntas que debe responder el dashboard:** 1) ¿qué máquina o sub-sistema está experimentando degradación? 2) ¿cuál es la probabilidad estimada de falla y su RUL (horas/ciclos)? 3) ¿cuál es el modo de falla físico probable (ej. picadura de rodamiento vs. pérdida de aislamiento)? 4) ¿cómo priorizar la atención según la matriz de criticidad (A/B/C)?

### 4.6 Módulos y entregables del sistema (por célula)

| Módulo | Alcance |
|---|---|
| **Núcleo de Data Science e IA** | Procesamiento de series temporales de telemetría y registros de inspección; modelos de aprendizaje supervisado y no supervisado para detección de anomalías, clasificación de modos de falla y estimación de RUL; **explicabilidad del modelo (SHAP / feature importance)** para mostrar qué variable física gatilló la predicción |
| **Backend y arquitectura de datos** | Esquema relacional y de series temporales para activos, sensores/canales, lecturas, predicciones e historial de estados; **endpoints/API** para ingesta de telemetría, consulta de estados de salud y gestión del ciclo de vida de las Órdenes de Trabajo (HiTL) |
| **Frontend y UI/UX** | **Dashboard principal** (matriz de salud global de la planta y alertas clasificadas por criticidad); **vista detalle de activo** (tendencias temporales por parámetro e historial de intervenciones); **panel HiTL** para validar pre-informes, agregar notas de diagnóstico en campo y autorizar órdenes |

### 4.7 Indicadores del dashboard (del backlog oficial)

Riesgo estimado de falla; máquinas en estado normal / bajo observación / riesgo elevado; tiempo desde el último mantenimiento; historial de fallas; tendencias de sensores; componentes con mayor frecuencia de falla; horas estimadas hasta una posible intervención. → Mapean a `target_estado_salud` y al RUL del dataset.

---

## 5. Alcance del MVP (decisiones aprobadas)

### 5.1 Decisiones cerradas ✅

1. Usuario principal: responsable/líder de mantenimiento.
2. Decisión habilitada: "¿a qué máquina intervengo y en qué orden?".
3. Predicción **por máquina** (máquina-hora).
4. No hay datos reales de la empresa → dataset sintético Dutaya + públicos de control.
5. Dataset: 1.661 horas en taller con causa; 261 eventos de disparo; 7.623 ventanas 48 h.
6. Horizonte del MVP: **48 h** (`target_falla_48h`).
7. Fuera de alcance MVP: RUL fino, por componente, CMMS real, datos reales, retraining automático, series irregulares.
8. Demo con datos simulados (v2 de Dutaya).
9. Arquitectura (ADR del repo, aceptados 2026-09-03): **monolito modular Next.js server-first + Prisma/PostgreSQL, sin tiempo real prematuro** (ver §8).

### 5.2 Decisiones aprobadas ✅ (reunión del 2026-09-10)

> **Estado:** los 11 puntos fueron **aprobados** en la reunión del 10/09/2026 (presentes: Dutaya, Seba, Pedro y el PM). Los ausentes pueden objetar y se revisa. Detalle en [`MINUTES.md`](./MINUTES.md).

| Tema | Recomendación por defecto |
|---|---|
| Familia de máquinas | Mecanizado de líneas A/B (tornos, centros de mecanizado, fresadoras) |
| Modo de falla objetivo | Binario "falla en 48 h"; profundizar `Fallo_Rodamiento` |
| Salida del MVP | Estado de salud + probabilidad de falla 48 h + prioridad |
| Frecuencia de actualización | Diaria (datos horarios, ventana móvil) |
| Configuración de criticidad | Columna del dataset + costo de parada, editable por máquina |
| Fórmula de prioridad | `P48h × peso(criticidad) × costo_parada normalizado` (+ factor tiempo desde último mantenimiento) |
| Acciones por nivel de salud | Normal → sin acción · Bajo_Observacion → monitorear · Riesgo_Critico → programar intervención ≤ 48 h · Parada_Mantenimiento → en mantenimiento |
| Estados de alerta | Abierta → En evaluación → Planificada → En ejecución → Cerrada (Correcta / Falso positivo / Descartada) |
| Registro de alerta correcta | Campo resultado al cerrar + contraste automático contra evento de falla en la ventana |
| Métricas de éxito | Recall sobre fallas ≥ 70–80 %, falsos positivos acotados, alertas/semana manejables, comparación vs. calendario |

> Nota de trazabilidad: los cuadros de la recomendación se convirtieron en **decisiones vigentes** el 2026-09-10. El repo (`docs/PRODUCT.md`, `docs/OPEN-QUESTIONS.md`, `docs/DATA-STRATEGY.md`) todavía lista varias de estas como P0 **abiertas**, porque se escribieron en la etapa "bootstrap" (antes de esta reunión y del dataset v2). **Acción pendiente del equipo:** actualizar esos documentos (y agregar ADR si la decisión es arquitectónica) con la evidencia y el responsable — regla del repo: no resolver preguntas abiertas con suposiciones silenciosas.

### 5.3 Pendientes externos 🔴 — estado actualizado

| Pendiente | Estado | Evidencia |
|---|---|---|
| Semántica exacta de "falla" | ✅ **Resuelto** | Diccionario §3: **Disparo** (`falla_inicio_disparo`, 261 pulsos, hora del colapso) vs **Convalecencia** (`falla_estado_causa`, 1.661 horas en taller, MTTR ≈ 6,4 h/falla). Columnas renombradas en v2 para expresarlo. |
| Data dictionary | ✅ **Resuelto** | `datos/README.md` del repo (30 columnas, 6 bloques, unidades). |
| Ground truth de anomalías + script/seed | ✅ **Resuelto** | `datos/script_generacion_de_datos.ipynb` (SEED=42): 280 spikes vibración (25–52 mm/s), 220 de voltaje, 150 de temperatura, ~2,5 % NaN/sensor + bloques blackout. Permite puntuar el pipeline de limpieza. |
| Leakage (`codigo_alarma_plc` / `target_estado_salud`) | ✅ **Resuelto** | Notebook §4–5: alarmas y targets se generan desde columnas internas que luego se descartan → son **salidas/monitoreo, no features**. |
| Asignar **validador industrial** | 🔴 **Sigue abierto** | Decisión del equipo. |

---

## 6. Datos: dataset Dutaya v2 (canónico) y fuentes de control

### 6.1 Dataset del MVP (`repo/datos/dataset_mantenimiento_predictivo_realista.csv`)

- **72.000 filas** (25 máquinas M-01…M-25 × 2.880 h) · **30 columnas** · período 2026-01-01 → 2026-04-30 (grilla horaria perfecta, 0 duplicados, 0 gaps).
- Columnas (diccionario oficial): A. Metadatos del activo (fecha_hora, id_maquina, tipo_equipo, modelo, linea_produccion, antiguedad_anos, criticidad, costo_parada_hora_usd, potencia_nominal_kw, marca); B. Odómetros (horas_operacion_totales, ciclos_acumulados, horas_desde_ultimo_mantenimiento, conteo_fallas_previas); C. Telemetría IIoT (estado_operativo, carga_pct, velocidad_rpm, voltaje_v, corriente_a, potencia_consumida_kw, temperatura_c, vibracion_mms, presion_bar); D. Señales SCADA/PLC (codigo_alarma_plc — **salida/monitoreo**); E. Eventos (falla_inicio_disparo, falla_estado_causa); F. Targets ML (target_falla_48h, target_tipo_falla, target_rul_horas, target_estado_salud).
- Ejemplo: `Torno CNC` / `Haas ST-30` / `Linea_A_Mecanizado_Pesado`, criticidad Alta, costo USD 1.500/h.
- Distribuciones clave (verificadas en v2): `target_falla_48h`=1 en 7.623 (10,6 %); salud: Normal 63,2 % / Bajo_Observacion 26,0 % / Riesgo_Critico 8,6 % / Parada_Mantenimiento 2,1 %; causas: Fallo_Motor_Termico 633 · Fallo_Presion_Bomba 545 · Fallo_Rodamiento 483; alarmas PLC granularizadas (WARN_ANOMALIA_TENDENCIA 4.533, ALARM_VIB_CRITICA 564, TRIP_PARADA_EMERGENCIA 131, etc.).

**v1 vs v2 (verificado celda a celda)**: no es solo renombrado. Cambian 47.260 filas (65,6 %): sobre todo `corriente_a` (45.159 celdas con variaciones pequeñas) y en menor medida `temperatura_c` (2.829) y `presion_bar` (2.773); además se renombran las columnas 25/26. **Targets, odómetros, metadatos y alarmas son idénticos.** Interpretación: Dutaya re-ejecutó el generador con ajustes (física de corriente, etc.). → **Usar la versión del repositorio como canónica**; la primera copia que circuló (v1) quedó obsoleta.

### 6.2 Calidad y riesgos (vigentes)

1. Sintético → la performance medida no garantiza performance real; debe declararse en el alcance. ✔ (declarado en docs del repo).
2. **Leakage resuelto en diseño** (ver §5.3): alarmas y targets de salida no deben usarse como features.
3. **Censura del RUL**: `target_rul_horas` (NaN salvo ≤ 48 h antes de falla; el v1 usaba 999.0, v2 usa NaN) → si se aborda RUL, tratar como supervivencia, no regresión ingenua. (RUL fino queda en fase 2.)
4. Grilla perfecta: no ejercita series irregulares (bien para MVP).
5. Faltantes ~2,5 %/sensor + outliers inyectados → ahora **puntuables contra la ground truth del notebook**.

### 6.3 Fuentes públicas de control (DS REF)

Kaggle AI4I 2020 · machine-failure-predictions · equipment-failure-prediction-dataset · NASA **C-MAPSS** (referencia de RUL) · Google Dataset Search (vibración/diagnóstico de fallas).

---

## 7. Modelo de datos

El **esquema conceptual completo** (entidades, campos, enums), el **mapeo del dataset a entidades** y el **flujo transaccional de trazabilidad** viven en [`DATA-MODEL.md`](./DATA-MODEL.md). Acá queda solo el resumen:

| Pieza | Dónde está |
| --- | --- |
| Esquema E-R y entidades (`activos`, `sensores_canales`, `lecturas_telemetria`, `predicciones_ia`, `diagnosticos_modos_falla`, `historial_estados_activo`, `ordenes_trabajo`) | [`DATA-MODEL.md`](./DATA-MODEL.md) |
| Mapeo de las 30 columnas del dataset → entidades (propuesta para Prisma) | [`DATA-MODEL.md`](./DATA-MODEL.md) |
| Decisión de implementación y migraciones | [ADR 0002](./adr/0002-prisma-postgresql.md) · [#15](../../issues/15) |

## 8. Arquitectura y stack (estado real: repo del equipo)

### 8.1 Decisiones vigentes (ADRs aceptados 2026-09-03)

| ADR | Decisión |
|---|---|
| **0001 Monolito modular** | Una sola app Next.js y un solo despliegue; módulos internos; microservicios descartados para el MVP. |
| **0002 Prisma + PostgreSQL** | PostgreSQL + Prisma (esquema/migraciones/acceso tipado server-only); sin modelos hasta validar datos. |
| **0003 Next.js server-first** | Server Components por defecto; Client solo con necesidad; Server Actions para mutaciones de UI; Route Handlers para APIs/integraciones; Zod en fronteras; **SPA + API separada descartada**. |
| **0004 Sin tiempo real prematuro** | HTTP + batch/programado; sin WebSockets/brokers hasta caso validado. |

→ **Resuelve las tensiones abiertas en v0.1** (§8.3): no hay backend REST separado (ni FastAPI/NestJS) para el MVP — la app Next es el backend (coherente con ADR 0003 y con la explicación de Next fullstack). El trabajo batch (importación de dataset, features, scoring ML) irá como **comando repetible del repo ejecutado como job separado** cuando exista necesidad medida (ARCHITECTURE.md §Batch work). Las series temporales en TimescaleDB/InfluxDB quedan para fase 2+ si el volumen lo exige.

### 8.2 Stack (package.json)

Node.js 24.15.0 LTS · Next.js **16.3.4** · React 19.2.8 · TypeScript 5.9.3 (strict) · Tailwind 4.3.3 · ESLint 9/10 · Prisma **7.10.0** (adapter-pg) · PostgreSQL 17 (compose) · Zod 4.5.4 · pg 8.23.0. CI: GitHub Actions (install → test → lint → typecheck → build) → deploy **Coolify** a `https://predictive-maintenance.smacaya.tech` (secretos en GitHub Actions, nunca en el repo).

### 8.3 Roadmap del repo (fases con criterio de salida)

**F0 Bootstrap** (app ejecutable, health check, CI) → *en curso/próximo a cerrar* · **F1 Exploración del dataset** (diccionario + perfil; en parte cubierta por los entregables de Dutaya) · **F2 Inventario de máquinas** · **F3 Visualización de sensores** · **F4 Baseline condición/anomalía** · **F5 Priorización de riesgo** · **F6 Alertas** · **F7 Feedback de mantenimiento** · **F8 Validación del MVP**. Cada fase cierra con resultado verificable; no se avanza para compensar una P0 sin resolver.

---

## 9. Organización y forma de trabajo

**Roles vigentes (desde la reunión del 2026-09-10):**

| Rol | Persona | Nota |
|---|---|---|
| **PM / coordinación** | `Fttab101` (PM en ejercicio) | Aceptado por **1 semana**; se revisa el lunes 14/09 y se evalúa rotación |
| **Referentes DS** | Dutaya + Pedro | Datos, modelo, métricas y definición de parámetros de la app |
| **Software engineer** | Seba | Frontend/backend, repo y deploy |
| **En formación DS** | Lucas | Aprende junto a los referentes DS (aporta base estadística) |
| Integrante | Denisse | Experiencia en datos, Python y SQL |
| Integrante | Diego | Canal de voz; a integrar con tarea de dúo |
| — | Karina | **Se retiró del proyecto (2026-09-08)** |

- Estructura: Coordinación → células **Data Science & IA**, **Backend & Datos**, **Frontend & UI/UX**.
- Repo público `S08-26-equipo-37`: `AGENTS.md` (reglas para devs/agentes: strict TS, Zod en fronteras, negocio fuera de componentes, server-first, Conventional Commits, Definition of Done = `npm test && npm run check && npm run build`, + `db:generate`/`db:validate` si cambia Prisma). Docs en `docs/` (PRODUCT, DATA-STRATEGY, ARCHITECTURE, OPEN-QUESTIONS, ROADMAP, DEVELOPMENT, SECURITY, ADRs).
- **Herramientas vigentes:** seguimiento de tareas en **GitHub Projects**; canales separados **#data_analist** y **#software_engineer**; comunicación general por Discord.
- **Próxima reunión:** **lunes 14/09, 12:00 (Argentina) — Sprint meet obligatorio.**
- Convención de nombres de documentos: ver **Anexo C** (los archivos compartidos **no llevan versión en el nombre**, para no consumir slots de links).
- Bootstrap local: `nvm use && npm ci`, `cp .env.example .env`, `npm run dev:full` (valida prerequisitos + Postgres Docker). UI y `/api/health` funcionan sin base.

---

## 10. Fuera de alcance del MVP (fase 2+)

RUL fino (regresión/supervivencia), predicción del **tipo** de falla como salida principal (el multiclase `target_tipo_falla` queda para preparación de refacciones en fase posterior), predicción por componente, CMMS/ERP reales, datos reales de planta, retraining automático, series irregulares, tiempo real/streaming, microservicios, MLOps/pipeline predictivo separado, autenticación/notificaciones (hasta necesidad validada), puesta en producción real.

---

## 11. Backlog inicial propuesto (alineado al roadmap del repo)

1. ✅ *Cerrado* — Dutaya entregó: diccionario, ground truth, script (SEED 42), semántica de falla, dataset v2 sin leakage.
2. **Reunión de equipo**: validar las 11 🟡 del DEC (§5.2) y el alcance F1; asignar **validador industrial**.
3. **Actualizar docs del repo** (PRODUCT/OPEN-QUESTIONS/DATA-STRATEGY + ADR si corresponde) con las decisiones cerradas y sus evidencias — sin suposiciones silenciosas.
4. **QA/limpieza** del pipeline contra la ground truth del notebook (fase F1/F4).
5. **EDA + feature engineering** (ventanas/derivadas, sin targets ni alarmas como features).
6. **Línea base modelo 48 h** (clasificación, partición temporal estricta; recall ≥ 70–80 % a definir).
7. **Decisión de esquema Prisma** con el mapeo del §7.2 (Fase 2) + seed desde el CSV v2.
8. **Priorización** (score × criticidad × costo) y **dashboard de riesgo por máquina** (F3/F5).
9. **Alertas + feedback** (F6/F7) y **validación MVP** (F8).
10. **Documento de limitaciones**: dataset sintético, censura RUL, leakage (declarado en el repo) → [`MODEL-LIMITATIONS.md`](./MODEL-LIMITATIONS.md).

---

## 12. Decisiones abiertas para la próxima reunión (resumen accionable)

- Validar las 11 propuestas 🟡 de la §5.2 (todas con recomendación por defecto).
- Confirmar la **familia de máquinas** y los **umbrales de métricas de éxito** (P0 del repo).
- Asignar el **validador industrial** (único 🔴 restante).
- Acordar cuándo crear el **schema Prisma** (el repo lo difiere hasta validar; el mapeo candidato está en §7.2).
- Decidir si la **salida** será probabilidad calibrada de falla 48 h (dataset lo soporta: 7.623 eventos) o se mantiene score/ranking (alinear con PRODUCT.md/DATA-STRATEGY.md).
- Ordenar tareas según roadmap F0→F8 y el cronograma de la simulación (S0–S4, fin 06/10).

---

## Anexo A — Documentación relacionada en el repositorio

| Documento | Qué contiene |
| --- | --- |
| [`PRODUCT.md`](./PRODUCT.md) | Hechos, hipótesis y decisiones de producto |
| [`SPEC-MVP-PARAMETERS.md`](./SPEC-MVP-PARAMETERS.md) | Parámetros del MVP a acordar (target, features, métricas, umbral) |
| [`DOMAIN-ONTOLOGY.md`](./DOMAIN-ONTOLOGY.md) | Taxonomía PdM: activos, variables, canales, modos de falla, estados, criticidad |
| [`DATA-MODEL.md`](./DATA-MODEL.md) | Esquema conceptual E-R y mapeo del dataset a entidades |
| [`DATA-STRATEGY.md`](./DATA-STRATEGY.md) | Regla rectora, inventario mínimo y datasets de control |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`adr/`](./adr/) | Arquitectura vigente y decisiones registradas |
| [`BACKLOG.md`](./BACKLOG.md) · [`MINUTES.md`](./MINUTES.md) | Qué significa cada tarea · minutas compiladas |
| [`../ml/README.md`](../ml/README.md) | Diccionario oficial del dataset |

Los materiales originales (documentos de trabajo previos) quedan en el historial de git del repositorio y del espacio compartido del equipo.

## Anexo B — Roster y aportes del equipo (actualizado 2026-09-08)

| Miembro | GitHub | Aporte principal | Estado |
|---|---|---|---|
| **Seba** | `SebastianMacaya` | **Software engineer del equipo.** Autor principal del bootstrap en `main` (31 commits): repo Next.js, PostgreSQL local con Docker, CI, docs/ADRs y **despliegue en producción `https://predictive-maintenance.smacaya.tech/`** (Coolify, dominio propio smacaya.tech). Su trabajo estructuró la base técnica que tenemos hoy (Fase 0). | Activo |
| **Dutaya** | `Dutaya000` | **Referente DS.** Dataset v2 del MVP, diccionario oficial (`datos/README.md`) y generador reproducible (SEED 42) con ground truth de anomalías. | Activo |
| **Denisse** | `deniiamayaDev` (Denisse Amaya) | Experiencia en datos, Python y SQL — candidata referente de la célula DS y posible mentora de perfiles en formación. | Activo |
| **Lucas** | *(por confirmar)* | Matemáticas (profesor); busca aprender análisis de datos junto a la célula DS; aporta base estadística (métricas, RUL, MTBF). | Activo |
| **Pedro** | *(sin actividad en repo/escritos)* | **Referente DS.** Se comunica por voz (con Diego); sin novedad de conexión con el resto aún — integrar vía canal de voz y tarea de dúo. | Activo (a integrar) |
| **Diego** | *(sin actividad en repo/escritos)* | Se comunica por voz (con Pedro); sin novedad de conexión con el resto aún — integrar vía canal de voz y tarea de dúo. | Activo (a integrar) |
| **PM en ejercicio** | `Fttab101` | Coordinación rotativa (revisión semanal): consolida alcance, minutas y tablero; autor de la documentación de decisiones. | Activo |
| **Karina** | `karinakozlowski` | *(rol previo a cubrir)* | **Se retiró del proyecto (2026-09-08)** |

*Nota: `superjonic` (Leandro Buzeta, founder de No Country) figura en CODEOWNERS como observador/coach, no como miembro del equipo.*

---

## Anexo C — Convención de nombres de la documentación

Decisión registrada en el [ADR 0005](./adr/0005-documentation-conventions.md):

| Regla | Detalle |
| --- | --- |
| Idioma de archivos | **Inglés**, en mayúsculas y con guiones (`DATA-MODEL.md`, `SPEC-MVP-PARAMETERS.md`) |
| Idioma del contenido | **Español** (el equipo trabaja en español) |
| Prefijos heredados | Los documentos de trabajo del equipo usaban `[GEN]`, `[DS]`, `[BK]`, `[FE]`, `[DEV]` con tipos `ALIGN`, `SPEC`, `ARCH`, `MIN`, `GUIDE`, `DEC`, `REQ`. Se conservan como referencia en el historial; en el repositorio se usa la convención de arriba |
| Versiones | **Sin versión en el nombre del archivo**: el historial lo guarda git y la versión se registra en el encabezado del documento |
| Cambios | Por PR, con Conventional Commits (`docs(scope): …`) |

---

*Documento vivo — actualizar al incorporar nuevos insumos o decisiones del equipo.*
