# Preguntas abiertas

Las preguntas se priorizan por su impacto sobre el producto y los datos. Una pregunta P0 abierta no impide desarrollar trabajo independiente, pero ningún agente debe resolverla mediante una suposición silenciosa.

## P0 — define la promesa del MVP

1. ¿Qué familia de máquinas será utilizada?
2. ¿Qué significa exactamente una falla?
3. ¿Cuál es el modo de falla objetivo?
4. ¿Se predice máquina, componente o tipo de falla?
5. ¿Cuál es el dataset?
6. ¿Cuántas fallas etiquetadas contiene?
7. ¿Qué sensores están disponibles?
8. ¿Qué frecuencia tienen?
9. ¿Cuál es el horizonte útil de anticipación?
10. ¿Mostraremos `anomaly score`, `risk score` o probabilidad? El modelo ya entrega una probabilidad (`predict_proba` en `ml/notebooks/03_modelado`), mientras el prototipo de interfaz muestra un índice de condición que **no** es una probabilidad (`src/features/maintenance/types.ts`). Sigue abierta, pero ahora puede resolverse con esa evidencia.
11. ¿Cómo se determina la criticidad?
12. ¿Qué acción debería realizar mantenimiento ante una alerta?
13. ¿Cómo se mide el éxito del MVP?

## P1 — define el flujo operativo

- ¿Quién es la persona usuaria principal y qué decisión toma hoy?
- ¿Qué estados operativos, cargas o condiciones ambientales deben contextualizar las señales?
- ¿Cómo se relacionan los identificadores de máquinas, sensores, fallas e intervenciones?
- ¿Con qué latencia y periodicidad llegan los datos, y en qué formato?
- ¿Qué explicación mínima necesita mantenimiento para confiar en una prioridad?
- ¿Qué costos tienen una falsa alarma y una falla no detectada?
- ¿Qué máquinas y usuarios participarán en la validación del MVP?
- ¿Quién revisará las etiquetas y confirmará el resultado de una alerta?
- ¿Cómo llega una predicción al producto: puntuación por lote hacia PostgreSQL, un servicio desplegado aparte, u otra forma? El prototipo de `ml/api` existe pero hoy no se despliega ni tiene contrato con la aplicación, y extraerlo como servicio requiere un ADR (ver `ARCHITECTURE.md`).

## P2 — decisiones posteriores a la validación

- ¿Qué roles y permisos necesita una primera operación compartida?
- ¿Se requieren notificaciones, exportaciones o integraciones externas?
- ¿Existe una necesidad demostrada de actualización en tiempo real?
- ¿Cuánto tiempo deben conservarse datos, predicciones y feedback?
- ¿Se necesita soportar más de una planta, organización o familia de máquinas?

Cuando se resuelva una pregunta, la respuesta debe registrar evidencia, responsable e impacto en el documento correspondiente o en un ADR si la decisión es arquitectónica.
