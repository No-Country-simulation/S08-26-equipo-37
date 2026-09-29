import Link from "next/link";
import { requireAuthenticatedUser } from "@/modules/identity/auth";
import { assignmentState } from "@/modules/identity/policy";
import { AccountForm } from "../_components/account-form";
import { UserMenu } from "../_components/user-menu";
import { changePasswordAction, logoutAction, updateThemeAction } from "../auth-actions";

const format = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });

export default async function Profile() {
  const user = await requireAuthenticatedUser({ allowPasswordChange: true });
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <header className="mb-6 flex items-center justify-between gap-4"><Link className="text-sm font-medium text-action" href="/">← Centro de operaciones</Link><UserMenu /></header>
    <h1 className="text-3xl font-semibold tracking-tight">Mi perfil</h1>
    {user.mustChangePassword ? <p className="mt-4 rounded border border-warning-border bg-warning-subtle p-4 text-sm text-warning-strong" role="alert">La administración requiere que cambies tu contraseña antes de continuar.</p> : null}
    <section className="admin-panel mt-6 flex flex-wrap items-center gap-5" aria-label="Datos de mi cuenta">
      {user.avatarUrl ? (
        // User-hosted images load in the browser; never proxy arbitrary URLs through the server.
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={`Avatar de ${user.name}`} className="size-16 rounded-full border border-default object-cover" height={64} referrerPolicy="no-referrer" src={user.avatarUrl} width={64} />
      ) : <span aria-hidden="true" className="grid size-16 place-items-center rounded-full bg-inset text-2xl font-semibold text-body">{user.name.slice(0, 1).toUpperCase()}</span>}
      <div><p className="text-xl font-semibold">{user.name}</p><p className="mt-1 text-sm text-secondary">{user.email}</p><p className="mt-2 text-xs text-secondary">Último acceso: {user.lastLoginAt ? format.format(user.lastLoginAt) : "Sin registros"}</p></div>
    </section>
    <section className="admin-panel mt-6 max-w-xl" aria-labelledby="profile-appearance">
      <h2 className="mb-2 text-lg font-semibold" id="profile-appearance">Apariencia</h2>
      <p className="mb-5 text-sm text-secondary">El tema claro es el predeterminado. Tu elección se guarda en tu cuenta para los próximos ingresos.</p>
      <AccountForm action={updateThemeAction} submitLabel="Guardar apariencia">
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Tema de la aplicación</legend>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-default px-4 py-3 has-checked:border-action has-checked:ring-1 has-checked:ring-action">
            <input className="size-4 accent-action" defaultChecked={user.theme === "light"} name="theme" type="radio" value="light" />
            <span className="text-sm font-medium">Claro</span>
          </label>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-default px-4 py-3 has-checked:border-action has-checked:ring-1 has-checked:ring-action">
            <input className="size-4 accent-action" defaultChecked={user.theme === "dark"} name="theme" type="radio" value="dark" />
            <span className="text-sm font-medium">Oscuro</span>
          </label>
        </fieldset>
      </AccountForm>
    </section>
    <section className="admin-panel mt-6" aria-labelledby="profile-access"><h2 className="text-lg font-semibold" id="profile-access">Mis roles y accesos</h2><p className="mt-1 text-sm text-secondary">Los cambios de permisos los realiza la administración.</p>
      <div className="mt-4 overflow-x-auto"><table className="admin-table"><thead><tr><th>Rol</th><th>Ámbito</th><th>Desde</th><th>Hasta</th><th>Estado</th></tr></thead><tbody>{user.assignments.map((item) => <tr key={item.id}><td>{item.role.name}</td><td>{item.scopeType} {item.scopeRef}</td><td>{item.validFrom ? format.format(item.validFrom) : "Sin límite"}</td><td>{item.validUntil ? format.format(item.validUntil) : "Sin límite"}</td><td>{assignmentState(user.status, item)}</td></tr>)}</tbody></table></div>
      {!user.assignments.length ? <p className="mt-4 text-sm text-secondary">No tenés accesos asignados.</p> : null}
    </section>
    <section className="admin-panel mt-6 max-w-xl" aria-labelledby="change-password"><h2 className="mb-2 text-lg font-semibold" id="change-password">Cambiar contraseña</h2><p className="mb-5 text-sm text-secondary">Usá entre 12 y 128 caracteres. Se cerrarán todas tus sesiones y deberás volver a ingresar.</p>
      <AccountForm action={changePasswordAction} submitLabel="Guardar contraseña"><label className="admin-label">Contraseña actual<input autoComplete="current-password" className="admin-input" maxLength={128} name="currentPassword" required type="password" /></label><label className="admin-label">Nueva contraseña<input autoComplete="new-password" className="admin-input" maxLength={128} minLength={12} name="password" required type="password" /></label></AccountForm>
    </section>
    <form action={logoutAction} className="mt-6"><button className="admin-button" type="submit">Cerrar sesión</button></form>
  </main>;
}
