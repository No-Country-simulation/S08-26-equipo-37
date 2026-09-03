# Producto

## Hechos conocidos

- PredictiveMaintenance es una aplicación de soporte al mantenimiento industrial.
- Su propósito eventual es transformar datos de sensores e historial de mantenimiento en información útil para detectar señales de deterioro, priorizar equipos y planificar intervenciones.
- Todavía no están definidos el dataset, la familia de máquinas, el modo de falla objetivo ni la salida predictiva del MVP.
- El alcance predictivo definitivo depende de la evidencia disponible en los datos.

## Hipótesis del MVP

La hipótesis de valor inicial es:

> Permitir que un responsable de mantenimiento identifique máquinas que muestran señales de deterioro, comprenda qué variables explican esa situación y decida cuáles debería revisar primero.

Para validarla, el MVP debería ofrecer un flujo pequeño y trazable: seleccionar un equipo, observar su condición a partir de datos reales, entender las variables relevantes y priorizar una revisión. La utilidad de ese flujo y la persona usuaria principal deben validarse con mantenimiento.

## Decisiones abiertas

- Qué familia de máquinas, componente o modo de falla cubrirá el MVP.
- Qué datos reales existen y con qué calidad, granularidad e historial.
- Si la salida será un `anomaly score`, `condition score`, `risk score`, una probabilidad calibrada de falla o una estimación temporal.
- Cómo se incorporará la criticidad y qué acción concreta deberá provocar una señal.
- Con qué criterio operativo y predictivo se considerará exitoso el MVP.

Estas decisiones se detallan y priorizan en [OPEN-QUESTIONS.md](./OPEN-QUESTIONS.md). Ninguna debe resolverse mediante una suposición silenciosa.

## Fuera de alcance inicial

- Prometer probabilidad de falla, tiempo hasta la falla o vida útil remanente sin datos que lo sustenten.
- Automatizar decisiones o intervenciones de mantenimiento.
- Diseñar un dashboard final, reglas de negocio o modelos de dominio ficticios.
- Autenticación, notificaciones, tiempo real, servicios predictivos separados y MLOps antes de que exista una necesidad validada.
- Infraestructura distribuida, microservicios o integraciones hipotéticas.
