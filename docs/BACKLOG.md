# Backlog explicado

> Guía del tablero [#505](https://github.com/orgs/No-Country-simulation/projects/505) para todo el equipo: **qué significa cada tarea, por qué existe y cómo se ve terminada**.
> Estado: 2026-09-11 · Las tareas se crean y siguen en el tablero; este documento las explica.

**Enlaces rápidos:** [Tablero #505](https://github.com/orgs/No-Country-simulation/projects/505) · [Issues abiertos](../../issues) · [Parámetros del MVP](./SPEC-MVP-PARAMETERS.md)

---

## 1. Cómo leer el backlog

Las tareas siguen una cadena, no son una lista suelta:

```
ENTENDER LOS DATOS        DECIDIR           CONSTRUIR              MOSTRAR
#10 QA/limpieza  ─┐
#11 EDA/features ─┼─► #12 parámetros ─► #13 modelo 48h ─► #19 servicio ─┐
#14 limitaciones ─┘                                                      ├─► #18 dashboard
                                                                         ├─► #20 alertas ─► #21 HiTL
BASE DE DATOS:  #15 schema ─► #16 seed ─► #17 vista sensores ────────────┘
TRANSVERSAL:    #22 maqueta · #23 dependencias · #24 validador · #25 docs · #27 tablero · #26 demo
                                                                        (+ #33 docs LFS · #34 CI dataset)
```

**Labels y campos del tablero**

| Elemento | Valores | Para qué |
| --- | --- | --- |
| `cell:*` | `cell:data-science` · `cell:software` · `cell:pm` | Qué célula es dueña |
| `type:*` | `feature` · `analysis` · `decision` · `docs` · `chore` | Naturaleza del trabajo |
| `sprint:*` | `sprint:1` … `sprint:4` | Sprint asignado |
| Campos | **Célula · Fase (F1–F8) · Sprint · Tamaño (XS–L) · Prioridad (P0–P2)** | Filtros y vistas |

**Regla de oro**: primero se entiende y se decide (#10–#14), después se construye (#15–#21); lo transversal (#22–#37) mantiene el proyecto ordenado y presentable.

---

## 2. Data Science — entender los datos y elegir qué prometemos

### [#10](../../issues/10) · QA y limpieza del dataset contra la ground truth
El dataset **tiene errores puestos a propósito** (faltantes, picos, caídas de red, blackouts). Como el generador usa **semilla 42**, sabemos *qué reglas* y *cuántas* anomalías hay, pero **el notebook no exporta la lista de filas**.

- **Cómo obtenerla**: (a) re-ejecutar el notebook y agregar una celda que guarde los índices (`idx_spikes_vib`, etc.) y verificar que el CSV regenerado coincida con el del repo; o (b) pedirle a Dutaya `anomalias_ground_truth.csv`.
- **Cuidado clave**: no todo valor extremo es basura — antes de una falla real la temperatura y la vibración suben de verdad. La regla es **marcar y excluir del cálculo, nunca borrar la fila** (la fila es la marca temporal).
- **Terminado cuando**: reporte de perfiles + reglas de imputación/outliers + **tabla "detectado vs inyectado"** (por tipo y a nivel fila, con falsos negativos y falsos positivos).

### [#11](../../issues/11) · EDA + feature engineering
Crear variables que resuman **la historia** de cada máquina, no solo el instante: medias/desvíos móviles (6/12/24/48 h), deltas, ratios, contexto operativo.

- **Prohibido**: usar `target_*`, `codigo_alarma_plc`, `falla_inicio_disparo`, `falla_estado_causa` como features → **leakage**.
- **Terminado cuando**: documento de features con justificación física + script reproducible.

### [#12](../../issues/12) · Definir parámetros del MVP ⭐ (la decisión madre)
Fija **qué predecimos y cómo lo medimos**: target y horizonte, lista blanca de features, ventanas, tratamiento de nulos, partición temporal, métrica de éxito y umbral de alerta.

- **Desbloquea**: #11, #13 y #15. Si no se cierra, todo lo demás se atasca.
- **Terminado cuando**: `SPEC-MVP-PARAMETERS.md` completado y aprobado.

### [#13](../../issues/13) · Baseline de clasificación 48 h
El primer modelo simple que responde *"¿riesgo de falla en 48 h?"* (regresión logística o GBM básico, sin tuning).

- **Cómo se hace bien**: split **temporal** (nunca aleatorio), métricas de recall/precision/**PR-AUC**, alertas por semana, y **comparación contra el mantenimiento por calendario** (la referencia operativa).
- **Test anti-leakage** (ver §5): si da AUC 0,99, algo salió mal.
- **Terminado cuando**: notebook reproducible + tabla de métricas + umbral elegido y justificado.

### [#14](../../issues/14) · Documento de limitaciones
Qué **no** podemos prometer: dataset sintético, 261 eventos de falla, grilla horaria perfecta, RUL censurado (NaN salvo ≤48 h), supuestos del generador (costos, criticidad, alarmas).
**Terminado cuando**: 1–2 páginas citadas desde la demo.

---

## 3. Software — convertir eso en una app usable

### [#15](../../issues/15) · Schema Prisma + migración inicial
Traducir el dataset a tablas: `activos`, `lecturas_telemetria`, `predicciones`, `alertas`, `eventos`.

- **Decisiones**: naming español vs inglés (merece **ADR**), PK de activos, constraint único `(id_maquina, fecha_hora)`, JSONB para la explicabilidad del modelo.
- **Terminado cuando**: `npm run db:validate` OK + migración nombrada.

### [#16](../../issues/16) · Seed reproducible desde el CSV v2
⚠️ Acá **seed = datos iniciales en la base** (no la semilla 42 del generador). Carga 25 máquinas y 72.000 lecturas.

- **Prerequisito**: `git lfs install && git lfs pull` (el CSV vive en LFS, ver [`DEVELOPMENT.md`](./DEVELOPMENT.md)).
- **Terminado cuando**: se puede correr dos veces sin duplicar y los conteos coinciden.

### [#17](../../issues/17) · Vista temporal de sensores por equipo
Pantalla que muestra la evolución de temperatura, vibración, corriente y presión de una máquina.

- **Detalles que hacen la diferencia**: marcar huecos/blackouts como "sin dato" (≠ 0), líneas verticales en los episodios de falla, sombrear las horas con `estado_operativo = 0`.
- **Terminado cuando**: mantenimiento mira una señal y la entiende.

### [#18](../../issues/18) · Dashboard de riesgo por máquina
La pantalla principal: lista ordenada por prioridad con `máquina · línea · criticidad · salud · P(48h) · prioridad · motivo · acción sugerida`.

- **Terminado cuando**: el responsable responde *"¿a qué máquina voy primero?"* en menos de 30 segundos y entiende **por qué**.

### [#19](../../issues/19) · Servicio de predicciones y prioridad
El puente entre DS y la app: **contrato de datos** (`id_maquina`, `fecha_calculo`, `probabilidad_falla_48h`, `estado_salud_sugerido`, `rul_horas`, `variables_explicativas`, `version_modelo`) + cálculo de prioridad en un service server-side.

- **Terminado cuando**: la UI muestra datos sin importar Prisma y con `fecha_calculo` + `version_modelo` visibles.

### [#20](../../issues/20) · Flujo de alertas con estados y resultado
Una **alerta** es un objeto que persiste y tiene dueño (no un número que se recalcula).

- **Ciclo**: Abierta → En evaluación → Planificada → En ejecución → Cerrada (correcta / falso positivo / descartada).
- **Anti-ruido**: máximo **una alerta abierta por máquina**.
- **Extra**: contraste automático con `falla_inicio_disparo` a las 48 h → propone "correcta" o "falso positivo".
- **Terminado cuando**: existen los estados, la trazabilidad y la métrica de **precisión de alertas**.

### [#21](../../issues/21) · Panel Human-in-the-Loop
Donde el experto **valida, corrige o descarta** la alerta (con la explicación del modelo y el histórico) y **emite la orden de trabajo**. Regla de dominio: **ninguna acción es automática**.

### [#22](../../issues/22) · Maqueta del frontend al repo
Imágenes/wireframes en `docs/design/` + nota de decisiones de UI, vía PR para que el equipo opine.

### [#23](../../issues/23) · Ordenar dependencias
Mergear [#3](../../pull/3) (quita el warning de Node 20), cerrar [#6](../../pull/6) (TypeScript 7 rompe CI por *peer dependencies*), evaluar [#4](../../pull/4), [#28](../../pull/28)–[#31](../../pull/31).

---

## 4. PM / Coordinación

| Issue | Tarea | En simple | Terminado cuando |
| --- | --- | --- | --- |
| [#24](../../issues/24) | Validador industrial | Quién revisa que todo tenga sentido de planta | Rol asignado y registrado |
| [#25](../../issues/25) | Actualizar docs del repo | `PRODUCT` / `OPEN-QUESTIONS` / `DATA-STRATEGY` alineados a lo aprobado el 10/09 (+ ADR si aplica) | PR de docs mergeado |
| [#26](../../issues/26) | Guion de la demo final | Qué mostramos, en qué orden y quién lo cuenta | Guion + ensayo |
| [#27](../../issues/27) | Configurar el tablero | Campos, labels, vistas y backlog cargado | 4 vistas + Prioridad |
| [#33](../../issues/33) | Documentar requisito de Git LFS | El dataset vive en LFS: quien clone necesita `git-lfs` | PR [#35](../../pull/35) |
| [#34](../../issues/34) | Validación del dataset en CI | `lfs: true` + validador de integridad | PR [#36](../../pull/36) |
| [#37](../../issues/37) | Migrar la documentación al repo | GitHub como fuente única; el espacio compartido queda como portal | Este documento + `docs/README.md` |

---

## 5. Glosario

| Término | Qué significa |
| --- | --- |
| **target** | La respuesta que queremos predecir (`target_falla_48h`) |
| **leakage (fuga)** | Usar como variable algo que en producción **no conocerías** al predecir → el modelo parece perfecto y falla en la vida real |
| **AUC** | Probabilidad de que, eligiendo al azar una máquina que falla y otra sana, el modelo le dé más riesgo a la que falla. 0,5 = azar · 0,7–0,8 = aceptable · **0,99 = sospechoso de leakage** |
| **PR-AUC** | Área precision-recall: la métrica útil cuando las clases están desbalanceadas (acá solo 10,6 % positivos) |
| **partición temporal** | Entrenar con lo viejo y evaluar con lo nuevo (nunca mezclado) |
| **recall** | De todas las fallas reales, cuántas anticipamos (objetivo ≥ 70–80 %) |
| **falsos positivos** | Alertas que no eran falla → consumen tiempo de mantenimiento |
| **RUL** | *Remaining Useful Life*: horas de vida útil restantes |
| **ground truth** | La "verdad conocida" de qué anomalías se inyectaron con la semilla 42 |
| **seed (dos sentidos)** | ① semilla aleatoria (42) = reproducibilidad del generador · ② *seed* de base = datos iniciales de prueba (#16) |
| **winsorizar** | Recortar valores extremos a un percentil (ej. >90,8 °C → 90,8) en lugar de borrarlos. **Riesgo**: esconde degradación real |
| **HiTL** | *Human-in-the-Loop*: el humano valida antes de actuar |
| **baseline** | El modelo más simple posible, como referencia antes de optimizar |
| **ADR** | *Architecture Decision Record*: documento corto con Contexto / Decisión / Consecuencias / Alternativas |
| **Git LFS** | Guarda los archivos pesados fuera del historial de Git; sin `git-lfs` el archivo llega como **puntero** de 3 líneas |
| **squash merge** | Unir todos los commits del PR en uno solo al mergear (único método permitido en `main`) |

### El test anti-leakage, con números reales del dataset

AUC de **una sola columna** prediciendo `target_falla_48h`:

| Columna | AUC | Veredicto |
| --- | --- | --- |
| `target_estado_salud` | 0,998 | 🚨 es una **salida** |
| `codigo_alarma_plc` | 0,998 | 🚨 salida disfrazada de dato de planta |
| `temperatura_c` | 0,702 | ✅ señal física |
| `vibracion_mms` | 0,668 | ✅ señal física |
| `presion_bar` | 0,219 | ✅ fuerte pero **invertida** (0,78 al revés: presión baja anticipa falla) |
| `corriente_a` / `carga_pct` | 0,45 / 0,42 | señal débil por sí sola |

**Regla práctica**: cualquier columna con AUC > 0,95 debe auditarse antes de entrar como feature, y un modelo final con AUC ≈ 0,99 significa que está usando una salida.

---

## 6. Ruta crítica del Sprint 1

**Bloqueantes** (si no salen, el resto se atasca): [#12](../../issues/12) (parámetros) → [#15](../../issues/15) (schema) → [#17](../../issues/17)/[#18](../../issues/18) (pantallas). En paralelo: [#10](../../issues/10) (QA del dataset).

**Cierres cortos que dan aire**: #22 (maqueta), [#23](../../issues/23) (dependencias), [#24](../../issues/24) (validador), [#25](../../issues/25) (docs), [#27](../../issues/27) (tablero).

**Ya resuelto o en curso**: tablero poblado (20 items + migración de docs) · [#33](../../issues/33) y [#34](../../issues/34) implementados en PRs con checks en verde.
