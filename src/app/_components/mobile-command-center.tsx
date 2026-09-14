"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  activityEvents,
  alerts,
  dashboardSummary,
  filterMachinesByStatus,
  machines,
  markNotificationsRead,
  notifications,
  priorityMachines,
} from "@/features/maintenance/mock-data";
import type {
  Alert,
  HealthStatus,
  Machine,
  MachineStatusFilter,
  MaintenanceNotification,
} from "@/features/maintenance/types";

import { MachineVisual } from "./machine-visual";

const tabs = [
  { id: "summary", label: "Resumen" },
  { id: "alerts", label: "Alertas" },
  { id: "machines", label: "Máquinas" },
  { id: "activity", label: "Actividad" },
] as const;

type MobileTab = (typeof tabs)[number]["id"];

const filters: readonly { label: string; value: MachineStatusFilter }[] = [
  { label: "Todas", value: "all" },
  { label: "Riesgo crítico", value: "critical" },
  { label: "Observación", value: "watch" },
  { label: "Normales", value: "healthy" },
  { label: "Mantenimiento", value: "maintenance" },
];

const statusTone: Record<HealthStatus, string> = {
  critical: "border-rose-300/25 bg-rose-300/10 text-rose-100",
  watch: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  healthy: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  maintenance: "border-sky-300/25 bg-sky-300/10 text-sky-100",
};

const actionStyle = "inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-semibold text-teal-200 transition hover:bg-white/[0.06] hover:text-white active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300";

const dateTime = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

const displayLabels: Record<string, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Media",
  sensor: "Sensor",
  condition: "Condición",
  maintenance: "Mantenimiento",
  open: "Abierta",
  "under-review": "En evaluación",
  planned: "Planificada",
  "in-progress": "En ejecución",
  closed: "Cerrada",
};

function tabIcon(tab: MobileTab) {
  const paths: Record<MobileTab, string> = {
    summary: "M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1Z",
    alerts: "M12 3 3.8 18a1 1 0 0 0 .88 1.5h14.64A1 1 0 0 0 20.2 18ZM12 8v5m0 3h.01",
    machines: "M4 6h16v12H4zm4 12v3m8-3v3M8 10h3m2 0h3m-8 4h8",
    activity: "M4 12h3l2-5 4 10 2-5h5",
  };

  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path d={paths[tab]} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function StatusPill({ machine }: { machine: Machine }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone[machine.status]}`}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {machine.statusLabel}
    </span>
  );
}

function severityStyle(severity: string) {
  if (severity === "critical") return "border-rose-300/25 bg-rose-300/[0.07] text-rose-100";
  if (severity === "high") return "border-orange-300/25 bg-orange-300/[0.07] text-orange-100";
  if (severity === "medium" || severity === "warning") return "border-amber-300/25 bg-amber-300/[0.07] text-amber-100";
  return "border-sky-300/20 bg-sky-300/[0.06] text-sky-100";
}

function displayValue(value: string) {
  return displayLabels[value] ?? value.replaceAll("_", " ");
}

function SnapshotTime({ value }: { value: string }) {
  return <time dateTime={value}>{dateTime.format(new Date(value))}</time>;
}

function tabFromLocation(): MobileTab {
  const requestedTab = new URLSearchParams(window.location.search).get("view");
  return tabs.find((tab) => tab.id === requestedTab)?.id ?? "summary";
}

function MachineReference({ machineId, source = "mobile-alerts" }: { machineId: string; source?: "mobile-alerts" | "mobile-activity" }) {
  const machine = machines.find((item) => item.id === machineId);

  return (
    <Link
      className={actionStyle}
      href={`/machines/${machineId}?from=${source}`}
    >
      Ver {machineId}{machine ? ` · ${machine.name}` : ""} →
    </Link>
  );
}

function AlertCard({ alert }: { alert: Alert }) {
  return (
    <article className={`rounded-2xl border p-4 ${severityStyle(alert.severity)}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-current/75">
            {displayValue(alert.severity)} · {displayValue(alert.category)}
          </p>
          <h3 className="mt-1 text-base font-semibold leading-6 text-white">{alert.title}</h3>
        </div>
        <span className="shrink-0 text-xs text-slate-300"><SnapshotTime value={alert.timestamp} /></span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-200">{alert.description}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-xs">
        <MachineReference machineId={alert.machineId} />
        <span className="rounded-full bg-black/15 px-2 py-1 text-slate-300">{displayValue(alert.status)}</span>
      </div>
    </article>
  );
}

