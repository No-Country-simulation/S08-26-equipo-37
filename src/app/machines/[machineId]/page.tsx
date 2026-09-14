import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { MachineVisual } from "@/app/_components/machine-visual";
import { ReturnToDashboardLink } from "@/app/_components/return-to-dashboard-link";
import { SensorTrend } from "@/app/_components/sensor-trend";
import { StatusBadge } from "@/app/_components/status-badge";
import { activityEvents, alerts, machines } from "@/features/maintenance/mock-data";
import type { Alert } from "@/features/maintenance/types";

const routeParamsSchema = z.object({
  machineId: z.string().regex(/^M-\d{2}$/),
});

const dateTime = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

const alertSeverity: Record<Alert["severity"], { label: string; className: string }> = {
  critical: { label: "Crítica", className: "border-rose-300/25 bg-rose-300/10 text-rose-100" },
  high: { label: "Alta", className: "border-orange-300/25 bg-orange-300/10 text-orange-100" },
  medium: { label: "Media", className: "border-amber-300/25 bg-amber-300/10 text-amber-100" },
};

const alertStatus: Record<Alert["status"], string> = {
  open: "Abierta",
  "under-review": "En evaluación",
  planned: "Planificada",
  "in-progress": "En ejecución",
  closed: "Cerrada",
};

type MachinePageProps = {
  params: Promise<unknown>;
};

async function findMachine(params: Promise<unknown>) {
  const parsed = routeParamsSchema.safeParse(await params);

  return parsed.success ? machines.find((machine) => machine.id === parsed.data.machineId) : undefined;
}

export function generateStaticParams() {
  return machines.map((machine) => ({ machineId: machine.id }));
}

export async function generateMetadata({ params }: MachinePageProps): Promise<Metadata> {
  const machine = await findMachine(params);

  return machine
    ? {
        title: `${machine.id} · ${machine.name} | PredictiveMaintenance`,
        description: machine.summary,
      }
    : { title: "Equipo no encontrado | PredictiveMaintenance" };
}

