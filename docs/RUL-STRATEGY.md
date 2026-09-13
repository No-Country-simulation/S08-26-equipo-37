# RUL extendido y evolución del MVP

**Propuesta técnica para decidir si el MVP se queda en la alerta a 48 h o da un paso más**

| Campo | Valor |
| --- | --- |
| Proyecto | PredictiveMaintenance (NoCountry) |
| Documento | Potencial del RUL extendido + estrategia de parámetros para un MVP más sofisticado |
| Estado | **Propuesta para decisión** (reunión del lunes 14/09) |
| Autor | PM en ejercicio (`Fttab101`) con análisis de datos del equipo |
| Base empírica | `analisis/markov-fallas.py` · `analisis/informe-markov.md` (dataset v2, commit `c8a224a`) |
| Documentos relacionados | [`SPEC-MVP-PARAMETERS.md`](./SPEC-MVP-PARAMETERS.md) · [`SCOPE.md`](./SCOPE.md) · [`DATA-STRATEGY.md`](./DATA-STRATEGY.md) · [`BACKLOG.md`](./BACKLOG.md) |

---

## 1. Resumen ejecutivo (para decidir en 5 minutos)

**Qué se propone.** Mantener el MVP aprobado (alerta de falla a 48 h) **y sumarle una segunda capa de información**: probabilidad de falla a **7, 30 y 90 días** y **vida útil restante (RUL) expresada como rango** — barata de calcular, verificable y mucho más útil para planificar.

**Por qué es posible sin datos nuevos.** El dataset solo tiene etiquetas hasta 48 h. Pero modelando el **paso de una etapa de salud a otra** (cadena de Markov) se obtienen horizontes largos **sin necesidad de etiquetas nuevas**: la información está en la estructura de las transiciones, no en las etiquetas.

**Qué ganamos.** Que mantenimiento pueda planificar compras de repuestos, coordinar paradas y decidir con costo esperado, en lugar de reaccionar a una alerta de dos días.

**Qué cuesta.** Dos ajustes metodológicos obligatorios (no negociables) y trabajo de la célula de datos: **(a)** la "etapa de salud" hay que **deducirla de los sensores** (hoy está tomada de una columna que en realidad *es* la respuesta), y **(b)** el modelo debe **recordar cuánto tiempo lleva la máquina en la etapa** (los datos muestran que eso cambia la probabilidad).

**Recomendación.** **Opción B — adoptar el horizonte extendido como información complementaria y experimental en el MVP, con validación**, y dejar la versión completa (con decisión por costos) para la fase siguiente. Detalle en §11.

---

## 2. El límite del horizonte actual

El MVP aprobado predice **una sola cosa**: ¿esta máquina falla en las próximas **48 horas**? Es un buen objetivo para una alerta, pero tiene tres límites prácticos:

1. **No permite planificar con antelación.** Comprar un rodamiento especial, conseguir una grúa o coordinar una parada general no se resuelve en 48 h: se planifica con semanas.
2. **El dato de RUL está censurado.** En el dataset, `target_rul_horas` solo tiene valor en las **48 h previas** a una falla (89,4 % de las filas viene vacío). Es decir: **no hay ejemplos de "cuánto le queda" para una máquina sana**. Eso hace imposible aprender un RUL largo de forma directa.
3. **No distingue entre "riesgo inmediato" y "deterioro lento".** Dos máquinas con la misma probabilidad a 48 h pueden necesitar decisiones muy distintas si una viene degradándose desde hace un mes y la otra acaba de empezar.

**La consecuencia de negocio:** con solo 48 h, el sistema avisa cuando ya casi no hay margen. Con horizonte extendido, el sistema **avisa mientras todavía se puede planificar**.

---

## 3. Qué es el RUL extendido y qué medimos

**RUL** (*Remaining Useful Life*): las horas de vida útil que le quedan a la máquina antes de fallar.

**Cómo lo estimamos sin etiquetas largas.** Construimos una tabla de "de qué etapa a qué etapa" por hora, estimada de las 72.000 filas del dataset:

| desde \ hacia | Normal | Bajo observación | Riesgo crítico | Parada | **FALLA** |
| --- | --- | --- | --- | --- | --- |
| **Normal** | 0,9966 | 0,0034 | 0 | 0 | 0 |
| **Bajo observación** | 0,0076 | 0,9860 | 0,0065 | 0 | 0 |
| **Riesgo crítico** | 0 | 0 | 0,9785 | 0 | **0,0215** |
| **Parada** | 0 | 0 | 0 | 0,9071 | 0,0929 |