function MachineCard({ machine }: { machine: Machine }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f1c2c]">
      <div className="grid grid-cols-[5.75rem_minmax(0,1fr)] gap-4 p-4 sm:grid-cols-[6.75rem_minmax(0,1fr)]">
        <MachineVisual className="h-24 w-full rounded-xl" label={`${machine.type} ${machine.name}`} visual={machine.visual} />
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-xs font-semibold text-teal-300">{machine.id}</p>
              <h3 className="mt-1 break-words text-base font-semibold text-white">{machine.name}</h3>
              <p className="mt-1 break-words text-xs text-slate-400">{machine.sector}</p>
            </div>
            <div className="shrink-0 text-right">
              <data aria-label={`Índice de atención simulado: ${machine.riskScore} de 100`} className="text-2xl font-semibold tabular-nums text-white" value={machine.riskScore}>
                {machine.riskScore}
              </data>
              <p className="text-[11px] text-slate-400">índice demo</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusPill machine={machine} />
            <span className="text-xs text-slate-400">Criticidad {machine.criticality.toLowerCase()}</span>
          </div>
        </div>
      </div>
      <div className="border-t border-white/[0.07] px-4 py-3">
        <p className="text-sm leading-5 text-slate-300">{machine.summary}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-1">
          <p className="text-xs text-slate-400">Actualizada <SnapshotTime value={machine.updatedAt} /></p>
          <Link
            className={actionStyle}
            href={`/machines/${machine.id}?from=mobile-machines`}
          >
            Ver detalle →
          </Link>
        </div>
      </div>
    </article>
  );
}

