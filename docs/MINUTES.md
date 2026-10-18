# Minutas del equipo

| Campo | Valor |
| --- | --- |
| Proyecto | PredictiveMaintenance (NoCountry) |
| Documento | Minutas compiladas — **orden: más reciente → más antigua** |
| Versión | v2.0 |
| Última actualización | 2026-10-04 |
| Responsable de edición | PM en ejercicio (rotativo) |
| Regla | Se **agrega la minuta nueva arriba**; no se reescriben minutas previas. El historial completo queda en git |

> **Cómo se usa:** §1 es el **estado vigente** (lo que rige hoy); §2 en adelante son las minutas, de la más nueva a la más vieja. Cada minuta nueva entra por PR (`docs(minutes): …`).

---

## 1. Estado vigente

**Estado de la simulación laboral:** entrega cerrada el **02/10/2026** (Demo Day); el cierre de la plataforma quedó fijado para el **05/10/2026 a las 23:59 (hora de Argentina)**, que por la diferencia horaria el listado de la plataforma muestra como 06/10. La fecha que se registra es la del cierre: **05/10/2026**.

### Roles durante la simulación

| Integrante | Rol |
| --- | --- |
| Héctor Medina Rodríguez |  Project Manager & Data Analyst |
| Sebastián Macaya | Software Engineer |
| Pedro L. Acosta Pérez | Data Analyst & Project Manager |
| Flavio Taya Ramos | Machine Learning Engineer |
| Diego Borges Salces | Backend Developer |

### Estado del proyecto al cierre de la simulación

