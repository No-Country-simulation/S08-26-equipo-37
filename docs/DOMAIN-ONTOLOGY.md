# Ontología y taxonomía PdM

| Campo | Valor |
| --- | --- |
| Proyecto | PredictiveMaintenance (NoCountry) |
| Documento | Taxonomía y modelo ontológico de mantenimiento predictivo |
| Origen | Documento de alineación técnica y funcional del equipo (convertido a Markdown) |
| Ubicación | `docs/DOMAIN-ONTOLOGY.md` |
| Relacionados | [`SCOPE.md`](./SCOPE.md) · [`DATA-MODEL.md`](./DATA-MODEL.md) · [`SPEC-MVP-PARAMETERS.md`](./SPEC-MVP-PARAMETERS.md) |

> **Qué define:** el vocabulario común del proyecto — qué es un activo, una variable de condición, un canal de captura, un modo de falla, un estado de salud y cómo se prioriza una intervención. Es la referencia para DS (features), Backend (tablas) y Frontend (filtros del tablero).

> **Alcance (2026-09-20).** Esta taxonomía es una **referencia general de PdM**, y describe una planta más amplia que la del dataset del MVP. Conviene tenerlo presente antes de derivar enums o tablas de acá:
>
> | Pieza | La taxonomía describe | El dataset del MVP tiene |
> | --- | --- | --- |
> | Activos | Motores eléctricos de 4–5 HP y 100–300 HP, transmisiones, tableros de fuerza, bancos de condensadores | Máquinas de mecanizado: torno CNC, centro de mecanizado 5 ejes, fresadora, rectificadora, taladro, corte láser, corte plasma, sierra cinta, compresor de tornillo, sistema hidráulico |
> | Potencia | Caballos de fuerza (HP) | `potencia_nominal_kw` (4,0 a 75,0 kW); el dataset no tiene HP |
> | Modos de falla | Aislamiento de bobinado, picadura de pista, desalineación de poleas, pérdida de capacidad de condensador | Tres causas registradas: rodamiento, motor térmico y presión de bomba |
> | Instrumental | Megóhmetro, cámara térmica, pinza amperimétrica | Ocho columnas numéricas por lectura, sin metadata de instrumento |
>
> Estos desajustes **no son errores de este documento**: son la razón por la que [`DATA-MODEL.md`](./DATA-MODEL.md) propone enums que el dataset no puede poblar (ver el material de decisión del schema en la reunión). Decidir si esta taxonomía es *la planta que tenemos* o *el marco al que aspiramos* es una decisión pendiente del equipo, y de ella depende qué enums se implementan.

> **Los dos ejes de estado son la clave del §Categoría 5.** La taxonomía separa correctamente **estados operativos** (Operación Normal · Standby/Pausa · En Mantenimiento · Fuera de Servicio) de **nivel de salud** (Normal · Bajo Observación · Riesgo Elevado · Crítico/Falla Inminente). El dataset del MVP **mezcla los dos** en una sola columna, `target_estado_salud`, que tiene **cuatro valores** (verificados sobre el CSV canónico): `Normal` (63,2 %) · `Bajo_Observacion` (26,0 %) · `Riesgo_Critico` (8,6 %) · **`Parada_Mantenimiento`** (2,1 %). Por eso ningún enum de salud de 4 valores puede guardarlo: el cuarto valor es un **estado operativo**, no de salud. No existe ningún valor `FALLA` en esa columna — los 261 disparos se marcan en `falla_inicio_disparo`, que es otra columna.
>
> ⚠️ **Trampa de nombres:** el `Riesgo_Critico` del dataset **no** equivale al `Crítico / Falla Inminente` de esta taxonomía. Por nivel de degradación corresponde a **Riesgo Elevado**. Mapear por parecido de palabras pondría el estado en el nivel equivocado.
>
> 📌 Dato útil para el mapeo: `Parada_Mantenimiento` coincide **exactamente** con las 1.530 filas de `estado_operativo = 0`, y el pipeline de limpieza las eliminó (ver [`MODEL-LIMITATIONS.md`](./MODEL-LIMITATIONS.md) §4.8).

Modelo Ontológico y Taxonomía de Mantenimiento Predictivo (PdM)
Documento de Alineación Técnica y Funcional

## 1. Visión General del Modelo
```text
El presente modelo ontológico establece la taxonomía estándar y la arquitectura conceptual para la plataforma de Mantenimiento Predictivo (PdM). Separa y relaciona cuantitativa y cualitativamente las entidades físicas de la planta, sus magnitudes de condición, los métodos de ingesta de datos, los modos de falla, los estados de salud y los criterios de priorización operativa.

+-----------------+      +---------------------+      +---------------------+
| 1. ACTIVO       | ---> | 2. VARIABLE         | ---> | 3. CANAL DE CAPTURA |
| (Equipment)     |      | (Condition Metric)  |      | (Ingestion Channel) |
+-----------------+      +---------------------+      +---------------------+
                                                                 |
                                                                 v
+-----------------+      +---------------------+      +---------------------+
| 6. PRIORIZACIÓN | <--- | 5. ESTADO / LIFECYCLE | <--- | 4. COMPORTAMIENTO   |
| (Decision/WO)   |      | (RUL & Health)      |      | (Fault Mode)        |
+-----------------+      +---------------------+      +---------------------+
```

