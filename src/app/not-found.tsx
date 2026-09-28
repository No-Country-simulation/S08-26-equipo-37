import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f3f5f7] px-4 text-slate-900">
      <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-8">
        <p className="font-mono text-sm font-medium text-slate-500">404 / PredictiveMaintenance</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Página no encontrada</h1>
        <p className="mt-3 leading-7 text-slate-600">
          La ruta no existe o el equipo solicitado no forma parte de este corte simulado.
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center rounded-md bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800"
          href="/"
        >
          Ir al centro de operaciones
        </Link>
      </section>
    </main>
  );
}
