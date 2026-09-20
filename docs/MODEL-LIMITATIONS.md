# Limitaciones del dataset y del modelo

> **Estado:** borrador para revisión del equipo. Cierra el punto 10 del backlog de [`SCOPE.md`](./SCOPE.md) y responde al issue [#14](../../issues/14).
>
> **Regla de uso:** ninguna métrica de este documento debe presentarse sin la limitación que la acompaña. Si una diapositiva dice PR-AUC 0,842, esta tabla es la que dice qué significa ese número y qué no.

## 1. Qué puede afirmarse hoy y qué no

| Afirmación | Estado | Por qué |
| --- | --- | --- |
| Un modelo de clasificación de falla a 48 h es viable sobre este dataset | **Sí** | PR-AUC 0,842 con partición temporal sobre abril |
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

**Nota para [#10](../../issues/10):** como el generador es reproducible con SEED 42, ese listado es *derivable* volviendo a correr el notebook de generación y comparando contra el CSV canónico. Cerrar #10 es trabajo pendiente, no una dependencia externa — siempre que el script del repositorio sea el que produjo el CSV v2.

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

## 4. Limitaciones del modelo

Modelo actual: **LightGBM Classifier** sobre una matriz de **42 features** (telemetría más ventanas móviles de 3, 6 y 12 h de temperatura, vibración y presión). Partición **temporal**: abril como mes de test (17.386 filas, 2.412 positivas) y los tres meses previos como entrenamiento (53.084 filas).

### 4.1 Hubo fuga de datos, y se corrigió

El primer entrenamiento daba métricas perfectas (**1,00**). La prueba de permutación lo delató: al desordenar la variable líder, el modelo seguía acertando todo. La causa era que `codigo_alarma_plc` y `estado_operativo` **contenían la respuesta del futuro** en el simulador, y el modelo las usaba como atajo en lugar de la física. Se eliminaron y el modelo pasó a métricas realistas.

**Riesgo residual:** que se hayan encontrado dos columnas con fuga no prueba que no queden otras. La auditoría fue dirigida, no exhaustiva, y el dataset sintético es justamente el tipo de origen donde estas correlaciones se cuelan. También se descartó `velocidad_rpm` por redundante, con el mismo criterio: la selección de features se hizo a mano, caso por caso.

### 4.2 Las métricas son por fila, no por evento

Con 7.623 filas positivas repartidas en 261 eventos, **cada falla aporta unas 29 filas positivas** en promedio. Un recall de 0,88 medido por fila **no significa** que se detecten el 88 % de las fallas: significa que se acierta el 88 % de las *horas* etiquetadas. Un operario experimenta eventos, no horas.

Es la limitación más importante de cara al negocio y la más fácil de malinterpretar en una presentación.

### 4.3 Partición sin agrupar por máquina

El split es temporal pero **no agrupa por máquina**, y `id_maquina` y `modelo` entran como variables categóricas nativas de LightGBM. Con 25 equipos, el modelo puede memorizar patrones por equipo en lugar de aprender degradación general. Falta la validación agrupada (*leave-machines-out*) para saber cuánto de la performance es generalizable.

### 4.4 Sin matriz de confusión ni comparación contra el calendario

Faltan dos piezas para cuantificar el valor:

- **Matriz de confusión**: no está en el notebook.
- **Referencia operativa**: no hay comparación contra el mantenimiento por calendario, que es la práctica que el MVP pretende mejorar.

Sin esta última, el PR-AUC es un número técnico sin traducción a decisión.

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
| §3.1 definición operativa de falla | Ratificar el §3 de `SPEC-MVP-PARAMETERS.md` y cerrar la P0 n.º 2 | `OPEN-QUESTIONS.md`, [#12](../../issues/12) |
| §3.2 limpieza sin puntuar | Re-correr el generador y comparar contra el CSV | [#10](../../issues/10) |
| §4.2 métricas por evento | Agregar métricas a nivel de evento, no de fila | [#13](../../issues/13) |
| §4.3 split por máquina | Validación agrupada por equipo | [#13](../../issues/13) |
| §4.4 valor de negocio | Matriz de confusión + referencia de calendario | [#13](../../issues/13), [#24](../../issues/24) |
| §4.5 umbral | Definir costos de falso positivo y falso negativo | P1 de `OPEN-QUESTIONS.md` |
| §4.7 calibración | Curva de confiabilidad y Brier score sobre el mes de test | [#13](../../issues/13) |
| §4.8 máquina detenida | Decidir cómo se representa el tiempo detenido sin filtrar el futuro | [#12](../../issues/12), [#15](../../issues/15) |
| §5 integración | Seed desde el CSV v2 y servicio de predicciones | [#16](../../issues/16), [#19](../../issues/19) |

## 7. Cómo citar este trabajo

Al presentar el MVP, la forma honesta de describirlo es:

> Sobre un dataset **sintético** de 25 máquinas y 4 meses, un modelo de clasificación a 48 h alcanza **PR-AUC 0,842** con partición temporal (recall 0,88 y precision 0,69 por hora etiquetada). La validación en planta, la calibración del umbral y la comparación contra el mantenimiento por calendario quedan pendientes, y son las condiciones para hablar de ahorro.

Cualquier versión más fuerte de esa frase —"predice fallas con 93 % de exactitud"— omite que la exactitud se mide por hora en un simulador.
