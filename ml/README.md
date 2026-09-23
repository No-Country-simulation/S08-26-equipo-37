# Mantenimiento Predictivo Industrial (PredictiveMaintenance)
### Proyecto de Analítica Avanzada, IIoT y Machine Learning para Maquinaria de Planta

Este repositorio contiene la arquitectura de datos, el diccionario oficial de variables y la guía metodológica para el desarrollo del modelo de **Mantenimiento Predictivo Industrial (MVP - Fase 1)**.

El dataset ha sido optimizado para reflejar la dinámica física y operativa de una planta de mecanizado con 25 máquinas industriales monitoreadas durante 4 meses (72.000 horas de telemetría continua), incorporando anomalías reales controladas para validar el pipeline de limpieza y eliminando cualquier fuga de datos (*Data Leakage*).

---

## 1. Alcance del Proyecto (MVP - Fase 1)

Conforme a los acuerdos de diseño y valor del negocio, el alcance de esta fase se concentra en dos pilares fundamentales:
1. **Alerta Temprana a 48 Horas (`target_falla_48h`):** Modelo de clasificación binaria supervisado sobre sensores físicos y odómetros para anticipar si un activo sufrirá una avería dentro de las próximas 48 horas.
2. **Matriz de Priorización Económica:** Algoritmo de toma de decisiones que jerarquiza las órdenes de trabajo considerando la probabilidad de falla predicha, la criticidad del equipo y su costo de parada por hora.

*(Nota: La regresión continua de RUL fino y la validación en tiempo real con datos de planta se abordarán en la Fase 2).*

---

## 2. Diccionario de Variables Oficial (30 Columnas)

El dataset consolidado (`dataset_mantenimiento_predictivo_realista.csv`) contiene **72.000 filas y 30 columnas** estructuradas en 6 bloques lógicos:

### A. Metadatos del Activo (Catálogo de Equipos de Planta)
1. **`fecha_hora`** *(datetime)*: Marca temporal de la lectura con frecuencia horaria (enero - abril 2026).
2. **`id_maquina`** *(string)*: Identificador único del equipo en fábrica (`M-01` a `M-25`).
3. **`tipo_equipo`** *(string)*: Familia funcional de máquina (Torno CNC, Centro de Mecanizado 5 Ejes, Fresadora Industrial, Rectificadora Cilíndrica/Plana, Taladro Industrial, Corte Láser Fibra, Corte Plasma HD, Sierra Cinta Industrial, Compresor de Tornillo, Sistema Hidráulico).
4. **`modelo`** *(string)*: Denominación técnica comercial del activo (ej. *Haas ST-30*, *DMG DMU 50*, *Atlas Copco GA 75*, *Rexroth CytroBox*).
5. **`linea_produccion`** *(string)*: Área de asignación productiva (*Linea_A_Mecanizado_Pesado*, *Linea_B_Mecanizado_Precision*, *Linea_C_Corte_Y_Perforado*, *Planta_Servicios_Auxiliares*).
6. **`antiguedad_anos`** *(int)*: Años de servicio ininterrumpido del equipo en planta (2 a 12 años).
7. **`criticidad`** *(string)*: Impacto sobre el flujo productivo global (*Alta*, *Media*, *Baja*).
8. **`costo_parada_hora_usd`** *(int)*: Pérdida financiera directa por cada hora de inactividad no programada ($300 a $3.000 USD/h).
9. **`potencia_nominal_kw`** *(float)*: Capacidad de placa instalada del motor o grupo hidráulico (4.0 a 75.0 kW).
10. **`marca`** *(string)*: Fabricante industrial del activo (Haas, Mazak, DMG Mori, Okuma, Bridgeport, Atlas Copco, Bosch Rexroth, etc.).

### B. Odómetros de Desgaste e Historial Operativo
11. **`horas_operacion_totales`** *(int)*: Odómetro acumulado de horas efectivas en marcha a lo largo de la vida útil del equipo.
12. **`ciclos_acumulados`** *(int)*: Conteo acumulado de piezas mecanizadas o ciclos de trabajo ejecutados.
13. **`horas_desde_ultimo_mantenimiento`** *(int)*: Horas de funcionamiento transcurridas desde la última orden de trabajo (se reinicia a 0 tras intervenir).
14. **`conteo_fallas_previas`** *(int)*: Historial acumulativo de paradas críticas sufridas por el equipo en el pasado.

