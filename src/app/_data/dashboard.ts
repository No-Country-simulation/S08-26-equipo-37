import { z } from "zod";

export type HealthStatus = "healthy" | "watch" | "critical" | "maintenance";

export type SensorTrend = {
  key: string;
  label: string;
  value: number;
  unit: string;
  /** Percentage change from the first available point in the 12-hour window. */
  change: number;
  tone: "critical" | "warning" | "neutral";
  points: readonly (number | null)[];
};

export type DashboardAsset = {
  id: string;
  name: string;
  model: string;
  manufacturer: string;
  line: string;
  criticality: "Alta" | "Media" | "Baja";
  status: HealthStatus;
  statusLabel: string;
  priority: number;
  probability48h: number | null;
  downtimeCost: number;
  maintenanceHours: number;
  previousFailures: number;
  operating: boolean;
  reason: string;
  action: string;
  sensors: readonly SensorTrend[];
};

export type DashboardSnapshot = {
  updatedAt: string;
  scope: string;
  total: number;
  counts: {
    healthy: number;
    watch: number;
    critical: number;
    maintenance: number;
  };
  note: string;
};

export const dashboardSnapshot: DashboardSnapshot = {
  updatedAt: "2026-04-27 10:00",
  scope: "Líneas A y B",
  total: 13,
  counts: { healthy: 8, watch: 2, critical: 2, maintenance: 1 },
  note: "Demo estática: P(48 h) y prioridad son ilustrativas; las 12 lecturas horarias preservan faltantes del CSV.",
};

