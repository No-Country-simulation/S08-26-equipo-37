import type { SensorTrend as SensorTrendData } from "@/features/maintenance/types";
import { scaleTrendPoints } from "./trend-scale";

const toneStyles: Record<SensorTrendData["tone"], string> = {
  critical: "bg-rose-300 shadow-[0_0_12px_rgba(253,164,175,0.16)]",
  warning: "bg-amber-200 shadow-[0_0_12px_rgba(253,230,138,0.14)]",
  neutral: "bg-teal-300 shadow-[0_0_12px_rgba(94,234,212,0.14)]",
};

const number = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

export function SensorTrend({ trend }: { trend: SensorTrendData }) {
  const change = `${trend.change > 0 ? "+" : ""}${number.format(trend.change)}%`;
  const description = `${trend.label}: ${number.format(trend.value)} ${trend.unit}. Cambio de ${change}. Evolución normalizada de las últimas 12 horas.`;
  const scaledPoints = scaleTrendPoints(trend.points);

  return (
    <figure className="rounded-2xl border border-white/[0.08] bg-[#0b1828] p-4 sm:p-5">
      <figcaption className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-xs font-medium text-slate-400">{trend.label}</span>
          <span className="mt-1 flex items-baseline gap-1 text-2xl font-semibold tracking-tight text-white">
            {number.format(trend.value)}
            <span className="text-xs font-medium text-slate-400">{trend.unit}</span>
          </span>
        </span>
        <span className="rounded-lg bg-white/[0.045] px-2 py-1 text-xs font-medium text-slate-300">{change}</span>
      </figcaption>

      <div aria-label={description} className="sensor-grid mt-5 flex h-24 items-end gap-1.5 rounded-xl px-2 pt-2" role="img">
        {scaledPoints.map((point, position) => (
          <span
            aria-hidden="true"
            className={`min-h-1 flex-1 rounded-t-sm opacity-45 transition-opacity last:opacity-100 ${
              point === null ? "border-t border-dashed border-slate-500 bg-transparent" : toneStyles[trend.tone]
            }`}
            key={`${trend.key}-${position + 1}`}
            style={{ height: `${point ?? 8}%` }}
            title={point === null ? "Sin dato" : `${number.format(trend.points[position] ?? 0)} ${trend.unit}`}
          />
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400">
        <span>Hace 12 h</span>
        {trend.points.includes(null) ? <span>— Sin dato</span> : null}
        <span>Ahora</span>
      </div>
    </figure>
  );
}
