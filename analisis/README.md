# Análisis — scripts de verificación y evaluación

Scripts de análisis sobre el dataset. Ninguno es código de producto: sirven para **medir** y para **poder verificar** lo que los documentos del repositorio afirman.

| Script | Qué hace | Documento que respalda |
| --- | --- | --- |
| [`verify-dataset-claims.py`](./verify-dataset-claims.py) | Audita el dataset crudo y el limpio: integridad, vocabulario de estados, distribución mensual, la fuga determinista, qué hace la limpieza, eventos borrados, ráfaga de fallas y conteo de anomalías inyectadas | [`../docs/MODEL-LIMITATIONS.md`](../docs/MODEL-LIMITATIONS.md) §§3.6, 3.7 y 4.1 bis |
| [`evaluate-baseline-honestly.py`](./evaluate-baseline-honestly.py) | Estima el techo real del baseline sin las columnas que filtran, evalúa **por evento** y compara contra el **mantenimiento por calendario** a igual presupuesto de alertas, con piso de azar | [`../docs/MODEL-LIMITATIONS.md`](../docs/MODEL-LIMITATIONS.md) §§4.2, 4.4 y 4.1 bis |
| [`markov-fallas.py`](./markov-fallas.py) | Dinámica de degradación con cadena de Markov: probabilidad por horizonte, RUL en cuantiles, test de la propiedad de Markov y cadenas por criticidad | [`informe-markov.md`](./informe-markov.md) · [`../docs/RUL-STRATEGY.md`](../docs/RUL-STRATEGY.md) |

## Requisitos

- Python 3.9+ con `numpy` y `pyarrow` (este último solo para leer el parquet limpio)
- Los datasets viven en **Git LFS**: `git lfs install && git lfs pull`
  - crudo: `datos/dataset_mantenimiento_predictivo_realista.csv`
  - limpio: `ml/datos/dataset_limpio.parquet`

## Uso

```bash
# auditoría del dataset y de la limpieza (todos los números citados en los docs)
python3 analisis/verify-dataset-claims.py

# techo del baseline, evaluación por evento y comparación contra el calendario
python3 analisis/evaluate-baseline-honestly.py

# dinámica de degradación (RUL extendido)
python3 analisis/markov-fallas.py                     # escribe informe-markov.md
```

Los dos primeros aceptan rutas explícitas con `--crudo` y `--limpio`; el segundo también acepta `--presupuestos` y `--semillas`.

## Advertencia

Dataset **sintético** (semilla 42): mide factibilidad del método, **no** desempeño en planta.

Dos cosas que estos scripts dejan explícitas, y que conviene tener presentes al leer cualquier métrica:

- **La etiqueta está codificada en dos features.** `potencia_consumida_kw` y `corriente_a` arrastran un sobreconsumo determinista del 15 % en las filas positivas, así que el target se recupera con una cuenta aritmética. Mientras esas columnas estén en la matriz, ninguna métrica mide capacidad predictiva.
- **Una métrica por fila no es una métrica por falla.** Cada evento aporta ~29 filas positivas, y con las fallas en ráfaga las ventanas se solapan: el recall por fila y el porcentaje de eventos detectados difieren por un factor de 3. Además, toda evaluación debería reportar el **piso del azar** al mismo presupuesto de alertas.

Sobre el análisis de Markov: los estados provienen de `target_estado_salud`, que **coincide con la etiqueta** de 48 h → sirve para describir la dinámica del dataset, **no** como modelo predictivo.

Limitaciones completas en [`../docs/MODEL-LIMITATIONS.md`](../docs/MODEL-LIMITATIONS.md).
