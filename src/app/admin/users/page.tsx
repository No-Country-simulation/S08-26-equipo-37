import Link from "next/link";
import { getUsers } from "@/modules/admin/service";
import { Empty, Field, formatDate, PageTitle, Status } from "../_components";

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { users, filters, canCreate } = await getUsers(await searchParams);
  return <>
    <PageTitle title="Usuarios" description="Cuentas y asignaciones dentro de tu ámbito. Solo podés administrar una persona si todos sus accesos están cubiertos por tus permisos.">
      {canCreate ? <Link className="admin-button" href="/admin/users/new">Invitar usuario</Link> : null}
    </PageTitle>
    <form className="admin-panel mb-5 grid items-end gap-4 sm:grid-cols-[1fr_220px_auto_auto]" method="get">
      <Field label="Buscar nombre o email"><input className="admin-input" defaultValue={filters.q} maxLength={120} name="q" placeholder="Nombre o email" type="search" /></Field>
      <Field label="Estado"><select className="admin-input" defaultValue={filters.status} name="status"><option value="">Todos</option><option value="ACTIVE">Activo</option><option value="INVITED">Invitado</option><option value="SUSPENDED">Suspendido</option></select></Field>
      <button className="admin-button" type="submit">Filtrar</button><Link className="inline-flex min-h-11 items-center text-sm text-action" href="/admin/users">Limpiar</Link>
    </form>
    <section className="admin-panel" aria-label="Directorio de usuarios">
      <p className="mb-4 text-sm text-secondary">{users.length} {users.length === 1 ? "usuario visible" : "usuarios visibles"}</p>
      {users.length ? <div className="overflow-x-auto"><table className="admin-table"><thead><tr><th scope="col">Persona</th><th scope="col">Estado</th><th scope="col">Accesos</th><th scope="col">Último ingreso (UTC)</th><th scope="col">Acción</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><p className="font-medium text-primary">{user.name}</p><p className="mt-1 text-xs text-secondary">{user.email}</p></td><td><Status value={user.status} />{user.mustChangePassword ? <p className="mt-1 text-xs text-warning">Cambio de contraseña requerido</p> : null}</td><td className="font-mono tabular-nums">{user.assignments.length}</td><td className="text-xs">{formatDate(user.lastLoginAt)}</td><td><Link aria-label={`Ver usuario ${user.name}`} className="inline-flex min-h-11 items-center font-medium text-action" href={`/admin/users/${user.id}`}>Ver detalle →</Link></td></tr>)}</tbody></table></div> : <Empty />}
    </section>
  </>;
}
