# Análisis — RUL extendido (exploratorio)

Script que estima la dinámica de degradación con una **cadena de Markov** y deriva:

- probabilidad acumulada de falla a **48 h / 7 / 30 / 90 días / 1 año** (potencias de la matriz);
- **RUL en cuantiles** (p25, mediana, p75, p90) como tiempo hasta la **próxima** falla;
- test de la **propiedad de Markov** (hazard según el tiempo en la etapa);
- cadenas por **criticidad** (Alta / Media / Baja);
- **validación** contra las etiquetas reales (`target_falla_48h`);
- **conteos crudos**, para saber cuántos datos sostienen cada transición.

## Requisitos

- Python 3.9+ con `numpy`
- El dataset real (vive en **Git LFS**): `git lfs install && git lfs pull`

## Uso

```bash
python3 analisis/markov-fallas.py                     # usa datos/dataset_mantenimiento_predictivo_realista.csv
python3 analisis/markov-fallas.py /ruta/al.csv        # o una ruta explícita
```

Salida por defecto: `informe-markov.md` (se puede cambiar con `--out`).

## Documentos

- Resultado del análisis: [`informe-markov.md`](./informe-markov.md)
- Propuesta de producto derivada: [`../docs/RUL-STRATEGY.md`](../docs/RUL-STRATEGY.md)

## Advertencia

Dataset **sintético** (semilla 42): mide factibilidad del método, **no** desempeño en planta.
Los estados provienen de `target_estado_salud`, que **coincide con la etiqueta** de 48 h → sirve para describir la dinámica del dataset, no como modelo predictivo. Limitaciones completas en el §9 del informe.
