"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  Alert,
  HealthStatus,
  Machine,
  MachineStatusFilter,
  MaintenanceNotification,
} from "@/features/maintenance/types";
import type { DashboardReadModel, MachineView } from "@/modules/maintenance/types";

import { MachineImage } from "./machine-image";

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
  critical: "text-rose-700",
  watch: "text-amber-800",
  healthy: "text-emerald-700",
  maintenance: "text-sky-700",
};

const actionStyle = "inline-flex min-h-11 min-w-0 items-center rounded-sm px-1 text-sm font-medium text-teal-700 hover:text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";

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

function StatusLabel({ machine }: { machine: Machine }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusTone[machine.status]}`}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {machine.statusLabel}
    </span>
  );
}

function severityStyle(severity: string) {
  if (severity === "critical") return "text-rose-700";
  if (severity === "high") return "text-orange-700";
  if (severity === "medium" || severity === "warning") return "text-amber-800";
  return "text-sky-700";
}

function displayValue(value: string) {
  return displayLabels[value] ?? value.replaceAll("_", " ");
}

function SnapshotTime({ value }: { value: string }) {
  return <time className="font-mono tabular-nums" dateTime={value}>{dateTime.format(new Date(value))}</time>;
}

function tabFromLocation(): MobileTab {
  const requestedTab = new URLSearchParams(window.location.search).get("view");
  return tabs.find((tab) => tab.id === requestedTab)?.id ?? "summary";
}

function MachineReference({ machineId, machine, source = "mobile-alerts" }: { machineId: string; machine?: MachineView; source?: "mobile-alerts" | "mobile-activity" }) {
  if (!machine || machine.id !== machineId) return null;

  return (
    <Link
      className={actionStyle}
      href={`/machines/${machineId}?from=${source}`}
    >
      Ver {machineId} · {machine.name} →
    </Link>
  );
}

function AlertRow({ alert, machine }: { alert: Alert; machine?: MachineView }) {
  return (
    <article className="px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
        <p className={`inline-flex items-center gap-2 font-medium ${severityStyle(alert.severity)}`}>
          <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
          {displayValue(alert.severity)} · {displayValue(alert.category)}
        </p>
        <span className="text-slate-500"><SnapshotTime value={alert.timestamp} /></span>
      </div>
      <h3 className="mt-2 text-base font-semibold leading-6 text-slate-900">{alert.title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">{alert.description}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 text-xs">
        <MachineReference machineId={alert.machineId} machine={machine} />
        <span className="text-slate-600">{displayValue(alert.status)}</span>
      </div>
    </article>
  );
}

function MachineRow({ machine }: { machine: MachineView }) {
  return (
    <article>
      <Link className="block px-4 py-4 hover:bg-slate-50 focus-visible:outline-offset-[-2px]" href={`/machines/${machine.id}?from=mobile-machines`}>
        <div className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-start gap-3">
          <MachineImage className="mt-1 h-10 w-12" image={machine.image} label={`${machine.type} ${machine.name}`} visual={machine.visual} />
          <div className="min-w-0">
            <p className="font-mono text-xs text-slate-500">{machine.id}</p>
            <h3 className="mt-1 break-words text-sm font-semibold leading-5 text-slate-900">{machine.name}</h3>
            <p className="mt-1 break-words text-xs leading-5 text-slate-600">{machine.sector}</p>
          </div>
          <div className="text-right">
            <data aria-label={`Índice de atención simulado: ${machine.riskScore} de 100`} className="font-mono text-xl tabular-nums text-slate-900" value={machine.riskScore}>
              {machine.riskScore}
            </data>
            <p className="mt-1 text-[10px] text-slate-500">Índice demo</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <StatusLabel machine={machine} />
          <span className="text-xs text-slate-600">Criticidad {machine.criticality.toLowerCase()}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
          <span className="text-slate-500"><SnapshotTime value={machine.updatedAt} /></span>
          <span className="font-medium text-teal-700">Ver detalle →</span>
        </div>
      </Link>
    </article>
  );
}

function NotificationCenter({
  items,
  machines,
  onRead,
  onReadAll,
}: {
  items: readonly MaintenanceNotification[];
  machines: readonly MachineView[];
  onRead: (id: string) => void;
  onReadAll: () => void;
}) {
  const unread = items.filter((item) => !item.read).length;

  return (
    <section aria-labelledby="notification-title" className="border-b border-slate-200 bg-white px-4 py-5" id="mobile-notifications">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-600">Notificaciones</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900" id="notification-title">
              {unread ? `${unread} sin leer` : "Todo al día"}
            </h2>
          </div>
          <button
            className="min-h-11 rounded-sm border border-slate-200 px-3 text-sm font-medium text-teal-700 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={unread === 0}
            onClick={onReadAll}
            type="button"
          >
            Marcar todas
          </button>
        </div>

        <ul className="mt-4 divide-y divide-slate-200 border-t border-slate-200">
          {items.map((item) => {
            const machine = machines.find((candidate) => candidate.id === item.machineId);

            return (
              <li className="py-4" key={item.id}>
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className={`mt-1.5 size-1.5 shrink-0 rounded-full ${item.read ? "bg-slate-400" : "bg-slate-700"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <span className="shrink-0 text-xs text-slate-500"><SnapshotTime value={item.timestamp} /></span>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-slate-600">{item.message}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {machine ? <Link
                        className={actionStyle}
                        href={`/machines/${item.machineId}?from=mobile-summary`}
                      >
                        Ver {item.machineId} · {machine.statusLabel} →
                      </Link> : null}
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

