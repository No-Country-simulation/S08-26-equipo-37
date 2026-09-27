import { z } from "zod";

export const scopes = ["GLOBAL", "ORGANIZATION", "PLANT", "AREA", "MACHINE"] as const;
const identifier = z.string().trim().min(1).max(200);
const optionalText = (maximum: number) => z.string().trim().max(maximum).transform((value) => value || null);
const dateInput = z.string().refine((value) => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
  const date = new Date(`${value}:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 16) === value;
}, "Ingresá una fecha válida en UTC.").transform((value) => value ? new Date(`${value}:00Z`) : null);
const avatar = z.string().trim().max(2000).refine((value) => {
  if (!value) return true;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
}, "El avatar debe ser una URL HTTP o HTTPS.").transform((value) => value || null);

export const userFields = z.object({ name: z.string().trim().min(2).max(120), email: z.email().trim().toLowerCase().max(254), avatarUrl: avatar });
export const assignmentFields = z.object({ roleId: identifier, scopeResourceId: identifier, validFrom: dateInput, validUntil: dateInput });
export const newUserSchema = userFields.extend({ ...assignmentFields.shape, confirmed: z.literal("yes", { error: "Confirmá la invitación y el acceso inicial." }) }).refine((value) => !value.validFrom || !value.validUntil || value.validFrom < value.validUntil, "La fecha hasta debe ser posterior a desde.");
export const updateUserSchema = userFields.extend({ userId: identifier, confirmed: z.literal("yes", { error: "Confirmá el cambio de los datos del usuario." }) });
export const assignmentSchema = assignmentFields.extend({ userId: identifier, assignmentId: z.string().max(200), confirmed: z.literal("yes", { error: "Confirmá el cambio de acceso." }) }).refine((value) => !value.validFrom || !value.validUntil || value.validFrom < value.validUntil, "La fecha hasta debe ser posterior a desde.");
export const userCommandSchema = z.object({ userId: identifier, command: z.enum(["invite", "suspend", "reactivate", "reset", "force-password"]), confirmed: z.literal("yes", { error: "Confirmá la acción administrativa." }) });
export const revokeSchema = z.object({ assignmentId: identifier, confirmed: z.literal("yes", { error: "Confirmá la revocación." }) });
export const roleSchema = z.object({ roleId: z.string().max(200), name: z.string().trim().min(3).max(64), description: optionalText(300), permissionKeys: z.array(identifier).max(100), mode: z.enum(["create", "details", "permissions"]), confirmed: z.literal("yes", { error: "Confirmá el cambio del rol." }) });
export const deleteRoleSchema = z.object({ roleId: identifier, confirmed: z.literal("yes", { error: "Confirmá la eliminación del rol." }) });
export const resourceSchema = z.object({ resourceId: z.string().max(200), scopeType: z.enum(["ORGANIZATION", "PLANT", "AREA", "MACHINE"]), scopeRef: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9._:-]+$/, "Usá letras, números, puntos, guiones o dos puntos."), name: z.string().trim().min(2).max(120), parentId: optionalText(200), confirmed: z.literal("yes", { error: "Confirmá el cambio de jerarquía de acceso." }) });
export const directoryFilters = z.object({ q: z.string().trim().max(120).default(""), status: z.enum(["", "ACTIVE", "INVITED", "SUSPENDED"]).default("") });
export const accessFilters = z.object({ userId: z.string().max(200).default(""), roleId: z.string().max(200).default(""), scopeType: z.enum(["", ...scopes]).default(""), machineRef: z.string().max(100).default(""), state: z.enum(["", "Activo", "Pendiente", "Vencido", "Suspendido"]).default(""), validity: z.enum(["", "expiring", "current", "future", "expired"]).default("") });
export const auditFilters = z.object({ q: z.string().trim().max(120).default(""), action: z.string().max(100).default("") });
