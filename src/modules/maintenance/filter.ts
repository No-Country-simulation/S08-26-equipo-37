import type { HealthStatus, MaintenanceNotification } from "@/features/maintenance/types";
import type { MaintenanceSource } from "./types";

const notificationPermissions: Record<MaintenanceNotification["type"], string> = {
  "new-alert": "alerts.view",
  "status-change": "activity.view",
  recommendation: "machines.view",
  maintenance: "activity.view",
};

// The caller resolves permissions against the registered server-side resource hierarchy.
export function filterMaintenanceData(source: MaintenanceSource, canRead: (permission: string, machineId: string) => boolean) {
  const machines = source.machines.filter((machine) =>
    ["dashboard.view", "machines.list", "machines.view"].every((permission) => canRead(permission, machine.id)),
  );
  const visible = new Set(machines.map((machine) => machine.id));
  const alerts = source.alerts.filter((alert) => visible.has(alert.machineId) && canRead("alerts.view", alert.machineId));
  const activityEvents = source.activityEvents.filter((event) => visible.has(event.machineId) && canRead("activity.view", event.machineId));
  const notifications = source.notifications.filter((notification) =>
    visible.has(notification.machineId) && canRead(notificationPermissions[notification.type], notification.machineId),
  );
  const counts: Record<HealthStatus, number> = { healthy: 0, watch: 0, critical: 0, maintenance: 0 };
  for (const machine of machines) counts[machine.status] += 1;

  return {
    machines, alerts, activityEvents, notifications,
    priorityMachines: [...machines].sort((left, right) => right.riskScore - left.riskScore),
    dashboardSummary: {
      total: machines.length, counts,
      highCriticality: machines.filter((machine) => machine.criticality === "Alta").length,
      activeAlerts: alerts.filter((alert) => alert.status !== "closed").length,
    },
    canViewAlerts: machines.some((machine) => canRead("alerts.view", machine.id)),
    canViewActivity: machines.some((machine) => canRead("activity.view", machine.id)),
  };
}