export default async function MachineDetailPage({ params }: MachinePageProps) {
  const machine = await findMachine(params);

  if (!machine) notFound();

  const relatedAlerts = alerts.filter((alert) => alert.machineId === machine.id);
  const relatedActivity = activityEvents.filter((event) => event.machineId === machine.id);

  return (
    <div className="min-h-screen bg-[#07111f] text-slate-100">
      <a className="skip-link" href="#machine-detail">
        Ir al detalle del equipo
      </a>

      <header className="border-b border-white/10 bg-[#07111f]/95">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center px-4 py-3 sm:px-6 lg:px-8">
          <ReturnToDashboardLink
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-teal-200 hover:bg-white/5 hover:text-teal-100"
          >
            <span aria-hidden="true">←</span>
            Volver al centro de operaciones
          </ReturnToDashboardLink>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8" id="machine-detail">
        <section
          aria-labelledby="machine-title"
          className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a1828] shadow-xl shadow-black/20"
        >
          <div className="grid lg:grid-cols-[minmax(20rem,0.85fr)_minmax(0,1.15fr)]">
            <MachineVisual
              className="aspect-[8/5] size-full min-h-56 rounded-none border-b border-white/10 object-cover lg:min-h-full lg:border-b-0 lg:border-r"
              label={`${machine.type} ${machine.id}`}
              visual={machine.visual}
            />

            <div className="min-w-0 p-5 sm:p-7 lg:p-9">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-bold text-teal-300">{machine.id}</p>
                  <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-4xl" id="machine-title">
                    {machine.name}
                  </h1>
                  <p className="mt-2 text-base text-slate-300">{machine.type} · {machine.model}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{machine.sector}</p>
                </div>
                <StatusBadge label={machine.statusLabel} status={machine.status} />
              </div>

              <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300">{machine.summary}</p>

              <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Criticidad</dt>
                  <dd className="mt-2 text-xl font-bold text-white">{machine.criticality}</dd>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Estado operativo</dt>
                  <dd className="mt-2 text-base font-bold text-white">{machine.operating ? "En operación" : "Fuera de operación"}</dd>
                </div>
                <div className="col-span-2 rounded-2xl border border-teal-300/20 bg-teal-300/[0.06] p-4 sm:col-span-1">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-teal-100/75">Índice demo</dt>
                  <dd className="mt-1 flex items-baseline gap-1">
                    <data className="text-3xl font-bold tabular-nums text-white" value={machine.riskScore}>{machine.riskScore}</data>
                    <span className="text-sm text-slate-400">/100</span>
                  </dd>
                  <p className="mt-1 text-xs leading-5 text-slate-400">Prioridad ilustrativa; no es una probabilidad de falla.</p>
                </div>
              </dl>

              <p className="mt-5 text-sm leading-6 text-slate-400">
                Corte del equipo: <time className="font-semibold text-slate-200" dateTime={machine.updatedAt}>{dateTime.format(new Date(machine.updatedAt))}</time>
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="decision-title" className="mt-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">Apoyo a la decisión</p>
          <h2 className="mt-1 text-2xl font-semibold text-white" id="decision-title">Qué observar y qué validar</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-amber-200/15 bg-amber-200/[0.055] p-5">
              <h3 className="font-bold text-amber-100">Señal principal</h3>
              <p className="mt-2 leading-7 text-slate-200">{machine.signal}</p>
            </article>
            <article className="rounded-2xl border border-teal-200/15 bg-teal-200/[0.045] p-5">
              <h3 className="font-bold text-teal-100">Recomendación orientativa</h3>
              <p className="mt-2 leading-7 text-slate-200">{machine.recommendation}</p>
              <p className="mt-3 text-sm font-semibold leading-6 text-teal-100/80">Requiere validación humana antes de cualquier intervención.</p>
            </article>
          </div>
        </section>

        <section aria-labelledby="signals-title" className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-300">Lecturas recientes simuladas</p>
          <h2 className="mt-1 text-2xl font-semibold text-white" id="signals-title">Tendencias de sensores</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Escala visual normalizada; las lecturas ausentes se muestran como “Sin dato”.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {machine.sensors.map((sensor) => <SensorTrend key={sensor.key} trend={sensor} />)}
          </div>
        </section>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <section aria-labelledby="related-alerts-title" className="rounded-3xl border border-white/10 bg-[#091624] p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-300">Seguimiento</p>
            <h2 className="mt-1 text-2xl font-semibold text-white" id="related-alerts-title">Alertas relacionadas</h2>
            {relatedAlerts.length ? (
              <ol className="mt-4 divide-y divide-white/[0.08]">
                {relatedAlerts.map((alert) => {
                  const severity = alertSeverity[alert.severity];

                  return (
                    <li className="py-4 first:pt-0 last:pb-0" key={alert.id}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${severity.className}`}>{severity.label}</span>
                        <span className="rounded-full bg-white/[0.055] px-2.5 py-1 text-xs font-semibold text-slate-300">{alertStatus[alert.status]}</span>
                      </div>
                      <h3 className="mt-3 text-base font-bold text-white">{alert.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-300">{alert.description}</p>
                      <time className="mt-2 block text-xs leading-5 text-slate-400" dateTime={alert.timestamp}>{dateTime.format(new Date(alert.timestamp))}</time>
                    </li>
                  );
                })}
              </ol>
            ) : <p className="mt-4 text-sm leading-6 text-slate-400">Este equipo no tiene alertas en el corte simulado.</p>}
          </section>

          <section aria-labelledby="related-activity-title" className="rounded-3xl border border-white/10 bg-[#091624] p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-300">Trazabilidad</p>
            <h2 className="mt-1 text-2xl font-semibold text-white" id="related-activity-title">Actividad del equipo</h2>
            {relatedActivity.length ? (
              <ol className="mt-4 divide-y divide-white/[0.08]">
                {relatedActivity.map((event) => (
                  <li className="py-4 first:pt-0 last:pb-0" key={event.id}>
                    <h3 className="text-sm font-bold text-white">{event.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{event.detail}</p>
                    <time className="mt-2 block text-xs leading-5 text-slate-400" dateTime={event.timestamp}>{dateTime.format(new Date(event.timestamp))}</time>
                  </li>
                ))}
              </ol>
            ) : <p className="mt-4 text-sm leading-6 text-slate-400">Este equipo no tiene actividad en el corte simulado.</p>}
          </section>
        </div>

        <footer className="mt-8 flex flex-col gap-3 border-t border-white/10 py-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>Datos, señales y recomendaciones simuladas. Ninguna acción es automática.</p>
          <ReturnToDashboardLink className="inline-flex min-h-11 items-center font-semibold text-teal-200 hover:text-teal-100">← Volver al panel</ReturnToDashboardLink>
        </footer>
      </main>
    </div>
  );
}
