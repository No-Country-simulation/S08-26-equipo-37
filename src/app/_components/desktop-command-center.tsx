import Link from "next/link";
import type { ReactNode } from "react";

import type { ActivityEvent, Alert, HealthStatus } from "@/features/maintenance/types";
import type { DashboardReadModel } from "@/modules/maintenance/types";

import { MachineImage } from "./machine-image";
import { SensorTrend } from "./sensor-trend";
import { StatusBadge } from "./status-badge";

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

const alertPresentation: Record<Alert["severity"], { label: string; className: string }> = {
  critical: { label: "Crítica", className: "text-rose-700" },
  high: { label: "Alta", className: "text-orange-800" },
  medium: { label: "Media", className: "text-amber-800" },
};

const alertStatusLabels: Record<Alert["status"], string> = {
  open: "Abierta",
  "under-review": "En evaluación",
  planned: "Planificada",
  "in-progress": "En ejecución",
  closed: "Cerrada",
};

const activityStyles: Record<ActivityEvent["type"], string> = {
  alert: "bg-rose-600",
  "status-change": "bg-amber-600",
  inspection: "bg-slate-500",
  maintenance: "bg-sky-600",
};

const riskBarStyles: Record<HealthStatus, string> = {
  healthy: "bg-emerald-600",
  watch: "bg-amber-600",
  critical: "bg-rose-600",
  maintenance: "bg-sky-600",
};

