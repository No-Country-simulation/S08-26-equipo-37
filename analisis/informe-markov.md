# Análisis Markov de la degradación — PredictiveMaintenance

- Filas: **72.000** · máquinas: **25** · eventos de falla: **261**
- Estados: `Normal`, `Bajo_Observacion`, `Riesgo_Critico`, `Parada_Mantenimiento`, `FALLA` (FALLA = hora con `falla_inicio_disparo=1`)

## 1. Matriz de transición (por hora)

| desde \ hacia | Normal | Bajo_Observacion | Riesgo_Critico | Parada_Mantenimiento | FALLA |
| --- | --- | --- | --- | --- | --- |
| **Normal** | 0,9966 | 0,0034 | 0,0000 | 0,0000 | 0,0000 |
| **Bajo_Observacion** | 0,0076 | 0,9860 | 0,0065 | 0,0000 | 0,0000 |
| **Riesgo_Critico** | 0,0000 | 0,0000 | 0,9785 | 0,0000 | 0,0215 |
| **Parada_Mantenimiento** | 0,0000 | 0,0000 | 0,0000 | 0,9071 | 0,0929 |
| **FALLA** | 0,0000 | 0,4598 | 0,0383 | 0,5019 | 0,0000 |


**Conteos crudos** (cuántos datos sostienen cada transición):

| desde \ hacia | Normal | Bajo_Observacion | Riesgo_Critico | Parada_Mantenimiento | FALLA | total |
| --- | --- | --- | --- | --- | --- | --- |
| **Normal** | 45.326 | 154 | 0 | 0 | 0 | 45.480 |
| **Bajo_Observacion** | 142 | 18.479 | 121 | 0 | 0 | 18.742 |
| **Riesgo_Critico** | 0 | 0 | 5.962 | 0 | 131 | 6.093 |
| **Parada_Mantenimiento** | 0 | 0 | 0 | 1.269 | 130 | 1.399 |
| **FALLA** | 0 | 120 | 10 | 131 | 0 | 261 |

> Las transiciones hacia `FALLA` se apoyan en **~130 casos** (±9 pp al 95 %). El 100 % de las fallas viene de `Riesgo_Critico` (131) o `Parada_Mantenimiento` (130).

**Persistencia (probabilidad de quedarse en el mismo estado la hora siguiente)**

- `Normal`: **0,9966**
- `Bajo_Observacion`: **0,9860**
- `Riesgo_Critico`: **0,9785**
- `Parada_Mantenimiento`: **0,9071**
- `FALLA`: **0,0000**

## 2. Tiempo esperado hasta la falla (RUL amplio, en horas)

Derivado de la matriz fundamental `N = (I − Q)⁻¹`, **cortando la cadena en la hora de la falla** a los fines del cálculo. En los datos `FALLA` **no** es un estado final: la máquina se repara y vuelve a servicio → los valores son **horas hasta la PRÓXIMA falla**.

| estado actual | horas esperadas hasta FALLA |
| --- | --- |
| `Normal` | **843,3 h** (35,1 días) |
| `Bajo_Observacion` | **548,0 h** (22,8 días) |
| `Riesgo_Critico` | **46,5 h** (1,9 días) |
| `Parada_Mantenimiento` | **10,8 h** (0,4 días) |

## 3. ¿Se cumple la propiedad de Markov? (test de permanencia)

- Permanencia en `Normal`: mediana **114 h**, máx **1.001 h**, episodios **167**

**Hazard empírico** (probabilidad de salir de `Normal` en la próxima hora, según antigüedad):

| horas en `Normal` | veces en ese punto | salidas | hazard |
| --- | --- | --- | --- |
| 1 | 167 | 27 | **0,1617** |
| 2 | 140 | 12 | **0,0857** |
| 3 | 128 | 6 | **0,0469** |
| 5 | 118 | 4 | **0,0339** |
| 8 | 111 | 2 | **0,0180** |
| 12 | 104 | 0 | **0,0000** |
| 24 | 99 | 1 | **0,0101** |
| 48 | 92 | 0 | **0,0000** |
| 72 | 89 | 0 | **0,0000** |

_Lectura_: si el hazard **crece** con la antigüedad, el proceso **no es Markov puro** → conviene semi-Markov (o Markov con covariables).

## 4. Cadenas por criticidad

| criticidad | máquinas | horas esperadas hasta FALLA desde `Normal` | desde `Riesgo_Critico` |
| --- | --- | --- | --- |
| Alta | 8 | 897,4 h | 46,2 h |
| Media | 9 | 824,2 h | 47,2 h |
| Baja | 8 | 816,6 h | 46,0 h |

