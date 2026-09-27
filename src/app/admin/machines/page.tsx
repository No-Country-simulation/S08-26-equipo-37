import Link from "next/link";
import { z } from "zod";
import { MachineImage } from "@/app/_components/machine-image";
import { StatusBadge } from "@/app/_components/status-badge";
import { requireAuthenticatedUser } from "@/modules/identity/auth";
import { getAdminMachines, primaryImage } from "@/modules/machine-presentation/service";

export default async function AdminMachinesPage({ searchParams }: { searchParams: Promise<unknown> }) {
  const actor = await requireAuthenticatedUser();
  const parsed = z.object({ q: z.string().trim().max(160).optional() }).safeParse(await searchParams);
  const query = parsed.success ? parsed.data.q ?? "" : "";
  const records = (await getAdminMachines(actor)).filter(({ machine, presentation }) =>
    `${machine.id} ${presentation.displayNameOverride ?? machine.name} ${machine.sector}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")),
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Configuración visual</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Máquinas</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Nombres, descripciones e imágenes de los equipos dentro de tu ámbito de acceso.</p>
      </header>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="admin-label min-w-0 flex-1">
          Buscar equipo
          <input className="admin-input" defaultValue={query} maxLength={160} name="q" placeholder="Referencia, nombre o sector" type="search" />
        </label>
        <button className="admin-button" type="submit">Buscar</button>
        {query ? <Link className="inline-flex min-h-11 items-center px-2 text-sm text-teal-700" href="/admin/machines">Limpiar</Link> : null}
      </form>

      <div className="admin-panel overflow-x-auto">
        <table className="admin-table">
          <caption className="sr-only">Máquinas autorizadas y su configuración de presentación</caption>
          <thead><tr><th scope="col">Equipo</th><th scope="col">Sector / línea</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead>
          <tbody>
            {records.map(({ machine, presentation, canUpdateImages, canUpdatePresentation }) => (
              <tr key={machine.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <MachineImage className="aspect-[8/5] w-20 shrink-0 rounded-md" image={primaryImage(presentation)} label={machine.name} visual={machine.visual} />
                    <div><p className="font-mono text-xs text-slate-500">{machine.id}</p><p className="mt-1 font-medium text-slate-900">{presentation.displayNameOverride ?? machine.name}</p></div>
                  </div>
                </td>
                <td>{machine.sector}</td>
                <td><StatusBadge label={machine.statusLabel} status={machine.status} /></td>
                <td>
                  <Link className="inline-flex min-h-11 items-center font-medium text-teal-700 hover:text-teal-800" href={`/admin/machines/${machine.id}`}>
                    {canUpdateImages || canUpdatePresentation ? "Editar presentación y galería" : "Ver presentación"}
                  </Link>
                </td>
              </tr>
            ))}
            {!records.length ? <tr><td colSpan={4}>No hay equipos disponibles para tu acceso y esta búsqueda.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <p className="text-xs leading-5 text-slate-500">Esta sección no modifica sensores, telemetría, predicciones ni el modelo técnico del equipo.</p>
    </div>
  );
}
