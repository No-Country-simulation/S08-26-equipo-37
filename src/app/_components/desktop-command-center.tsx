import Link from "next/link";

import {
  activityEvents,
  alerts,
  dashboardSummary,
  machines,
  priorityMachines,
} from "@/features/maintenance/mock-data";
import type { ActivityEvent, Alert, HealthStatus } from "@/features/maintenance/types";

import { MachineVisual } from "./machine-visual";
import { SensorTrend } from "./sensor-trend";
import { StatusBadge } from "./status-badge";

const SIMULATED_NOW = Date.parse("2026-04-27T10:00:00-03:00");

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

const alertPresentation: Record<
  Alert["severity"],
  { label: string; className: string }
> = {
  critical: {
    label: "Crítica",
    className: "border-rose-300/30 bg-rose-300/10 text-rose-100",
  },
  high: {
    label: "Alta",
    className: "border-orange-300/30 bg-orange-300/10 text-orange-100",
  },
  medium: {
    label: "Media",
    className: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  },
};

const alertStatusLabels: Record<Alert["status"], string> = {
  open: "Abierta",
  "under-review": "En evaluación",
  planned: "Planificada",
  "in-progress": "En ejecución",
  closed: "Cerrada",
};

const activityPresentation: Record<
  ActivityEvent["type"],
  { label: string; className: string }
> = {
  alert: { label: "Alerta", className: "bg-rose-300" },
  "status-change": { label: "Cambio de estado", className: "bg-amber-300" },
  inspection: { label: "Inspección", className: "bg-teal-300" },
  maintenance: { label: "Mantenimiento", className: "bg-sky-300" },
};

const riskBarStyles: Record<HealthStatus, string> = {
  healthy: "bg-emerald-300",
  watch: "bg-amber-300",
  critical: "bg-rose-400",
  maintenance: "bg-sky-300",
};

const machineById = new Map(machines.map((machine) => [machine.id, machine]));

