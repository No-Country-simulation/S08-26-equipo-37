import type { DashboardAsset } from "../_data/dashboard";
import { SensorTrend } from "./sensor-trend";
import { StatusBadge } from "./status-badge";

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function MachineDetail({ asset }: { asset: DashboardAsset }) {
  const probability = Math.round((asset.probability48h ?? 0) * 100);

  return (
    <section aria-labelledby="titulo-detalle" className="scroll-mt-32" id="detalle">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">Detalle del equipo</p>
          <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl" id="titulo-detalle">
            Señales que explican la atención
          </h2>
        </div>
        <a className="hidden text-xs font-medium text-teal-300 hover:text-teal-200 sm:block" href="#prioridades">
          Volver a la lista ↑
        </a>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#091523]/90 shadow-2xl shadow-black/15">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
          <article className="p-5 sm:p-7 lg:p-8">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-teal-300">{asset.id}</span>
                  <StatusBadge label={asset.statusLabel} status={asset.status} />
                </div>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">{asset.name}</h3>
                <p className="mt-2 text-sm text-slate-400">
                  {asset.manufacturer} · {asset.model}
                </p>
              </div>

              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-medium text-slate-300">
                <span
                  aria-hidden="true"
                  className={`size-1.5 rounded-full ${asset.operating ? "bg-emerald-300" : "bg-sky-300"}`}
                />
                {asset.operating ? "En operación" : "Detenida"}
              </span>
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-x-5 gap-y-6 border-t border-white/[0.07] pt-6 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-slate-400">Línea</dt>
                <dd className="mt-1 text-sm font-medium text-slate-200">{asset.line}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Criticidad</dt>
                <dd className="mt-1 text-sm font-medium text-slate-200">{asset.criticality}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Costo de parada</dt>
                <dd className="mt-1 text-sm font-medium text-slate-200">{currency.format(asset.downtimeCost)}/h</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Desde mantenimiento</dt>
                <dd className="mt-1 text-sm font-medium text-slate-200">{asset.maintenanceHours} h</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Fallas previas</dt>
                <dd className="mt-1 text-sm font-medium text-slate-200">{asset.previousFailures}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Lecturas</dt>
                <dd className="mt-1 text-sm font-medium text-slate-200">Cada hora</dd>
              </div>
            </dl>
          </article>

          <aside className="border-t border-white/10 bg-white/[0.025] p-5 sm:p-7 lg:p-8 xl:border-l xl:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Probabilidad a 48 h</p>
            {asset.probability48h === null ? (
              <p className="mt-3 text-2xl font-semibold text-sky-200">No aplica</p>
            ) : (
              <>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <p className="text-4xl font-semibold tracking-[-0.05em] text-white">{probability}%</p>
                  <span className="mb-1 rounded-md bg-amber-300/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-100">
                    Valor simulado
                  </span>
                </div>
                <div aria-hidden="true" className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                  <span className="block h-full rounded-full bg-gradient-to-r from-amber-300 to-rose-400" style={{ width: `${probability}%` }} />
                </div>
              </>
            )}

            <div className="mt-7 rounded-2xl border border-amber-300/15 bg-amber-300/[0.055] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-100/70">Señal principal</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white">{asset.reason}</p>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Acción sugerida</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">{asset.action}</p>
              <p className="mt-3 text-xs leading-5 text-slate-400">Requiere validación humana antes de generar una intervención.</p>
            </div>
          </aside>
        </div>

        <div className="border-t border-white/10 p-5 sm:p-7 lg:p-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-white">Tendencias de condición</h3>
              <p className="mt-1 text-xs text-slate-400">Últimas 12 lecturas horarias · escala visual normalizada</p>
            </div>
            <span className="text-xs text-slate-400">Los huecos se muestran como “sin dato”</span>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {asset.sensors.map((sensor) => (
              <SensorTrend key={sensor.key} trend={sensor} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
