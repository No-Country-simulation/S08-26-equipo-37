# Domain modules

Create a module only for a real vertical use case with domain behavior. Do not add empty folders or placeholder layers.

Each module should expose the smallest API needed by `src/app`, keep business rules out of React components, validate external input at its boundary, and access Prisma only through server-side code. Reuse an existing repository pattern before introducing another one.

Possible future areas include `machines`, `condition-monitoring`, `alerts`, and `maintenance`; these are candidates, not approved boundaries. Their names and data models depend on the real dataset and decisions in `docs/OPEN-QUESTIONS.md`.