function formatAge(timestamp: string) {
  const minutes = Math.max(0, Math.floor((SIMULATED_NOW - Date.parse(timestamp)) / 60_000));

  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h`;
}

export function DesktopCommandCenter() {
  const activeAlerts = alerts.filter((alert) => alert.status !== "closed");
  const attentionMachines = priorityMachines.slice(0, 3);
  const topMachine = attentionMachines[0];
  const summaryCards = [
    {
      label: "Equipos monitoreados",
      value: dashboardSummary.total,
      helper: "Alcance de esta demo",
      className: "border-white/10 bg-white/[0.035] text-slate-200",
    },
    {
      label: "Estado normal",
      value: dashboardSummary.counts.healthy,
      helper: "Sin señales prioritarias",
      className: "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-100",
    },
    {
      label: "En observación",
      value: dashboardSummary.counts.watch,
      helper: "Seguir tendencia",
      className: "border-amber-300/20 bg-amber-300/[0.07] text-amber-100",
    },
    {
      label: "Riesgo crítico",
      value: dashboardSummary.counts.critical,
      helper: "Revisión prioritaria",
      className: "border-rose-300/20 bg-rose-300/[0.08] text-rose-100",
    },
    {
      label: "En mantenimiento",
      value: dashboardSummary.counts.maintenance,
      helper: "Intervención en curso",
      className: "border-sky-300/20 bg-sky-300/[0.07] text-sky-100",
    },
    {
      label: "Alertas activas",
      value: dashboardSummary.activeAlerts,
      helper: "Pendientes de cierre",
      className: "border-sky-300/20 bg-sky-300/[0.07] text-sky-100",
    },
  ];

  return (
    <div className="hidden min-h-screen bg-[#06101c] text-slate-100 xl:block">
      <a className="skip-link" href="#desktop-content">
        Ir al centro de operaciones
      </a>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07111f]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-[1800px] items-center justify-between gap-8 px-8 py-4 2xl:px-12">
          <a className="flex items-center gap-4" href="#desktop-summary">
            <span className="grid size-11 place-items-center rounded-xl bg-teal-300 text-base font-black tracking-tight text-[#061019] shadow-[0_0_30px_rgba(94,234,212,0.18)]">
              PM
            </span>
            <span>
              <span className="block text-lg font-semibold tracking-tight text-white">Centro de operaciones</span>
              <span className="block text-sm text-slate-400">PredictiveMaintenance · Vista de planta</span>
            </span>
          </a>

          <nav aria-label="Secciones del centro de operaciones" className="flex items-center gap-2">
            <a className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white" href="#desktop-attention">
              Atención inmediata
            </a>
            <a className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white" href="#desktop-alerts">
              Alertas
            </a>
            <a className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white" href="#desktop-machines">
              Equipos
            </a>
          </nav>

          <div className="shrink-0 text-right">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-300/25 bg-teal-300/10 px-3 py-1 text-sm font-bold text-teal-100">
              <span aria-hidden="true" className="size-2 rounded-full bg-teal-300" />
              Demo simulada
            </span>
            <time className="mt-1.5 block text-sm text-slate-400" dateTime="2026-04-27T10:00:00-03:00">
              Corte estático · 27 abr 2026 · 10:00
            </time>
          </div>
        </div>
        <p className="border-t border-amber-200/10 bg-amber-200/[0.055] px-8 py-2 text-center text-sm font-medium text-amber-100/90">
          Datos, alertas y puntajes simulados. Este panel no está conectado a sensores, backend ni modelo predictivo.
        </p>
      </header>

      <main className="mx-auto max-w-[1800px] scroll-mt-36 px-8 py-8 2xl:px-12" id="desktop-content">
        <section aria-labelledby="desktop-title" className="scroll-mt-36" id="desktop-summary">
          <div className="flex items-end justify-between gap-8">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.17em] text-teal-300">Panorama operativo</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white 2xl:text-5xl" id="desktop-title">
                Qué requiere atención ahora
              </h1>
              <p className="mt-3 max-w-3xl text-lg leading-7 text-slate-300">
                Estado global, prioridades y señales principales para decidir la próxima revisión de campo.
              </p>
            </div>
            <p className="max-w-md text-right text-sm leading-6 text-slate-400">
              Las recomendaciones son orientativas y requieren validación humana antes de cualquier intervención.
            </p>
          </div>

          <ul className="mt-7 grid grid-cols-3 gap-3 xl:grid-cols-6">
            {summaryCards.map((card) => (
              <li className={`rounded-2xl border p-5 ${card.className}`} key={card.label}>
                <data className="block text-4xl font-semibold tabular-nums tracking-tight text-white" value={card.value}>
                  {card.value}
                </data>
                <p className="mt-4 text-base font-bold text-current">{card.label}</p>
                <p className="mt-1 text-sm leading-5 text-slate-400">{card.helper}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="desktop-attention-title" className="mt-10 scroll-mt-36" id="desktop-attention">
          <div className="mb-5 flex items-end justify-between gap-6">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.17em] text-rose-300">Atención inmediata</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight text-white" id="desktop-attention-title">
                Primeros equipos a revisar
              </h2>
            </div>
            <p className="text-base text-slate-400">Orden ilustrativo según índice demo</p>
          </div>

          <ol className="grid grid-cols-3 gap-5">
            {attentionMachines.map((machine, index) => (
              <li className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a1828] shadow-xl shadow-black/20" key={machine.id}>
                <div className="relative h-40 border-b border-white/10 bg-[#091827] 2xl:h-48">
                  <MachineVisual className="size-full" label={`${machine.type} ${machine.id}`} visual={machine.visual} />
                  <span className="absolute left-4 top-4 rounded-full border border-rose-200/25 bg-[#07111f]/90 px-3 py-1.5 text-sm font-bold text-rose-100">
                    Prioridad #{index + 1}
                  </span>
                  <span className="absolute right-4 top-4 rounded-xl bg-[#07111f]/90 px-3 py-2 text-right shadow-lg">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Índice demo</span>
                    <data className="block text-3xl font-bold tabular-nums text-white" value={machine.riskScore}>
                      {machine.riskScore}
                    </data>
                  </span>
                </div>

                <div className="p-5 2xl:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-sm font-bold text-teal-300">{machine.id}</p>
                      <h3 className="mt-1 text-xl font-bold text-white 2xl:text-2xl">{machine.name}</h3>
                      <p className="mt-1 text-sm text-slate-400">{machine.sector}</p>
                      <p className="mt-2 text-sm font-semibold text-slate-300">
                        Criticidad {machine.criticality.toLowerCase()}
                      </p>
                    </div>
                    <StatusBadge label={machine.statusLabel} status={machine.status} />
                  </div>

                  <div className="mt-5 rounded-2xl border border-amber-200/15 bg-amber-200/[0.055] p-4">
                    <p className="text-sm font-bold text-amber-100">Señal principal</p>
                    <p className="mt-1 text-base leading-6 text-slate-200">{machine.signal}</p>
                  </div>

                  <p className="mt-4 text-base leading-6 text-slate-300">{machine.recommendation}</p>
                  <Link
                    className="mt-4 inline-flex min-h-11 items-center rounded-lg font-bold text-teal-300 hover:text-teal-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
                    href={`/machines/${machine.id}?from=desktop-attention`}
                  >
                    Ver detalle y señales →
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-10 grid grid-cols-12 gap-6">
          <section
            aria-labelledby="desktop-alerts-title"
            className="col-span-7 scroll-mt-36 rounded-3xl border border-white/10 bg-[#091624] p-6"
            id="desktop-alerts"
          >
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.17em] text-rose-300">Alertas activas</p>
                <h2 className="mt-1 text-2xl font-semibold text-white" id="desktop-alerts-title">
                  Requieren seguimiento humano
                </h2>
              </div>
              <span className="rounded-full bg-rose-300/10 px-3 py-1 text-base font-bold text-rose-100">
                {activeAlerts.length} activas
              </span>
            </div>

            <ol className="mt-5 divide-y divide-white/[0.07]">
              {activeAlerts.map((alert, index) => {
                const machine = machineById.get(alert.machineId);
                const severity = alertPresentation[alert.severity];

                return (
                  <li key={alert.id}>
                    <Link
                      className="-mx-3 grid grid-cols-[7.5rem_minmax(0,1fr)_5rem] items-center gap-5 rounded-xl px-3 py-4 transition-colors hover:bg-white/[0.045] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
                      href={`/machines/${alert.machineId}?from=desktop-alerts`}
                    >
                      <span className={`rounded-xl border px-3 py-2 text-center text-sm font-bold ${severity.className}`}>
                        #{index + 1} · {severity.label}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <h3 className="text-lg font-bold text-white">{alert.title}</h3>
                          <span className="text-sm font-semibold text-slate-400">{alertStatusLabels[alert.status]}</span>
                        </div>
                        <p className="mt-1 text-base text-slate-200">
                          <span className="font-mono font-bold text-teal-300">{alert.machineId}</span>
                          {machine ? ` · ${machine.name}` : ""} · {alert.description}
                        </p>
                      </div>
                      <time className="text-right text-base font-bold tabular-nums text-slate-300" dateTime={alert.timestamp}>
                        hace {formatAge(alert.timestamp)}
                      </time>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-labelledby="desktop-activity-title" className="col-span-5 rounded-3xl border border-white/10 bg-[#091624] p-6">
            <p className="text-sm font-bold uppercase tracking-[0.17em] text-sky-300">Actividad reciente</p>
            <h2 className="mt-1 text-2xl font-semibold text-white" id="desktop-activity-title">
              Últimos cambios registrados
            </h2>

            <ol className="mt-5 space-y-4">
              {activityEvents.slice(0, 5).map((event) => {
                const machine = machineById.get(event.machineId);
                const presentation = activityPresentation[event.type];

                return (
                  <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3" key={event.id}>
                    <span aria-hidden="true" className={`mt-2 size-2.5 rounded-full ${presentation.className}`} />
                    <div>
                      <p className="text-base font-bold text-white">{event.title}</p>
                      <p className="mt-0.5 text-sm leading-5 text-slate-400">
                        {presentation.label} · {machine?.name ?? event.machineId} · {event.detail}
                      </p>
                    </div>
                    <time className="text-sm font-semibold tabular-nums text-slate-400" dateTime={event.timestamp}>
                      {timeFormatter.format(new Date(event.timestamp))}
                    </time>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        {topMachine ? (
          <section aria-labelledby="desktop-trends-title" className="mt-6 rounded-3xl border border-white/10 bg-[#091624] p-6">
            <div className="grid grid-cols-[minmax(15rem,0.7fr)_minmax(0,2.3fr)] items-center gap-6">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.17em] text-teal-300">Señales prioritarias</p>
                <h2 className="mt-1 text-2xl font-semibold text-white" id="desktop-trends-title">
                  {topMachine.id} · {topMachine.name}
                </h2>
                <p className="mt-3 text-base leading-6 text-slate-300">{topMachine.signal}</p>
                <p className="mt-3 text-sm leading-5 text-slate-400">
                  Lecturas recientes simuladas. Escala visual normalizada y huecos preservados.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {topMachine.sensors.slice(0, 3).map((sensor) => (
                  <SensorTrend key={sensor.key} trend={sensor} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section aria-labelledby="desktop-machines-title" className="mt-10 scroll-mt-36" id="desktop-machines">
          <div className="mb-5 flex items-end justify-between gap-6">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.17em] text-teal-300">Mapa visual</p>
              <h2 className="mt-1 text-3xl font-semibold text-white" id="desktop-machines-title">
                Estado de los equipos
              </h2>
            </div>
            <p className="text-base text-slate-400">Puntaje 0–100 ilustrativo · no es una probabilidad real</p>
          </div>

          <ul className="grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-4">
            {machines.map((machine) => (
              <li
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a1828] transition-colors hover:border-teal-300/30 focus-within:border-teal-300/50"
                id={`desktop-machine-${machine.id}`}
                key={machine.id}
              >
                <article className="h-full">
                  <Link
                    className="group grid h-full grid-cols-[8.5rem_minmax(0,1fr)] transition-colors hover:bg-white/[0.035] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal-300"
                    href={`/machines/${machine.id}?from=desktop-machines`}
                  >
                    <MachineVisual className="h-full min-h-56 w-full rounded-none" label={`${machine.type} ${machine.id}`} visual={machine.visual} />
                    <div className="flex min-w-0 flex-col p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-bold text-teal-300">{machine.id}</p>
                          <h3 className="mt-1 break-words text-lg font-bold leading-snug text-white">{machine.name}</h3>
                          <p className="mt-1 break-words text-sm leading-snug text-slate-400">{machine.type}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-sm font-bold text-slate-300">
                          {machine.criticality}
                        </span>
                      </div>

                      <div className="mt-4">
                        <StatusBadge label={machine.statusLabel} status={machine.status} />
                      </div>

                      <div className="mt-auto pt-5">
                        <div className="flex items-end justify-between gap-4">
                          <span className="text-sm font-semibold text-slate-400">Índice demo</span>
                          <data className="text-2xl font-bold tabular-nums text-white" value={machine.riskScore}>
                            {machine.riskScore}
                            <span className="text-sm text-slate-400">/100</span>
                          </data>
                        </div>
                        <div
                          aria-label={`Índice de atención simulado ${machine.riskScore} de 100`}
                          className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]"
                          role="img"
                        >
                          <span className={`block h-full rounded-full ${riskBarStyles[machine.status]}`} style={{ width: `${machine.riskScore}%` }} />
                        </div>
                        <time className="mt-3 block text-sm text-slate-400" dateTime={machine.updatedAt}>
                          Actualizada {timeFormatter.format(new Date(machine.updatedAt))}
                        </time>
                      </div>
                    </div>
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="mx-auto mt-4 flex max-w-[1800px] items-center justify-between border-t border-white/10 px-8 py-7 text-sm text-slate-400 2xl:px-12">
        <span>PredictiveMaintenance · MVP visual con datos simulados</span>
        <span>Soporte a la decisión · ninguna acción automática</span>
      </footer>
    </div>
  );
}
