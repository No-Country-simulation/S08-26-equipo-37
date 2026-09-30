import type { SensorTrend as SensorTrendData } from "@/features/maintenance/types";
import { scaleTrendPoints, trendPath } from "./trend-scale";

const toneStyles: Record<SensorTrendData["tone"], string> = {
  critical: "text-critical",
  warning: "text-warning",
  neutral: "text-body",
};

const number = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

export function SensorTrend({ trend }: { trend: SensorTrendData }) {
  const change = `${trend.change > 0 ? "+" : ""}${number.format(trend.change)}%`;
  const description = `${trend.label}: ${number.format(trend.value)} ${trend.unit}. Cambio de ${change} desde la primera lectura disponible. Evolución normalizada de lecturas simuladas: ${trend.points.map((point) => point === null ? "sin dato" : number.format(point)).join(", ")}.`;
  const scaledPoints = scaleTrendPoints(trend.points);

  return (
    <figure className="min-w-0 rounded-md border border-default bg-subtle p-4">
      <figcaption className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-xs font-medium text-secondary">{trend.label}</span>
          <span className="mt-2 flex items-baseline gap-1 font-mono text-2xl tabular-nums tracking-tight text-primary">
            {number.format(trend.value)}
            <span className="text-xs font-medium text-secondary">{trend.unit}</span>
          </span>
        </span>
        <span className="pt-0.5 font-mono text-[11px] tabular-nums text-secondary" title="Cambio desde la primera lectura disponible">{change}</span>
      </figcaption>

      <svg aria-label={description} className={`mt-3 h-24 w-full overflow-visible ${toneStyles[trend.tone]}`} role="img" viewBox="0 0 200 90">
        <path d="M0 10H200M0 45H200M0 80H200" fill="none" stroke="var(--chart-grid)" strokeOpacity=".35" strokeDasharray="2 4" />
        <path d={trendPath(scaledPoints)} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        {scaledPoints.map((point, position) => {
          const x = 5 + (position / Math.max(1, scaledPoints.length - 1)) * 190;
          return point === null ? (
            <path d={`M${x} 10V80`} key={x} stroke="var(--chart-missing)" strokeDasharray="2 4"><title>Sin dato</title></path>
          ) : (
            <circle cx={x} cy={10 + (100 - point) * 0.7} fill="var(--chart-point)" key={x} r="2.5" stroke="currentColor" strokeWidth="1.5">
              <title>{`${number.format(trend.points[position] ?? 0)} ${trend.unit}`}</title>
            </circle>
          );
        })}
      </svg>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-[10px] text-secondary">
        <span>{trend.points.length} lecturas · Escala relativa</span>
        {trend.points.includes(null) ? <span>┊ Sin dato</span> : null}
      </div>
    </figure>
  );
}