## 2. Taxonomía Estructurada del Sistema
### Categoría 1: Activos Industriales (Assets & Equipment)
Entidades físicas y jerarquía de equipamiento sujeto a monitoreo y conservación.

Activos Industriales
├── Sistemas de Potencia y Accionamiento
│   ├── Motores Eléctricos
│   │   ├── Motores de Baja Potencia (4–5 HP) [Estrategia: Run-to-Failure controlado]
│   │   └── Motores Críticos / Alta Potencia (100–300 HP) [Estrategia: PdM Intensivo]
│   ├── Sistemas de Aislamiento
│   │   ├── Bobinados de Estator y Rotor
│   │   └── Barniz Dieléctrico
│   └── Protecciones y Control
│       ├── Guardamotores y Relés Térmicos
│       ├── Contactores y Arrancadores Suaves
│       └── Variadores de Frecuencia (VFD)
├── Maquinaria de Mecanizado y Producción (Backlog NoCountry)
│   ├── Tornos y Fresadoras (Convencionales / CNC)
│   ├── Centros de Mecanizado CNC
│   └── Rectificadoras, Taladros Industriales y Equipos de Corte
├── Transmisiones y Elementos Mecánicos
│   ├── Componentes Rotativos
│   │   ├── Rodamientos (Pistas, Bolillas/Rodillos)
│   │   ├── Bujes y Reductores de Velocidad
│   │   └── Ejes y Husillos
│   ├── Transmisiones Flexibles / Continuas
│   │   ├── Correas (Tipo V, Dentadas)
│   │   └── Cadenas, Poleas y Piñones
│   └── Transporte de Material
│       ├── Cintas Transportadoras
│       ├── Roscas Sinfín / Tornillos Transportadores
│       └── Elevadores de Cangilones
├── Sistemas Auxiliares y de Fluidos
│   ├── Neumática e Hidráulica: Compresores, Bombas, Válvulas, Cilindros, Depósitos de Presión
│   └── Sistemas Térmicos: Calentadores Industriales, Resistencias, Quemadores, Intercambiadores
└── Infraestructura Eléctrica y Distribución
    ├── Tableros Eléctricos de Fuerza y Distribución
    ├── Barras Colectoras, Terminales y Clemas
    └── Bancos de Condensadores / Capacitores (Corrección de Factor de Potencia)

### Categoría 2: Variables de Condición y Parámetros (Metrics & Features)
Magnitudes físicas y operativas medidas de forma continua o discontinua en cada activo.

Tipo de Variable	Magnitud / Parámetro Físico	Unidad / Formato
Cinemática y Dinámica	Vibración global (RMS, Aceleración, Velocidad)

Espectro de Vibración (Análisis FFT)

Velocidad angular y posición (RPM, backlash)

Nivel acústico y ultrasonido estructural
	g, mm/s, m/s^2

Espectro Frecuencia/Amplitud

RPM,gradosdB, kHz

Térmica	Temperatura puntual de proceso/rodamiento

Gradiente térmico y diferencia entre fases (\Delta T)
	°C, K

\Delta T (°C)

Electromecánica	Consumo de corriente por fase (Amperaje)

Desbalance de fases, Tensión, Voltaje

Potencia activa, reactiva y Factor de Potencia (\cos \phi)
	A

V, \%

kW, kVAR

Dieléctrica	Resistencia de Aislamiento

Capacitancia

Impedancia
	M\Omega, G\Omega

\muF

\Omega

