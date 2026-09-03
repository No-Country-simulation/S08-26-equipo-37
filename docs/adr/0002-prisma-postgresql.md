# ADR 0002: Prisma con PostgreSQL

## Status

Aceptado — 2026-09-03.

## Context

La aplicación necesita persistencia relacional, pero el dataset y el modelo de negocio definitivo todavía no están validados.

## Decision

Usar PostgreSQL como base de datos y Prisma para esquema, migraciones y acceso tipado desde código exclusivo del servidor. No crear modelos de negocio hasta disponer de datos y decisiones confirmadas.

## Consequences

- El esquema y sus cambios quedan versionados y validados.
- La aplicación depende de Prisma para el acceso habitual; SQL directo queda reservado para una necesidad demostrada.
- Prisma no se usa desde componentes de UI.

## Alternatives considered

- SQL manual como acceso principal: descartado porque agrega trabajo repetitivo sin una necesidad actual.
- Base documental: descartada porque no hay evidencia de que el modelo relacional sea insuficiente.
