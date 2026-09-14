import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#07111f] px-4 text-slate-100">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0a1828] p-8 text-center shadow-xl shadow-black/20">
        <p className="font-mono text-sm font-bold text-teal-300">404</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Página no encontrada</h1>
        <p className="mt-3 leading-7 text-slate-300">
          La ruta no existe o el equipo solicitado no forma parte de este corte simulado.
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-teal-300 px-5 font-bold text-[#07111f] hover:bg-teal-200"
          href="/"
        >
          Ir al centro de operaciones
        </Link>
      </section>
    </main>
  );
}
