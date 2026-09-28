import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AdminForm } from "@/app/_components/admin-form";
import { MachineImage } from "@/app/_components/machine-image";
import { requireAuthenticatedUser } from "@/modules/identity/auth";
import {
  addExternalImageAction, removeImageAction, reorderImageAction, savePresentationAction,
  setPrimaryImageAction, uploadImageAction,
} from "@/modules/machine-presentation/actions";
import { getAdminMachine, primaryImage } from "@/modules/machine-presentation/service";
import { machineRefSchema } from "@/modules/machine-presentation/validation";

export default async function AdminMachinePage({ params }: { params: Promise<unknown> }) {
  const actor = await requireAuthenticatedUser();
  const parsed = z.object({ machineRef: machineRefSchema }).safeParse(await params);
  if (!parsed.success) notFound();
  const record = await getAdminMachine(actor, parsed.data.machineRef);
  if (!record) notFound();
  const { machine, presentation, canUpdateImages, canUpdatePresentation, storageAvailability } = record;

  return (
    <div className="space-y-7">
      <header>
        <Link className="inline-flex min-h-11 items-center text-sm font-medium text-teal-700 hover:text-teal-800" href="/admin/machines">← Volver a máquinas</Link>
        <div className="mt-2 flex items-start justify-between gap-5">
          <div>
            <p className="font-mono text-sm text-slate-500">{machine.id}</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{presentation.displayNameOverride ?? machine.name}</h1>
            <p className="mt-2 text-sm text-slate-600">{machine.sector}</p>
          </div>
          <MachineImage className="aspect-[8/5] w-24 shrink-0 rounded-md sm:w-36" image={primaryImage(presentation)} label={machine.name} visual={machine.visual} />
        </div>
      </header>

      <section aria-labelledby="presentation-title" className="admin-panel space-y-4 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900" id="presentation-title">Presentación</h2>
        {canUpdatePresentation ? (
          <AdminForm action={savePresentationAction} submitLabel="Guardar presentación">
            <input name="machineRef" type="hidden" value={machine.id} />
            <label className="admin-label">Nombre visible
              <input className="admin-input" defaultValue={presentation.displayNameOverride ?? ""} maxLength={160} name="displayNameOverride" placeholder={machine.name} />
            </label>
            <label className="admin-label">Descripción breve
              <textarea className="admin-input" defaultValue={presentation.shortDescription ?? ""} maxLength={1000} name="shortDescription" rows={3} />
            </label>
            <p className="text-xs leading-5 text-slate-500">Dejá el nombre vacío para usar «{machine.name}». Estos cambios no alteran los datos técnicos.</p>
          </AdminForm>
        ) : <p className="text-sm text-slate-600">{presentation.shortDescription ?? "Sin descripción personalizada."}</p>}
      </section>

      <section aria-labelledby="gallery-title" className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900" id="gallery-title">Galería</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">La imagen principal aparece en el dashboard. Sin imágenes se utiliza la ilustración original.</p>
        </div>
        {!presentation.images.length ? <p className="admin-panel p-5 text-sm text-slate-600">Todavía no hay imágenes configuradas.</p> : null}
        <ol className="space-y-4">
          {presentation.images.map((image, index) => (
            <li className="admin-panel p-5" key={image.id}>
              <div className="flex flex-col gap-5 md:flex-row">
                <MachineImage className="aspect-[8/5] w-full max-w-64 shrink-0 rounded-md" image={image} label={machine.name} visual={machine.visual} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500">Imagen {index + 1}{image.isPrimary ? " · Principal" : ""}</p>
                  <p className="mt-2 text-sm text-slate-900">{image.alt}</p>
                  <a className="mt-2 block break-all text-xs text-teal-700 hover:text-teal-800" href={image.url} referrerPolicy="no-referrer" rel="noreferrer" target="_blank">Abrir imagen</a>
                  {canUpdateImages ? <div className="mt-4 flex flex-wrap items-start gap-4">
                    {!image.isPrimary ? <AdminForm action={setPrimaryImageAction} submitLabel="Usar como principal">
                      <input name="machineRef" type="hidden" value={machine.id} /><input name="imageId" type="hidden" value={image.id} />
                    </AdminForm> : null}
                    <AdminForm action={reorderImageAction} submitLabel="Mover">
                      <input name="machineRef" type="hidden" value={machine.id} /><input name="imageId" type="hidden" value={image.id} />
                      <label className="admin-label">Posición
                        <input className="admin-input max-w-24" defaultValue={index + 1} max={presentation.images.length} min={1} name="position" required type="number" />
                      </label>
                    </AdminForm>
                    <AdminForm action={removeImageAction} confirmLabel="Confirmo quitar esta imagen de la galería" submitLabel="Quitar imagen">
                      <input name="machineRef" type="hidden" value={machine.id} /><input name="imageId" type="hidden" value={image.id} />
                    </AdminForm>
                  </div> : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {canUpdateImages ? <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="external-title" className="admin-panel space-y-4 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900" id="external-title">Agregar URL externa</h2>
          <AdminForm action={addExternalImageAction} submitLabel="Agregar imagen">
            <input name="machineRef" type="hidden" value={machine.id} />
            <label className="admin-label">URL de la imagen
              <input className="admin-input" maxLength={2048} name="url" placeholder="https://…/equipo.jpg" required type="url" />
            </label>
            <label className="admin-label">Descripción de la imagen
              <input className="admin-input" maxLength={240} name="alt" placeholder="Vista frontal del torno CNC" required />
            </label>
            <p className="text-xs leading-5 text-slate-500">HTTPS público con extensión JPEG, PNG o WEBP. La disponibilidad depende del sitio de origen.</p>
          </AdminForm>
        </section>
        <section aria-labelledby="upload-title" className="admin-panel space-y-4 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900" id="upload-title">Subir una imagen</h2>
          {storageAvailability === "available" ? <AdminForm action={uploadImageAction} submitLabel="Subir imagen">
            <input name="machineRef" type="hidden" value={machine.id} />
            <label className="admin-label">Archivo
              <input accept="image/jpeg,image/png,image/webp" className="admin-input" name="file" required type="file" />
            </label>
            <label className="admin-label">Descripción de la imagen
              <input className="admin-input" maxLength={240} name="alt" required />
            </label>
            <p className="text-xs leading-5 text-slate-500">JPEG, PNG o WEBP, hasta 5 MiB. No se admiten SVG.</p>
          </AdminForm> : <p className="text-sm leading-6 text-slate-600">
            {storageAvailability === "misconfigured" ? "El almacenamiento tiene una configuración incompleta o inválida. Contactá a quien administra el despliegue." : "La carga de archivos estará disponible cuando se configure el almacenamiento. Podés agregar imágenes mediante URL externa."}
          </p>}
        </section>
      </div> : null}

      <p className="text-xs leading-5 text-slate-500">Quitar una imagen elimina su referencia en este equipo. Si quitás la principal se usa la siguiente; si quitás la última vuelve la ilustración original.</p>
    </div>
  );
}
