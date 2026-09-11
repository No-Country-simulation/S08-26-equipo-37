# Parámetros del MVP — plantilla para completar

| Campo | Valor |
| --- | --- |
| Proyecto | PredictiveMaintenance (NoCountry) |
| Documento | Parámetros del MVP — plantilla de decisión |
| Issue asociado | [#12](../../issues/12) Definir parámetros del MVP |
| Reunión | **Sprint meet — lunes 14/09/2026, 12:00 (Argentina)** |
| Versión | v0.1 — **plantilla sin completar** |
| Completan | DS (Dutaya + Pedro) · PM (`Fttab101`) · SE (Seba) |
| Estado | Abierto — se completa y firma en la reunión |

> **Cómo se usa**
> 1. Recorrer los bloques en orden (§1 a §11). En cada tabla, *Recomendación por defecto* ya está cargada: alcanza con confirmarla o reemplazarla.
> 2. Escribir la decisión en la columna **Decisión** y anotar quién la tomó.
> 3. Al cerrar: mover [#12](../../issues/12) a *Done* en el tablero, actualizar los docs del repo ([#25](../../issues/25)) y mergear este documento por PR.
> 4. Si una decisión cambia después, se agrega una fila "reemplaza a…" — este documento **no se reescribe**.

---

## 1. Alcance y unidad de predicción

| Parámetro | Recomendación por defecto | Decisión | Impacto si cambia |
| --- | --- | --- | --- |
| Usuario principal | Responsable/líder de mantenimiento | | Cambia qué información se prioriza en la UI |
| Decisión que habilita | "¿A qué máquina intervengo y en qué orden?" | | — |
| Unidad de predicción | **Máquina-hora** (una fila = una máquina en una hora) | | El dataset no tiene granularidad por componente |
| Alcance de activos | Mecanizado líneas A/B (tornos, CNC, fresadoras) | | Afecta el volumen de datos y la demo |

## 2. Target y horizonte

| Parámetro | Recomendación por defecto | Decisión | Impacto si cambia |
| --- | --- | --- | --- |
| Target principal | `target_falla_48h` (clasificación binaria 0/1) | | Es el único target etiquetado con horizonte |
| Horizonte | **48 horas** | | 24 h es derivable; 7/30 días **no** están etiquetados |
| Tipo de problema | Clasificación binaria (no regresión de RUL) | | RUL fino queda fuera del MVP (censurado) |
| Salida secundaria | Estado de salud + prioridad | | Requiere definir la fórmula (§8) |

## 3. Definición de "falla" para el MVP

| Parámetro | Recomendación por defecto | Decisión | Impacto si cambia |
| --- | --- | --- | --- |
| Evento de falla | `falla_inicio_disparo = 1` (hora del colapso) | | Es el "disparo": 261 eventos |
| Estado de reparación | `falla_estado_causa ≠ "Ninguna"` (1.661 horas en taller) | | Se usa para contexto, **no** como target |
| Ventana de anticipación | Las 48 h previas a un disparo | | Define qué filas son positivas |

## 4. Features: lista blanca y lista negra

| Grupo | Contenido | Decisión |
| --- | --- | --- |
| ✅ **Permitidas** — sensores | `temperatura_c`, `vibracion_mms`, `corriente_a`, `presion_bar`, `carga_pct`, `velocidad_rpm`, `voltaje_v`, `potencia_consumida_kw` | |
| ✅ **Permitidas** — odómetros/contexto | `horas_operacion_totales`, `ciclos_acumulados`, `horas_desde_ultimo_mantenimiento`, `conteo_fallas_previas`, `estado_operativo` | |
| ✅ **Permitidas** — activo | `tipo_equipo`, `modelo`, `linea_produccion`, `criticidad`, `potencia_nominal_kw`, `antiguedad_anos`, `costo_parada_hora_usd` | |
| 🚫 **Prohibidas (leakage)** | `target_falla_48h`, `target_tipo_falla`, `target_rul_horas`, `target_estado_salud`, `codigo_alarma_plc`, `falla_inicio_disparo`, `falla_estado_causa` | |
| Regla de construcción | El set se arma con **lista blanca explícita**, nunca "todas las columnas menos el target" | |

> Dato para la reunión: `codigo_alarma_plc` y `target_estado_salud` predicen solos con **AUC 0,998**. Si entran como features, el modelo "da perfecto" y no sirve. Ver [`BACKLOG.md`](./BACKLOG.md#el-test-anti-leakage-con-números-reales-del-dataset).

## 5. Ventanas y variables derivadas

| Parámetro | Recomendación por defecto | Decisión | Impacto si cambia |
| --- | --- | --- | --- |
| Ventanas móviles | 6 / 12 / 24 / 48 h por máquina (media, máx, desvío) | | Más ventanas = más features y más riesgo de overfitting |
| Dirección de la ventana | Solo **pasado** (`shift`, sin ventanas centradas) | | Ventana centrada = leakage |
| Deltas | Cambio vs. 6 h y 24 h antes | | Captura tendencia |
| Agregados por activo | Media histórica de la máquina | | Contextualiza el valor actual |

## 6. Nulos, outliers y calidad

| Situación | Recomendación por defecto | Decisión |
| --- | --- | --- |
| Sensor nulo (~2,5 %) | Guardar **NULL**; si se imputa, en columna aparte con flag | |
| Máquina apagada (`estado_operativo = 0`, 1.530 filas) | Se conserva: no es error | |
| Blackouts (bloques sin telemetría) | Marcar "sin dato", **no** convertir a 0 | |
| Picos inyectados | Flag + exclusión de agregados o winsorizado; **nunca** borrar la fila | |
| Picos de degradación real | Se conservan como señal (no winsorizar) | |
| Duplicados | Constraint único `(id_maquina, fecha_hora)`; verificado: 0 | |

## 7. Partición de datos y validación

| Parámetro | Recomendación por defecto | Decisión | Impacto si cambia |
| --- | --- | --- | --- |
| Tipo de partición | **Temporal** (entrenar con lo viejo, evaluar con lo nuevo) | | Aleatoria infla las métricas |
| Corte propuesto | Entrenar ene–mar · validar abril | | Definir si se reserva una máquina completa |
| Validación por máquina | Confirmar que el modelo generaliza a máquinas no vistas | | Detecta overfitting por equipo |
| Reproductibilidad | Semilla fija + script versionado | | Sin esto no se puede comparar corridas |

## 8. Métricas, umbral y salida al usuario

| Parámetro | Recomendación por defecto | Decisión | Impacto si cambia |
| --- | --- | --- | --- |
| Métrica principal | **Recall sobre fallas reales** (objetivo ≥ 70–80 %) | | Es lo que evita paradas |
| Métrica secundaria | PR-AUC + precisión + **alertas por semana** | | Mide la carga operativa real |
| Umbral de alerta | A definir con la curva precision/recall (arranque ~0,70) | | Umbral bajo = más ruido; alto = fallas no vistas |
| Comparación obligatoria | Contra mantenimiento por calendario | | Es el "¿sirve o no sirve?" |
| Salida en la app | Estado de salud + P(48h) + **prioridad** + motivo (variables explicativas) | | |
| Fórmula de prioridad | `P(48h) × peso(criticidad) × costo_parada_normalizado` | | Definir los pesos de criticidad (Alta/Media/Baja) |
| Factor adicional | Horas desde el último mantenimiento (opcional) | | Favorece equipos postergados |

## 9. Frecuencia y operación

| Parámetro | Recomendación por defecto | Decisión |
| --- | --- | --- |
| Frecuencia de recálculo | **Diaria** (datos horarios, ventana móvil) | |
| Momento de la corrida | Fuera del horario administrativo | |
| Generación de alertas | 1 por máquina como máximo, al cruzar el umbral | |
| Cierre de alerta | Resultado: correcta / falso positivo / descartada (+ contraste automático a 48 h) | |
| Trazabilidad | Registrar `fecha_calculo` y `version_modelo` en cada predicción mostrada | |

## 10. Fuera de alcance del MVP (confirmar)

☐ RUL fino (regresión/supervivencia) · ☐ predicción por componente · ☐ predicción del tipo de falla como salida principal · ☐ integración con CMMS real · ☐ datos reales de planta · ☐ retraining automático · ☐ series temporales irregulares · ☐ tiempo real / streaming · ☐ microservicios · ☐ MLOps

## 11. Criterios de cierre del issue

- [ ] Todos los bloques (§1–§10) tienen **decisión escrita** y responsable
- [ ] La lista blanca/negra de features quedó cerrada (§4)
- [ ] El umbral de alerta y la métrica de éxito están definidos (§8)
- [ ] Este documento se mergeó por PR
- [ ] Los docs del repo se actualizaron ([#25](../../issues/25): `PRODUCT.md`, `DATA-STRATEGY.md`, `OPEN-QUESTIONS.md`)
- [ ] [#12](../../issues/12) pasó a **Done** en el [tablero #505](https://github.com/orgs/No-Country-simulation/projects/505)

**Firmas**

| Rol | Persona | OK |
| --- | --- | --- |
| DS | Dutaya / Pedro | ☐ |
| Ingeniería | Seba | ☐ |
| PM | `Fttab101` | ☐ |

---

## Anexo — Comandos y referencias útiles para la reunión

```bash
npm run data:validate     # valida el dataset (falla si es un puntero LFS)
```

- Dataset canónico: [`datos/dataset_mantenimiento_predictivo_realista.csv`](../datos/dataset_mantenimiento_predictivo_realista.csv) (Git LFS, commit `c8a224a`)
- Diccionario oficial: [`datos/README.md`](../datos/README.md) · Generador reproducible: [`datos/script_generacion_de_datos.ipynb`](../datos/script_generacion_de_datos.ipynb) (SEED = 42)
- Guía del backlog: [`BACKLOG.md`](./BACKLOG.md) · Estrategia de datos: [`DATA-STRATEGY.md`](./DATA-STRATEGY.md)
- Issues relacionados: [#10](../../issues/10) · [#11](../../issues/11) · [#13](../../issues/13) · [#14](../../issues/14) · [#15](../../issues/15) · [#25](../../issues/25)