export function MobileCommandCenter({ data, userMenu }: { data: DashboardReadModel; userMenu: ReactNode }) {
  const { machines, alerts, activityEvents, notifications, priorityMachines, dashboardSummary, canViewAlerts, canViewActivity } = data;
  const [activeTab, setActiveTab] = useState<MobileTab>("summary");
  const [statusFilter, setStatusFilter] = useState<MachineStatusFilter>("all");
  const [readNotificationIds, setReadNotificationIds] = useState<readonly string[]>([]);
  const notificationItems = notifications.map((item) => readNotificationIds.includes(item.id) ? { ...item, read: true } : item);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unreadCount = notificationItems.filter((item) => !item.read).length;
  const filteredMachines = useMemo(() => statusFilter === "all" ? machines : machines.filter((machine) => machine.status === statusFilter), [machines, statusFilter]);
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
    <section aria-label="Centro de comando móvil" className="min-h-dvh bg-[#f3f5f7] text-slate-900 xl:hidden">
      <a className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-sm focus:bg-teal-700 focus:px-3 focus:py-2 focus:font-semibold focus:text-white" href="#mobile-content">
        Ir al contenido
      </a>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-sm border border-slate-200 text-xs font-semibold tracking-tight text-slate-900">
              PM
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">PredictiveMaintenance</p>
              <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500">27 abr 2026 / 10:00</p>
            </div>
          </div>

          <button
            aria-controls="mobile-notifications"
            aria-expanded={notificationsOpen}
            aria-label={`Notificaciones: ${unreadCount} sin leer`}
            className="relative grid size-11 shrink-0 place-items-center rounded-sm border border-slate-200 text-slate-700 hover:bg-slate-50"
            onClick={toggleNotifications}
            ref={notificationButtonRef}
            type="button"
          >
            <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
              <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            </svg>
            {unreadCount ? (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-700 px-1 font-mono text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            ) : null}
          </button>
          {userMenu}
        </div>
        <p className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-center text-xs text-slate-600">
          <span className="font-medium text-amber-800">Demo simulada</span> · Sin acciones automáticas
        </p>
      </header>

      <span aria-live="polite" className="sr-only">
        Vista {tabs.find((tab) => tab.id === activeTab)?.label}. {unreadCount} {unreadCount === 1 ? "notificación" : "notificaciones"} sin leer.
      </span>

      {notificationsOpen ? (
        <NotificationCenter
          items={notificationItems}
          machines={machines}
          onRead={(id) => setReadNotificationIds((ids) => [...ids, id])}
          onReadAll={() => setReadNotificationIds(notifications.map((item) => item.id))}
        />
      ) : null}

      <div className="mx-auto max-w-2xl scroll-mt-28 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6" id="mobile-content" tabIndex={-1}>
        {!machines.length ? <section className="mb-6 rounded-md border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">No hay equipos habilitados para tu acceso</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Consultá tus ámbitos y vigencias o contactá a quien administra los accesos.</p>
          <Link className={actionStyle} href="/profile">Ver mis accesos →</Link>
        </section> : null}
        {activeTab === "summary" ? (
          <div className="grid gap-8">
            <section aria-labelledby="mobile-summary-title">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900" id="mobile-summary-title">
                Estado de planta
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {dashboardSummary.total} {dashboardSummary.total === 1 ? "equipo" : "equipos"} · {dashboardSummary.highCriticality} de criticidad alta
              </p>

              <dl className="mt-5 grid grid-cols-2 overflow-hidden rounded-md border border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-2 border-b border-r border-slate-200 px-4 py-4">
                  <dt className="text-xs text-rose-700">Riesgo crítico</dt>
                  <dd className="font-mono text-2xl tabular-nums text-slate-900">{dashboardSummary.counts.critical}</dd>
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-4">
                  <dt className="text-xs text-amber-800">Observación</dt>
                  <dd className="font-mono text-2xl tabular-nums text-slate-900">{dashboardSummary.counts.watch}</dd>
                </div>
                <div className="flex items-center justify-between gap-2 border-r border-slate-200 px-4 py-4">
                  <dt className="text-xs text-emerald-700">Normales</dt>
                  <dd className="font-mono text-2xl tabular-nums text-slate-900">{dashboardSummary.counts.healthy}</dd>
                </div>
                <div className="flex items-center justify-between gap-2 px-4 py-4">
                  <dt className="text-xs text-sky-700">Mantenimiento</dt>
                  <dd className="font-mono text-2xl tabular-nums text-slate-900">{dashboardSummary.counts.maintenance}</dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="mobile-important-alerts">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900" id="mobile-important-alerts">Alertas <span className="ml-1 font-mono text-sm font-normal text-slate-600">{canViewAlerts ? dashboardSummary.activeAlerts : "—"}</span></h2>
                <button className="min-h-11 px-1 text-sm font-semibold text-teal-700 hover:text-teal-800" onClick={() => openTab("alerts")} type="button">
                  Ver todas
                </button>
              </div>
              <div className="mt-2 divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white">
                {alerts.slice(0, 2).map((alert) => <AlertRow alert={alert} key={alert.id} machine={machines.find((machine) => machine.id === alert.machineId)} />)}
                {!alerts.length ? <p className="p-4 text-sm text-slate-600">{canViewAlerts ? "No hay alertas en los equipos habilitados." : "No tenés acceso a las alertas de estos equipos."}</p> : null}
              </div>
            </section>

            <section aria-labelledby="mobile-critical-machines">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900" id="mobile-critical-machines">Equipos críticos</h2>
                <button className="min-h-11 px-1 text-sm font-semibold text-teal-700 hover:text-teal-800" onClick={() => openTab("machines")} type="button">
                  Ver equipos
                </button>
              </div>
              <div className="mt-2 divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white">
                {criticalMachines.map((machine) => <MachineRow key={machine.id} machine={machine} />)}
                {!criticalMachines.length ? <p className="p-4 text-sm text-slate-600">No hay equipos críticos entre los equipos habilitados.</p> : null}
              </div>
            </section>

            <section aria-labelledby="mobile-latest-activity">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900" id="mobile-latest-activity">Actividad reciente</h2>
                <button className="min-h-11 px-1 text-sm font-semibold text-teal-700 hover:text-teal-800" onClick={() => openTab("activity")} type="button">Ver historial</button>
              </div>
              <ul className="mt-2 divide-y divide-slate-200 border-y border-slate-200">
                {activityEvents.slice(0, 3).map((event) => (
                  <li className="py-4" key={event.id}>
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                      <span className="shrink-0 text-xs text-slate-600"><SnapshotTime value={event.timestamp} /></span>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-slate-600">{event.detail}</p>
                    <MachineReference machineId={event.machineId} machine={machines.find((machine) => machine.id === event.machineId)} source="mobile-activity" />
                  </li>
                ))}
              </ul>
              {!activityEvents.length ? <p className="py-4 text-sm text-slate-600">{canViewActivity ? "No hay actividad en los equipos habilitados." : "No tenés acceso a la actividad de estos equipos."}</p> : null}
            </section>
          </div>
        ) : null}

        {activeTab === "alerts" ? (
          <section aria-labelledby="mobile-alerts-title">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900" id="mobile-alerts-title">Alertas prioritarias</h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">{canViewAlerts ? `${dashboardSummary.activeAlerts} activas · Requieren revisión humana` : "No tenés acceso a las alertas de estos equipos."}</p>
            <div className="mt-5 divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white">
              {alerts.map((alert) => <AlertRow alert={alert} key={alert.id} machine={machines.find((machine) => machine.id === alert.machineId)} />)}
              {!alerts.length && canViewAlerts ? <p className="p-4 text-sm text-slate-600">No hay alertas en los equipos habilitados.</p> : null}
            </div>
          </section>
        ) : null}

        {activeTab === "machines" ? (
          <section aria-labelledby="mobile-machines-title">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900" id="mobile-machines-title">Máquinas</h1>
            <p className="mt-1 text-sm text-slate-600">Índice demo 0–100 · No es probabilidad de falla</p>
            <div aria-label="Filtrar máquinas por estado" className="mt-4 flex flex-wrap gap-2 pb-2" role="group">
              {filters.map((filter) => (
                <button
                  aria-pressed={statusFilter === filter.value}
                  className={`min-h-11 shrink-0 rounded-sm border px-3 text-sm font-medium ${statusFilter === filter.value ? "border-teal-700/40 bg-teal-50 text-teal-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  type="button"
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <p aria-live="polite" className="mt-1 text-xs text-slate-600">
              {filteredMachines.length === 1 ? "1 equipo visible" : `${filteredMachines.length} equipos visibles`}
            </p>
            <div className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white">
              {filteredMachines.map((machine) => <MachineRow key={machine.id} machine={machine} />)}
              {!filteredMachines.length ? <p className="p-4 text-sm text-slate-600">No hay equipos habilitados con este filtro.</p> : null}
            </div>
          </section>
        ) : null}

        {activeTab === "activity" ? (
          <section aria-labelledby="mobile-activity-title">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900" id="mobile-activity-title">Actividad</h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">Historial de estados, sensores y mantenimiento</p>
            <ol className="relative mt-6 ml-2 border-l border-slate-200 pl-5">
              {activityEvents.map((event) => (
                <li className="relative pb-6 last:pb-0" key={event.id}>
                  <span aria-hidden="true" className="absolute -left-[1.65rem] top-1 size-3 rounded-full border-2 border-[#f3f5f7] bg-slate-400" />
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <h2 className="text-sm font-semibold text-slate-900">{event.title}</h2>
                    <span className="shrink-0 text-xs text-slate-600"><SnapshotTime value={event.timestamp} /></span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{event.detail}</p>
                  <MachineReference machineId={event.machineId} machine={machines.find((machine) => machine.id === event.machineId)} source="mobile-activity" />
                </li>
              ))}
            </ol>
            {!activityEvents.length ? <p className="mt-4 text-sm text-slate-600">{canViewActivity ? "No hay actividad en los equipos habilitados." : "No tenés acceso a la actividad de estos equipos."}</p> : null}
          </section>
        ) : null}
      </div>

      <nav aria-label="Navegación móvil" className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto grid max-w-2xl grid-cols-4 gap-1 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                aria-current={active ? "page" : undefined}
                aria-label={tab.label}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-sm text-xs font-medium ${active ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:text-slate-900"}`}
                key={tab.id}
                onClick={() => openTab(tab.id)}
                type="button"
              >
                {tabIcon(tab.id)}
                <span>{tab.label}</span>
                {tab.id === "alerts" && unreadCount ? (
                  <span className="sr-only">, {unreadCount} {unreadCount === 1 ? "notificación" : "notificaciones"} sin leer</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>
    </section>
  );
}