export const mockAssets = [
  {
    id: "M-01",
    name: "Torno CNC",
    model: "Haas ST-30",
    manufacturer: "Haas Automation",
    line: "Línea A · Mecanizado pesado",
    criticality: "Alta",
    status: "critical",
    statusLabel: "Riesgo crítico",
    priority: 1,
    probability48h: 0.87,
    downtimeCost: 1_500,
    maintenanceHours: 128,
    previousFailures: 6,
    operating: true,
    reason: "Temperatura elevada: 95,19 °C, con tendencia ascendente.",
    action: "Programar intervención dentro de las próximas 48 h.",
    sensors: [
      {
        key: "temperature",
        label: "Temperatura",
        value: 95.19,
        unit: "°C",
        change: 12.4,
        tone: "critical",
        points: [84.7, null, 89.72, 89.29, 89.69, 90.35, null, 87.09, 92.79, 92.64, 92.59, 95.19],
      },
      {
        key: "vibration",
        label: "Vibración",
        value: 3.19,
        unit: "mm/s",
        change: 11.5,
        tone: "warning",
        points: [2.86, 3.03, 3.27, 3.23, 2.3, 2.94, 2.64, 2.91, 2.97, 3.08, 2.88, 3.19],
      },
      {
        key: "pressure",
        label: "Presión",
        value: 5.58,
        unit: "bar",
        change: 15.5,
        tone: "warning",
        points: [4.83, 4.8, 5.22, 5.03, 4.86, 4.87, 4.9, 4.78, 4.97, 5.18, 5.32, 5.58],
      },
    ],
  },
  {
    id: "M-09",
    name: "Fresadora industrial",
    model: "Bridgeport V1000",
    manufacturer: "Bridgeport",
    line: "Línea B · Mecanizado de precisión",
    criticality: "Baja",
    status: "critical",
    statusLabel: "Riesgo crítico",
    priority: 2,
    probability48h: 0.72,
    downtimeCost: 450,
    maintenanceHours: 82,
    previousFailures: 5,
    operating: true,
    reason: "Temperatura ascendente y advertencia de tendencia anómala.",
    action: "Inspeccionar el motor y programar intervención dentro de 48 h.",
    sensors: [
      {
        key: "temperature",
        label: "Temperatura",
        value: 92.6,
        unit: "°C",
        change: 9.1,
        tone: "critical",
        points: [84.84, 86.38, 85.25, 83.62, 86.18, 86.68, 83.5, 84.49, 88.43, 89.76, 90.91, 92.6],
      },
      {
        key: "vibration",
        label: "Vibración",
        value: 3.31,
        unit: "mm/s",
        change: 2.2,
        tone: "warning",
        points: [3.24, 2.98, 2.93, 2.65, 2.77, 2.56, 2.95, 2.82, 2.99, 3.22, 3.26, 3.31],
      },
      {
        key: "pressure",
        label: "Presión",
        value: 5.11,
        unit: "bar",
        change: 1,
        tone: "neutral",
        points: [5.06, 4.88, 4.67, 4.86, 5.11, null, 4.81, 4.76, 4.87, 5.02, 5.27, 5.11],
      },
    ],
  },
  {
    id: "M-02",
    name: "Torno CNC",
    model: "Haas ST-30",
    manufacturer: "Haas Automation",
    line: "Línea A · Mecanizado pesado",
    criticality: "Alta",
    status: "watch",
    statusLabel: "Bajo observación",
    priority: 3,
    probability48h: 0.38,
    downtimeCost: 1_500,
    maintenanceHours: 385,
    previousFailures: 5,
    operating: true,
    reason: "Vibración elevada en la ventana reciente.",
    action: "Monitorear vibración y revisar en el próximo turno.",
    sensors: [
      {
        key: "temperature",
        label: "Temperatura",
        value: 80.14,
        unit: "°C",
        change: 10.3,
        tone: "warning",
        points: [72.68, 75.47, 79.77, 77.1, 82.34, 81.86, 78.89, 76.4, 79.5, 82.37, 83.28, 80.14],
      },
      {
        key: "vibration",
        label: "Vibración",
        value: 3.81,
        unit: "mm/s",
        change: 12.1,
        tone: "warning",
        points: [3.4, null, 3.8, 3.77, 3.11, 3.34, 3.69, 3.46, 4.53, 4.27, 4.4, 3.81],
      },
      {
        key: "pressure",
        label: "Presión",
        value: 3.72,
        unit: "bar",
        change: 14.1,
        tone: "neutral",
        points: [3.26, 3.28, 3.78, 3.54, 3.51, null, 3.65, 3.39, 3.59, 4.16, 3.99, 3.72],
      },
    ],
  },
  {
    id: "M-13",
    name: "Rectificadora plana",
    model: "Chevalier Smart-H1224",
    manufacturer: "Chevalier",
    line: "Línea B · Mecanizado de precisión",
    criticality: "Baja",
    status: "watch",
    statusLabel: "Bajo observación",
    priority: 4,
    probability48h: 0.31,
    downtimeCost: 400,
    maintenanceHours: 423,
    previousFailures: 6,
    operating: true,
    reason: "423 h desde el último mantenimiento y presión en ascenso.",
    action: "Mantener en observación y planificar una revisión preventiva.",
    sensors: [
      {
        key: "temperature",
        label: "Temperatura",
        value: 85.84,
        unit: "°C",
        change: 4,
        tone: "warning",
        points: [82.57, 81.84, 83.71, 82.71, 81.79, 83.25, 84.94, 82.97, 84.45, 90.03, 84.43, 85.84],
      },
      {
        key: "vibration",
        label: "Vibración",
        value: 3.93,
        unit: "mm/s",
        change: -1.3,
        tone: "warning",
        points: [3.98, 4.29, 4.22, 3.93, 3.82, null, 4.36, 3.96, 3.96, 4.05, 3.6, 3.93],
      },
      {
        key: "pressure",
        label: "Presión",
        value: 3.88,
        unit: "bar",
        change: 18.7,
        tone: "warning",
        points: [3.27, 3.6, 3.68, 3.54, null, 3.56, 3.43, 3.12, 3.49, 3.41, 3.44, 3.88],
      },
    ],
  },
] satisfies readonly DashboardAsset[];

export const priorityAssets = mockAssets;

const assetIdSchema = z.string().catch("M-01");

export function getMockAsset(value: unknown): DashboardAsset {
  const id = assetIdSchema.parse(value);

  return mockAssets.find((asset) => asset.id === id) ?? mockAssets[0];
}