export function DesktopCommandCenter({ data, userMenu }: { data: DashboardReadModel; userMenu: ReactNode }) {
  const { activityEvents, alerts, dashboardSummary, machines, priorityMachines, canViewAlerts, canViewActivity } = data;
  const activeAlerts = alerts.filter((alert) => alert.status !== "closed");
  const [topMachine, ...nextMachines] = priorityMachines.slice(0, 3);
  const summary = [
    { label: "Equipos", value: dashboardSummary.total, color: "bg-slate-400" },
    { label: "Normales", value: dashboardSummary.counts.healthy, color: "bg-emerald-600" },
    { label: "En observación", value: dashboardSummary.counts.watch, color: "bg-amber-600" },
    { label: "Riesgo crítico", value: dashboardSummary.counts.critical, color: "bg-rose-600" },
    { label: "En mantenimiento", value: dashboardSummary.counts.maintenance, color: "bg-sky-600" },
    { label: "Alertas activas", value: canViewAlerts ? dashboardSummary.activeAlerts : null, color: "bg-slate-400" },
  ];

  return (
    <div className="hidden min-h-screen bg-[#f3f5f7] text-slate-900 xl:block">
      <a className="skip-link" href="#desktop-content">Ir al centro de operaciones</a>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-18 max-w-[1600px] items-center justify-between gap-8 px-8 2xl:px-12">
          <a className="flex items-center gap-3" href="#desktop-summary">
            <span className="grid size-10 place-items-center rounded border border-slate-300 font-mono text-sm font-bold tracking-tighter text-slate-900">PM</span>
            <span>
              <span className="block text-sm font-semibold tracking-tight text-slate-900">PredictiveMaintenance</span>
              <span className="block text-xs text-slate-600">Centro de operaciones</span>
            </span>
          </a>
          <nav aria-label="Secciones del centro de operaciones" className="flex gap-6 text-sm font-medium text-slate-600">
            <a className="inline-flex min-h-11 items-center hover:text-slate-900" href="#desktop-attention">Prioridades</a>
            <a className="inline-flex min-h-11 items-center hover:text-slate-900" href="#desktop-machines">Equipos</a>
            <a className="inline-flex min-h-11 items-center gap-2 hover:text-slate-900" href="#desktop-alerts">Alertas <span className="font-mono text-xs text-slate-700">{activeAlerts.length.toString().padStart(2, "0")}</span></a>
          </nav>
          {userMenu}
        </div>
        <p className="border-t border-slate-200 bg-slate-50 px-8 py-2 text-center text-xs text-slate-600">Datos y puntajes simulados · Sin conexión a sensores ni modelo predictivo · Ninguna intervención automática</p>
      </header>

      <main className="mx-auto max-w-[1600px] scroll-mt-32 px-8 py-8 2xl:px-12" id="desktop-content">
        <section aria-labelledby="desktop-title" className="scroll-mt-32" id="desktop-summary">
          <div className="flex items-end justify-between gap-8">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900" id="desktop-title">Estado de planta</h1>
              <p className="mt-2 text-sm text-slate-600">{dashboardSummary.total} {dashboardSummary.total === 1 ? "equipo" : "equipos"} en seguimiento · {dashboardSummary.highCriticality} de criticidad alta</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-600">Corte de los datos simulados</p>
              <time className="mt-1 block font-mono text-sm tabular-nums text-slate-700" dateTime="2026-04-27T10:00:00-03:00">27 ABR 2026 / 10:00</time>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-6 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-white py-5">
            {summary.map((item) => (
              <div className="px-5" key={item.label}>
                <dt className="flex items-center gap-2 text-xs text-slate-600"><span aria-hidden="true" className={`size-1.5 rounded-full ${item.color}`} />{item.label}</dt>
                <dd className="mt-2 font-mono text-3xl tabular-nums tracking-tight text-slate-900">{item.value === null ? "—" : item.value.toString().padStart(2, "0")}</dd>
              </div>
            ))}
          </dl>
        </section>

        {!machines.length ? <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">No hay equipos habilitados para tu acceso</h2>
          <p className="mt-2 text-sm text-slate-600">Consultá tus ámbitos y vigencias o contactá a quien administra los accesos.</p>
          <Link className="mt-3 inline-flex min-h-11 items-center font-medium text-teal-700 hover:text-teal-800" href="/profile">Ver mis accesos →</Link>
        </section> : null}

        {machines.length ? <section aria-labelledby="desktop-attention-title" className="mt-8 scroll-mt-32" id="desktop-attention">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900" id="desktop-attention-title">Equipos prioritarios</h2>
            <p className="text-xs text-slate-600">Orden ilustrativo según índice demo</p>
          </div>
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">
            {topMachine ? (
              <article className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
                  <span className="flex items-center gap-3 text-xs text-slate-700"><span className="font-mono text-rose-700">01</span> Primera revisión</span>
                  <StatusBadge label={topMachine.statusLabel} status={topMachine.status} />
                </div>
                <div className="px-6 pt-5">
                  <div className="flex items-center justify-between gap-5">
                    <div>
                      <p className="font-mono text-sm text-slate-600">{topMachine.id} <span className="text-slate-600">/</span> {topMachine.model}</p>
                      <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{topMachine.name}</h3>
                      <p className="mt-2 text-xs text-slate-600">{topMachine.sector} · Criticidad {topMachine.criticality.toLowerCase()}</p>
                    </div>
                    <MachineImage className="h-24 w-40 shrink-0" image={topMachine.image} label={`${topMachine.type} ${topMachine.id}`} visual={topMachine.visual} />
                  </div>
                  <p className="mt-5 border-l-2 border-rose-600/60 pl-3 text-sm leading-6 text-slate-700">{topMachine.signal}</p>
                  <div className="mt-5 grid grid-cols-3 gap-3">{topMachine.sensors.slice(0, 3).map((sensor) => <SensorTrend key={sensor.key} trend={sensor} />)}</div>
                  <p className="mt-3 text-[11px] text-slate-600">Lecturas simuladas · Escala relativa por sensor · Huecos preservados</p>
                  <p className="my-5 text-sm leading-6 text-slate-700"><span className="font-medium text-slate-900">Revisión sugerida: </span>{topMachine.recommendation}</p>
                </div>
                <div className="flex items-center justify-between gap-5 border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <div className="flex items-baseline gap-2"><data className="font-mono text-2xl tabular-nums text-slate-900" value={topMachine.riskScore}>{topMachine.riskScore}</data><span className="text-xs text-slate-600">/100 · Índice demo</span></div>
                  <Link className="inline-flex min-h-11 items-center justify-center gap-5 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800" href={`/machines/${topMachine.id}?from=desktop-attention`}>Revisar equipo <span aria-hidden="true">↗</span></Link>
                </div>
              </article>
            ) : null}
            <div className="flex flex-col rounded-lg border border-slate-200 bg-white">
              <h3 className="border-b border-slate-200 px-5 py-4 text-sm font-medium text-slate-700">Siguientes en la revisión</h3>
              <ol className="divide-y divide-slate-200" start={2}>
                {nextMachines.map((machine, index) => (
                  <li key={machine.id}>
                    <Link className="group block px-5 py-5 hover:bg-slate-50" href={`/machines/${machine.id}?from=desktop-attention`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs text-slate-600">{(index + 2).toString().padStart(2, "0")} <span className="mx-2 text-slate-600">/</span> {machine.id}</span>
                        <StatusBadge label={machine.statusLabel} status={machine.status} />
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <MachineImage className="h-14 w-20 shrink-0" image={machine.image} label={`${machine.type} ${machine.id}`} visual={machine.visual} />
                        <div className="min-w-0"><h4 className="text-base font-semibold text-slate-900 group-hover:text-teal-800">{machine.name}</h4><p className="mt-1 text-xs text-slate-600">{machine.model}</p></div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{machine.signal}</p>
                      <div className="mt-4 flex items-center justify-between text-xs">
                        <span className="text-slate-600">Índice demo <data className="ml-2 font-mono text-base text-slate-900" value={machine.riskScore}>{machine.riskScore}</data><span className="ml-1">/100</span></span>
                        <span className="font-medium text-teal-700">Ver detalle <span aria-hidden="true">↗</span></span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>
              <p className="mt-auto border-t border-slate-200 px-5 py-4 text-xs leading-5 text-slate-600">Las señales requieren validación humana antes de cualquier intervención.</p>
            </div>
          </div>
        </section> : null}

        <section aria-labelledby="desktop-machines-title" className="mt-8 scroll-mt-32" id="desktop-machines">
          <div className="mb-4 flex items-center justify-between gap-6">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900" id="desktop-machines-title">Inventario de equipos <span className="ml-2 font-mono text-sm font-normal text-slate-600">{machines.length.toString().padStart(2, "0")}</span></h2>
            <p className="text-xs text-slate-600">Índice demo 0–100 · No es una probabilidad de falla</p>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Equipos del corte simulado, estado, criticidad, índice de atención y última actualización.</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                <tr>{["Equipo", "Sector", "Estado", "Criticidad", "Índice demo", "Actualización"].map((heading) => <th className="px-5 py-3 font-medium" key={heading} scope="col">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {machines.map((machine) => (
                  <tr className="scroll-mt-32 hover:bg-slate-50 focus-within:bg-slate-50" id={`desktop-machine-${machine.id}`} key={machine.id}>
                    <th className="px-5 py-3 font-normal" scope="row">
                      <Link className="group flex min-h-11 items-center gap-3 rounded-sm" href={`/machines/${machine.id}?from=desktop-machines`}>
                        <MachineImage className="h-11 w-16 shrink-0" image={machine.image} label={`${machine.type} ${machine.id}`} visual={machine.visual} />
                        <span><span className="block font-mono text-[11px] text-slate-600">{machine.id}</span><span className="mt-0.5 block font-medium text-slate-900 group-hover:text-teal-800">{machine.name} <span aria-hidden="true" className="ml-1 text-slate-500 group-hover:text-teal-800">↗</span></span></span>
                      </Link>
                    </th>
                    <td className="max-w-56 px-5 py-3 text-xs leading-5 text-slate-600">{machine.sector}</td>
                    <td className="px-5 py-3"><StatusBadge label={machine.statusLabel} status={machine.status} /></td>
                    <td className="px-5 py-3 text-xs text-slate-700">{machine.criticality}</td>
                    <td className="px-5 py-3"><div className="flex items-center gap-3"><data className="w-6 text-right font-mono text-sm tabular-nums text-slate-900" value={machine.riskScore}>{machine.riskScore}</data><span aria-hidden="true" className="h-1 w-16 overflow-hidden bg-slate-200"><span className={`block h-full ${riskBarStyles[machine.status]}`} style={{ width: `${machine.riskScore}%` }} /></span></div></td>
                    <td className="px-5 py-3"><time className="font-mono text-xs tabular-nums text-slate-600" dateTime={machine.updatedAt}>{timeFormatter.format(new Date(machine.updatedAt))}</time></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-8 grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-5">
          <section aria-labelledby="desktop-alerts-title" className="scroll-mt-32 rounded-lg border border-slate-200 bg-white" id="desktop-alerts">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 className="text-base font-semibold text-slate-900" id="desktop-alerts-title">Alertas activas</h2><span className="font-mono text-xs text-slate-600">{activeAlerts.length.toString().padStart(2, "0")}</span></div>
            <ol className="divide-y divide-slate-200">
              {activeAlerts.map((alert) => {
                const severity = alertPresentation[alert.severity];
                return (
                  <li key={alert.id}>
                    <Link className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-start gap-3 px-5 py-4 hover:bg-slate-50" href={`/machines/${alert.machineId}?from=desktop-alerts`}>
                      <span className="pt-0.5 font-mono text-xs text-slate-700">{alert.machineId}</span>
                      <div>
                        <h3 className="text-sm font-medium text-slate-900">{alert.title}</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-600">{alert.description}</p>
                        <p className="mt-2 text-xs"><span className={severity.className}>{severity.label}</span><span className="mx-2 text-slate-600">/</span><span className="text-slate-600">{alertStatusLabels[alert.status]}</span></p>
                      </div>
                      <time className="pt-0.5 font-mono text-xs tabular-nums text-slate-600" dateTime={alert.timestamp}>{timeFormatter.format(new Date(alert.timestamp))}</time>
                    </Link>
                  </li>
                );
              })}
            </ol>
            {!activeAlerts.length ? <p className="px-5 py-4 text-sm text-slate-600">{canViewAlerts ? "No hay alertas activas en los equipos habilitados." : "No tenés acceso a alertas en estos equipos."}</p> : null}
          </section>
          <section aria-labelledby="desktop-activity-title" className="rounded-lg border border-slate-200 bg-white">
            <h2 className="border-b border-slate-200 px-5 py-4 text-base font-semibold text-slate-900" id="desktop-activity-title">Actividad reciente</h2>
            <ol className="divide-y divide-slate-200 px-5">
              {activityEvents.slice(0, 5).map((event) => (
                <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 py-4" key={event.id}>
                  <span aria-hidden="true" className={`mt-1.5 size-1.5 rounded-full ${activityStyles[event.type]}`} />
                  <div><p className="text-sm font-medium text-slate-700">{event.title}</p><p className="mt-1 text-xs leading-5 text-slate-600"><span className="font-mono">{event.machineId}</span> · {event.detail}</p></div>
                  <time className="pt-0.5 font-mono text-xs tabular-nums text-slate-600" dateTime={event.timestamp}>{timeFormatter.format(new Date(event.timestamp))}</time>
                </li>
              ))}
            </ol>
            {!activityEvents.length ? <p className="px-5 py-4 text-sm text-slate-600">{canViewActivity ? "No hay actividad en los equipos habilitados." : "No tenés acceso a la actividad de estos equipos."}</p> : null}
          </section>
        </div>
      </main>
      <footer className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-8 py-6 text-xs text-slate-500 2xl:px-12"><span>PredictiveMaintenance / Centro de operaciones</span><span>Datos simulados · Decisiones a cargo del equipo de mantenimiento</span></footer>
    </div>
  );
}
