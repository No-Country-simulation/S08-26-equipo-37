# Producto

## Hechos conocidos

- PredictiveMaintenance es una aplicación de soporte al mantenimiento industrial.
- Su propósito eventual es transformar datos de sensores e historial de mantenimiento en información útil para detectar señales de deterioro, priorizar equipos y planificar intervenciones.
- El **dataset**, la **familia de máquinas** y el **modo de falla objetivo** del MVP ya están definidos ([`SPEC-MVP-PARAMETERS.md`](./SPEC-MVP-PARAMETERS.md)): telemetría horaria de 25 máquinas de mecanizado y una clasificación binaria de falla a 48 h. Lo que sigue abierto es la **salida predictiva** y su validación industrial ([`OPEN-QUESTIONS.md`](./OPEN-QUESTIONS.md)).
- El alcance predictivo definitivo depende de la evidencia disponible en los datos, y esa evidencia ya está medida: ver [`MODEL-LIMITATIONS.md`](./MODEL-LIMITATIONS.md).

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

- Prometer probabilidad de falla, tiempo hasta la falla o vida útil remanente **más allá de lo que los datos sostienen**. Hoy hay evidencia para una probabilidad a 48 h (PR-AUC 0,842 con partición temporal, precision 0,69) y **no** para RUL continuo, que está censurado en el dataset. Ver [`MODEL-LIMITATIONS.md`](./MODEL-LIMITATIONS.md).
- Automatizar decisiones o intervenciones de mantenimiento.
- Diseñar un dashboard final, reglas de negocio o modelos de dominio ficticios.
- Autenticación, notificaciones, tiempo real y MLOps antes de que exista una necesidad validada. Existe un **prototipo local** de servicio predictivo en `ml/api` (FastAPI + LightGBM) que **no se despliega**: no tiene Dockerfile, no está en `compose.yaml` y ningún workflow lo construye. Ver [`ARCHITECTURE.md`](./ARCHITECTURE.md).
- Infraestructura distribuida, microservicios o integraciones hipotéticas.