Aplicando esa tabla varias veces seguidas (como repetir un cálculo hora tras hora) se obtiene:

**Probabilidad de falla por horizonte** — el dataset solo tiene la columna de 48 h; el resto se deriva:

| Si hoy está… | 48 h *(etiquetado)* | 7 días | **30 días** | 90 días |
| --- | --- | --- | --- | --- |
| Normal | 0,53 % | 9,1 % | **56,3 %** | 93,9 % |
| Bajo observación | 9,3 % | 38,3 % | **73,8 %** | 96,3 % |
| Riesgo crítico | 64,8 % | 97,4 % | **100 %** | 100 % |
| Parada | 99,1 % | 100 % | **100 %** | 100 % |

**RUL en rangos** (en vez de un número falso-preciso):

| Si hoy está… | Caso típico (mediana) | Escenario pesimista (p90) | Promedio |
| --- | --- | --- | --- |
| Normal | **622 h** (~26 días) | 1.804 h | 843 h |
| Bajo observación | **267 h** (~11 días) | 1.426 h | 548 h |
| Riesgo crítico | **32 h** | 106 h | 47 h |
| Parada | 8 h | 24 h | 11 h |

*Mediana = el caso del medio (la mitad falla antes, la mitad después). p90 = el 90 % de los casos falla antes de ese valor: el peor escenario razonable. El promedio engaña porque la distribución tiene cola larga.*

**Lo que esto habilita en el negocio:**
- "Esta máquina tiene 12 % a 48 h, pero **56 % a 30 días**: programemos la intervención en la parada del 20/10".
- "Quedan **entre 270 y 1.400 horas**": el rango permite decidir si el repuesto se pide ya o no.
- Comparar máquinas por **riesgo a 30 días** cambia el orden de prioridades respecto de mirar solo 48 h.

---

## 4. Los dos hallazgos que condicionan el diseño

Estos dos puntos son la razón por la que **esto no es "enchufar y listo"**. Están medidos, no supuestos.

### Hallazgo A — La "etapa de salud" del dataset *es* la respuesta

Al validar contra la etiqueta real:

| Etapa | P(falla en 48 h) real | P(48 h) que predice el modelo |
| --- | --- | --- |
| Normal | **0,00 %** | 0,53 % |
| Bajo observación | **0,00 %** | 9,29 % |
| Riesgo crítico | **100,00 %** | 64,77 % |
| Parada | 91,50 % | 99,07 % |

`Riesgo crítico` coincide con "falla en 48 h" en el **100 %** de los casos. Es decir: la etapa que usamos como punto de partida **es la misma respuesta que queremos predecir**.

> **Qué significa en criollo**: es como querer adivinar la nota de un examen y que alguien te pase la nota como "dato de entrada". El modelo parece perfecto y no sirve. Esto se llama **fuga de información** (*leakage*).

**Consecuencia para el diseño**: la etapa **no se puede leer**; hay que **deducirla de los sensores** (vibración, temperatura, corriente, presión) con un modelo que estime el estado oculto.

### Hallazgo B — El modelo se olvida de cuánto tiempo llevás en la etapa

La probabilidad de salir de `Normal` según el tiempo que lleva ahí:

| Horas en Normal | 1 | 3 | 8 | 12 |
| --- | --- | --- | --- | --- |
| Probabilidad de salir esa hora | **0,162** | 0,047 | 0,018 | **0,000** |

Una cadena "clásica" supone que esa probabilidad es **constante**. Los datos dicen que **depende del tiempo en la etapa** (y por eso el modelo subestima `Riesgo crítico` en 35 puntos). La versión que sí lo tiene en cuenta se llama **semi-Markov** (Markov + "hace cuánto que estoy acá").

---

## 5. Arquitectura propuesta: tres capas

```
CAPA 3 · DECISIÓN      ¿Qué conviene hacer y cuándo?          (costo esperado de esperar vs intervenir)
        ▲
CAPA 2 · DINÁMICA      ¿Cómo evoluciona el deterioro?          (semi-Markov: transiciones + tiempo en etapa)
        ▲
CAPA 1 · ESTADO        ¿En qué etapa está hoy la máquina?      (deducida de los sensores — sin fuga)
```

| Capa | Qué resuelve | Cómo se implementa | Necesita |
| --- | --- | --- | --- |
| **1. Estado** | Convertir sensores en "etapa" | Estados ocultos (*HMM*) o deciles de riesgo del modelo de 48 h | Datos de sensores (los tenemos) |
| **2. Dinámica** | Extender el horizonte | Cadena semi-Markov (o Markov con covariables) | Estado de la capa 1 + tiempo en etapa |
| **3. Decisión** | Elegir la acción de menor costo | Proceso de decisión de Markov (*MDP*) con `costo_parada_hora_usd` | Costo de intervención planificada (a asumir, ver §9) |

