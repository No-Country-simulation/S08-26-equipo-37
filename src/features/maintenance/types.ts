export type HealthStatus = "healthy" | "watch" | "critical" | "maintenance";
export type MachineStatusFilter = HealthStatus | "all";

export type SensorTrendTone = "critical" | "warning" | "neutral";

export type SensorTrend = {
  key: string;
  label: string;
  value: number;
  unit: string;
  /** Percentage change from the first available point in the displayed window. */
  change: number;
  tone: SensorTrendTone;
  points: readonly (number | null)[];
};

export type MachineVisual =
  | "lathe"
  | "mill"
  | "compressor"
  | "machining-center"
  | "hydraulic"
  | "auxiliary";

export type Criticality = "Alta" | "Media" | "Baja";

export type Machine = {
  id: string;
  name: string;
  type: string;
  model: string;
  visual: MachineVisual;
  status: HealthStatus;
  statusLabel: string;
  criticality: Criticality;
  /** Demo condition index from 0 to 100; it is not a failure probability. */
  riskScore: number;
  updatedAt: string;
  sector: string;
  summary: string;
  signal: string;
  recommendation: string;
  operating: boolean;
  sensors: readonly SensorTrend[];
};

export type AlertSeverity = "critical" | "high" | "medium";
export type AlertStatus = "open" | "under-review" | "planned" | "in-progress" | "closed";
export type AlertCategory = "sensor" | "condition" | "maintenance";

export type Alert = {
  id: string;
  machineId: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  timestamp: string;
  status: AlertStatus;
  category: AlertCategory;
};

export type NotificationType = "new-alert" | "status-change" | "recommendation" | "maintenance";

export type MaintenanceNotification = {
  id: string;
  machineId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
};

export type Notification = MaintenanceNotification;

export type ActivityEventType = "alert" | "status-change" | "inspection" | "maintenance";

export type ActivityEvent = {
  id: string;
  machineId: string;
  type: ActivityEventType;
  title: string;
  detail: string;
  timestamp: string;
};

export type DashboardSummary = {
  total: number;
  counts: Record<HealthStatus, number>;
  highCriticality: number;
  activeAlerts: number;
};