- **Frontend:** se presentó una versión funcional de la plataforma con gestión de máquinas, alertas, roles de usuario y solicitudes de invitación. Se implementó la opción de personalizar el modo de visualización entre tema claro y oscuro.
- **Modelo de Machine Learning:** se reentrenó el modelo excluyendo las variables `potencia_consumida_kw` y `corriente_a`. Se exportó `modelo_predictivo_lightgbm.joblib` con 40 características y se alineó la definición de columnas de entrada de la API con los nombres y el orden esperados por el modelo. Se ejecutó una prueba de aserción en el notebook para verificar la consistencia.
- **Diseño del esquema de datos:** se trabajó en el diseño del esquema de datos de la aplicación, teniendo en cuenta los requisitos funcionales, el dataset de entrenamiento y las necesidades de integración con el backend. La propuesta de esquema se incorporó posteriormente al repositorio mediante el [PR #57](https://github.com/No-Country-simulation/S08-26-equipo-37/pull/57).
- **Base de datos e integración:** aunque se avanzó en el diseño del esquema y en los componentes de la aplicación, la integración completa no se terminó antes del Demo Day. La incorporación del esquema de Prisma al repositorio tampoco significó que la base de datos estuviera desplegada y operativa: la migración a PostgreSQL seguía pendiente y estaba documentada en el [issue #15](https://github.com/No-Country-simulation/S08-26-equipo-37/issues/15).
- **Entregables:** El 2 de octubre se completó la entrega de los cuatro entregables requeridos en la plataforma de NoCountry, cumpliendo así en tiempo y forma.

---

## 2. Minuta — Demo Day y cierre de la simulación (2026-10-02)

| Campo | Valor |
| --- | --- |
| Fecha | Viernes 02/10/2026 |
| Modalidad | Voz (sesión a través de Meet) |
| Asistentes | Pedro y Héctor |

### Temas tratados y acuerdos

1. **Presentación del proyecto:** Pedro presentó el proyecto de mantenimiento predictivo ante la comunidad de NoCountry.
2. **Subida de los entregables:** Héctor subió la versión final del video, completando así la publicación de los cuatro entregables asignados en la plataforma de NoCountry.
3. **Participación del equipo:** Héctor, Sebastián, Pedro, Flavio y Diego completaron las simulación. Denisse y Lucas no participaron en las últimas semanas de trabajo ni llegaron a las instancias finales con el resto del equipo.
4. **Cierre de la simulación:** se da por finalizada la simulación laboral.

### Acciones

| # | Acción | Responsable | Estado |
| --- | --- | --- | --- |
| A1 | Subir la versión final del video a la plataforma de NoCountry | Héctor | Completada |
| A2 | Completar la publicación de los cuatro entregables asignados | Equipo | Completada |

### Pendientes

- **Cierre administrativo de la simulación** el **05/10/2026 a las 23:59 (hora de Argentina)** — el listado de la plataforma lo muestra como 06/10 por la zona horaria.
- Lo que quedó fuera del alcance presentado y sigue abierto: la migración de mantenimiento a PostgreSQL ([#15](../../issues/15)), la integración del prototipo de inferencia con la aplicación y la regeneración del dataset ([#48](../../issues/48)).

---

## 3. Minuta — Pre-demo meet (2026-10-01)

| Campo | Valor |
| --- | --- |
| Fecha | Jueves 01/10/2026 |
| Modalidad | Asincrónica, mediante los canales de texto de Discord |
| Asistentes | Héctor, Sebastián, Pedro, Flavio y Diego |
| Ausentes | Denisse y Lucas |

### Temas tratados y acuerdos

1. **Frontend:** Sebastián implementó la opción de visualización personalizable por perfil, con temas claro y oscuro.
2. **Video de presentación:** Héctor presentó un borrador del video. Se propusieron modificaciones para mejorar la versión final.
3. **Entregables:** se informó que tres de los cuatro entregables asignados ya estaban publicados en la plataforma de NoCountry. Quedaba pendiente la publicación del video final.

### Acciones

| # | Acción | Responsable | Estado |
| --- | --- | --- | --- |
| A1 | Incorporar las modificaciones propuestas al video y preparar la versión final | Héctor | Pendiente al cierre de la sesión |
| A2 | Publicar el video final en la plataforma de NoCountry | Héctor | Pendiente al cierre de la sesión |

### Pendientes

- **A1 y A2** (modificaciones y publicación del video final) se cerraron el **02/10**, según la minuta del Demo Day.

---

## 4. Minuta — Planeación del sprint final (2026-09-28)

| Campo | Valor |
| --- | --- |
| Fecha | Lunes 28/09/2026 |
| Modalidad | Voz y texto |
| Asistentes | Héctor, Sebastián, Pedro y Flavio |
| Ausentes | Diego, Denisse y Lucas |

### Temas tratados y acuerdos

1. **Planificación del cierre:** se establecieron como fechas relevantes el pre-demo meet del jueves 01/10 y el Demo Day del viernes 02/10.
2. **Frontend:** Sebastián presentó la versión disponible de la plataforma, que incluía gestión de máquinas, alertas, roles de usuario y solicitudes de invitación. Pedro propuso incorporar un modo oscuro, además del modo claro existente.
3. **Entregable 1:** Pedro presentó un borrador del documento. Héctor lo revisó y propuso sugerencias para mejorarlo.
4. **Video de presentación:** se acordó que Héctor estaría a cargo de grabar el video. Se contaba con un guion escrito que organizaba el contenido tramo por tramo.
5. **Actualización del modelo predictivo:** Flavio presentó los siguientes cambios:
   - Se reentrenó el modelo excluyendo definitivamente las variables `potencia_consumida_kw` y `corriente_a`.
   - Se exportó y se incorporó al repositorio el archivo `modelo_predictivo_lightgbm.joblib`, con exactamente 40 características.
   - Se alineó `columnas_modelo` en `ml/api/main.py` con los nombres y el orden de las características del modelo cargado.
   - Se actualizó la definición de `LecturaSensor` y el payload de ejemplo en `ml/README.md` para documentar las 40 columnas y corregir el ejemplo que generaba un error 422.
   - Se ejecutó una prueba de aserción al final del notebook para confirmar la consistencia de las características.
6. **Esquema de datos:** quedó pendiente que Diego realizara modificaciones al esquema de acuerdo con las observaciones hechas por Sebastián.

### Acciones

| # | Acción | Responsable | Estado |
| --- | --- | --- | --- |
| A1 | Implementar el modo oscuro como alternativa al modo claro | Sebastián | Propuesta presentada; implementación pendiente al cierre de la reunión |
| A2 | Revisar y ajustar el borrador del Entregable 1 | Pedro / Héctor | En revisión |
| A3 | Grabar el video de presentación siguiendo el guion acordado | Héctor | Pendiente |
| A4 | Ajustar el esquema de datos según las observaciones de Sebastián | Diego | Pendiente |
| A5 | Validar la consistencia del modelo actualizado y de sus características de entrada | Flavio | Prueba de consistencia reportada como realizada |

### Pendientes

- **A2** (ajustes del Entregable 1) cerró con la revisión y la publicación del 02/10.
- **A3** (video) se cerró el 01/10.
- **A4** (esquema de datos) se resolvió con el [#57](../../pull/57), mergeado el **04/10**.
- **A5** (validación del modelo) quedó cerrada con el [#47](../../pull/47).
- **Sigue abierto lo que depende del origen de los datos:** regenerar el dataset ([#48](../../issues/48)) y corregir el filtro de limpieza ([#10](../../issues/10)).

---

## 5. Minuta — Cierre del sprint (2026-09-24)

| Campo | Valor |
| --- | --- |
| Fecha | Jueves 24/09/2026 |
| Modalidad | Asincrónica: no se celebró reunión de voz. El cierre del sprint y el plan de la semana se comunicaron por escrito, en los canales de texto de Discord |
| Asistentes | Héctor, Sebastián, Pedro, Flavio y Diego |
| Ausentes | Denisse y Lucas |

### Temas tratados y acuerdos

1. **Coordinación del equipo:** el 23/09/2026, Pedro comenzó a ejercer el rol de Project Manager (PM), después de que transcurrieran 24 horas desde la presentación de la propuesta sin que se registraran objeciones. Héctor se comprometió a acompañarlo y apoyarlo en las tareas de coordinación que lo requirieran.
2. **Diseño del modelo de datos:** el 23/09/2026 se encomendó a Diego una tarea relacionada con la misión técnica propuesta el día 22 de septiembre: diseñar el modelo de datos de la aplicación, teniendo en cuenta los requisitos funcionales, el dataset utilizado para entrenar el modelo de Machine Learning y las necesidades de integración con el backend.
3. **Alcance de la tarea:** el trabajo debía determinar la información que debía persistirse, identificar las entidades y relaciones necesarias y proponer un esquema PostgreSQL implementable mediante Prisma ORM.

### Acciones

| # | Acción | Responsable | Estado |
| --- | --- | --- | --- |
| A1 | Acompañar a Pedro en las tareas de coordinación cuando lo requiera | Héctor | Compromiso asumido (23/09/2026) |
| A2 | Diseñar el modelo de datos, identificar entidades y relaciones y proponer un esquema PostgreSQL compatible con Prisma ORM | Diego | Asignada (23/09/2026) |

### Pendientes

- **A2** (modelo de datos) se resolvió con el [#57](../../pull/57), con Diego como autor y Pedro como coautor.

---

## 6. Minuta — Sprint planning extraordinario (2026-09-22)

| Campo | Valor |
| --- | --- |
| Fecha | Martes 22/09/2026 |
| Modalidad | Voz |
| Asistentes | Héctor, Sebastián y Pedro |
| Ausentes | Denisse, Lucas, Flavio y Diego |

### Temas tratados y acuerdos

1. **Participación del equipo:** se informó que Lucas no había vuelto a reportarse con el equipo. También se señaló que Denisse no había ejercido el rol de Project Manager que se le había asignado la semana anterior.
2. **Propuesta de coordinación:** se propuso a Pedro para asumir el rol de PM, con la responsabilidad de organizar el trabajo diario, destrabar bloqueos y realizar seguimiento al avance de las tareas. La propuesta quedó pendiente de aprobación por parte del equipo.
3. **Pendientes críticos para el cierre:** se identificaron tres frentes de trabajo prioritarios:
   - Validar el dataset y el modelo de predicción.
   - Construir la base de datos.
   - Integrar los componentes frontend y backend.
4. **Limpieza del dataset y reentrenamiento:** se plantearon dos decisiones técnicas pendientes:
   - Determinar si se debía corregir el filtro de limpieza antes de reentrenar el modelo o proceder con los datos disponibles.
   - Determinar si el reentrenamiento debía realizarse sin las variables `potencia_consumida_kw` y `corriente_a`. Se señaló que, si se excluían ambas variables, la evaluación debía rehacerse con el mismo criterio de evaluación utilizado en `analisis/`.
5. **Propuesta de articulación técnica:** se propuso encomendar a Diego la articulación de las tres piezas del flujo de datos: dataset, base de datos y entradas del pipeline. La misión también contemplaba los aspectos relacionados con el repositorio y la integración continua (CI). La propuesta quedó pendiente de aceptación.

### Acciones

| # | Acción | Responsable | Estado |
| --- | --- | --- | --- |
| A1 | Definir la asignación del rol de PM y las responsabilidades de coordinación | Equipo | Propuesta presentada; pendiente de aprobación |
| A2 | Validar el dataset y el modelo de predicción | Célula de datos | Pendiente |
| A3 | Construir la base de datos | Responsable por confirmar | Pendiente |
| A4 | Integrar los componentes frontend y backend | Equipo de desarrollo | Pendiente |
| A5 | Definir el criterio de limpieza del dataset y el alcance del reentrenamiento | Célula de datos | Pendiente de decisión |
| A6 | Articular el dataset, la base de datos, las entradas del pipeline, el repositorio y CI | Diego | Misión propuesta; pendiente de aceptación |

### Pendientes

- **A1** (rol de PM): aprobado el 23/09 y registrado en la minuta del cierre del sprint.
- **A2** (validar dataset y modelo): el modelo se corrigió y se reentrenó ([#47](../../pull/47)); la validación del dataset sigue abierta ([#48](../../issues/48), [#10](../../issues/10)).
- **A3** (base de datos): **sigue pendiente** — la migración de mantenimiento no está generada ni aplicada ([#15](../../issues/15)).
- **A4** (integración frontend/backend): **sigue pendiente**; quedó fuera del alcance presentado.
- **A5** (criterio de limpieza): **abierta**, en [#10](../../issues/10).
- **A6** (articulación de las tres piezas): entregada como esquema en el [#57](../../pull/57); la importación del dataset a PostgreSQL sigue pendiente.

---

## 7. Registro — Sesión ordinaria de planeación no realizada (2026-09-21)

| Campo | Valor |
| --- | --- |
| Fecha | Lunes 21/09/2026 |
| Carácter | Sesión ordinaria de planeación |
| Estado | No se realizó la sesión |

No se celebró la sesión ordinaria de planeación prevista para esta fecha.

---

## 8. Minuta — Reunión 2026-09-10 (decisiones del MVP y roles)

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

## 9. Minuta — Kick-off / Arranque organizativo (S0, 2026-09-03)

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
