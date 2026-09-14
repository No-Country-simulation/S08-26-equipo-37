import Link from "next/link";

import type { DashboardAsset } from "../_data/dashboard";
import { StatusBadge } from "./status-badge";

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function PriorityList({
  assets,
  selectedAssetId,
}: {
  assets: readonly DashboardAsset[];
  selectedAssetId: string;
}) {
  return (
    <section aria-labelledby="lista-prioridades" className="scroll-mt-32" id="prioridades">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">Próximas revisiones</p>
          <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl" id="lista-prioridades">
            Orden de atención sugerido
          </h2>
        </div>
        <span className="hidden text-xs text-slate-400 sm:block">Seleccioná un equipo para ver sus señales</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a1625]/80 shadow-2xl shadow-black/10">
        <div className="hidden grid-cols-[4rem_minmax(12rem,1.3fr)_minmax(9rem,0.9fr)_7rem_minmax(12rem,1fr)] gap-4 border-b border-white/10 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 lg:grid">
          <span>Orden</span>
          <span>Equipo</span>
          <span>Estado</span>
          <span>48 h</span>
          <span>Señal principal</span>
        </div>

        <ol className="divide-y divide-white/[0.07]">
          {assets.map((asset) => {
            const isSelected = asset.id === selectedAssetId;

            return (
              <li key={asset.id}>
                <Link
                  aria-current={isSelected ? "true" : undefined}
                  className={`group grid min-h-28 gap-4 px-4 py-4 outline-none transition hover:bg-white/[0.04] focus-visible:bg-white/[0.06] sm:px-5 lg:grid-cols-[4rem_minmax(12rem,1.3fr)_minmax(9rem,0.9fr)_7rem_minmax(12rem,1fr)] lg:items-center ${
                    isSelected ? "bg-teal-300/[0.055] shadow-[inset_3px_0_0_#2dd4bf]" : ""
                  }`}
                  href={`/?asset=${asset.id}#detalle`}
                >
                  <span className="flex items-center justify-between lg:block">
                    <span className="font-mono text-lg font-semibold text-slate-300">#{asset.priority}</span>
                    <span className="text-xs text-slate-400 lg:hidden">{asset.criticality} criticidad</span>
                  </span>

                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-teal-300">{asset.id}</span>
                      {isSelected ? <span className="text-[10px] uppercase tracking-wider text-teal-200">Seleccionado</span> : null}
                    </span>
                    <span className="mt-1 block truncate text-sm font-semibold text-white sm:text-base">{asset.name}</span>
                    <span className="mt-1 block truncate text-xs text-slate-400">
                      {asset.model} · {asset.line}
                    </span>
                  </span>

                  <span className="flex items-center justify-between gap-4 lg:block">
                    <StatusBadge label={asset.statusLabel} status={asset.status} />
                    <span className="text-xs text-slate-400 lg:mt-2 lg:block">
                      {currency.format(asset.downtimeCost)}/h
                    </span>
                  </span>

                  <span className="flex items-baseline gap-2 lg:block">
                    <span className="text-xl font-semibold tabular-nums text-white">
                      {Math.round((asset.probability48h ?? 0) * 100)}%
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 lg:block">Mock v0</span>
                  </span>

                  <span className="flex items-center justify-between gap-4 text-sm leading-5 text-slate-300">
                    <span>{asset.reason}</span>
                    <span aria-hidden="true" className="text-lg text-teal-300 transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
