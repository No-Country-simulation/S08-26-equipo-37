# ADR 0006: Dónde viven los artefactos binarios

## Status

Propuesto — pendiente de decisión del equipo. Registrado el 2026-09-20.

## Context

El repositorio guarda dos clases de artefactos binarios:

- **Datasets**: `datos/dataset_mantenimiento_predictivo_realista.csv` (16,7 MB) y `ml/datos/dataset_limpio.parquet`, ambos en Git LFS.
- **Modelos**: `ml/api/models/modelo_predictivo_lightgbm.joblib` (344 KiB), en git.

En el PR #44 un **duplicado del dataset de 16,7 MB entró como blob normal** en `ml/datos/`: `.gitattributes` solo matcheaba `datos/` y el workflow `Dataset` solo miraba `datos/**`, así que el archivo pasó sin validarse y quedó en el historial. Se decidió **no reescribir la historia** (el historial es el registro de lo que pasó; la reescritura se reserva para casos extremos como una credencial), así que la corrección mira hacia adelante: cortar el crecimiento y evitar que se repita.

Para eso se agregaron dos cosas en el PR de integridad del repositorio: la regla de LFS pasó a ser **por extensión** (`*.csv`, `*.parquet`) y se sumó `scripts/validate-artifacts.mjs`, que corre en cada PR y falla cuando un artefacto de datos o modelo supera **512 KiB**, es decir cuando no pasó por LFS.

Ese umbral es una decisión con consecuencias duraderas y hoy no está registrada en ningún lado. Este ADR la registra.

## Decision

1. **Los datasets y sus derivados viven en Git LFS.** `*.csv` y `*.parquet` se rastrean con LFS por extensión, no por ruta: la regla por ruta fue exactamente lo que dejó pasar el archivo de `ml/datos/` en #44.
2. **Los artefactos de modelo pueden vivir en git mientras pesen menos de 512 KiB.** Por encima de ese umbral se mueven a LFS.
3. **El umbral es 512 KiB** y lo verifica `npm run artifacts:validate` en cada pull request. La guarda lee tamaños del índice de git, así que no necesita `git-lfs` ni descargar objetos.
4. **La guarda no reemplaza la decisión humana.** Si un artefacto legítimamente debe superar el umbral sin ir a LFS, se cambia este ADR, no se saltea el chequeo.

## Consequences

- La historia del repositorio deja de crecer con datos, y el límite es explícito y verificable en lugar de depender de que alguien recuerde la regla.
- LFS agrega un requisito de instalación por máquina (documentado en `DEVELOPMENT.md`) y consume cuota de almacenamiento en GitHub.
- Un modelo en LFS obligaría a `git lfs pull` para que el prototipo de `ml/api` lo cargue. Hoy pesa 344 KiB y no lo necesita; el día que crezca, la guarda lo va a marcar y este ADR indica qué hacer.
- **Los notebooks quedan fuera de la guarda.** Un `.ipynb` no es una extensión de datos, y hoy uno pesa 1,9 MB por las salidas embebidas. Limpiar las salidas antes de commitear sigue siendo una práctica manual; si se vuelve un problema, corresponde otro ADR.
- Si el proyecto adopta un registry de modelos (MLflow u otro), este ADR se reemplaza por el que corresponda.

## Alternatives considered

- **Reescribir la historia del PR #44** para recuperar los 16,7 MB: descartado por decisión del equipo. El historial es el registro de lo que pasó y sirve para estar atentos; la reescritura se reserva para casos extremos. El costo aceptado es que esos 16 MB quedan en el historial.
- **Todos los binarios en LFS, sin umbral**: descartado porque obliga a `git lfs pull` para leer un artefacto de 344 KiB, y agrega fricción sin beneficio medible.
- **Vigilar por ruta** (`datos/`, `ml/datos/`) en lugar de por extensión: descartado porque la regla por ruta fue la causa directa del incidente.
- **Confiar en la disciplina del equipo, sin guarda**: descartado porque el error llegó a `main` con el CI en verde. Una regla que depende de que alguien la recuerde no es una regla.
- **Un límite por cantidad de archivos o por tamaño total del repositorio**: descartado por ser más difícil de explicar y de accionar que un umbral por archivo.