## 5. Probabilidad acumulada de falla por horizonte

Derivada aplicando la matriz hora tras hora (potencias de Q). El dataset solo tiene etiquetas a 48 h.

| estado actual | 48 h | 7 días | 30 días | 90 días | 1 año |
| --- | --- | --- | --- | --- | --- |
| `Normal` | 0,53 % | 9,11 % | 56,26 % | 93,85 % | 100,00 % |
| `Bajo_Observacion` | 9,29 % | 38,26 % | 73,84 % | 96,32 % | 100,00 % |
| `Riesgo_Critico` | 64,77 % | 97,40 % | 100,00 % | 100,00 % | 100,00 % |
| `Parada_Mantenimiento` | 99,07 % | 100,00 % | 100,00 % | 100,00 % | 100,00 % |

## 6. Cuantiles del tiempo hasta la próxima falla

Calculados de la curva de supervivencia: el primer k donde la probabilidad de NO haber fallado cae por debajo del nivel.

| estado actual | p25 | **mediana** | p75 | p90 | media (matriz fundamental) |
| --- | --- | --- | --- | --- | --- |
| `Normal` | 323 h | **622 h** | 1.131 h | 1.804 h | 843 h |
| `Bajo_Observacion` | 104 h | **267 h** | 754 h | 1.426 h | 548 h |
| `Riesgo_Critico` | 14 h | **32 h** | 64 h | 106 h | 47 h |
| `Parada_Mantenimiento` | 3 h | **8 h** | 15 h | 24 h | 11 h |

_La media engaña (cola larga): la **mediana** es la métrica útil para planificar._

## 7. Validación contra las etiquetas reales

| estado | filas | P(falla 48 h) real | P(48 h) que da la cadena | diferencia |
| --- | --- | --- | --- | --- |
| `Normal` | 45.493 | **0,00 %** | 0,53 % | -0,53 pp |
| `Bajo_Observacion` | 18.754 | **0,00 %** | 9,29 % | -9,29 pp |
| `Riesgo_Critico` | 6.223 | **100,00 %** | 64,77 % | 35,23 pp |
| `Parada_Mantenimiento` | 1.530 | **91,50 %** | 99,07 % | -7,57 pp |

> **Dos lecturas**: (1) el estado del dataset **coincide con la etiqueta** (`Riesgo` con falla en 48 h al 100 %) → confirma la fuga de información; (2) la cadena homogénea **subestima** ese estado porque ignora el tiempo de permanencia.

## 8. Conclusiones y qué haría falta para producción

**Lo que esta prueba demuestra**

- Una cadena de Markov **extiende el horizonte** (7/30/90 días) y da **RUL en cuantiles** sin etiquetas nuevas.
- Construida sobre el estado de salud del dataset **no es un modelo predictivo**: el estado *es* la etiqueta.

**El diseño correcto (sin fuga)**

1. **Estado observable**: deducir la etapa de los sensores (estados ocultos) o usar deciles de riesgo del modelo de 48 h.
2. **Dinámica con memoria**: semi-Markov o Markov con covariables (el hazard depende del tiempo en la etapa, ver §3).
3. **Decisión con costos**: proceso de decisión con `costo_parada_hora_usd` → intervenir ahora vs. esperar.
4. **Contraste**: análisis de supervivencia (Cox / Weibull) para RUL con covariables y censura.

**Validación disponible**: el generador del dataset tiene un proceso de estados explícito (semilla 42) → una semi-Markov debería recuperar su estructura.

## 9. Limitaciones del análisis

| Limitación | Qué implica |
| --- | --- |
| Los estados provienen de una etiqueta del dataset | La cadena describe la **dinámica de esa etiqueta**, no un fenómeno observable en planta (ver §7) |
| `FALLA` no es un estado final en los datos | 261 transiciones salen de `FALLA`: la máquina se repara y vuelve a servicio. Los tiempos son **hasta la próxima falla**, con corte en la hora de la falla |
| Muestras chicas | Transiciones hacia `FALLA`: ~130 casos (**±9 pp** al 95 %). Hazard de la 1.ª hora: 27 casos (**±11 pp**) |
| Cadena homogénea | No distingue por máquina, antigüedad ni carga (por criticidad los tiempos son casi iguales) |
| Dataset sintético | Mide factibilidad del método y permite validar contra la estructura del generador (semilla 42); **no** demuestra desempeño real |
| Sin costo de intervención | El dataset tiene costo de parada (300–3.000 USD/h), no costo de reparación planificada |

**Convención numérica**: coma decimal y punto de miles (español).
