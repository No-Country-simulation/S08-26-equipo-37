# Documentación del proyecto

**Punto de entrada único.** Todo lo que antes vivía repartido en el espacio compartido (con límite de links) ahora vive acá: versionado, revisable por PR y con URL estable.

> **Regla:** los archivos van en **inglés** y el contenido en **español** (consistente con `PRODUCT.md`, `DATA-STRATEGY.md`, `ARCHITECTURE.md`). Cada tema tiene **un solo lugar**; si un documento se reemplaza, se retira.

---

## Producto y alcance

| Documento | Qué contiene | Estado |
| --- | --- | --- |
| [`PRODUCT.md`](./PRODUCT.md) | Hechos, hipótesis, decisiones abiertas y fuera de alcance | Existe — **actualizar** con las decisiones del 10/09 ([#25](../../issues/25)) |
| [`SPEC-MVP-PARAMETERS.md`](./SPEC-MVP-PARAMETERS.md) | Parámetros del MVP: target, features, partición, métrica, umbral, prioridad (plantilla de [#12](../../issues/12)) | **Nuevo** — se completa en el sprint meet |
| [`ROADMAP.md`](./ROADMAP.md) | Fases F0–F8 con criterio de salida | Existe |
| [`SCOPE.md`](./SCOPE.md) | Alcance, fundamentos de planta y decisiones aprobadas del MVP (documento principal) | **Nuevo** |
| [`RUL-STRATEGY.md`](./RUL-STRATEGY.md) | Potencial del **RUL extendido** (horizontes de 7/30/90 días) y estrategia de parámetros para un MVP más sofisticado | **Nuevo** — propuesta para decisión |

## Datos

| Documento | Qué contiene | Estado |
| --- | --- | --- |
| [`DATA-STRATEGY.md`](./DATA-STRATEGY.md) | Regla rectora, inventario mínimo, tipos de problema, integridad del dataset | Existe — **actualizar** ([#25](../../issues/25)) |
| [`../ml/README.md`](../ml/README.md) | Diccionario oficial de las 30 columnas del dataset | Existe (Dutaya) |
| [`../ml/notebooks/01_generacion/script_generacion_de_datos.ipynb`](../ml/notebooks/01_generacion/script_generacion_de_datos.ipynb) | Generador reproducible (SEED = 42) con la ground truth de anomalías | Existe (Dutaya) |
| [`DOMAIN-ONTOLOGY.md`](./DOMAIN-ONTOLOGY.md) | Taxonomía PdM: activos, variables, canales, modos de falla, estados, criticidad | **Nuevo** |

## Arquitectura y modelo de datos

| Documento | Qué contiene | Estado |
| --- | --- | --- |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Monolito modular server-first, flujos de request, workspace de ML (Python) y límites | Existe |
| [`adr/`](./adr/) | Decisiones de arquitectura: 0001 monolito modular · 0002 Prisma/PostgreSQL · 0003 server-first · 0004 sin tiempo real prematuro · **0005 convención de documentación** | Existe |
| [`DATA-MODEL.md`](./DATA-MODEL.md) | Esquema conceptual E-R, mapeo del dataset a entidades y flujo de trazabilidad | **Nuevo** |
| [`SECURITY.md`](./SECURITY.md) | Fronteras de confianza, secretos, base de datos | Existe |

## Trabajo y proceso

| Documento | Qué contiene | Estado |
| --- | --- | --- |
| [`BACKLOG.md`](./BACKLOG.md) | El backlog explicado: qué significa cada tarea, por qué existe y cómo se cierra | **Nuevo** |
| [`MINUTES.md`](./MINUTES.md) | Minutas compiladas (más nuevo arriba, append-only) | **Nuevo** |
| [`DEVELOPMENT.md`](./DEVELOPMENT.md) | Setup local, comandos, Git LFS, flujo de PR | Existe |
| [`OPEN-QUESTIONS.md`](./OPEN-QUESTIONS.md) | Preguntas abiertas priorizadas (P0/P1/P2) | Existe — **actualizar** ([#25](../../issues/25)) |
| [Tablero #505](https://github.com/orgs/No-Country-simulation/projects/505) | Estado del sprint: issues, campos y vistas | Fuera del repo (tablero) |

---

## Cómo se mantiene esta documentación

1. **Cambios por PR**, como el código: rama `docs/…`, Conventional Commits (`docs(scope): …`) y revisión.
2. **Una decisión = un registro**: si tiene alternativas o consecuencias duraderas, se agrega un **ADR** en [`adr/`](./adr/).
3. **Sin duplicados**: cuando un documento reemplaza a otro, el viejo se retira en el mismo PR y se deja el enlace.
4. **Trazabilidad**: cada documento referencia los issues relacionados (`Closes #12`, `Refs #25`).
5. **Minutas**: se **agregan arriba** en `MINUTES.md`; el historial completo queda en git.

## Migración en curso

El pasaje desde el espacio compartido se sigue en el issue [#37](../../issues/37):

- [x] **Etapa 1** — índice + `BACKLOG.md` + `SPEC-MVP-PARAMETERS.md` + `MINUTES.md` (PR [#38](../../pull/38))
- [x] **Etapa 2** — `SCOPE.md`, `DOMAIN-ONTOLOGY.md`, `DATA-MODEL.md` + [ADR 0005](./adr/0005-documentation-conventions.md)
- [ ] **Etapa 3** — retirar los documentos duplicados del espacio compartido y dejar **un solo link** hacia este índice
