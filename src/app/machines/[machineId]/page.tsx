import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { MachineImage } from "@/app/_components/machine-image";
import { ReturnToDashboardLink } from "@/app/_components/return-to-dashboard-link";
import { SensorTrend } from "@/app/_components/sensor-trend";
import { StatusBadge } from "@/app/_components/status-badge";
import { UserMenu } from "@/app/_components/user-menu";
import type { Alert } from "@/features/maintenance/types";
import { requireAuthenticatedUser } from "@/modules/identity/auth";
import { getMachineReadModel } from "@/modules/maintenance/read-model";

const routeParamsSchema = z.object({
  machineId: z.string().regex(/^M-\d{2}$/),
});

const dateTime = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

const alertSeverity: Record<Alert["severity"], { label: string; className: string }> = {
  critical: { label: "Crítica", className: "text-rose-700" },
  high: { label: "Alta", className: "text-orange-800" },
  medium: { label: "Media", className: "text-amber-800" },
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

export const metadata: Metadata = { title: "Ficha de equipo | PredictiveMaintenance" };

export default async function MachineDetailPage({ params }: MachinePageProps) {
  const actor = await requireAuthenticatedUser();
  const parsed = routeParamsSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const data = await getMachineReadModel(actor, parsed.data.machineId);
  if (!data) notFound();
  const { machine, alerts: relatedAlerts, activityEvents: relatedActivity, canViewAlerts, canViewActivity } = data;

  return (
    <div className="min-h-screen bg-[#f3f5f7] text-slate-900">
      <a className="skip-link" href="#machine-detail">
        Ir al detalle del equipo
      </a>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-x-6 px-4 py-2 sm:px-6 lg:px-8">
          <ReturnToDashboardLink
            className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-teal-700 hover:text-teal-800"
          >
            <span aria-hidden="true">←</span>
            Volver al centro de operaciones
          </ReturnToDashboardLink>
          <UserMenu />
        </div>
        <div className="border-t border-slate-200">
          <p className="mx-auto max-w-7xl px-4 py-3 text-xs leading-5 text-slate-600 sm:px-6 lg:px-8">
            <strong className="font-semibold text-slate-900">Demo simulada.</strong> Datos, señales y recomendaciones ilustrativas. Ninguna acción es automática.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8" id="machine-detail">
        <section
          aria-labelledby="machine-title"
          className="overflow-hidden rounded-lg border border-slate-200 bg-white"
        >
          <div className="flex items-start justify-between gap-4 p-5 sm:gap-8 sm:p-7">
            <div className="min-w-0">
              <p className="font-mono text-sm font-semibold tracking-wide text-slate-600">{machine.id}</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl" id="machine-title">
                {machine.name}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">{machine.type} · {machine.model}</p>
              <p className="text-sm leading-6 text-slate-600">{machine.sector}</p>
            </div>
            <MachineImage
              className="mt-1 aspect-[8/5] w-16 shrink-0 rounded-md opacity-90 sm:w-44"
              image={machine.image}
              label={`${machine.type} ${machine.id}`}
              visual={machine.visual}
            />
          </div>
          <p className="max-w-4xl px-5 pb-6 text-sm leading-6 text-slate-600 sm:px-7">{machine.summary}</p>

          <dl className="grid grid-cols-2 border-t border-slate-200 bg-slate-50 md:grid-cols-4">
            <div className="border-b border-r border-slate-200 p-5 sm:px-7 md:border-b-0">
              <dt className="text-xs font-medium text-slate-500">Estado de salud</dt>
              <dd className="mt-3"><StatusBadge label={machine.statusLabel} status={machine.status} /></dd>
            </div>
            <div className="border-b border-slate-200 p-5 sm:px-7 md:border-b-0 md:border-r">
              <dt className="text-xs font-medium text-slate-500">Criticidad</dt>
              <dd className="mt-3 text-base font-semibold text-slate-900">{machine.criticality}</dd>
            </div>
            <div className="border-r border-slate-200 p-5 sm:px-7">
              <dt className="text-xs font-medium text-slate-500">Estado operativo</dt>
              <dd className="mt-3 text-sm font-medium text-slate-900">{machine.operating ? "En operación" : "Fuera de operación"}</dd>
            </div>
            <div className="p-5 sm:px-7">
              <dt className="text-xs font-medium text-slate-500">Índice demo</dt>
              <dd className="mt-2 flex items-baseline gap-1">
                <data className="text-2xl font-semibold tabular-nums text-slate-900" value={machine.riskScore}>{machine.riskScore}</data>
                <span className="text-xs text-slate-500">/100</span>
              </dd>
              <p className="mt-1 text-xs leading-5 text-slate-500">Prioridad ilustrativa; no es una probabilidad de falla.</p>
            </div>
          </dl>
          <div className="border-t border-slate-200 px-5 py-3 sm:px-7">
            <p className="text-xs leading-5 text-slate-500">
              Corte del equipo: <time className="text-slate-600" dateTime={machine.updatedAt}>{dateTime.format(new Date(machine.updatedAt))}</time>
            </p>
          </div>
        </section>

        <section aria-labelledby="decision-title" className="mt-8">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Apoyo a la decisión</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900" id="decision-title">Qué observar y qué validar</h2>
          <div className="mt-4 grid overflow-hidden rounded-lg border border-slate-200 bg-white lg:grid-cols-2">
            <article className="border-b border-slate-200 p-5 sm:p-6 lg:border-r lg:border-b-0">
              <h3 className="text-sm font-semibold text-slate-900">Señal principal</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{machine.signal}</p>
            </article>
            <article className="p-5 sm:p-6">
              <h3 className="text-sm font-semibold text-slate-900">Recomendación orientativa</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{machine.recommendation}</p>
              <p className="mt-4 border-l-2 border-slate-200 pl-3 text-xs leading-5 text-slate-500">Requiere validación humana antes de cualquier intervención.</p>
            </article>
          </div>
        </section>

        <section aria-labelledby="signals-title" className="mt-8">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Lecturas recientes simuladas</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900" id="signals-title">Tendencias de sensores</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Escala visual normalizada; las lecturas ausentes se muestran como “Sin dato”.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {machine.sensors.map((sensor) => <SensorTrend key={sensor.key} trend={sensor} />)}
          </div>
        </section>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <section aria-labelledby="related-alerts-title" className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Seguimiento</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900" id="related-alerts-title">Alertas relacionadas</h2>
            {relatedAlerts.length ? (
              <ol className="mt-4 divide-y divide-slate-200">
                {relatedAlerts.map((alert) => {
                  const severity = alertSeverity[alert.severity];

                  return (
                    <li className="py-4 first:pt-0 last:pb-0" key={alert.id}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-semibold ${severity.className}`}>{severity.label}</span>
                        <span aria-hidden="true" className="text-slate-600">/</span>
                        <span className="text-xs text-slate-500">{alertStatus[alert.status]}</span>
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-slate-900">{alert.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{alert.description}</p>
                      <time className="mt-2 block text-xs leading-5 text-slate-500" dateTime={alert.timestamp}>{dateTime.format(new Date(alert.timestamp))}</time>
                    </li>
                  );
                })}
              </ol>
            ) : <p className="mt-4 text-sm leading-6 text-slate-500">{canViewAlerts ? "Este equipo no tiene alertas en el corte simulado." : "No tenés acceso a las alertas de este equipo."}</p>}
          </section>

          <section aria-labelledby="related-activity-title" className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Trazabilidad</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900" id="related-activity-title">Actividad del equipo</h2>
            {relatedActivity.length ? (
              <ol className="mt-4 divide-y divide-slate-200">
                {relatedActivity.map((event) => (
                  <li className="py-4 first:pt-0 last:pb-0" key={event.id}>
                    <h3 className="text-sm font-semibold text-slate-900">{event.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{event.detail}</p>
                    <time className="mt-2 block text-xs leading-5 text-slate-500" dateTime={event.timestamp}>{dateTime.format(new Date(event.timestamp))}</time>
                  </li>
                ))}
              </ol>
            ) : <p className="mt-4 text-sm leading-6 text-slate-500">{canViewActivity ? "Este equipo no tiene actividad en el corte simulado." : "No tenés acceso a la actividad de este equipo."}</p>}
          </section>
        </div>

        <footer className="mt-8 flex flex-col gap-3 border-t border-slate-200 py-6 text-xs leading-5 text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Datos, señales y recomendaciones simuladas. Ninguna acción es automática.</p>
          <ReturnToDashboardLink className="inline-flex min-h-11 items-center rounded-md text-sm font-medium text-teal-700 hover:text-teal-800">← Volver al panel</ReturnToDashboardLink>
        </footer>
      </main>
    </div>
  );
}