### C. Telemetría de Sensores en Tiempo Real (Variables Predictoras / IIoT)
15. **`estado_operativo`** *(int)*: Estado funcional en la lectura (1 = máquina encendida en producción; 0 = máquina detenida por parada operativa, fin de semana o reparación).
16. **`carga_pct`** *(float)*: Porcentaje de esfuerzo mecánico aplicado sobre el cabezal o bomba (0.0% a 100.0%).
17. **`velocidad_rpm`** *(float)*: Velocidad de giro del husillo o motor principal (0 a 1.500 RPM).
18. **`voltaje_v`** *(float)*: Tensión de línea trifásica (nominal ~220 V con variaciones y transitorios).
19. **`corriente_a`** *(float)*: Consumo de corriente en Amperios (A). Aumenta con la carga y con la fricción por desgaste mecánico.
20. **`potencia_consumida_kw`** *(float)*: Potencia activa demandada en kW ($P = \sqrt{3} \cdot V \cdot I \cdot \cos\phi$).
21. **`temperatura_c`** *(float)*: Temperatura de rodamientos, bobinado o fluido hidráulico (°C).
22. **`vibracion_mms`** *(float)*: Velocidad RMS de vibración global del conjunto mecánico (mm/s).
23. **`presion_bar`** *(float)*: Presión del fluido hidráulico, lubricación o circuito neumático (bar).

### D. Señales de Planta y Alarmas SCADA / PLC *(Variable de Salida / Monitoreo)*
24. **`codigo_alarma_plc`** *(string)*: Código de advertencia registrado por el autómata de control (`SISTEMA_NORMAL`, `WARN_ANOMALIA_TENDENCIA`, `ALARM_VIB_CRITICA`, `ALARM_SOBRETEMPERATURA_MOTOR`, `ALARM_PRESION_ANORMAL`, `TRIP_PARADA_EMERGENCIA`, `ALARM_MAQUINA_APAGADA`).

### E. Eventos de Avería Industrial (Disparo vs. Convalecencia)
25. **`falla_inicio_disparo`** *(int)*: **[Evento de Disparo - 261 registros]** Marca con `1` únicamente la hora exacta en que ocurre el colapso del componente y se detiene la línea; `0` en el resto del tiempo.
26. **`falla_estado_causa`** *(string)*: **[Estado de Convalecencia - 1.661 registros]** Causa raíz que provocó la detención (`Fallo_Rodamiento`, `Fallo_Motor_Termico`, `Fallo_Presion_Bomba`, o `Ninguna`). Permanece activa durante toda la ventana de reparación en taller.

### F. Variables Objetivo para Machine Learning (Supervisión)
27. **`target_falla_48h`** *(int)*: **[Target Principal de Clasificación Binaria]** `1` si la máquina presentará una falla dentro de las siguientes 48 horas ($t \to t+48\text{h}$); `0` si permanecerá en estado operativo normal.
28. **`target_tipo_falla`** *(string)*: **[Target Multiclase]** Causa raíz de la falla inminente en la ventana de 48 horas (para preparación de refacciones).
29. **`target_rul_horas`** *(float)*: **[Target de Regresión / RUL]** Horas restantes exactas de vida útil hasta el colapso. Contiene `NaN` cuando la máquina está sana (>48h).
30. **`target_estado_salud`** *(string)*: **[Diagnóstico de Condición]** Estado operativo del activo (`Normal`, `Bajo_Observacion`, `Riesgo_Critico`, `Parada_Mantenimiento`).

---

## 3. Justificación Técnica: Disparo de Falla (261) vs. Convalecencia en Taller (1.661)

Para evitar confusiones en los modelos y justificar la física del dataset ante los evaluadores, se distingue claramente entre **Evento** y **Estado**:

