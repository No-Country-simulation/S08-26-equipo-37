import Link from "next/link";
import type { ReactNode } from "react";
import type { Assignment } from "@/modules/identity/policy";
import type { PermissionKey } from "@/modules/identity/catalog";

export const scopeLabels = { GLOBAL: "Global", ORGANIZATION: "Organización", PLANT: "Planta", AREA: "Área", MACHINE: "Máquina" };
export const statusLabels = { ACTIVE: "Activo", INVITED: "Invitado", SUSPENDED: "Suspendido" };
export const permissionLabels: Record<PermissionKey, string> = {
  "dashboard.view": "Ver panel", "machines.list": "Listar máquinas", "machines.view": "Ver detalle de máquinas", "machines.presentation.update": "Editar presentación de máquinas", "machines.images.update": "Administrar imágenes de máquinas", "alerts.view": "Ver alertas", "alerts.acknowledge": "Reconocer alertas", "alerts.assign": "Asignar alertas", "alerts.update_status": "Actualizar estado de alertas", "activity.view": "Ver actividad", "users.view": "Ver usuarios", "users.create": "Crear e invitar usuarios", "users.update": "Editar usuarios", "users.suspend": "Suspender o reactivar usuarios", "users.reset_password": "Restablecer contraseñas", "users.manage_access": "Administrar accesos", "roles.view": "Ver roles", "roles.create": "Crear roles", "roles.update": "Editar roles", "roles.delete": "Eliminar roles", "roles.manage_permissions": "Administrar permisos de roles", "audit.view": "Ver auditoría", "settings.view": "Ver configuración", "settings.update": "Editar configuración",
};
export const formatDate = (value: Date | null) => value ? new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }).format(value) : "—";
export const dateValue = (value: Date | null) => value?.toISOString().slice(0, 16) ?? "";
export function PageTitle({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight text-primary">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-secondary">{description}</p></div>{children}</div>;
}
export function Status({ value }: { value: string }) {
  const tone = ["ACTIVE", "Activo"].includes(value) ? "text-success" : ["SUSPENDED", "Suspendido", "Vencido"].includes(value) ? "text-critical" : "text-warning";
  return <span className={`inline-flex items-center gap-2 text-xs font-medium ${tone}`}><span aria-hidden="true" className="size-1.5 rounded-full bg-current" />{statusLabels[value as keyof typeof statusLabels] ?? value}</span>;
}
export function Empty({ children = "No hay registros en tu ámbito para estos filtros." }: { children?: ReactNode }) { return <p className="py-8 text-sm text-secondary">{children}</p>; }
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="admin-label">{label}{children}</label>; }
export type AccessChoices = { roles: readonly { id: string; name: string }[]; resources: readonly { id: string; name: string; scopeType: string; scopeRef: string }[]; allowGlobal: boolean };
export function AssignmentFields({ choices, assignment }: { choices: AccessChoices; assignment?: Assignment }) {
  const currentResource = assignment?.scopeType === "GLOBAL" ? "GLOBAL" : choices.resources.find((resource) => resource.scopeType === assignment?.scopeType && resource.scopeRef === assignment?.scopeRef)?.id;
  return <div className="grid gap-4 sm:grid-cols-2"><Field label="Rol"><select className="admin-input" defaultValue={assignment?.roleId ?? ""} name="roleId" required><option disabled value="">Seleccionar rol</option>{choices.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></Field><Field label="Ámbito y recurso"><select className="admin-input" defaultValue={currentResource ?? ""} name="scopeResourceId" required><option disabled value="">Seleccionar recurso</option>{choices.allowGlobal ? <option value="GLOBAL">Global · Todo el sistema</option> : null}{choices.resources.map((resource) => <option key={resource.id} value={resource.id}>{scopeLabels[resource.scopeType as keyof typeof scopeLabels]} · {resource.name} ({resource.scopeRef})</option>)}</select></Field><Field label="Desde (UTC, vacío = sin inicio)"><input className="admin-input" defaultValue={dateValue(assignment?.validFrom ?? null)} name="validFrom" type="datetime-local" /></Field><Field label="Hasta (UTC, vacío = sin vencimiento)"><input className="admin-input" defaultValue={dateValue(assignment?.validUntil ?? null)} name="validUntil" type="datetime-local" /></Field></div>;
}
export function BackLink({ href, children }: { href: string; children: ReactNode }) { return <Link className="mb-4 inline-flex min-h-11 items-center text-sm font-medium text-action hover:text-action-hover" href={href}>← {children}</Link>; }
export function PermissionFields({ permissions, selected = [] }: { permissions: readonly PermissionKey[]; selected?: readonly string[] }) {
  return <fieldset><legend className="mb-3 text-sm font-semibold">Permisos</legend><div className="grid gap-x-5 sm:grid-cols-2">{permissions.map((key) => <label className="flex min-h-14 items-center gap-3 border-t border-soft py-2 text-sm" key={key}><input className="size-4 shrink-0 accent-action" defaultChecked={selected.includes(key)} name="permissionKeys" type="checkbox" value={key} /><span>{permissionLabels[key]}<span className="mt-0.5 block font-mono text-[11px] text-muted">{key}</span></span></label>)}</div></fieldset>;
}
