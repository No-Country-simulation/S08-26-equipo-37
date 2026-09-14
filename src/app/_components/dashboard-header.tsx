const navigation = [
  { href: "#resumen", label: "Resumen" },
  { href: "#prioridades", label: "Prioridades" },
  { href: "#detalle", label: "Detalle" },
];

export function DashboardHeader() {
  return (
    <>
      <a className="skip-link" href="#contenido">
        Ir al contenido
      </a>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07111f]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between gap-4 px-4 sm:h-[72px] sm:px-6 lg:px-10">
          <a className="group flex min-w-0 items-center gap-3" href="#resumen">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-teal-400 font-black tracking-tight text-[#061019] shadow-[0_0_28px_rgba(45,212,191,0.18)] transition-transform group-hover:-rotate-3">
              PM
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-tight text-white sm:text-base">
                PredictiveMaintenance
              </span>
              <span className="hidden text-xs text-slate-400 sm:block">Centro de mantenimiento</span>
            </span>
          </a>

          <nav aria-label="Secciones del tablero" className="hidden items-center gap-1 md:flex">
            {navigation.map((item) => (
              <a
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-200 sm:text-xs">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-teal-300" />
            Demo
          </span>
        </div>

        <div className="border-t border-amber-300/10 bg-amber-300/[0.06] px-4 py-2 text-center text-xs leading-5 text-amber-100/80 sm:px-6">
          Maqueta con datos simulados. No está conectada al backend ni a un modelo predictivo.
        </div>
      </header>
    </>
  );
}
