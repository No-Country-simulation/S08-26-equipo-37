import Link from "next/link";
import { getCurrentUser } from "@/modules/identity/auth";
import { hasAnyPermission } from "@/modules/identity/policy";
import { logoutAction } from "../auth-actions";

export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;
  const admin = ["users.view", "users.create", "roles.view", "users.manage_access", "machines.presentation.update", "machines.images.update", "audit.view", "settings.view", "settings.update"].some((key) => hasAnyPermission(user, key));
  const initials = user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <details className="relative shrink-0">
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800" aria-label={`Cuenta de ${user.name}`}>
      <span aria-hidden="true" className="grid size-7 place-items-center rounded bg-slate-100 text-xs font-semibold">{initials}</span>
      <span className="hidden max-w-36 truncate sm:block">{user.name}</span><span aria-hidden="true">⌄</span>
    </summary>
    <div className="absolute right-0 top-full z-[80] mt-2 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
      <p className="truncate px-3 py-2 text-sm font-semibold text-slate-900">{user.name}</p>
      <Link className="flex min-h-11 items-center rounded px-3 text-sm text-slate-700 hover:bg-slate-50" href="/profile">Perfil</Link>
      {admin ? <Link className="flex min-h-11 items-center rounded px-3 text-sm text-teal-800 hover:bg-teal-50" href="/admin">Administración</Link> : null}
      <form action={logoutAction}><button className="flex min-h-11 w-full items-center rounded px-3 text-sm text-slate-700 hover:bg-slate-50" type="submit">Cerrar sesión</button></form>
    </div>
  </details>;
}
