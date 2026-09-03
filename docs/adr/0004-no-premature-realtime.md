# ADR 0004: Sin tiempo real prematuro

## Status

Aceptado — 2026-09-03.

## Context

Todavía no se conoce la frecuencia, volumen ni latencia requerida por los datos. “Datos de sensores” no implica por sí solo procesamiento en tiempo real.

## Decision

Comenzar con solicitudes HTTP y procesamiento por lotes o programado cuando sea necesario. No incorporar WebSockets, brokers ni streaming hasta que un caso validado defina latencia y volumen.

## Consequences

- La operación y las pruebas permanecen simples.
- La información puede no ser instantánea; la frecuencia se ajustará con evidencia.
- Si aparece una exigencia de latencia, se medirá primero el flujo actual y se decidirá el cambio mínimo.

## Alternatives considered

- WebSockets: descartados sin interacción bidireccional inmediata demostrada.
- Broker o plataforma de streaming: descartados sin volumen, desacoplamiento o garantías de entrega que los justifiquen.
