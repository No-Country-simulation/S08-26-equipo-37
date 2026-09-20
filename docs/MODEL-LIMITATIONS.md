# Limitaciones del dataset y del modelo

> **Estado:** borrador para revisión del equipo. Cierra el punto 10 del backlog de [`SCOPE.md`](./SCOPE.md) y responde al issue [#14](../../issues/14).
>
> **Regla de uso:** ninguna métrica de este documento debe presentarse sin la limitación que la acompaña. Si una diapositiva dice PR-AUC 0,842, esta tabla es la que dice qué significa ese número y qué no.

> ## 🚨 Antes de mostrar cualquier métrica: la etiqueta está codificada en las features
>
> Medido sobre el dataset canónico, **una cuenta aritmética con tres de las features que el modelo usa recupera el target con precisión y recall de 1,000**:
>
> ```python
> ratio = potencia_consumida_kw / (potencia_nominal_kw * (0.12 + 0.88 * carga_pct / 100))
> falla_inminente = ratio > 1.07      # TP=5.919 · FP=0 · FN=0 · TN=61.036
> ```
>
> La causa está en el generador, que aplica un sobreconsumo determinista del 15 % exactamente a las filas positivas:
>
> ```python
> sobreconsumo = np.where(df["falla_proximas_48h"] == 1, 1.15, 1.0)
> df["potencia_consumida_kw"] = np.where(df["estado_operativo"] == 1, potencia_base * sobreconsumo, 0.0)
> ```
>
> `potencia_consumida_kw`, `potencia_nominal_kw` y `carga_pct` están en la lista blanca de [`SPEC-MVP-PARAMETERS.md`](./SPEC-MVP-PARAMETERS.md) §4 y las tres entran al modelo, junto con `corriente_a`, que se deriva de la potencia y arrastra el mismo 15 %. **Mientras sigan ahí, ninguna métrica del baseline mide capacidad predictiva.** Detalle en §4.1 bis.

## 1. Qué puede afirmarse hoy y qué no

| Afirmación | Estado | Por qué |
| --- | --- | --- |
| Un modelo de clasificación de falla a 48 h **mide capacidad predictiva** sobre este dataset | **No** | La etiqueta se recupera de las features con una regla determinista (§4.1 bis): las métricas están infladas |
| Un modelo de clasificación de falla a 48 h es viable sobre este dataset | **Pendiente** | Lo será cuando se reentrene sin las columnas que filtran, y ahí se sabrá el número real |
| El modelo predice fallas en una planta real | **No** | El dataset es sintético: el modelo aprendió la física de un simulador |
| Existe una probabilidad calibrada de falla | **No** | El umbral y la calibración no están definidos en el producto |
| Podemos estimar RUL continuo | **No** | El `target_rul_horas` está censurado (ver §3.3) |
| Podemos distinguir el tipo de falla | **No** | Hay 261 eventos con causa registrada: no alcanza para modelar 3 clases |
| Podemos estimar el ahorro del mantenimiento | **No** | No hay comparación contra el mantenimiento por calendario (§4.4) |

## 2. Qué es el dataset

- **Sintético y reproducible.** Generado por [`../ml/notebooks/01_generacion/script_generacion_de_datos.ipynb`](../ml/notebooks/01_generacion/script_generacion_de_datos.ipynb) con **SEED = 42** y `np.random.seed(...)`, así que la corrida es repetible.
- **72.000 filas horarias**, 30 columnas, **25 máquinas** (M-01 a M-25), **4 meses** (enero–abril de 2026), 4 líneas de producción y 10 tipos de equipo.
- **261 eventos de falla** (`falla_inicio_disparo`), sobre 1.661 filas de convalecencia (`falla_estado_causa`: 633 motor térmico, 545 presión, 483 rodamiento).
- **Anomalías inyectadas a propósito**, con el objetivo declarado de evaluar el pipeline de limpieza: 280 picos de vibración, 220 transitorios de voltaje y 150 picos de temperatura, todos de 1 hora, más desconexiones de red en ráfaga (*blackouts* IoT con ausencia no aleatoria).
- **El target del MVP** es `target_falla_48h` (binario). El dataset tiene **7.623 filas positivas** sobre 72.000 (10,6 %).

## 3. Limitaciones del dataset

### 3.1 La semántica de "falla" está resuelta; falta ratificar la definición operativa

La distinción entre las dos columnas **está resuelta y documentada**: `falla_inicio_disparo` marca el **disparo** (261 pulsos, la hora del colapso) mientras `falla_estado_causa` registra la **convalecencia** (1.661 horas en taller, MTTR ≈ 6,4 h por falla). Las columnas se renombraron en el dataset v2 justamente para expresar esa diferencia (ver [`SCOPE.md`](./SCOPE.md) §5.3).

Lo que falta no es la semántica, sino su **ratificación operativa**. [`SPEC-MVP-PARAMETERS.md`](./SPEC-MVP-PARAMETERS.md) §3 propone las reglas concretas —evento = `falla_inicio_disparo = 1`, ventana = las 48 h previas a un disparo— con la columna "Decisión" vacía, y la pregunta **P0 n.º 2** de [`OPEN-QUESTIONS.md`](./OPEN-QUESTIONS.md) la sigue listando como abierta. Hoy el repositorio afirma las dos cosas a la vez.

**Por qué importa aunque el target ya esté construido:** el conteo de 7.623 filas positivas depende de que la ventana sean "las 48 h *previas* al disparo" y no, por ejemplo, "las 48 h alrededor del evento". Y la distinción disparo/convalecencia es la que decide qué ve un operario: una alerta sobre un disparo inminente no es lo mismo que una alerta sobre una máquina que ya está en taller.

### 3.2 No hay verificación de la limpieza contra lo inyectado

Las anomalías se inyectaron para poder **puntuar la limpieza**, pero no existe en el repositorio el listado celda por celda (qué fila, qué columna, qué valor) que permita medir recall y precisión de detección. Sin eso, la limpieza se validó con inspección visual, no con métricas.

**Corrección (2026-09-20):** una versión anterior de este documento decía que el listado era derivable re-corriendo el generador. **No lo es**: el notebook de generación lee su insumo de una ruta absoluta de Windows (`C:\Users\PC\Desktop\dataset_mantenimiento_predictivo.csv`) y **ese archivo base no está versionado en el repositorio**, así que el generador no se puede re-ejecutar desde el repo.

**Pero el listado sí es extraíble del CSV**, porque cada inyección tiene una firma medible. Verificado contra el dataset canónico:

| Inyección | Regla de detección | Nominal | Esperado tras los nulos | Detectado |
| --- | --- | --- | --- | --- |
| Picos de vibración | `vibracion_mms ≥ 25` | 280 | 273,0 | **274** |
| Transitorios de voltaje | `voltaje_v` en [340, 390] o [120, 150] | 220 | 214,5 | **215** |
| Picos de temperatura | `temperatura_c ≥ 130` | 150 | 146,2 | **145** |
| Nulos MCAR (7 sensores) | celda vacía | 1.800 por sensor | — | **1.841–1.842** |
| Flatlines | valor constante en ventana | 19 h y 17 h | — | 21 y 32 filas |
| Deriva de calibración | tendencia por máquina | M-05 y M-14 | — | presente |

La columna "esperado" no es una excusa: el generador inyecta los nulos **después** de los picos, con una tasa del 2,5 %, así que se espera perder ~2,5 % de cada pico. Los tres conteos coinciden con esa predicción dentro de ±1,5, que es la mejor señal de que la regla de extracción es la correcta. Los nulos dan 1.841–1.842 en vez de 1.800 porque los *blackouts* posteriores apagan bloques de telemetría y suman ~42.

**Consecuencia para [#10](../../issues/10):** la comparación contra lo inyectado **se puede construir ya**, con estas reglas, sin esperar a nadie. Dos advertencias para hacerlo bien: el voltaje exige usar los rangos exactos (una regla laxa como `≤150` barre las filas de máquina apagada, que tienen 0 V y son el 1 % del dataset), y las flatlines exigen detectar **varianza cero en una ventana**, no un valor exacto —`62,45` también aparece por casualidad en la variación normal de M-11.

### 3.3 El RUL está censurado por construcción

El generador convierte el centinela de "sin falla cerca" en nulo:

```python
df["target_rul_horas"] = df["horas_hasta_falla"].replace(999.0, np.nan)
```

Es decir: el RUL solo tiene valor **poco antes** del fallo (≤48 h) y es nulo en todo el resto de la vida útil. Un modelo de RUL continuo entrenado así solo aprende la ventana final, no la degradación completa. Por eso el MVP predice clasificación a 48 h y el RUL extendido quedó como propuesta en [`RUL-STRATEGY.md`](./RUL-STRATEGY.md).

### 3.4 Volumen y variedad insuficientes para más de un horizonte

**261 eventos en 25 máquinas durante 4 meses** alcanza para una clasificación binaria a 48 h, no para más: modelar tipo de falla exigiría separar 3 clases sobre 261 casos, y estimar ahorro exigiría distribuciones de costo por evento. Tampoco hay plantas, turnos ni condiciones ambientales distintas.

### 3.5 Granularidad horaria

La telemetría es horaria y las anomalías inyectadas duran 1 hora. El dataset no permite analizar fallas que se resuelven en minutos, que es la escala donde suele jugarse la detección temprana real.

### 3.6 El proceso de fallas simulado es en ráfagas

Medido sobre el dataset canónico, los 261 disparos **no son eventos independientes repartidos en cuatro meses**: entre disparos consecutivos de la misma máquina hay una mediana de **16 horas** (mínimo 5, máximo 1.130), y **el 59 % de los intervalos es de 48 horas o menos**.

La consecuencia directa: **el 62,4 % de las filas positivas cae dentro de las 48 h de más de una falla**. La etiqueta es correcta —cada fila positiva tiene efectivamente una falla dentro de las 48 h siguientes, verificado fila por fila—, pero las ventanas se solapan tanto que:

- los "261 eventos" no son 261 casos independientes, así que las métricas por evento tampoco se salvan de la correlación;
- una franja de degradación genera varios disparos, y el modelo puede aprender el episodio, no cada falla;
- y explica por qué `estado_operativo` fue un atajo tan potente: si la máquina está detenida (en taller), la ráfaga suele seguir, así que **el 91,5 % de las filas con la máquina apagada son positivas, contra el 8,8 % de las encendidas** (§4.1).

Para un modo de falla como "rodamiento picado" o "motor térmico", fallar cada 16 horas no es física de planta: es una propiedad del simulador. Cualquier métrica del baseline hereda esa facilidad.



### 3.7 Qué hace realmente la limpieza (y qué no)

Comparado celda por celda contra el CSV crudo, con la clave `(id_maquina, fecha_hora)`, el dataset limpio (`ml/datos/dataset_limpio.parquet`, 70.470 × 30) resulta de **dos operaciones y nada más**:

| Transformación | Medición |
| --- | --- |
| Eliminar las filas de máquina apagada | 72.000 → 70.470 (−1.530, exactamente las de `Parada_Mantenimiento`) |
| Imputar los nulos | 1.841–1.842 por sensor → **0**, con **forward-fill** (99,8–99,9 % de los valores imputados son idénticos al anterior de la misma máquina) |
| Tratar outliers | **Ninguno.** En las siete columnas de sensores, **0 celdas cambiaron de valor**: cada celda no nula es idéntica al crudo |
| Winsorizar o marcar picos | **Ninguno**, ni flag ni recorte |

Y la limpieza **cambia el conjunto de columnas**: quita `estado_operativo`, `falla_estado_causa`, `target_rul_horas` y `target_estado_salud`, y agrega las cuatro derivadas `vibracion_critica`, `temperatura_critica`, `mes` y `dia_semana`. Las flags son correctas: `vibracion_critica` coincide con `vibracion_mms > 15` y `temperatura_critica` con `temperatura_c > 75` en las 70.470 filas.

**Tabla comparada contra lo inyectado** (el criterio de [#10](../../issues/10)):

| Inyección | Nominal | En el crudo | En el limpio | Qué pasó |
| --- | --- | --- | --- | --- |
| Picos de vibración | 280 | 274 | **285** | ✋ el forward-fill **propagó 11 picos** a la hora siguiente |
| Transitorios de voltaje | 220 | 215 | **217** | ✋ ídem, +2 |
| Picos de temperatura | 150 | 145 | **147** | ✋ ídem, +2 |
| Nulos MCAR | 1.800/sensor | 1.841 | 0 | ✅ imputados, pero sin trazabilidad |
| Flatlines | 19 h y 17 h | presentes | presentes | ✋ sin tratar |
| Deriva de calibración | M-05, M-14 | presente | presente | ✅ se conserva (es señal) |

El conteo de picos **sube** en lugar de bajar, y esa es la señal de alarma: cuando la hora siguiente a un pico inyectado quedó nula, el forward-fill copió el valor del pico (32–48 mm/s donde la mediana de la máquina es ~3) y creó un **pico falso de una hora**.

#### Y lo más grave: el filtro de "horas muertas" borró la mitad de las fallas

El notebook describe esa operación como *"Depuración de Horas Muertas (-1.530 filas)"*, que suena a quitar tiempo inactivo. Medido sobre los datos, eso es lo que borró:

| | Crudo | Limpio | Diferencia |
| --- | --- | --- | --- |
| Disparos (`falla_inicio_disparo = 1`) | 261 | **131** | **−130 (el 50 %)** |
| Filas positivas | 7.623 | 6.223 | −1.400 |
| Eventos de falla en el set de entrenamiento (enero–marzo) | 158 | **79** | −79 |
| Eventos de falla en el set de test (abril) | 103 | **52** | −51 |

La coincidencia es exacta: los 130 disparos que desaparecen son **los 130 que ocurren con `estado_operativo = 0`**. Y no es un defecto del dataset: la hora del colapso es, por definición, una hora en la que la máquina suele estar detenida. El filtro que quiso sacar horas inactivas sacó, junto con ellas, **el registro de la mitad de las fallas**.

Consecuencias:

- El modelo **entrena con la mitad de los eventos** y se evalúa con la otra mitad, y la mitad descartada no es aleatoria: son las fallas cuyo registro coincide con la parada.
- El dataset limpio **ya no contiene el evento** de esas fallas, así que una evaluación por evento —la que recomienda [#13](../../issues/13) para salir del problema de las métricas por fila— solo puede cubrir 131 de 261.
- La descripción del cambio ("horas muertas") no representa su efecto real, y por eso pasó desapercibido hasta ahora.

#### Además: enero no tiene ninguna falla, y el test tiene el doble de tasa base

Distribución medida en el dataset limpio:

| Mes | Filas | Positivas | Tasa | Disparos |
| --- | --- | --- | --- | --- |
| Enero | 18.600 | 0 | **0,0 %** | **0** |
| Febrero | 16.060 | 2.977 | 18,5 % | 62 |
| Marzo | 18.424 | 834 | 4,5 % | 17 |
| Abril (test) | 17.386 | 2.412 | 13,9 % | 52 |

Dos cosas que esto implica y que nadie había anotado: **el primer mes del entrenamiento no aporta un solo ejemplo positivo**, y la partición temporal no es solo temporal — **el test tiene casi el doble de tasa base que el entrenamiento** (13,9 % contra 7,2 %). Eso mueve precision y recall respecto de lo que se vería en un mes promedio, y explica parte de la diferencia entre las métricas del notebook y las de cualquier reentrenamiento.

**Tres divergencias con la regla que el equipo aprobó** en [`SPEC-MVP-PARAMETERS.md`](./SPEC-MVP-PARAMETERS.md) §6:

1. *"Sensor nulo: Guardar NULL; si se imputa, en columna aparte con flag"* → se imputó **en la misma columna y sin flag**. Hoy no hay forma de saber qué celdas son imputadas mirando el dataset limpio: hubo que compararlo contra el crudo para descubrirlo.
2. *"Picos inyectados: Flag + exclusión de agregados o winsorizado; nunca borrar la fila"* → **no se hizo nada**, y el forward-fill los duplicó.
3. *"Picos de degradación real: se conservan como señal"* → se cumple, pero por omisión: no hay ninguna lógica que distinga un pico inyectado de uno real.

**Impacto:** el modelo entrena con picos duplicados y con valores imputados indistinguibles de los reales, y la limpieza no se puede auditar desde su propio resultado. No es un error de cálculo: es que la limpieza es **más delgada de lo que su notebook sugiere** —el análisis de outliers que muestra es exploratorio, no aplicado— y el criterio de #10 pide que sea puntuable.

## 4. Limitaciones del modelo

Modelo actual: **LightGBM Classifier** sobre una matriz de **42 features** (telemetría más ventanas móviles de 3, 6 y 12 h de temperatura, vibración y presión). Partición **temporal**: abril como mes de test (17.386 filas, 2.412 positivas) y los tres meses previos como entrenamiento (53.084 filas).

### 4.1 Hubo fuga de datos, y se corrigió

El primer entrenamiento daba métricas perfectas (**1,00**). La prueba de permutación lo delató: al desordenar la variable líder, el modelo seguía acertando todo. La causa era que `codigo_alarma_plc` y `estado_operativo` **contenían la respuesta del futuro** en el simulador, y el modelo las usaba como atajo en lugar de la física. Se eliminaron y el modelo pasó a métricas realistas.

El mecanismo de `estado_operativo` está medido y no es obvio: la máquina detenida marca el taller, y como las fallas vienen en ráfagas (§3.6), estar detenida anticipa otro disparo casi con certeza — **el 91,5 % de las filas con `estado_operativo = 0` son positivas, contra el 8,8 % de las filas con la máquina encendida**. Es una palanca de diez veces que ningún AUC muestra (el suyo es 0,409), y por eso pasó la auditoría previa. Ver el aviso en [`BACKLOG.md`](./BACKLOG.md).

**Riesgo residual:** que se hayan encontrado dos columnas con fuga no prueba que no queden otras. La auditoría fue dirigida, no exhaustiva, y el dataset sintético es justamente el tipo de origen donde estas correlaciones se cuelan. También se descartó `velocidad_rpm` por redundante, con el mismo criterio: la selección de features se hizo a mano, caso por caso.

### 4.1 bis La tercera fuga está dentro de las features, y es determinista

Quitar `codigo_alarma_plc` y `estado_operativo` bajó el modelo de 1,00 a métricas plausibles, y por eso se dio la fuga por resuelta. **No lo estaba.** El generador aplica un sobreconsumo del 15 % exactamente a las filas con falla inminente:

```python
sobreconsumo = np.where(df["falla_proximas_48h"] == 1, 1.15, 1.0)
df["potencia_consumida_kw"] = np.where(df["estado_operativo"] == 1, potencia_base * sobreconsumo, 0.0)
df["corriente_a"] = np.where(df["estado_operativo"] == 1,
                             (df["potencia_consumida_kw"] * 1000.0) / (np.sqrt(3) * df["voltaje_v"] * cos_phi), 0.0)
```

Como `potencia_base = potencia_nominal_kw * (0.12 + 0.88 * carga_pct / 100)`, el cociente entre lo consumido y lo esperado **vale 1,15 en las positivas y 1,00 en las negativas**. Medido sobre el dataset canónico:

| Grupo | n | ratio mínimo | mediana | máximo |
| --- | --- | --- | --- | --- |
| Positivas (`target_falla_48h = 1`) | 5.919 | 1,1477 | **1,1500** | 1,1522 |
| Negativas | 61.036 | 0,9966 | **1,0000** | 1,0036 |

**Precisión 1,000 y recall 1,000** con un solo umbral en 1,07 (TP 5.919 · FP 0 · FN 0 · TN 61.036). No es una correlación alta: es la etiqueta, escrita en la feature.

Por qué importa tanto:

- **Las métricas del baseline no miden capacidad predictiva.** PR-AUC 0,842, recall 0,88 y precision 0,69 salen de un modelo que tiene acceso a una señal que revela el target. Que no llegue a 1,00 se explica porque un árbol aproxima mal un cociente, no porque no tenga el dato.
- **La prueba de permutación no podía detectarlo.** Romper la temperatura no bajaba el score porque el modelo no dependía de la física: tenía el cociente.
- **Ninguna de las auditorías hechas hasta ahora lo habría encontrado.** No es una columna con AUC alto —`corriente_a` mide 0,451 y `carga_pct` 0,421— ni un valor con tasa de positivos anómala. La fuga vive en una **relación** entre columnas, y eso lo único que lo detecta es intentar **reconstruir el target desde el conjunto de features**.
- **Sobrevive a la limpieza actual**: el filtro quitó las filas de máquina apagada y la imputación tocó los nulos, pero las dos columnas que arrastran el 15 % siguen en la matriz de 42 features.

**Qué hacer, en orden:**

1. **Sacar `potencia_consumida_kw` y `corriente_a` de la matriz de features.** Son las dos únicas features derivadas del target: verificado sobre el generador, donde una sola línea (`sobreconsumo`) las afecta, y las demás referencias al flag de falla construyen el propio target o el RUL censurado.
2. **Reentrenar y reportar el número nuevo.** Sin esas columnas el techo lo marcan las señales físicas, no el oráculo. Una versión anterior de este documento anticipaba "una caída grande"; **medido, no es tan grande**: una regresión logística sobre 33 features sin las columnas que filtran —misma partición temporal, enero–marzo contra abril— alcanza **AUC 0,938** en abril, con recall 0,78 a precision 0,57 (y 0,87 a precision 0,50). Con las columnas que filtran sube a 0,949, y agregando el cociente explícito da **0,993**: ese último número es el control que valida el experimento, porque reproduce el oráculo. LightGBM con features no lineales debería superar a la regresión logística, así que **0,938 es un piso, no un techo**, y el criterio de éxito del MVP (recall ≥ 70–80 %) parece alcanzable. **Caveat importante:** con ventanas solapadas y fallas en ráfaga (§3.6), esa AUC mide detección de *episodio*, no anticipación de 48 h; para eso hace falta una métrica por evento.
3. **Auditar el generador antes que los datos.** La tabla de [`BACKLOG.md`](./BACKLOG.md) muestra que ninguna barrida estadística caza esta fuga: el AUC de una columna no la ve (0,451), el cociente entre dos columnas tampoco (0,577), y solo la forma afín exacta da 1,000. Como el dataset lo genera código nuestro que vive en el repo, la auditoría confiable es leer ese código y buscar cada derivación de una feature a partir del target.
4. **Alternativa más limpia si el dataset se regenera:** quitar el `sobreconsumo` del generador. Ahí la fuga desaparece de raíz y las dos columnas vuelven a ser utilizables.

Hasta el paso 2, cualquier cifra del baseline debe presentarse como **no validada**.



### 4.2 Las métricas son por fila, no por evento

Con 7.623 filas positivas repartidas en 261 eventos, **cada falla aporta unas 29 filas positivas** en promedio. Un recall de 0,88 medido por fila **no significa** que se detecten el 88 % de las fallas: significa que se acierta el 88 % de las *horas* etiquetadas. Un operario experimenta eventos, no horas.

La diferencia, **medida**: con el mismo modelo y el mismo mes (abril), el recall por fila a precision 0,50 es **0,87**, y el porcentaje de **eventos** detectados es **19–33 %** según el presupuesto de alertas (§4.4). O sea que el número amable y el número útil se diferencian por un factor de 3.

Es la limitación **más fácil de malinterpretar en una presentación**: el número suena a "detecta el 88 % de las fallas" y no significa eso.

### 4.3 Partición sin agrupar por máquina

El split es temporal pero **no agrupa por máquina**, y `id_maquina` y `modelo` entran como variables categóricas nativas de LightGBM. Con 25 equipos, el modelo puede memorizar patrones por equipo en lugar de aprender degradación general. Falta la validación agrupada (*leave-machines-out*) para saber cuánto de la performance es generalizable.

### 4.4 La comparación contra el calendario, medida (y el piso del azar)

El notebook no trae matriz de confusión ni comparación contra la referencia operativa, y `SPEC-MVP-PARAMETERS.md` §8 marca la segunda como **obligatoria**. Medida sobre abril, **a igual presupuesto de alertas** —que es la única forma honesta de comparar— y con un **piso de azar** para poder interpretar el resultado:

| Alertas en el mes | Modelo | Calendario (`horas_desde_ultimo_mantenimiento`) | Azar (media de 20 semillas) |
| --- | --- | --- | --- |
| 25 (~1 por máquina) | 9,6 % | 5,8 % | 5,8 % ± 2,7 |
| 50 (~2 por máquina) | **19,2 %** | 5,8 % | 11,7 % ± 4,5 |
| 100 (~4 por máquina) | **32,7 %** | 5,8 % | 22,1 % ± 4,1 |
| 250 (~10 por máquina) | 38,5 % | 5,8 % | **44,9 %** ± 6,1 |
| 500 (~20 por máquina) | 55,8 % | 7,7 % | **72,2 %** ± 5,7 |
| 1.000 (~40 por máquina) | 69,2 % | 19,2 % | **92,6 %** ± 4,0 |

Cifras = **porcentaje de los 52 eventos de abril detectados** (al menos una alerta en las 48 h previas). Anticipación mediana del modelo: 20–33 h según el presupuesto.

**Tres lecturas, y las tres importan:**

1. **El modelo le gana al calendario por 3 a 5 veces** en todos los presupuestos. La práctica que el MVP quiere mejorar se mejora, y eso es lo que `SPEC-MVP-PARAMETERS.md` §8 pedía demostrar.
2. **Pero solo le gana al azar con presupuestos bajos.** A partir de ~250 alertas por mes, alarmar al azar detecta más eventos que el modelo. No es un defecto del modelo: es que con las fallas en ráfaga (§3.6) y ventanas de 48 h, una densidad alta de alarmas "pega" en la ventana de casi cualquier evento por casualidad. **Con presupuestos altos, cualquier detector parece bueno.**
3. **El criterio aprobado de "recall ≥ 70–80 %" no es alcanzable de forma significativa a nivel de evento.** Se llega al 69 % recién con ~40 alertas por máquina al mes, y en ese punto el azar ya detecta el 93 %: el detector no aporta nada. En un presupuesto realista (2–4 alertas por máquina al mes) el modelo detecta **19–33 % de los eventos**.

**Consecuencia:** la métrica de éxito hay que redefinirla como *"porcentaje de eventos detectados con al menos N horas de anticipación, con un presupuesto de A alertas por máquina al mes, contra el piso del azar"*. Y el piso del azar debería ser obligatorio en toda evaluación de este proyecto: sin él, cualquier número de recall se lee como logro cuando puede ser densidad.

**Salvedades de esta medición:** el modelo es una regresión logística, o sea un piso (LightGBM puede rendir mejor al mismo presupuesto); solo son evaluables **52 de los 103 eventos** de abril, porque la limpieza borró la otra mitad (§3.7); y las ventanas previas quedan más delgadas que 48 h reales por esas mismas filas eliminadas.

### 4.5 El punto de operación no está elegido

Con precision 0,69 y recall 0,88, **aproximadamente una de cada tres alertas sería falsa**. El umbral que produce ese balance no está fijado en el producto, y los costos de una falsa alarma y de una falla no detectada no están definidos (pregunta P1 abierta). Ese par de costos es lo que define el umbral, no la métrica.

### 4.6 Explicabilidad limitada

La prueba de permutación mostró que romper la temperatura apenas mueve el score (caída de 0,0084) porque las ventanas de 6 y 12 h absorben la señal. Es **robustez física por redundancia**, pero también significa que el modelo no depende de una señal dominante identificable: explicar "el motivo" de una alerta, que el dashboard pide, no sale de la importancia de features.

### 4.7 La probabilidad no está calibrada

[`DATA-STRATEGY.md`](./DATA-STRATEGY.md) fija que una salida de probabilidad se valida con **discriminación *y* calibración**, y aclara que *"un score de ranking no es una probabilidad; el valor debe conservar significado probabilístico fuera del entrenamiento"*.

El modelo entrega `predict_proba` y lo que está medido es **discriminación** (PR-AUC). En el notebook **no hay curva de confiabilidad ni Brier score**: nadie verificó que un 0,80 signifique 80 % de las veces.

**Consecuencia práctica:** mientras no se mida, la salida debe presentarse como **score de riesgo**, no como probabilidad. Es exactamente la distinción que `DATA-STRATEGY.md` pide no mezclar, y afecta tanto a la interfaz (que hoy declara que su índice no es una probabilidad) como a la fórmula de prioridad de `SPEC-MVP-PARAMETERS.md` §8, que multiplica por `P(48h)`.

### 4.8 El modelo solo vio horas de máquina encendida

El pipeline de limpieza filtró la base para conservar únicamente `estado_operativo == 1`, y con eso quitó las **1.530 horas de máquina apagada** (72.000 → 70.470 filas). El notebook lo documenta como "Depuración de Horas Muertas".

Verificado sobre el dataset canónico: esas 1.530 filas son **exactamente** las que tienen `target_estado_salud = "Parada_Mantenimiento"` (los dos conjuntos coinciden fila por fila). O sea que el filtro **eliminó una clase completa de la etiqueta de estado**, no solo horas vacías. Cualquier trabajo futuro sobre estados de salud —la entidad `historial_estados_activo` de [`DATA-MODEL.md`](./DATA-MODEL.md)— se queda sin ese estado en los datos limpios.

El efecto no es cosmético: **el modelo nunca vio una máquina detenida**, así que nada lo habilita a distinguir "detenida porque es domingo" de "detenida porque se rompió". Y el contrato de la API tampoco manda `estado_operativo` (se quitó por fuga de datos), de modo que **una lectura de una máquina apagada se puntúa igual que una en marcha**: los sensores en cero entran al modelo como una observación más y devuelven una probabilidad con apariencia válida.

Es una ceguera operativa, no un detalle de implementación: en planta, buena parte del tiempo de una máquina es tiempo detenido.

> **Divergencia con una regla aprobada:** [`SPEC-MVP-PARAMETERS.md`](./SPEC-MVP-PARAMETERS.md) §6 dice, sobre esas mismas 1.530 filas, *"Se conserva: no es error"*. La implementación hizo lo contrario. La reunión tiene que decidir cuál de las dos cosas vale, porque de eso depende cómo se representa la máquina detenida sin filtrar el futuro.

## 5. Limitaciones de integración y operación

- **Nada consume el modelo.** El dashboard renderiza un snapshot estático y su índice de condición **no es una probabilidad** (`src/features/maintenance/types.ts`). Ver [`ARCHITECTURE.md`](./ARCHITECTURE.md).
- **El prototipo de `ml/api` no se despliega**: sin Dockerfile, fuera de `compose.yaml`, sin workflow que lo construya o lo testee, y sin contrato con la aplicación.
- **Sin cobertura en CI**: el código Python no tiene tests ni build en el pipeline. Un cambio en el notebook de limpieza no rompe nada de forma visible.
- **Sin versionado de artefactos**: el modelo entrenado vive en git (344 KiB) sin trazabilidad de a qué datos y a qué código corresponde.
- **Los notebooks llevan las salidas embebidas** (uno pesa 1,9 MB), así que el diff de una re-ejecución es enorme y la revisión se vuelve impráctica.

## 6. Qué levantaría cada limitación

| Limitación | Qué haría falta | Dónde |
| --- | --- | --- |
| §4.1 bis etiqueta dentro de las features | **Excluir `potencia_consumida_kw` y `corriente_a` (o regenerar el dataset sin el `sobreconsumo`) y reentrenar. Es la prioridad: sin esto, ninguna métrica vale.** Estimación medida sin esas columnas: AUC ≈ 0,94 (§4.1 bis) | [#13](../../issues/13), [#10](../../issues/10) |
| §3.7 la mitad de las fallas borradas | Corregir el filtro: no descartar las filas de parada que *son* el evento de falla, o al menos conservar el disparo | [#10](../../issues/10), [#13](../../issues/13) |
| §3.7 imputación sin trazabilidad | Imputar con flag o dejar el NULL, como pide `SPEC-MVP-PARAMETERS.md` §6 | [#10](../../issues/10) |
| §3.7 enero sin fallas y tasa base del test | Reportar métricas por mes y no solo en abril, o excluir enero del entrenamiento | [#13](../../issues/13) |
| §3.1 definición operativa de falla | Ratificar el §3 de `SPEC-MVP-PARAMETERS.md` y cerrar la P0 n.º 2 | `OPEN-QUESTIONS.md`, [#12](../../issues/12) |
| §3.2 limpieza sin puntuar | Construir la tabla de comparación con las reglas de extracción de §3.2: **ya es posible**, no depende de nadie | [#10](../../issues/10) |
| §3.6 fallas en ráfagas | Decidir si las métricas se reportan por episodio y no por evento | [#13](../../issues/13) |
| §4.2 métricas por evento | Agregar métricas a nivel de evento, no de fila | [#13](../../issues/13) |
| §4.3 split por máquina | Validación agrupada por equipo | [#13](../../issues/13) |
| §4.4 valor de negocio | Matriz de confusión + referencia de calendario | [#13](../../issues/13), [#24](../../issues/24) |
| §4.5 umbral | Definir costos de falso positivo y falso negativo | P1 de `OPEN-QUESTIONS.md` |
| §4.7 calibración | Curva de confiabilidad y Brier score sobre el mes de test | [#13](../../issues/13) |
| §4.8 máquina detenida | Decidir cómo se representa el tiempo detenido sin filtrar el futuro | [#12](../../issues/12), [#15](../../issues/15) |
| §5 integración | Seed desde el CSV v2 y servicio de predicciones | [#16](../../issues/16), [#19](../../issues/19) |

## 7. Cómo citar este trabajo

**Mientras §4.1 bis siga abierto, no hay métrica del baseline que se pueda citar como capacidad predictiva.** La forma honesta de describir el estado es:

> Tenemos un pipeline completo —dataset, limpieza, features, modelo y API— y un control de calidad que encontró que **la etiqueta del simulador está codificada en dos de las features**: una regla aritmética sobre `potencia_consumida_kw`, `potencia_nominal_kw` y `carga_pct` reproduce el target con precisión y recall de 1,000. Las métricas publicadas (PR-AUC 0,842) están infladas por eso y **no deben presentarse como desempeño** hasta reentrenar sin esas columnas. Los límites del dataset y del modelo están documentados en este archivo.

Si en algún momento se reentrena sin las columnas que filtran, la frase vuelve a admitir métricas, con estas salvedades: el dataset es **sintético** (25 máquinas, 4 meses), las fallas vienen en ráfagas (mediana de 16 h entre disparos, así que los "261 eventos" no son independientes), **el recall se mide por hora y no por falla** —y la diferencia es de un factor de 3: 0,87 por fila contra 19–33 % de eventos (§4.2 y §4.4)—, el test tiene casi el doble de tasa base que el entrenamiento, y sigue pendiente la calibración del umbral.

**Y una recomendación de método que sale de esta revisión:** toda evaluación de este proyecto debería reportar **el piso del azar al mismo presupuesto de alertas**. Sin él, un recall alto se lee como logro cuando puede ser solo densidad de alarmas sobre fallas agrupadas. Con presupuestos altos el azar detecta más eventos que el modelo (§4.4), y eso no se ve en ninguna métrica por fila.
