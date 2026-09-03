# ADR 0001: Monolito modular

## Status

Aceptado — 2026-09-03.

## Context

El MVP necesita validar datos y flujo de usuario antes de asumir una escala o límites de dominio que todavía no existen.

## Decision

Mantener una sola aplicación Next.js y un solo despliegue. Organizar las capacidades que aparezcan como módulos internos, con dependencias explícitas, y dejar la infraestructura compartida mínima en `src/lib`.

## Consequences

- Desarrollo, pruebas y despliegue simples.
- Los límites internos requieren disciplina, pero pueden cambiar sin coordinación distribuida.
- Un módulo solo se separará si una necesidad operativa medida lo justifica.

## Alternatives considered

- Microservicios: descartados por costo operativo y límites de negocio aún inciertos.
- Código sin módulos: descartado porque dificulta aislar responsabilidades a medida que el producto crece.