**La capa 1 es la que falta hoy** y es la que convierte todo esto en un modelo legítimo. Las capas 2 y 3 son incrementales sobre ella.

---

## 6. Estrategia de parámetros: MVP actual vs. MVP extendido

Esta es la propuesta concreta de cambio. Nada se elimina: **se agrega** información y se corrige el origen del estado.

| Parámetro | MVP aprobado (hoy) | MVP extendido (propuesta) | Qué habilita |
| --- | --- | --- | --- |
| **Target principal** | `target_falla_48h` (0/1) | Igual, **más** probabilidad a 7 / 30 / 90 días | Planificación con antelación |
| **Etapa de salud** | Columna del dataset | **Deducida de los sensores** (capa 1) | Elimina la fuga; es la pieza que legitima el resto |
| **Salida al usuario** | Estado + P(48 h) + prioridad | + **P(30 d)** + **RUL en rango (mediana y p90)** + **costo esperado de esperar** | Decide cuándo intervenir, no solo a qué máquina |
| **Modelo de dinámica** | — | **Semi-Markov** (transiciones + tiempo en etapa) | Corrige la subestimación de riesgo medida |
| **Priorización** | P(48 h) × criticidad × costo de parada | Igual, pero con **riesgo a 30 días** y **costo esperado** | Ordena por impacto económico, no solo por urgencia |
| **Alertas** | Umbral único (~0,70) | Umbral **por horizonte y por criticidad** (ej. 48 h para criticidad Alta; 30 días para Media/Baja) | Menos ruido y mejor uso del tiempo del técnico |
| **Frecuencia** | Diaria | Diaria + **recálculo del estado** al recibir datos nuevos | Mantiene la estimación al día |
| **Métricas de éxito** | Recall ≥ 70–80 % a 48 h | + **calibración por horizonte** (que "56 %" signifique 56 %) + **costo evitado** | Defiende el valor ante el negocio |
| **Fuera de alcance** | RUL fino, por componente, CMMS real | Se mantiene, salvo **RUL en rango** (que pasa a estar dentro) | No prometemos más de lo que validamos |

**Regla de oro de esta propuesta**: la información nueva va **como complemento y con etiqueta de experimental** hasta que la validación de §8 la respalde. El MVP no pierde su promesa actual ni su fecha.

---

## 7. Cómo se vería en el producto

