# ADR 0003: Next.js server-first

## Status

Aceptado — 2026-09-03.

## Context

Next.js ya reúne interfaz y backend del MVP. Duplicar esa capacidad con una SPA y una API separada aumentaría superficie y despliegues.

## Decision

Usar Server Components por defecto. Incorporar Client Components solo para estado, efectos o eventos del navegador; Server Actions para mutaciones internas y Route Handlers para APIs o integraciones externas. Validar entradas externas con Zod y mantener acceso a datos y negocio fuera de la UI.

## Consequences

- Menos JavaScript en el cliente y una única aplicación que operar.
- Los límites servidor/cliente deben permanecer explícitos.
- Una API separada se evaluará solo ante consumidores o requisitos independientes reales.

## Alternatives considered

- SPA cliente con API separada: descartada por complejidad sin beneficio actual.
- Componentes cliente por defecto: descartados porque amplían innecesariamente el código y los datos expuestos al navegador.