Operativa / Proceso	Horas acumuladas de funcionamiento (H_{op)

Ciclos de arranque/paro

Presión de trabajo y flujo/caudal
	Horas

Conteo

bar, PSI, L/min

### Categoría 3: Métodos y Canales de Captura (Data Ingestion Channels)
Mecanismos de adquisición e ingesta de datos en la plataforma.

Canales de Ingesta
├── 1. Telemetría Automática Continua (Sensores IoT Fijos)
│   ├── Acelerómetros Triaxiales Fijos (Vibración)
│   ├── Sondas PT100 / Termocuplas Integradas
│   ├── Transformadores de Corriente (CT) / Pinzas Fijas
│   └── Transmisores de Presión/RPM conectados a PLC / SCADA
├── 2. Inspección Periódica con Instrumental Portátil (Rondas de Campo)
│   ├── Termografía: Cámaras Térmicas Portátiles y Pistolas IR
│   ├── Pruebas Dieléctricas: Megóhmetro (Megger)
│   ├── Calidad de Energía: Pinza Amperimétrica Portátil y Medidor LCR
│   └── Análisis Acústico: Equipos de Ultrasonido y Escucha Sensorial
├── 3. Muestreo Robótico Autónomo (Human-in-the-Loop)
│   └── Rovers y Drones de Inspección (Captura Térmica, Visión Computacional, Audio)
└── 4. Registros Históricos y Gestión Manual
    └── Integración CMMS / ERP (Logs de mantenimiento, partes de avería, historial de repuestos)

### Categoría 4: Comportamientos y Modos de Falla (Behaviors & Fault Modes)
Patrones anómalos y procesos de degradación física identificados por los modelos.

    • Fallas Mecánicas:

        ◦ Rodamientos / Ejes: Picadura de pistas (spalling), desgaste de elementos rodantes, falta de lubricación, agarrotamiento, desbalance de masa, desalineación de ejes, holgura estructural.

        ◦ Transmisiones: Destensión de correas, desalineación de poleas/piñones, desgaste de dientes en cadenas/engranajes, atasco mecánico en roscas sinfín.

    • Fallas Eléctricas y Térmicas:

        ◦ Contactos / Distribución: Falsos contactos por vibración, sulfatación en terminales, arcos eléctricos, puntos calientes por alta resistencia.

        ◦ Bobinados / Aislamiento: Degeneración del barniz por sobretemperatura, corto entre espiras, pérdida de aislamiento a masa (derivación).

        ◦ Condensadores: Perforación del dieléctrico, pérdida de capacidad, desbalance de corrección reactiva.

    • Fallas de Proceso:

        ◦ Cavitación en bombas, sobrecarga por acumulación de material, fugas y caídas de presión en líneas neumáticas/hidráulicas.

### Categoría 5: Estados y Ciclos de Vida (States & Lifecycle)
Clasificación cuantitativa y cualitativa de la salud operativa de cada activo.

#### A. Estados Operativos de la Máquina
Operación Normal \quad\Big\vert{\quad Standby / Pausa \quad\Big\vert{\quad En Mantenimiento \quad\Big\vert{\quad Fuera de Servicio (Falla)
#### B. Nivel de Salud (Health Index)
Estado de Salud	Definición Técnica	Criterio de Acción
Normal / Saludable	Parámetros dentro de tolerancias nominales.	Monitoreo estándar.
Bajo Observación	Divergencias leves o tendencias crecientes en variables secundarias.	Incremento de frecuencia de ronda portátil.
Riesgo Elevado	Múltiples variables fuera de rango o coincidencia con patrones de falla.	Generación de Pre-Informe de Diagnóstico.
Crítico / Falla Inminente	Degradación acelerada con riesgo de daño catastrófico.	Recomendación de parada de emergencia.
#### C. Métricas Predictivas Temporales
    • RUL (Remaining Useful Life): Estimación de vida útil remanente expresada en horas de operación (H_{rem) o ciclos.

    • P_{falla(t): Probabilidad porcentual de ocurrencia de falla en una ventana temporal t (ej. 24h, 7días).

    • MTBF (Mean Time Between Failures): Tiempo medio histórico entre fallas por tipología de activo.

### Categoría 6: Matriz de Criticidad y Priorización (Priority Framework)
```text
La clasificación del activo combina su impacto productivo con el nivel de salud para activar la salida correspondiente del sistema:

                 +-------------------------------------------------+
                  |          CRITICIDAD DEL ACTIVO (Asset Class)   |
                  |  Cat. A (Crítico) | Cat. B (Medio) | Cat. C (Bajo)|
+-----------------+-------------------+----------------+--------------+
| SALUD: Normal   | Rutina            | Rutina         | Rutina       |
| SALUD: Riesgo   | Pre-informe HI-TL | Orden Planif.  | Inspección   |
| SALUD: Crítico  | Parada Emergencia | Parada Program.| Reemplazo    |
+-----------------+-------------------+----------------+--------------+

Flujo de Salida del Sistema:
    1. Notificación de Rutina: Inclusión automática en la siguiente ronda de inspección.

    2. Inspección Focalizada: Despacho de técnico/rover con instrumental específico (ej. prueba de Megóhmetro a Motor de 200 HP).

    3. Pre-Informe / Orden de Trabajo Planificada (Human-in-the-Loop): Validación obligatoria por parte del analista experto antes de la emisión de la Orden de Trabajo (WO) en el CMMS.

    4. Parada de Emergencia: Alerta de máxima prioridad ante riesgo inminente de daño catastrófico o seguridad.
```

## 3. Modelo Integrado de Flujo de Datos
```text
Toda interacción dentro de la plataforma responde a la siguiente cadena lógica de entidades:

Activo (Cat. A/B/C) \longrightarrow Variable / Parámetro \longrightarrow Canal de Ingesta \longrightarrow Modo de Falla \longrightarrow Estado / RUL \longrightarrow Validación Human-in-the-Loop
```

## 4. Control de Versión del Documento
    • [GEN] (Prefijo/Módulo): Se usa [GEN] porque es un documento transversal de arquitectura de información que sirve de mapa tanto para Data Science (modelos), Backend (tablas de BD) y Frontend (filtros del dashboard).
    • ONTOLOGY (Tipo de documento): Identifica que es una taxonomía / ontología / modelo de dominio.
    • TaxonomiaModeloPredictivo (Nombre): Indica claramente el contenido del archivo.
    • v1.0 (Versión): Primera versión oficial aprobada.


