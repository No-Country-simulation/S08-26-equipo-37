# Estrategia de datos

## Regla rectora

> El dataset disponible determinará qué promesa predictiva puede realizar el MVP.

No se diseñará el modelo de dominio final ni se elegirá una salida predictiva antes de conocer los datos reales.

## Hechos conocidos

- No existe todavía un dataset definitivo confirmado para el proyecto.
- No se conocen aún la cantidad ni la familia de máquinas, los sensores disponibles, las fallas etiquetadas o el horizonte útil de anticipación.
- Detección de anomalías, clasificación de fallas, probabilidad de falla y vida útil remanente resuelven problemas distintos y requieren evidencia diferente.

## Hipótesis por validar

- Los sensores y el historial podrían contener señales de deterioro útiles para priorizar revisiones.
- El contexto operativo podría ser necesario para distinguir deterioro de cambios normales de régimen.
- La historia de fallas e intervenciones podría permitir una tarea supervisada; hasta inspeccionar esos registros, no debe asumirse.

## Decisiones vigentes

- Trabajar primero con análisis batch y reproducible; no asumir tiempo real.
- Mantener los datos originales inmutables y documentar toda limpieza o transformación.
- Separar datos de entrenamiento, validación y prueba respetando tiempo y equipos para evitar fuga de información.
- Empezar con el baseline más simple que responda la pregunta elegida y compararlo contra una referencia operativa.
- No crear tablas de negocio a partir de nombres de columnas hipotéticos.

## Inventario mínimo antes de modelar

La exploración debe responder y dejar documentado:

- dataset y origen de los datos;
- cantidad, identificadores y familia de máquinas;
- sensores, significado físico y unidades;
- frecuencia de muestreo y cambios de frecuencia;
- zona horaria, formato, orden y cobertura de los timestamps;
- datos faltantes, duplicados, valores imposibles y períodos sin señal;
- fallas históricas, definición, modo, componente y momento del evento;
- intervenciones de mantenimiento y su relación temporal con las señales;
- etiquetas disponibles, procedencia y confiabilidad;
- estados operativos, carga, ambiente y otros factores de contexto;
- horizonte de anticipación que permitiría actuar.

El primer entregable de datos será un diccionario y un perfil de calidad. Recién entonces se propondrán el contrato de ingestión y el esquema persistente mínimo.

## Problemas predictivos diferentes

| Problema | Pregunta que responde | Evidencia mínima | Lo que no implica |
| --- | --- | --- | --- |
| Detección de anomalías | ¿Esta observación o ventana se aparta del comportamiento de referencia? | Historial representativo de operación y una definición de normalidad | Una anomalía no es necesariamente una falla ni expresa su probabilidad |
| Clasificación de fallas | ¿Qué clase o modo de falla corresponde dentro de una ventana definida? | Ejemplos etiquetados suficientes y una taxonomía consistente | Una clase predicha no informa por sí sola cuándo ocurrirá la falla ni garantiza probabilidades calibradas |
| Probabilidad de falla | ¿Qué probabilidad existe de una falla definida dentro de un horizonte explícito? | Eventos y no eventos confiables, horizonte, exposición y validación de calibración | Un score de ranking no es una probabilidad; el valor debe conservar significado probabilístico fuera del entrenamiento |
| Vida útil remanente (RUL) | ¿Cuánto tiempo o uso queda hasta un evento final definido? | Trayectorias de degradación y tiempos hasta falla o censura comparables | No puede inferirse solo de anomalías o de etiquetas aisladas de falla |

Otros nombres tampoco son intercambiables:

- `anomaly score`: grado relativo de desviación respecto de una referencia;
- `condition score`: índice resumido de condición cuya escala debe definirse;
- `risk score`: prioridad relativa que puede combinar señal y consecuencias;
- probabilidad calibrada: frecuencia esperada de un evento definido para valores similares;
- estimación temporal: tiempo esperado o intervalo hasta un evento definido.

## Selección y evaluación

La pregunta operativa y los datos deben elegir el objetivo, no al revés. La evaluación también cambia:

- anomalías: estabilidad, carga de falsas alarmas y utilidad de los casos priorizados, con revisión experta;
- clasificación: desempeño por clase y costo de errores dentro del horizonte acordado;
- probabilidad: discriminación y calibración, además del costo operativo del umbral;
- RUL: error temporal y consecuencias distintas de anticipar demasiado tarde o demasiado temprano.

Las métricas concretas, el umbral y el conjunto de prueba permanecen abiertos hasta definir la acción de mantenimiento y el costo de los errores.
