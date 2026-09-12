# ADR 0005: Convención de documentación del proyecto

## Status

Aceptado — 2026-09-11.

## Context

La documentación del proyecto vivía repartida en un espacio compartido con **límite de 10 links**, sin historial de cambios, sin revisión y con URLs que cambiaban según la versión del archivo. Los documentos de trabajo del equipo usaban prefijos y tipos en español (`[GEN] ALIGN …`, `[BK] ARCH …`) pensados para nombrar archivos en Drive/Notion, no rutas de repositorio.

El repositorio ya tenía documentación técnica (`PRODUCT.md`, `DATA-STRATEGY.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `DEVELOPMENT.md`, `SECURITY.md`) con **nombres en inglés y contenido en español**.

## Decision

1. **El repositorio es la fuente única de documentación.** El espacio compartido queda como portal de un solo enlace hacia [`docs/README.md`](../../docs/README.md).
2. **Nombres de archivo en inglés** (mayúsculas, con guiones: `SPEC-MVP-PARAMETERS.md`) y **contenido en español**, para mantener la consistencia con los documentos existentes y evitar tildes o `ñ` en las rutas.
3. **Sin versión en el nombre del archivo**: el historial lo guarda git y la versión se registra dentro del documento.
4. **Un solo lugar por tema**: cuando un documento reemplaza a otro, el reemplazado se retira en el mismo PR.
5. **Un índice obligatorio**: [`docs/README.md`](../../docs/README.md) lista qué documento contiene qué y su estado.
6. **Los cambios entran por Pull Request** con Conventional Commits (`docs(scope): …`).
7. Los **prefijos heredados** (`[GEN]`, `[DS]`, `[BK]`, `[FE]`, `[DEV]` y los tipos `ALIGN`/`SPEC`/`ARCH`/`MIN`/`GUIDE`/`DEC`/`REQ`) quedan documentados como referencia histórica en `docs/SCOPE.md` (Anexo C), pero no se usan para nombrar archivos del repositorio.

## Consequences

- Un solo punto de entrada y **URLs estables** por ruta de archivo; sin límite de documentos.
- Historial, autoría y revisión de cada cambio de documentación quedan auditables con git y los PRs.
- Las minutas se acumulan en un único archivo (`docs/MINUTES.md`, más nuevo arriba): **una reunión = un commit**.
- Requiere disciplina de mantenimiento: el índice debe actualizarse cuando se agrega o retira un documento.
- Las personas que no usan git igual pueden leer la documentación desde el navegador (el repositorio es público).

## Alternatives considered

- **Seguir con el espacio compartido**: descartado por el límite de links, la falta de historial y la ambigüedad de versiones.
- **Wiki de GitHub**: descartada porque no pasa por PR ni comparte el circuito de revisión del código.
- **Documentos en Google Docs enlazados desde el repositorio**: descartado porque el contenido seguiría fuera del control de versiones.
- **Nombres de archivo en español con los prefijos heredados**: descartado por incoherencia con la documentación existente del repo y por introducir tildes/`ñ` en rutas.
