import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 text-primary">
      <section className="w-full max-w-lg rounded-lg border border-default bg-panel p-8">
        <p className="font-mono text-sm font-medium text-muted">404 / PredictiveMaintenance</p>
        <h1 className="mt-2 text-3xl font-semibold text-primary">Página no encontrada</h1>
        <p className="mt-3 leading-7 text-secondary">
          La ruta no existe o el equipo solicitado no forma parte de este corte simulado.
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center rounded-md bg-action px-5 text-sm font-semibold text-on-action hover:bg-action-hover"
          href="/"
        >
          Ir al centro de operaciones
        </Link>
      </section>
    </main>
  );
}