function NotificationCenter({
  items,
  onRead,
  onReadAll,
}: {
  items: readonly MaintenanceNotification[];
  onRead: (id: string) => void;
  onReadAll: () => void;
}) {
  const unread = items.filter((item) => !item.read).length;

  return (
    <section aria-labelledby="notification-title" className="border-b border-white/10 bg-[#0c1928] px-4 py-5" id="mobile-notifications">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-300">Centro de notificaciones</p>
            <h2 className="mt-1 text-lg font-semibold text-white" id="notification-title">
              {unread ? `${unread} sin leer` : "Todo al día"}
            </h2>
          </div>
          <button
            className="min-h-11 rounded-xl border border-white/10 px-3 text-sm font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={unread === 0}
            onClick={onReadAll}
            type="button"
          >
            Marcar todas
          </button>
        </div>

        <ul className="mt-4 grid gap-2">
          {items.map((item) => {
            const machine = machines.find((candidate) => candidate.id === item.machineId);

            return (
              <li className={`rounded-xl border p-3 ${item.read ? "border-white/[0.07] bg-white/[0.025]" : "border-teal-300/20 bg-teal-300/[0.055]"}`} key={item.id}>
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${item.read ? "bg-slate-600" : "bg-teal-300"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <span className="shrink-0 text-xs text-slate-400"><SnapshotTime value={item.timestamp} /></span>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-slate-300">{item.message}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <Link
                        className={actionStyle}
                        href={`/machines/${item.machineId}?from=mobile-summary`}
                      >
                        Ver {item.machineId}{machine ? ` · ${machine.statusLabel}` : ""} →
                      </Link>
                      {!item.read ? (
                        <button
                          className={actionStyle}
                          onClick={() => onRead(item.id)}
                          type="button"
                        >
                          Marcar como leída
                          <span className="sr-only">: {item.title}</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function MobileCommandCenter() {
  const [activeTab, setActiveTab] = useState<MobileTab>("summary");
  const [statusFilter, setStatusFilter] = useState<MachineStatusFilter>("all");
  const [notificationItems, setNotificationItems] = useState<readonly MaintenanceNotification[]>(notifications);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unreadCount = notificationItems.filter((item) => !item.read).length;
  const filteredMachines = useMemo(() => filterMachinesByStatus(machines, statusFilter), [statusFilter]);
  const criticalMachines = priorityMachines.filter((machine) => machine.status === "critical").slice(0, 3);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!notificationsOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setNotificationsOpen(false);
      notificationButtonRef.current?.focus();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [notificationsOpen]);

  useEffect(() => {
    function restoreTab() {
      setNotificationsOpen(false);
      setActiveTab(tabFromLocation());
      if (window.matchMedia("(max-width: 79.999rem)").matches) {
        window.scrollTo({ behavior: "instant", top: 0 });
      }
    }

    const frame = window.requestAnimationFrame(restoreTab);
    window.addEventListener("popstate", restoreTab);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("popstate", restoreTab);
    };
  }, []);

  function openTab(tab: MobileTab) {
    setNotificationsOpen(false);
    if (tab !== activeTab) {
      window.history.pushState(null, "", tab === "summary" ? "/" : `/?view=${tab}`);
    }
    setActiveTab(tab);
    window.scrollTo({ behavior: "instant", top: 0 });
  }

  function toggleNotifications() {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (nextOpen) window.scrollTo({ behavior: "instant", top: 0 });
  }

  return (
    <section aria-label="Centro de comando móvil" className="min-h-dvh bg-[#08111d] text-slate-100 xl:hidden">
      <a className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-teal-300 focus:px-3 focus:py-2 focus:font-semibold focus:text-[#08111d]" href="#mobile-content">
        Ir al contenido
      </a>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#08111d]/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-300 font-black text-[#08111d]">
              PM
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">PredictiveMaintenance</p>
              <p className="truncate text-xs text-slate-400">Corte · 27 abr 2026 · 10:00</p>
            </div>
          </div>

          <button
            aria-controls="mobile-notifications"
            aria-expanded={notificationsOpen}
            aria-label={`Notificaciones: ${unreadCount} sin leer`}
            className="relative grid size-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-200"
            onClick={toggleNotifications}
            ref={notificationButtonRef}
            type="button"
          >
            <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
              <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            </svg>
            {unreadCount ? (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-400 px-1 text-[10px] font-bold text-[#08111d]">
                {unreadCount}
              </span>
            ) : null}
          </button>
        </div>
        <p className="border-t border-amber-300/10 bg-amber-300/[0.06] px-4 py-1.5 text-center text-[11px] font-medium text-amber-100/85">
          Demo con datos simulados · No genera órdenes ni intervenciones
        </p>
      </header>

      <span aria-live="polite" className="sr-only">
        Vista {tabs.find((tab) => tab.id === activeTab)?.label}. {unreadCount} notificaciones sin leer.
      </span>

      {notificationsOpen ? (
        <NotificationCenter
          items={notificationItems}
          onRead={(id) => setNotificationItems((items) => markNotificationsRead(items, id))}
          onReadAll={() => setNotificationItems((items) => markNotificationsRead(items))}
        />
      ) : null}

      <div className="mx-auto max-w-2xl scroll-mt-28 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6" id="mobile-content" tabIndex={-1}>
        {activeTab === "summary" ? (
          <div className="grid gap-7">
            <section aria-labelledby="mobile-summary-title">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-teal-300">Resumen ejecutivo</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white" id="mobile-summary-title">
                Estado de planta
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                {dashboardSummary.total} equipos · {dashboardSummary.highCriticality} de criticidad alta
              </p>

              <dl className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.07] p-4">
                  <dt className="text-xs font-medium text-rose-100">Riesgo crítico</dt>
                  <dd className="mt-2 text-3xl font-semibold text-white">{dashboardSummary.counts.critical}</dd>
                </div>
                <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-4">
                  <dt className="text-xs font-medium text-amber-100">En observación</dt>
                  <dd className="mt-2 text-3xl font-semibold text-white">{dashboardSummary.counts.watch}</dd>
                </div>
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.07] p-4">
                  <dt className="text-xs font-medium text-emerald-100">Normales</dt>
                  <dd className="mt-2 text-3xl font-semibold text-white">{dashboardSummary.counts.healthy}</dd>
                </div>
                <div className="rounded-2xl border border-sky-300/20 bg-sky-300/[0.07] p-4">
                  <dt className="text-xs font-medium text-sky-100">Alertas activas</dt>
                  <dd className="mt-2 text-3xl font-semibold text-white">{dashboardSummary.activeAlerts}</dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="mobile-important-alerts">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-300">Atención primero</p>
                  <h2 className="mt-1 text-xl font-semibold text-white" id="mobile-important-alerts">Alertas importantes</h2>
                </div>
                <button className="min-h-11 px-1 text-sm font-semibold text-teal-200" onClick={() => openTab("alerts")} type="button">
                  Ver todas
                </button>
              </div>
              <div className="mt-3 grid gap-3">
                {alerts.slice(0, 2).map((alert) => <AlertCard alert={alert} key={alert.id} />)}
              </div>
            </section>

            <section aria-labelledby="mobile-critical-machines">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">Prioridad</p>
                  <h2 className="mt-1 text-xl font-semibold text-white" id="mobile-critical-machines">Máquinas en riesgo crítico</h2>
                </div>
                <button className="min-h-11 px-1 text-sm font-semibold text-teal-200" onClick={() => openTab("machines")} type="button">
                  Ver equipos
                </button>
              </div>
              <div className="mt-3 grid gap-3">
                {criticalMachines.map((machine) => <MachineCard key={machine.id} machine={machine} />)}
              </div>
            </section>

            <section aria-labelledby="mobile-latest-activity">
              <div className="flex items-end justify-between gap-3">
                <h2 className="text-xl font-semibold text-white" id="mobile-latest-activity">Actividad reciente</h2>
                <button className="min-h-11 px-1 text-sm font-semibold text-teal-200" onClick={() => openTab("activity")} type="button">Ver historial</button>
              </div>
              <ul className="mt-3 divide-y divide-white/[0.07] rounded-2xl border border-white/10 bg-[#0f1c2c] px-4">
                {activityEvents.slice(0, 3).map((event) => (
                  <li className="py-4" key={event.id}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{event.title}</p>
                      <span className="shrink-0 text-xs text-slate-400"><SnapshotTime value={event.timestamp} /></span>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-slate-400">{event.detail}</p>
                    <MachineReference machineId={event.machineId} source="mobile-activity" />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}

        {activeTab === "alerts" ? (
          <section aria-labelledby="mobile-alerts-title">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-rose-300">Foco inmediato</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white" id="mobile-alerts-title">Alertas prioritarias</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">Ordenadas para lectura rápida. Todas son parte de la simulación visual.</p>
            <div className="mt-5 grid gap-3">
              {alerts.map((alert) => <AlertCard alert={alert} key={alert.id} />)}
            </div>
          </section>
        ) : null}

        {activeTab === "machines" ? (
          <section aria-labelledby="mobile-machines-title">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-teal-300">Inventario resumido</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white" id="mobile-machines-title">Máquinas</h1>
            <div aria-label="Filtrar máquinas por estado" className="mt-4 flex flex-wrap gap-2 pb-2" role="group">
              {filters.map((filter) => (
                <button
                  aria-pressed={statusFilter === filter.value}
                  className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold ${statusFilter === filter.value ? "border-teal-300 bg-teal-300 text-[#08111d]" : "border-white/10 bg-white/[0.035] text-slate-300"}`}
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  type="button"
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <p aria-live="polite" className="mt-1 text-xs text-slate-400">
              {filteredMachines.length === 1 ? "1 equipo visible" : `${filteredMachines.length} equipos visibles`}
            </p>
            <div className="mt-4 grid gap-3">
              {filteredMachines.map((machine) => <MachineCard key={machine.id} machine={machine} />)}
            </div>
          </section>
        ) : null}

        {activeTab === "activity" ? (
          <section aria-labelledby="mobile-activity-title">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-300">Últimos cambios</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white" id="mobile-activity-title">Actividad</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">Historial simulado de estados, sensores y mantenimiento.</p>
            <ol className="relative mt-6 ml-2 border-l border-white/10 pl-5">
              {activityEvents.map((event) => (
                <li className="relative pb-6 last:pb-0" key={event.id}>
                  <span aria-hidden="true" className="absolute -left-[1.65rem] top-1 size-3 rounded-full border-2 border-[#08111d] bg-teal-300" />
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-sm font-semibold text-white">{event.title}</h2>
                    <span className="shrink-0 text-xs text-slate-400"><SnapshotTime value={event.timestamp} /></span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{event.detail}</p>
                  <MachineReference machineId={event.machineId} source="mobile-activity" />
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>

      <nav aria-label="Navegación móvil" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0b1726]/95 backdrop-blur-xl">
        <div className="mx-auto grid max-w-2xl grid-cols-4 gap-1 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                aria-current={active ? "page" : undefined}
                aria-label={tab.label}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold ${active ? "bg-teal-300/10 text-teal-200" : "text-slate-400"}`}
                key={tab.id}
                onClick={() => openTab(tab.id)}
                type="button"
              >
                {tabIcon(tab.id)}
                <span>{tab.label}</span>
                {tab.id === "alerts" && unreadCount ? (
                  <span className="sr-only">, {unreadCount} notificaciones sin leer</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>
    </section>
  );
}
