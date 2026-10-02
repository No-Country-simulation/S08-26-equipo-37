# Modelo de datos

| Campo | Valor |
| --- | --- |
| Proyecto | PredictiveMaintenance (NoCountry) |
| Documento | Modelo persistido del MVP y referencia conceptual anterior |
| Origen | Schema en `prisma/schema.prisma` ([ADR 0008](./adr/0008-mvp-machine-hour-persistence.md)) y documento de arquitectura de datos del equipo |
| Ubicación | `docs/DATA-MODEL.md` |
| Relacionados | [`DOMAIN-ONTOLOGY.md`](./DOMAIN-ONTOLOGY.md) · [`SCOPE.md`](./SCOPE.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [ADR 0002](./adr/0002-prisma-postgresql.md) · [ADR 0008](./adr/0008-mvp-machine-hour-persistence.md) |

> **Estado:** el MVP está modelado en `prisma/schema.prisma` y validado con Prisma 7.10. La migración todavía no existe ([#15](../../issues/15)). La aplicación no lee estas tablas. Las secciones marcadas como referencia conceptual describen un diseño anterior y no están implementadas.

## Implementación del MVP

La unidad de persistencia es una máquina en una hora. El flujo es:

```text
Activo → LecturaMaquinaHora → PrediccionIA → Alerta → RevisionAlerta → OrdenTrabajo
Activo → EventoFalla
```

`EventoFalla` sirve después para contrastar una alerta con una falla real. `OrdenTrabajo` es opcional: una revisión puede descartar la alerta y terminar ahí.

| Modelo Prisma | Tabla | Qué guarda |
| --- | --- | --- |
| `Activo` | `activos` | Identificador de planta, tipo, modelo, marca, línea, antigüedad, criticidad, costo de parada y potencia nominal |
| `LecturaMaquinaHora` | `lecturas_maquina_hora` | Sensores, `estadoOperativo` y odómetros de esa hora |
| `PrediccionIA` | `predicciones_ia` | Inferencia real: falla a 48 h, probabilidad, versión del modelo |
| `EventoFalla` | `eventos_falla` | Hecho real de falla, distinto de la predicción |
| `Alerta` | `alertas` | Caso operativo con estado y, al cerrar, resultado |
| `RevisionAlerta` | `revisiones_alerta` | Quién decidió, qué decidió y el motivo |
| `OrdenTrabajo` | `ordenes_trabajo` | Intervención humana, con alerta de origen opcional |

Las personas son el `User` ya existente. No hay un modelo `Usuario`.

| Regla | Cómo queda |
| --- | --- |
| Una sola fila por máquina y hora | `@@unique([activoId, fechaHora])` |
| Sensor faltante | `Float?`. No se convierte a `0` |
| Odómetros | En `LecturaMaquinaHora`, no como estado único de `Activo` |
| Una alerta activa por máquina | Índice único parcial donde `closedAt` es nulo |
| Misma máquina en toda la cadena | Predicción → lectura, alerta → predicción y orden → alerta son FKs compuestas con `activoId`. Una alerta de A no puede apuntar a una predicción de B |
| Cierre de alerta | `estado = CERRADA` y `closedAt` se escriben juntos. El resultado es `CORRECTA`, `FALSO_POSITIVO` o `DESCARTADA` |

### Qué entra desde el dataset

| Destino | Columnas |
| --- | --- |
| `Activo` | `id_maquina`, `tipo_equipo`, `modelo`, `marca`, `linea_produccion`, `antiguedad_anos`, `criticidad`, `costo_parada_hora_usd`, `potencia_nominal_kw` |
| `LecturaMaquinaHora` | `fecha_hora`, `estado_operativo`, ocho sensores, `horas_operacion_totales`, `ciclos_acumulados`, `horas_desde_ultimo_mantenimiento`, `conteo_fallas_previas` |
| `EventoFalla` | `falla_inicio_disparo`, `falla_estado_causa` |

No se guardan como telemetría ni como columnas de predicción: `target_falla_48h`, `target_tipo_falla`, `target_rul_horas`, `target_estado_salud`, `codigo_alarma_plc`, medias o desvíos móviles, `mes`, `dia_semana`, `vibracion_critica` y `temperatura_critica`.

### Contrato de la API de Data Science

`POST /api/v1/predict/falla` devuelve `id_maquina`, `falla_predicha_48h`, `probabilidad_falla`, `score_dashboard`, `alerta_estado` y `color_hex`.

| Campo de `PrediccionIA` | Relación con la API |
| --- | --- |
| `fallaPredicha48h` | `falla_predicha_48h` (0/1), guardado como booleano |
| `probabilidadFalla48h` | `probabilidad_falla` |
| `versionModelo` | Obligatorio en la base. El endpoint no lo envía; lo informa quien persiste la inferencia |
| `estadoSaludSugerido`, `umbralAlerta`, `variablesExplicativas` | Opcionales. La API actual no los devuelve |
| — | `score_dashboard`, `alerta_estado` y `color_hex` no se persisten |

La API pide sensores no nulos y no envía `velocidad_rpm` ni `estado_operativo`. La base sí los conserva, porque describen la hora observada. Los odómetros viajan una vez en el payload de inferencia y se guardan en cada lectura.

## Referencia conceptual anterior

El texto que sigue es el esquema E-R v1.0 (canales de sensor, telemetría escalar, RUL y diagnóstico de modo de falla). No está en Prisma.

[BK] ARCH - Esquema Conceptual de Base de Datos para Mantenimiento Predictivo v1.0
## 1. Sentido y Propósito del Entregable
Este documento define la arquitectura relacional y conceptual de la base de datos para la plataforma de Mantenimiento Predictivo (PdM). Modela formalmente las 6 categorías del modelo ontológico en una estructura de datos transaccional y extensible, preparada para arquitecturas híbridas (SQL Relacional + Series Temporales NoSQL/TimescaleDB).

Permite mapear la jerarquía física de planta, canalizar la ingesta de telemetría continua y discontinua, estructurar las inferencias de los modelos de Machine Learning y dar soporte operativo al flujo Human-in-the-Loop para la gestión de Órdenes de Trabajo.

## 2. Diagrama de Relaciones Conceptual (Modelo E-R)
```text
[ Categorias_Activos ] 1 ─── N [ Activos ] 1 ─── N [ Sensores_Canales ]
                                 │                        │
                                 │ 1                      │ 1
                                 │                        │
                                 ▼ N                      ▼ N
                       [ Historial_Estados ]     [ Lecturas_Telemetria ]
                                 ▲
                                 │ 1
                                 │
                      [ Predicciones_IA ] 1 ─── N [ Diagnosticos_ModosFalla ]
                                 │
                                 │ 1
                                 ▼ N
                        [ Ordenes_Trabajo ]
```

## 3. Definición Detallada de Entidades (Esquema de Tablas)
### Categoría 1: Jerarquía y Criticidad de Activos
activos (Assets)
Almacena los equipos, motores, máquinas de mecanizado y componentes de distribución de la planta.

    • id_activo (UUID, PK): Identificador único global.

    • codigo_identificador (VARCHAR): Código interno de planta (ej. MOT-EXT-300HP-01, CNC-CENT-02).

    • nombre (VARCHAR): Nombre descriptivo (ej. "Motor Principal de Extrusión").

    • tipo_activo (ENUM): motor, torno, fresadora, centro_cnc, rectificadora, tablero, transmision, calentador, banco_capacitores, compresor.

    • categoria_criticidad (ENUM): A_alta (parada general), B_media (impacto focalizado), C_baja (reemplazo directo).

    • potencia_hp (DECIMAL, Nullable): Potencia nominal en caballos de fuerza (para segmentación 5 HP vs 300 HP).

    • ubicacion_planta (VARCHAR): Sector o línea de producción (ej. "Línea de Prensas 2").

    • id_activo_padre (UUID, FK Nullable): Relación autorreferencial para sub-ensambles (ej. Rodamiento dentro de Motor).

Categorías 2 y 3: Sensores, Canales de Captura y Telemetría
sensores_canales (Sensors & Capture Channels)
Catálogo de fuentes de datos (fijas IoT, instrumental portátil de ronda o robótica).

    • id_canal (UUID, PK)

    • id_activo (UUID, FK): Activo asignado.

    • tipo_canal (ENUM): iot_fijo, instrumento_portatil, robot_autonomo, manual_cmms.

    • instrumento_utilizado (ENUM): acelerometro_vibracion, pt100_temp, camara_termica, megohmetro, pinza_amperimetrica, medidor_lcr, audicion_ultrasonido.

    • variable_medida (ENUM): temperatura, vibracion_rms, vibracion_fft, amperaje, resistencia_aislamiento_mohm, capacitancia_uf, presion, rpm.

    • unidad_medida (VARCHAR): °C, mm/s, A, MΩ, µF, Bar, RPM.

    • frecuencia_muestreo_seg (INT, Nullable): Intervalo de envío en segundos (para sensores continuos).

lecturas_telemetria (Telemetry Measurements)
Nota de Arquitectura: En producción, esta entidad se implementa sobre una base de datos optimizada para Series Temporales (ej. TimescaleDB, InfluxDB).

    • id_lectura (BIGINT / UUID, PK)

    • id_canal (UUID, FK): Canal emisor de la lectura.

    • timestamp (TIMESTAMPTZ): Marca temporal con zona horaria.

    • valor_numerico (DECIMAL): Valor escalar capturado.

    • payload_completo (JSONB, Nullable): Contenedor de datos de alta densidad (espectro FFT, matrices térmicas, capturas robóticas).

Categorías 4 y 5: Diagnósticos de IA, Modos de Falla y Estado de Salud
predicciones_ia (ML Model Predictions)
Registra las inferencias generadas por los modelos de Machine Learning.

    • id_prediccion (UUID, PK)

    • id_activo (UUID, FK): Activo analizado.

    • timestamp_calculo (TIMESTAMPTZ): Momento de la inferencia.

    • probabilidad_falla (DECIMAL, 0.00 a 1.00): Probabilidad calculada de fallo en la ventana operativa.

    • rul_estimado_horas (INT, Nullable): Remaining Useful Life estimado en horas.

    • estado_salud_sugerido (ENUM): normal, observacion, riesgo_elevado, falla_inminente.

    • variables_explicativas (JSONB): Ponderación de características (Feature Importance / SHAP) que explican el diagnóstico (ej. {"vibracion_z": "+40%", "temperatura": "+15C").

diagnosticos_modos_falla (Fault Modes & Root Cause)
Mapea la inferencia del modelo con los modos de degradación física.

    • id_diagnostico (UUID, PK)

    • id_prediccion (UUID, FK): Predicción origen.

    • modo_falla (ENUM): degradacion_aislamiento_bobinado, pista_rodamiento_picada, falso_contacto_tablero, desalineacion_polea, fuga_capacidad_condensador, desgaste_herramienta_mecanizado.

    • confianza_falla (DECIMAL): Porcentaje de certidumbre del modo de falla asociado.

historial_estados_activo (Asset Health State History)
Línea de tiempo consolidada de la salud operativa de cada máquina.

    • id_historial (UUID, PK)

    • id_activo (UUID, FK)

    • timestamp (TIMESTAMPTZ)

    • estado_salud (ENUM): normal, observacion, riesgo_elevado, falla_inminente.

    • origen_cambio (ENUM): modelo_ia_automatico, validacion_experto_humano.

### Categoría 6: Decisiones Operativas y Flujo "Human-in-the-Loop"
ordenes_trabajo (Interventions & Work Orders)
Coordina la validación humana y la ejecución de intervenciones en planta.

    • id_orden (UUID, PK)

    • id_activo (UUID, FK)

    • id_prediccion (UUID, FK Nullable): Vínculo con la alerta automática.

    • tipo_accion_sugerida (ENUM): inspeccion_ronda_megohmetro, inspeccion_ronda_termografia, engrase_relubricacion, mantenimiento_planificado_parada, parada_emergencia.

    • prioridad (ENUM): baja, media, alta, critica.

    • estado_orden (ENUM): pendiente_revision_humana, aprobada, rechazada, en_ejecucion, completada.

    • tecnico_asignado (VARCHAR, Nullable)

    • notas_experto_humano (TEXT): Observaciones y ajustes del técnico al validar o corregir el diagnóstico de la IA.

## 4. Trazabilidad de Datos (Caso de Uso Transaccional)
```text
[Megóhmetro Portátil] ──> (Resistencia = 1.2 MΩ) ──> [lecturas_telemetria]
                                                             │
                                                             ▼
                                                    [predicciones_ia]
                                                    (P_falla = 0.87 | RUL = 72h)
                                                             │
                                                             ▼
                                             [diagnosticos_modos_falla]
                                             (degradacion_aislamiento_bobinado)
                                                             │
                                                             ▼
                                               [historial_estados_activo]
                                               (estado_salud = riesgo_elevado)
                                                             │
                                                             ▼
                                                    [ordenes_trabajo]
                                                    (estado = pendiente_revision_humana)
                                                             │
                                                             ▼
                                                    [Experto Humano Validador]
```

## 5. Control de Versión y Identificación del Documento
    • Nombre oficial para repositorio (.md): BK_ARCH_EsquemaBaseDatos_v1.0.md

    • Nombre para Google Drive / Notion: [BK] ARCH - Esquema Conceptual de Base de Datos v1.0

    • Módulo: [BK] (Backend & Base de Datos)

    • Tipo: ARCH (Arquitectura / Diseño)

    • Versión: v1.0

---

## Mapeo del dataset en el esquema conceptual v1.0

Esta tabla no es el schema implementado. Conserva el diseño anterior, con odómetros en el activo y targets como entidades de validación.

| Entidad | Columnas del CSV que la pueblan |
|---|---|
| `Activos` | `id_maquina`, `tipo_equipo`, `modelo`, `marca`, `linea_produccion`, `criticidad`, `costo_parada_hora_usd`, `potencia_nominal_kw`, `antiguedad_anos`, `horas_operacion_totales`, `ciclos_acumulados`, `conteo_fallas_previas` |
| `Lecturas_Telemetria` (por activo) | `fecha_hora`, sensores (carga_pct, velocidad_rpm, voltaje_v, corriente_a, potencia_consumida_kw, temperatura_c, vibracion_mms, presion_bar), `estado_operativo`, `horas_desde_ultimo_mantenimiento` |
| `Historial_Estados` / predicción (ground truth de validación) | `target_estado_salud`, `target_falla_48h`, `target_rul_horas`, `target_tipo_falla` |
| `Eventos` (disparo/convalecencia) | `falla_inicio_disparo`, `falla_estado_causa` |
| Señales PLC (salida/monitoreo) | `codigo_alarma_plc` |

> **Nota:** la tabla de arriba pertenece al documento conceptual v1.0. El mapeo que usa Prisma está en [Implementación del MVP](#implementación-del-mvp). Los odómetros no viven en `Activo`. La migración y el seed siguen pendientes ([#15](../../issues/15), [#16](../../issues/16)).

---
