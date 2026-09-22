# ADR 0006: Dónde viven los artefactos binarios

## Status

Propuesto — pendiente de decisión del equipo. Registrado el 2026-09-20.

## Context

El repositorio guarda dos clases de artefactos binarios:

- **Datasets**: `datos/dataset_mantenimiento_predictivo_realista.csv` (16,7 MB) y `ml/datos/dataset_limpio.parquet`, ambos en Git LFS.
- **Modelos**: `ml/api/models/modelo_predictivo_lightgbm.joblib` (344 KiB), en git.

El límite entre ambos era una regla **por ruta**: una ruta no listada en `.gitattributes` quedaba fuera de LFS y fuera de la validación, así que un archivo de datos podía entrar al historial como blob normal sin que nada lo advirtiera. Sacarlo después exige reescribir la historia, y el equipo decidió no hacerlo: el historial es el registro de lo que pasó y sirve para estar atentos, y la reescritura se reserva para casos extremos, como una credencial expuesta.

Hoy la regla es **por extensión** (`*.csv`, `*.parquet`) y `scripts/validate-artifacts.mjs` corre en cada pull request: falla cuando un artefacto de datos o modelo supera **512 KiB**, es decir cuando no pasó por LFS. Ese umbral no estaba registrado en ningún otro lado.

## Decision

1. **Los datasets y sus derivados viven en Git LFS**, rastreados por extensión y no por ruta.
2. **Los artefactos de modelo pueden vivir en git mientras pesen menos de 512 KiB.** Por encima de ese umbral se mueven a LFS.
3. **El umbral es 512 KiB** y lo verifica `npm run artifacts:validate` en cada pull request.
4. **La guarda no reemplaza la decisión humana.** Si un artefacto debe superar el umbral sin ir a LFS, se cambia este ADR, no se saltea el chequeo.

## Consequences

- La historia deja de crecer con datos, y el límite es verificable, no una regla que hay que recordar.
- LFS agrega un requisito de instalación por máquina (`DEVELOPMENT.md`) y consume cuota de almacenamiento en GitHub.
- Un modelo en LFS obligaría a `git lfs pull` para que el prototipo de `ml/api` lo cargue. Hoy pesa 344 KiB y no lo necesita.
- **Los notebooks quedan fuera de la guarda**: un `.ipynb` no es una extensión de datos y hoy uno pesa 1,9 MB por las salidas embebidas. Limpiarlas antes de commitear sigue siendo manual.
- Si el proyecto adopta un registry de modelos (MLflow u otro), este ADR se reemplaza.

## Alternatives considered

- **Reescribir la historia** para recuperar los 16,7 MB: el costo aceptado es que esos 16,7 MB quedan en el historial.
- **Todos los binarios en LFS, sin umbral**: obliga a `git lfs pull` para leer un artefacto de 344 KiB, fricción sin beneficio medible.
- **Vigilar por ruta** (`datos/`, `ml/datos/`): es el problema que este ADR resuelve.
- **Confiar en la disciplina, sin guarda**: una regla que depende de que alguien la recuerde no es una regla.
- **Un límite por cantidad de archivos o por tamaño total**: más difícil de explicar y de accionar que un umbral por archivo.
