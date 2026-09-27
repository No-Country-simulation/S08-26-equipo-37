import type { ActivityEvent, Alert, DashboardSummary, Machine, MaintenanceNotification } from "@/features/maintenance/types";

export type MachineView = Machine & { image: { url: string; alt: string } | null };

export type MaintenanceSource = {
  machines: readonly Machine[];
  alerts: readonly Alert[];
  activityEvents: readonly ActivityEvent[];
  notifications: readonly MaintenanceNotification[];
};

export type DashboardReadModel = {
  machines: MachineView[];
  priorityMachines: MachineView[];
  alerts: Alert[];
  activityEvents: ActivityEvent[];
  notifications: MaintenanceNotification[];
  dashboardSummary: DashboardSummary;
  canViewAlerts: boolean;
  canViewActivity: boolean;
};