```text
Evolución Temporal de un Activo:
[ Operación Normal ] ───> [ DISPARO DE ROTURA ] ───> [ PARADA EN TALLER (MTTR) ] ───> [ PUESTA A PUNTO ]
                                │                                    │
                         Hora exacta del                     Horas consecutivas
                             colapso                       esperando repuesto/reparando
                                │                                    │
                    falla_inicio_disparo = 1              falla_estado_causa = "Causa"
                        (261 eventos)                         (1.661 horas acumuladas)


# 🏭 Proyecto de Mantenimiento Predictivo - Área de Data Science

Bienvenido al módulo central de Inteligencia Artificial del proyecto. El objetivo de esta área es transformar la telemetría histórica de la planta en alertas tempranas de fallas para optimizar los tiempos de operación y reducir los costos de parada por averías mecánicas.

---

## 📌 1. Información General y Contexto Operativo

### 🎯 Objetivos del Negocio
* **Monitoreo en Tiempo Real:** Evaluar hora por hora las lecturas de los sensores para predecir si una máquina entrará en colapso dentro de una ventana crítica de 48 horas.
* **Optimización de Mantenimiento:** Pasar de un modelo reactivo (reparar cuando ya se rompió) a un modelo predictivo, aprovechando el "Índice de Salud" (0-100) para agendar revisiones técnicas preventivas.

### 🧪 Reglas de Negocio Aplicadas en la Limpieza
Durante la fase de curación de datos, se establecieron los siguientes criterios industriales para asegurar la fidelidad del dataset:
* **Valores Faltantes (0% Nulos):** Se eliminó el 2.5% de baches de señal en los sensores mediante técnicas de arrastre cronológico operativo (`ffill` y `bfill`).
* **Tratamiento del Estado Apagado (⚠️ BAJO REVISIÓN):** Inicialmente se removieron 1,530 horas muertas de planta (`estado_operativo == 0`). Sin embargo, una auditoría técnica posterior (v2.0) reveló que este filtro eliminó por error **130 de los 261 eventos de falla reales** (el 50% de los colapsos), ya que las máquinas suelen registrar la hora de parada justo en el colapso. Se corregirá en el siguiente sprint para duplicar los datos de entrenamiento.
* **Manejo Estratégico de Outliers:** Los picos críticos de vibración y temperatura se conservaron intactos debido a que representan las firmas físicas reales de los colapsos mecánicos de los tornos y compresores.

### 🗺️ El Mapa de Decisiones Analíticas
Para este dataset se evaluaron 4 horizontes predictivos posibles según la necesidad del negocio:
1. **`target_falla_48h` (Clasificación Binaria) -> *Camino Seleccionado*:** Responde a la pregunta inmediata: ¿La máquina va a fallar en las próximas 48 horas? (Sí/No). Ideal para encender las alarmas del Dashboard.
2. `target_tipo_falla` (Clasificación Multiclase): Determina qué componente específico va a fallar (Eléctrico, Rodamiento, Neumático, etc.).
3. `target_rul_horas` (Regresión Numérica): Estima el número de horas exactas de vida útil restante que le quedan al activo.
4. `target_estado_salud` (Clasificación Ordinal): Categoriza la severidad del desgaste en niveles (Normal, Bajo Observación, Riesgo Crítico).

---

## 📊 2. Ficha Técnica del Modelo Activo (Actualizado v2.0)
* **Algoritmo Seleccionado:** `LightGBM Classifier` (Gradient Boosting optimizado).
* **Target de Predicción:** `target_falla_48h` (Clasificación Binaria: 1 = Falla Inminente, 0 = Operación Normal).
* **Alineación de Columnas:** Matriz purificada de **41 columnas predictivas**. Se eliminaron las variables con *Data Leakage* (`codigo_alarma_plc`, `estado_operativo` y `corriente_a`) para garantizar que el modelo aprenda de la física real de los sensores y no de pistas artificiales del simulador.
* **Rendimiento Legítimo Obtenido:** **PR-AUC: 0.8311** y un **Recall del 87%** en el mes piloto de evaluación.

---

## 📁 3. Organización Interna del Módulo (`ml/`)
* `/datos`: Datasets históricos curados y limpios.
* `/notebooks/01_generacion`: Script de origen del dataset sintético inicial.
* `/notebooks/02_eda_limpieza`: Análisis Exploratorio de Datos y curación de sensores.
* `/notebooks/03_modelado`: Cuadernos de entrenamiento y ajuste del LightGBM.
* `/api`: Servidor predictivo en FastAPI encargado de exponer los endpoints de producción.

---

## 🛰️ 4. Contrato de API para el Backend (Actualizado v2.0)

* **Endpoint de Salud (`GET /health`):** Retorna `{"status": "healthy"}` si el modelo está cargado correctamente.
* **Endpoint de Inferencia (`POST /api/v1/predict/falla`):** El backend ya **NO** necesita calcular promedios ni desviaciones estándar móviles. Solo debe enviar una lista estructurada con las lecturas básicas de las últimas 12 horas. 
* *Nota de Arquitectura:* Los campos de telemetría eléctrica en tiempo real (`corriente_a` y `potencia_consumida_kw`) fueron desactivados de la lógica del modelo para neutralizar la fuga de datos analítica.

### 📋 Ejemplo de Payload de Entrada Simplificado (JSON esperado):
```json
{
  "id_maquina": "M-01",
  "tipo_equipo": "Torno CNC",
  "modelo": "CNC-Principal",
  "linea_produccion": "Mecanizado_Pesado",
  "antiguedad_anos": 5,
  "criticidad": "Alta",
  "costo_parada_hora_usd": 1500,
  "potencia_nominal_kw": 45.0,
  "marca": "BrandX",
  "horas_operacion_totales": 12450,
  "ciclos_acumulados": 8500,
  "horas_desde_ultimo_mantenimiento": 120,
  "conteo_fallas_previas": 2,
  "historial_sensores_12h": [
    {
      "carga_pct": 82.5,
      "voltaje_v": 400.0,
      "temperatura_c": 86.5,
      "vibracion_mms": 14.2,
      "presion_bar": 4.2,
      "vibracion_critica": 0,
      "temperatura_critica": 1,
      "mes": 4,
      "dia_semana": "Monday"
    }
  ]
}
```

### 📊 Ejemplo de Respuesta Enviada al Dashboard (Output JSON):
```json
{
  "id_maquina": "M-01",
  "falla_predicha_48h": 1,
  "probabilidad_falla": 0.8311,
  "score_dashboard": 83,
  "alerta_estado": "Riesgo crítico",
  "color_hex": "#e74c3c"
}
```
