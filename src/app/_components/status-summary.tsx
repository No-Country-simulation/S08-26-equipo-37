import type { DashboardSnapshot } from "../_data/dashboard";

const cards = [
  {
    key: "critical",
    label: "Riesgo crítico",
    helper: "Requieren revisión",
    className: "border-rose-400/20 bg-rose-400/[0.07] text-rose-200",
  },
  {
    key: "watch",
    label: "En observación",
    helper: "Seguir tendencia",
    className: "border-amber-300/20 bg-amber-300/[0.07] text-amber-100",
  },
  {
    key: "healthy",
    label: "Estado normal",
    helper: "Monitoreo habitual",
    className: "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-100",
  },
  {
    key: "maintenance",
    label: "En mantenimiento",
    helper: "Intervención activa",
    className: "border-sky-300/20 bg-sky-300/[0.07] text-sky-100",
  },
] as const;

export function StatusSummary({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <section aria-labelledby="estado-planta" className="scroll-mt-32" id="resumen">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
            Panorama operativo
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl lg:text-[2.75rem]">
            Qué necesita atención hoy
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Vista de ejemplo para priorizar revisiones y entender las señales de cada equipo en menos de un minuto.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 sm:justify-end sm:text-right">
          <span>{snapshot.scope}</span>
          <span aria-hidden="true" className="text-slate-700">
            •
          </span>
          <time>{snapshot.updatedAt}</time>
        </div>
      </div>

      <h2 className="sr-only" id="estado-planta">
        Resumen del estado de planta
      </h2>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <li className={`rounded-2xl border p-4 sm:p-5 ${card.className}`} key={card.key}>
            <div className="flex items-start justify-between gap-2">
              <data className="text-3xl font-semibold tracking-tight text-white" value={snapshot.counts[card.key]}>
                {snapshot.counts[card.key]}
              </data>
              <span aria-hidden="true" className="mt-1 size-2 rounded-full bg-current shadow-[0_0_16px_currentColor]" />
            </div>
            <p className="mt-4 text-sm font-semibold text-current">{card.label}</p>
            <p className="mt-1 text-xs text-slate-400">{card.helper}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-400">
        {snapshot.total} equipos dentro del alcance · {snapshot.note}
      </p>
    </section>
  );
}