En el **detalle del activo** (pantalla de [#17](https://github.com/No-Country-simulation/S08-26-equipo-37/issues/17)/[#18](https://github.com/No-Country-simulation/S08-26-equipo-37/issues/18)):

```
Motor Principal de Extrusión (M-07) · Criticidad Alta · USD 1.500/h

Riesgo de falla      48 h:  12 %       7 días: 38 %      30 días: 56 %
Vida útil estimada   típica 267 h      peor escenario 1.426 h
Estado actual        Bajo observación (deducido de sensores: vibración +40 %)
Por qué              vibracion_mms +40 % · temperatura_c +15 °C
Costo de esperar 7 d USD ~4.800 (esperado)   vs. intervención planificada: a cotizar
Acción sugerida      programar inspección en la parada del 20/10
```

*El "costo de esperar" es ilustrativo: `P(7 d) × 7 días × costo por hora`. El costo de la intervención planificada no está en el dataset; hay que asumirlo explícitamente.*

---

## 8. Plan de validación (obligatorio antes de mostrarlo como salida del producto)

Un horizonte extendido mal calibrado es peor que no tenerlo: si dice 56 % y falla el 20 %, el equipo deja de confiar. Por eso:

1. **Partición temporal estricta** (entrenar con lo viejo, evaluar con lo nuevo), como en el baseline de 48 h.
2. **Calibración por horizonte**: curva de fiabilidad ("cuando dije 56 %, ¿pasó el 56 %?") y error de Brier.
3. **Comparación contra la referencia operativa** (mantenimiento por calendario) en cada horizonte.
4. **Validación contra el generador**: el dataset tiene un proceso de estados conocido (semilla 42); un modelo semi-Markov estimado de los datos debería **recuperar esa estructura**. Es una validación con *ground truth*, algo poco común.
5. **Declaración de límites**: dataset sintético → mide factibilidad del método, no desempeño real (ver [`BACKLOG.md`](./BACKLOG.md) §5 y [#14](https://github.com/No-Country-simulation/S08-26-equipo-37/issues/14)).

---

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| **Fuga de información** (usar la etapa como si fuera dato) | Capa 1 obligatoria: estado deducido de sensores |
| **Prometer RUL que no se sostiene** | Publicar **rangos** (mediana y p90), no un número; validar calibración |
| **Pocos eventos** (261 fallas, 25 máquinas) | Agrupar por familia de máquina y criticidad; reportar incertidumbre |
| **Dataset sintético** | Declararlo; validar contra el generador; no vender desempeño real |
| **Consumir el sprint** | Se limita a la **opción barata** (§11) durante el MVP; el resto va a fase 2 |
| **Falta el costo de intervención** | Asumirlo y dejarlo escrito; el MDP se recalcula cuando exista el dato |

---

## 10. Hoja de ruta por fases

| Fase | Qué se hace | Cuándo |
| --- | --- | --- |
| **F1 — MVP (comprometido)** | Alerta a 48 h, dashboard, HiTL, parámetros del SPEC | Sprint actual |
| **F2 — Horizonte extendido (experimental)** | Capa 1 (estado observable) + capa 2 (semi-Markov) → P(7/30/90 d) y RUL en rango, con validación | A definir el lunes (§11) |
| **F3 — Decisión por costo** | Capa 3 (MDP): "intervenir ahora vs esperar", umbrales por costo | Fase posterior |

---

## 11. Decisión del lunes: 3 preguntas y 3 opciones

**Preguntas (si alguna es "no", corresponde la opción C):**

1. ¿Mejora la decisión que tiene que tomar mantenimiento? → **Sí, según §3** (permite planificar).
2. ¿Hay capacidad en la célula de datos sin frenar los parámetros, el schema y las pantallas? → **A definir en la reunión**.
3. ¿Es verificable con lo que tenemos? → **Sí** (partición temporal + generador con semilla conocida).

**Opciones:**

| Opción | Alcance | Costo | Riesgo |
| --- | --- | --- | --- |
| **A — Adelantar todo** | Capas 1 + 2 + 3 en el MVP | Alto: compite con el camino crítico | Puede poner en riesgo la fecha del MVP |
| **B — Complemento experimental** ⭐ | Capa 1 con **deciles de riesgo** (simple, sin fuga) + capa 2 básica → publicar P(30 d) y RUL en rango **marcados como experimentales**, con validación | Bajo (~1 día de trabajo de DS) | Ninguno para la fecha si se hace después de cerrar los parámetros |
| **C — Fase 2** | Todo queda documentado y se retoma después del MVP | Nulo ahora | Se pierde el impacto en la demo |

**Recomendación: Opción B.** Es la única que suma valor visible para la demo **sin tocar el camino crítico**, siempre que se ejecute **después** de cerrar los parámetros del MVP ([#12](https://github.com/No-Country-simulation/S08-26-equipo-37/issues/12)) y con la validación de §8 hecha antes de mostrarlo.

---

## 12. Anexo — Glosario mínimo y material

| Término | En criollo |
| --- | --- |
| **RUL** | Horas de vida útil que le quedan a la máquina |
| **Horizonte** | Cuánto tiempo hacia adelante estoy prediciendo (48 h, 30 días…) |
| **Cadena de Markov** | Tabla que dice, si hoy estoy en una etapa, qué probabilidad hay de estar en cada etapa la hora siguiente |
| **Semi-Markov** | Igual, pero teniendo en cuenta **cuánto tiempo** lleva en la etapa |
| **Estados ocultos (HMM)** | La etapa no se ve; se **deduce** de los sensores (como la fiebre con un termómetro) |
| **MDP** | Marco para **decidir** la mejor acción considerando costos |
| **Fuga (leakage)** | Usar como dato algo que en realidad es la respuesta |
| **Censura** | Sabemos que la máquina no falló todavía, pero no cuándo fallará |
| **Calibración** | Que cuando el modelo dice "56 %", efectivamente pase el 56 % |
| **Mediana / p90** | El caso típico / el escenario pesimista razonable |

**Material de origen:** [`analisis/markov-fallas.py`](../analisis/markov-fallas.py) (reproducible) · `analisis/informe-markov.md` (informe completo con las 8 secciones y las cifras).
**Cómo reproducirlo:**
```bash
python3 analisis/markov-fallas.py            # genera el informe
```

**Advertencia final:** todo el análisis está hecho sobre el **dataset sintético del equipo** (72.000 filas, 25 máquinas, 261 fallas, semilla 42). Sirve para demostrar **factibilidad del método** y para validar contra la estructura conocida del generador; **no** demuestra desempeño en una planta real.
