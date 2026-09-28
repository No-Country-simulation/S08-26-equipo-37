import "server-only";

import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { machines } from "@/features/maintenance/mock-data";
import { getActor, publicUserSelect, requireAuthenticatedUser, type CurrentUser } from "@/modules/identity/auth";
import { audit } from "@/modules/identity/audit";
import { PERMISSIONS } from "@/modules/identity/catalog";
import type { Db } from "@/modules/identity/db";
import { sendAccountMail } from "@/modules/identity/mail";
import { assignmentState, can, canDelegate, hasAnyPermission, scopeMatches, type Actor, type ResourceContext, type ScopeType } from "@/modules/identity/policy";
import { getResourceContext, listResources } from "@/modules/identity/resources";
import { issueInvitation, issuePasswordReset } from "@/modules/identity/tokens";
import { authorityForRemainingValidity } from "./authority";
import { accessFilters, assignmentSchema, auditFilters, deleteRoleSchema, directoryFilters, newUserSchema, resourceSchema, revokeSchema, roleSchema, updateUserSchema, userCommandSchema } from "./validation";

export class AdminError extends Error {}
export type AdminResult = { success: string; link?: string };
type Scope = { scopeType: ScopeType; scopeRef: string | null };
const roleInclude = { permissions: { include: { permission: true } } } satisfies Prisma.RoleInclude;
const adminPermissions = ["users.view", "users.create", "users.manage_access", "roles.view", "machines.presentation.update", "machines.images.update", "audit.view", "settings.view", "settings.update"];

function assertPermission(actor: Actor, key: string, context?: ResourceContext) {
  if (!can(actor, key, context)) throw new AdminError("No tenés permiso para realizar esta acción en ese ámbito.");
}

async function readActor(key?: string, global = false) {
  const actor = await requireAuthenticatedUser();
  if (key ? !(global ? can(actor, key) : hasAnyPermission(actor, key)) : !adminPermissions.some((permission) => hasAnyPermission(actor, permission))) redirect("/forbidden");
  return actor;
}

async function contextFor(scope: Scope, db: Db): Promise<ResourceContext> {
  try { return await getResourceContext(scope.scopeType, scope.scopeRef, db); }
  catch { throw new AdminError("El ámbito no existe o su jerarquía no es válida."); }
}

async function scopeFromResource(resourceId: string, db: Db): Promise<Scope> {
  if (resourceId === "GLOBAL") return { scopeType: "GLOBAL", scopeRef: null };
  const resource = await db.accessResource.findUnique({ where: { id: resourceId } });
  if (!resource) throw new AdminError("El recurso de acceso ya no está disponible.");
  return { scopeType: resource.scopeType, scopeRef: resource.scopeRef };
}

// A user-level edit affects every assignment, including another plant or a future assignment.
async function coversUser(actor: Actor, target: CurrentUser, permission: string, db: Db, comparePrivileges = true): Promise<boolean> {
  if (!target.assignments.length) return can(actor, permission);
  for (const assignment of target.assignments) {
    const context = await contextFor(assignment, db);
    if (!can(actor, permission, context) || (comparePrivileges && assignment.role.permissions.some(({ permission: granted }) => !can(actor, granted.key, context)))) return false;
  }
  return true;
}

async function controlsUser(actor: Actor, target: CurrentUser, permission: string, db: Db): Promise<boolean> {
  if (!await coversUser(actor, target, permission, db)) return false;
  const now = new Date();
  for (const assignment of target.assignments) {
    const authority = authorityForRemainingValidity(actor, assignment, now);
    const context = await contextFor(assignment, db);
    if (!can(authority, permission, context, now) || assignment.role.permissions.some(({ permission: granted }) => !can(authority, granted.key, context, now))) return false;
  }
  return true;
}

async function targetUser(actor: Actor, userId: string, permission: string, db: Db, controlIdentity = false) {
  const target = await db.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!target || !(controlIdentity ? await controlsUser(actor, target, permission, db) : await coversUser(actor, target, permission, db))) throw new AdminError("El usuario no está disponible dentro de tu ámbito o vigencia de administración.");
  return target;
}

async function visibleUsers(actor: Actor, permission: string, db: Db) {
  const users = await db.user.findMany({ select: publicUserSelect, orderBy: [{ name: "asc" }, { id: "asc" }] });
  const visible: CurrentUser[] = [];
  for (const user of users) if (await coversUser(actor, user, permission, db, permission !== "users.view")) visible.push(user);
  return visible;
}

async function commonAuditScope(scopes: readonly Scope[], db: Db): Promise<Scope> {
  if (!scopes.length) return { scopeType: "GLOBAL", scopeRef: null };
  const contexts = await Promise.all(scopes.map((scope) => contextFor(scope, db)));
  const fields = [["MACHINE", "machineRef"], ["AREA", "areaRef"], ["PLANT", "plantRef"], ["ORGANIZATION", "organizationRef"]] as const;
  for (const [scopeType, field] of fields) {
    const scopeRef = contexts[0]?.[field];
    if (scopeRef && contexts.every((context) => context[field] === scopeRef)) return { scopeType, scopeRef };
  }
  return { scopeType: "GLOBAL", scopeRef: null };
}

function userSnapshot(user: Pick<CurrentUser, "id" | "name" | "email" | "avatarUrl" | "status" | "mustChangePassword">) {
  return { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, status: user.status, credentialChangeRequired: user.mustChangePassword };
}

function assignmentSnapshot(assignment: { userId: string; roleId: string; scopeType: ScopeType; scopeRef: string | null; validFrom: Date | null; validUntil: Date | null }) {
  return { userId: assignment.userId, roleId: assignment.roleId, scopeType: assignment.scopeType, scopeRef: assignment.scopeRef, validFrom: assignment.validFrom?.toISOString() ?? null, validUntil: assignment.validUntil?.toISOString() ?? null };
}

async function assertGlobalAdminRemains(db: Db) {
  const users = await db.user.findMany({ where: { status: "ACTIVE", mustChangePassword: false }, select: publicUserSelect });
  const hasAdministrator = users.some((user) => {
    const permanent = { ...user, assignments: user.assignments.filter((assignment) => assignment.scopeType === "GLOBAL" && assignment.validUntil === null) };
    return PERMISSIONS.every((key) => can(permanent, key));
  });
  if (!hasAdministrator) throw new AdminError("Debe permanecer al menos un administrador activo con todos los permisos globales y sin vencimiento.");
}

async function transaction<T>(actorId: string, work: (db: Db, actor: CurrentUser) => Promise<T>) {
  return getPrisma().$transaction(async (db) => {
    const actor = await getActor(db, actorId);
    if (actor.mustChangePassword) throw new AdminError("Primero completá el cambio de contraseña requerido.");
    return work(db, actor);
  }, { isolationLevel: "Serializable" });
}

async function deliver(email: string, kind: "invitation" | "reset", link: string, success: string): Promise<AdminResult> {
  try {
    const sent = await sendAccountMail(email, kind, link);
    return { success: `${success} ${sent ? "Correo enviado." : "El correo no está configurado; compartí el enlace privado."}`, link };
  } catch {
    return { success: `${success} No se pudo enviar el correo; compartí el enlace privado.`, link };
  }
}

export async function getAdminNavigation() {
  const actor = await readActor();
  return { actorName: actor.name, sections: [
    { href: "/admin", label: "Resumen", visible: true },
    { href: "/admin/users", label: "Usuarios", visible: hasAnyPermission(actor, "users.view") },
    { href: "/admin/roles", label: "Roles y permisos", visible: can(actor, "roles.view") },
    { href: "/admin/access", label: "Accesos", visible: hasAnyPermission(actor, "users.view") || hasAnyPermission(actor, "users.manage_access") || can(actor, "settings.view") || can(actor, "settings.update") },
    { href: "/admin/machines", label: "Máquinas", visible: hasAnyPermission(actor, "machines.presentation.update") || hasAnyPermission(actor, "machines.images.update") },
    { href: "/admin/audit", label: "Auditoría", visible: hasAnyPermission(actor, "audit.view") },
  ].filter((section) => section.visible) };
}

export async function getUsers(input: unknown = {}) {
  const actor = await readActor("users.view");
  const parsed = directoryFilters.safeParse(input);
  const filters = parsed.success ? parsed.data : directoryFilters.parse({});
  const users = (await visibleUsers(actor, "users.view", getPrisma())).filter((user) => (!filters.status || user.status === filters.status) && (!filters.q || `${user.name} ${user.email}`.toLocaleLowerCase("es").includes(filters.q.toLocaleLowerCase("es"))));
  return { users, filters, canCreate: hasAnyPermission(actor, "users.create") && hasAnyPermission(actor, "users.manage_access") };
}

async function accessChoices(actor: Actor, db: Db) {
  const resources = await listResources(db);
  const visible = [] as typeof resources;
  for (const resource of resources) {
    const context = await contextFor(resource, db);
    if (can(actor, "users.manage_access", context)) visible.push(resource);
  }
  const roles = (await db.role.findMany({ include: roleInclude, orderBy: { name: "asc" } })).filter((role) => role.permissions.every(({ permission }) => hasAnyPermission(actor, permission.key)));
  return { resources: visible, roles, allowGlobal: can(actor, "users.manage_access") };
}

export async function getNewUserOptions() {
  const actor = await readActor("users.create");
  if (!hasAnyPermission(actor, "users.manage_access")) redirect("/forbidden");
  const choices = await accessChoices(actor, getPrisma());
  const resources = [] as typeof choices.resources;
  for (const resource of choices.resources) if (can(actor, "users.create", await contextFor(resource, getPrisma()))) resources.push(resource);
  return { ...choices, resources, allowGlobal: choices.allowGlobal && can(actor, "users.create") };
}

export async function getUserDetail(userId: string) {
  const actor = await readActor();
  if (!hasAnyPermission(actor, "users.view") && !hasAnyPermission(actor, "users.manage_access")) redirect("/forbidden");
  const db = getPrisma();
  const user = await db.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!user || !(await coversUser(actor, user, "users.view", db, false) || await coversUser(actor, user, "users.manage_access", db))) return null;
  const permissions = { update: await controlsUser(actor, user, "users.update", db), suspend: await controlsUser(actor, user, "users.suspend", db), reset: await controlsUser(actor, user, "users.reset_password", db), invite: await controlsUser(actor, user, "users.create", db), access: await coversUser(actor, user, "users.manage_access", db) };
  return { user, permissions, choices: permissions.access ? await accessChoices(actor, db) : null };
}

export async function createUser(actorId: string, input: unknown): Promise<AdminResult> {
  const data = newUserSchema.parse(input);
  const result = await transaction(actorId, async (db, actor) => {
    const scope = await scopeFromResource(data.scopeResourceId, db);
    const context = await contextFor(scope, db);
    assertPermission(actor, "users.create", context);
    const role = await db.role.findUnique({ where: { id: data.roleId }, include: roleInclude });
    if (!role || !canDelegate(actor, { ...scope, validFrom: data.validFrom, validUntil: data.validUntil }, role.permissions.map(({ permission }) => permission.key), context)) throw new AdminError("No podés delegar ese rol, ámbito o período.");
    const user = await db.user.create({ data: { name: data.name, email: data.email, avatarUrl: data.avatarUrl, status: "INVITED", assignments: { create: { roleId: role.id, ...scope, validFrom: data.validFrom, validUntil: data.validUntil } } }, select: publicUserSelect });
    await audit(db, { actorUserId: actor.id, action: "USER_CREATED", entityType: "User", entityId: user.id, afterData: userSnapshot(user), ...scope });
    const assignment = user.assignments[0];
    if (assignment) await audit(db, { actorUserId: actor.id, action: "ACCESS_GRANTED", entityType: "UserRoleAssignment", entityId: assignment.id, afterData: assignmentSnapshot(assignment), ...scope });
    return { email: user.email, link: await issueInvitation(db, user.email, actor.id) };
  });
  return deliver(result.email, "invitation", result.link, "Usuario invitado y acceso inicial creado.");
}

export async function updateUser(actorId: string, input: unknown): Promise<AdminResult> {
  const data = updateUserSchema.parse(input);
  await transaction(actorId, async (db, actor) => {
    const before = await targetUser(actor, data.userId, "users.update", db, true);
    const after = await db.user.update({ where: { id: before.id }, data: { name: data.name, email: data.email, avatarUrl: data.avatarUrl }, select: publicUserSelect });
    if (before.email !== after.email) {
      await db.session.deleteMany({ where: { userId: before.id } });
      await db.passwordResetToken.deleteMany({ where: { userId: before.id, usedAt: null } });
      await db.invitation.deleteMany({ where: { email: before.email, acceptedAt: null } });
    }
    await audit(db, { actorUserId: actor.id, action: "USER_UPDATED", entityType: "User", entityId: before.id, beforeData: userSnapshot(before), afterData: userSnapshot(after), ...await commonAuditScope(before.assignments, db) });
  });
  return { success: "Datos actualizados. Un cambio de email invalida las sesiones y enlaces anteriores." };
}

export async function userCommand(actorId: string, input: unknown): Promise<AdminResult> {
  const { userId, command } = userCommandSchema.parse(input);
  const result = await transaction(actorId, async (db, actor) => {
    const permission = command === "invite" ? "users.create" : command === "suspend" || command === "reactivate" ? "users.suspend" : "users.reset_password";
    const before = await targetUser(actor, userId, permission, db, true);
    const scope = await commonAuditScope(before.assignments, db);
    if (command === "invite") {
      if (before.status !== "INVITED") throw new AdminError("Solo se puede invitar una cuenta pendiente de activación.");
      const link = await issueInvitation(db, before.email, actor.id);
      await audit(db, { actorUserId: actor.id, action: "USER_INVITED", entityType: "User", entityId: userId, ...scope });
      return { email: before.email, link, kind: "invitation" as const };
    }
    if (command === "reset") {
      if (before.status !== "ACTIVE") throw new AdminError("La cuenta debe estar activa para solicitar un restablecimiento.");
      const link = await issuePasswordReset(db, userId);
      await audit(db, { actorUserId: actor.id, action: "PASSWORD_RESET_REQUESTED", entityType: "User", entityId: userId, ...scope });
      return { email: before.email, link, kind: "reset" as const };
    }
    if (command === "reactivate" && before.status !== "SUSPENDED") throw new AdminError("La cuenta no está suspendida.");
    const credentials = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    const changes = command === "suspend" ? { status: "SUSPENDED" as const, disabledAt: new Date() } : command === "reactivate" ? { status: credentials?.passwordHash ? "ACTIVE" as const : "INVITED" as const, disabledAt: null } : { mustChangePassword: true };
    const after = await db.user.update({ where: { id: userId }, data: changes, select: publicUserSelect });
    await db.session.deleteMany({ where: { userId } });
    if (command === "suspend") {
      await db.passwordResetToken.deleteMany({ where: { userId, usedAt: null } });
      await db.invitation.deleteMany({ where: { email: before.email, acceptedAt: null } });
    }
    await assertGlobalAdminRemains(db);
    await audit(db, { actorUserId: actor.id, action: command === "suspend" ? "USER_SUSPENDED" : command === "reactivate" ? "USER_REACTIVATED" : "USER_UPDATED", entityType: "User", entityId: userId, beforeData: userSnapshot(before), afterData: userSnapshot(after), ...scope });
    return null;
  });
  return result ? deliver(result.email, result.kind, result.link, "Enlace nuevo generado; el anterior quedó invalidado.") : { success: "Acción aplicada. Las sesiones anteriores quedaron invalidadas." };
}

export async function saveAssignment(actorId: string, input: unknown): Promise<AdminResult> {
  const data = assignmentSchema.parse(input);
  await transaction(actorId, async (db, actor) => {
    await targetUser(actor, data.userId, "users.manage_access", db);
    const before = data.assignmentId ? await db.userRoleAssignment.findUnique({ where: { id: data.assignmentId } }) : null;
    if (data.assignmentId && (!before || before.userId !== data.userId)) throw new AdminError("La asignación no está disponible.");
    const scope = await scopeFromResource(data.scopeResourceId, db);
    const context = await contextFor(scope, db);
    const role = await db.role.findUnique({ where: { id: data.roleId }, include: roleInclude });
    if (!role || !canDelegate(actor, { ...scope, validFrom: data.validFrom, validUntil: data.validUntil }, role.permissions.map(({ permission }) => permission.key), context)) throw new AdminError("El rol, ámbito o período supera lo que podés delegar.");
    const values = { userId: data.userId, roleId: data.roleId, ...scope, validFrom: data.validFrom, validUntil: data.validUntil };
    const after = before ? await db.userRoleAssignment.update({ where: { id: before.id }, data: values }) : await db.userRoleAssignment.create({ data: values });
    await assertGlobalAdminRemains(db);
    await audit(db, { actorUserId: actor.id, action: before ? "ACCESS_UPDATED" : "ACCESS_GRANTED", entityType: "UserRoleAssignment", entityId: after.id, ...(before ? { beforeData: assignmentSnapshot(before) } : {}), afterData: assignmentSnapshot(after), ...await commonAuditScope(before ? [before, after] : [after], db) });
  });
  return { success: "Acceso guardado. Los permisos se evalúan en cada solicitud." };
}

export async function revokeAssignment(actorId: string, input: unknown): Promise<AdminResult> {
  const data = revokeSchema.parse(input);
  await transaction(actorId, async (db, actor) => {
    const before = await db.userRoleAssignment.findUnique({ where: { id: data.assignmentId } });
    if (!before) throw new AdminError("La asignación ya no existe.");
    await targetUser(actor, before.userId, "users.manage_access", db);
    await db.userRoleAssignment.delete({ where: { id: before.id } });
    await assertGlobalAdminRemains(db);
    await audit(db, { actorUserId: actor.id, action: "ACCESS_REVOKED", entityType: "UserRoleAssignment", entityId: before.id, beforeData: assignmentSnapshot(before), scopeType: before.scopeType, scopeRef: before.scopeRef });
  });
  return { success: "Acceso revocado. El usuario conserva sus otras asignaciones." };
}

export async function getRoles() {
  const actor = await readActor("roles.view", true);
  const roles = await getPrisma().role.findMany({ include: { ...roleInclude, _count: { select: { assignments: true } } }, orderBy: [{ isSystem: "desc" }, { name: "asc" }] });
  return { roles, permissions: PERMISSIONS, canCreate: can(actor, "roles.create"), canSetPermissions: can(actor, "roles.manage_permissions"), grantablePermissions: PERMISSIONS.filter((key) => can(actor, key)) };
}

export async function getRoleDetail(roleId: string) {
  const actor = await readActor("roles.view", true);
  const role = await getPrisma().role.findUnique({ where: { id: roleId }, include: { ...roleInclude, _count: { select: { assignments: true } } } });
  if (!role) return null;
  const covered = role.permissions.every(({ permission }) => can(actor, permission.key));
  return { role, permissions: PERMISSIONS, grantablePermissions: PERMISSIONS.filter((key) => can(actor, key)), canUpdate: covered && can(actor, "roles.update"), canSetPermissions: covered && can(actor, "roles.manage_permissions"), canDelete: covered && !role.isSystem && can(actor, "roles.delete") };
}

export async function saveRole(actorId: string, input: unknown): Promise<AdminResult> {
  const data = roleSchema.parse(input);
  await transaction(actorId, async (db, actor) => {
    const creating = data.mode === "create";
    assertPermission(actor, creating ? "roles.create" : data.mode === "permissions" ? "roles.manage_permissions" : "roles.update");
    const before = creating ? null : await db.role.findUnique({ where: { id: data.roleId }, include: roleInclude });
    if (!creating && !before) throw new AdminError("El rol ya no existe.");
    if (before?.permissions.some(({ permission }) => !can(actor, permission.key))) throw new AdminError("No podés modificar un rol con permisos superiores a los tuyos.");
    const keys = [...new Set(data.permissionKeys)];
    if (creating || data.mode === "permissions") {
      if (keys.length) assertPermission(actor, "roles.manage_permissions");
      if (keys.some((key) => !PERMISSIONS.includes(key as typeof PERMISSIONS[number]) || !can(actor, key))) throw new AdminError("No podés otorgar alguno de los permisos seleccionados.");
      const addedKeys = keys.filter((key) => !before?.permissions.some(({ permission }) => permission.key === key));
      if (before && addedKeys.length) {
        // Editing a shared role also grants its new permissions to existing assignments.
        const now = new Date();
        const affected = await db.userRoleAssignment.findMany({ where: { roleId: before.id, OR: [{ validUntil: null }, { validUntil: { gt: now } }] } });
        for (const assignment of affected) {
          if (!canDelegate(actor, assignment, addedKeys, await contextFor(assignment, db), now)) throw new AdminError("Los nuevos permisos exceden el ámbito o la vigencia que podés delegar a las asignaciones de este rol.");
        }
      }
    }
    const after = creating ? await db.role.create({ data: { name: data.name, description: data.description } }) : await db.role.update({ where: { id: data.roleId }, data: data.mode === "details" ? { name: data.name, description: data.description } : {} });
    if (creating || data.mode === "permissions") {
      const permissions = await db.permission.findMany({ where: { key: { in: keys } } });
      if (permissions.length !== keys.length) throw new AdminError("El catálogo de permisos requiere actualizarse antes de guardar.");
      await db.rolePermission.deleteMany({ where: { roleId: after.id } });
      if (permissions.length) await db.rolePermission.createMany({ data: permissions.map((permission) => ({ roleId: after.id, permissionId: permission.id })) });
    }
    await assertGlobalAdminRemains(db);
    const beforeData = before ? { name: before.name, description: before.description, permissions: before.permissions.map(({ permission }) => permission.key) } : undefined;
    await audit(db, { actorUserId: actor.id, action: creating ? "ROLE_CREATED" : data.mode === "permissions" ? "ROLE_PERMISSION_UPDATED" : "ROLE_UPDATED", entityType: "Role", entityId: after.id, beforeData, afterData: { name: after.name, description: after.description, permissions: data.mode === "details" ? beforeData?.permissions ?? [] : keys } });
  });
  return { success: "Rol guardado." };
}

export async function deleteRole(actorId: string, input: unknown): Promise<AdminResult> {
  const data = deleteRoleSchema.parse(input);
  await transaction(actorId, async (db, actor) => {
    assertPermission(actor, "roles.delete");
    const before = await db.role.findUnique({ where: { id: data.roleId }, include: { ...roleInclude, _count: { select: { assignments: true } } } });
    if (!before || before.isSystem) throw new AdminError("Los roles del sistema no se pueden eliminar.");
    if (before._count.assignments) throw new AdminError("Revocá o reasigná los accesos que usan este rol antes de eliminarlo.");
    if (before.permissions.some(({ permission }) => !can(actor, permission.key))) throw new AdminError("No podés eliminar un rol con permisos superiores a los tuyos.");
    await db.role.delete({ where: { id: before.id } });
    await assertGlobalAdminRemains(db);
    await audit(db, { actorUserId: actor.id, action: "ROLE_DELETED", entityType: "Role", entityId: before.id, beforeData: { name: before.name, description: before.description } });
  });
  return { success: "Rol personalizado eliminado." };
}

export async function getAccess(input: unknown = {}) {
  const actor = await readActor();
  const canView = hasAnyPermission(actor, "users.view");
  const canManage = hasAnyPermission(actor, "users.manage_access");
  const canViewResources = can(actor, "settings.view") || can(actor, "settings.update");
  if (!canView && !canManage && !canViewResources) redirect("/forbidden");
  const parsed = accessFilters.safeParse(input);
  const filters = parsed.success ? parsed.data : accessFilters.parse({});
  const db = getPrisma();
  const users = canView || canManage ? await visibleUsers(actor, canView ? "users.view" : "users.manage_access", db) : [];
  const resources = await listResources(db);
  const requestedMachine = resources.find((resource) => resource.scopeType === "MACHINE" && resource.scopeRef === filters.machineRef);
  const machineContext = requestedMachine && (can(actor, "users.view", await contextFor(requestedMachine, db)) || can(actor, "users.manage_access", await contextFor(requestedMachine, db))) ? await contextFor(requestedMachine, db) : null;
  const now = new Date();
  const rows = users.flatMap((user) => user.assignments.map((assignment) => ({ ...assignment, user: { id: user.id, name: user.name, email: user.email }, state: assignmentState(user.status, assignment, now), resourceName: assignment.scopeType === "GLOBAL" ? "Todo el sistema" : resources.find((resource) => resource.scopeType === assignment.scopeType && resource.scopeRef === assignment.scopeRef)?.name ?? assignment.scopeRef })));
  const assignments = rows.filter((row) => (!filters.userId || row.user.id === filters.userId) && (!filters.roleId || row.roleId === filters.roleId) && (!filters.scopeType || row.scopeType === filters.scopeType) && (!filters.machineRef || Boolean(machineContext && scopeMatches(row, machineContext))) && (!filters.state || row.state === filters.state) && (!filters.validity || (filters.validity === "expiring" ? row.state === "Activo" && row.validUntil !== null && row.validUntil <= new Date(now.getTime() + 7 * 86_400_000) : filters.validity === "current" ? row.state === "Activo" : filters.validity === "future" ? row.validFrom !== null && row.validFrom > now : row.validUntil !== null && row.validUntil <= now)));
  const machineResources = [] as typeof resources;
  for (const resource of resources) if (resource.scopeType === "MACHINE" && (can(actor, "users.view", await contextFor(resource, db)) || can(actor, "users.manage_access", await contextFor(resource, db)))) machineResources.push(resource);
  return { assignments, users, roles: [...new Map(rows.map((row) => [row.roleId, { id: row.role.id, name: row.role.name }])).values()], filters, machineResources, resources: canViewResources ? resources : [], canEditResources: can(actor, "settings.update") };
}

export async function saveResource(actorId: string, input: unknown): Promise<AdminResult> {
  const data = resourceSchema.parse(input);
  await transaction(actorId, async (db, actor) => {
    assertPermission(actor, "settings.update");
    const all = await listResources(db);
    const before = data.resourceId ? all.find((resource) => resource.id === data.resourceId) : undefined;
    if (data.resourceId && !before) throw new AdminError("El recurso ya no existe.");
    if (before?.scopeType === "MACHINE" && machines.some((machine) => machine.id === before.scopeRef) && (before.scopeType !== data.scopeType || before.scopeRef !== data.scopeRef)) throw new AdminError("La referencia y el tipo de una máquina del inventario se conservan. Podés editar su nombre y recurso padre.");
    if (data.scopeType === "MACHINE" && !machines.some((machine) => machine.id === data.scopeRef)) throw new AdminError("La referencia debe corresponder a una máquina del inventario actual.");
    const rank = { GLOBAL: 0, ORGANIZATION: 1, PLANT: 2, AREA: 3, MACHINE: 4 };
    if (data.parentId) {
      const parent = all.find((resource) => resource.id === data.parentId);
      if (!parent || parent.id === data.resourceId || rank[parent.scopeType] >= rank[data.scopeType]) throw new AdminError("El padre debe ser una organización, planta o área de nivel superior.");
      const seen = new Set([data.resourceId]);
      let current = parent;
      while (current) {
        if (seen.has(current.id)) throw new AdminError("La jerarquía no puede contener ciclos.");
        seen.add(current.id);
        const next = all.find((resource) => resource.id === current.parentId);
        if (!next) break;
        current = next;
      }
    }
    if (before && (before.scopeType !== data.scopeType || before.scopeRef !== data.scopeRef)) {
      if (await db.userRoleAssignment.count({ where: { scopeType: before.scopeType, scopeRef: before.scopeRef } })) throw new AdminError("La referencia o el tipo no se puede cambiar mientras tenga accesos asignados.");
      if (all.some((child) => child.parentId === before.id && rank[child.scopeType] <= rank[data.scopeType])) throw new AdminError("El nuevo tipo no es compatible con los recursos hijos.");
    }
    const values = { scopeType: data.scopeType, scopeRef: data.scopeRef, name: data.name, parentId: data.parentId };
    const after = before ? await db.accessResource.update({ where: { id: before.id }, data: values }) : await db.accessResource.create({ data: values });
    await audit(db, { actorUserId: actor.id, action: before ? "ACCESS_RESOURCE_UPDATED" : "ACCESS_RESOURCE_CREATED", entityType: "AccessResource", entityId: after.id, ...(before ? { beforeData: { scopeType: before.scopeType, scopeRef: before.scopeRef, name: before.name, parentId: before.parentId } } : {}), afterData: values });
  });
  return { success: "Jerarquía de autorización guardada. No se modificaron datos técnicos de maquinaria." };
}

async function visibleAudit(actor: Actor, db: Db) {
  const logs = await db.auditLog.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  const visible = [] as typeof logs;
  for (const log of logs) {
    try { if (can(actor, "audit.view", await contextFor(log, db))) visible.push(log); }
    catch { if (can(actor, "audit.view")) visible.push(log); }
  }
  return visible;
}

export async function getAudit(input: unknown = {}) {
  const actor = await readActor("audit.view");
  const parsed = auditFilters.safeParse(input);
  const filters = parsed.success ? parsed.data : auditFilters.parse({});
  const visible = await visibleAudit(actor, getPrisma());
  const logs = visible.filter((log) => (!filters.action || log.action === filters.action) && (!filters.q || `${log.actorUserId ?? ""} ${log.entityId ?? ""} ${log.entityType} ${log.scopeRef ?? ""}`.toLocaleLowerCase("es").includes(filters.q.toLocaleLowerCase("es"))));
  return { logs, filters, actions: [...new Set(visible.map((log) => log.action))].sort() };
}

export async function getAdminOverview() {
  const actor = await readActor();
  const db = getPrisma();
  const users = hasAnyPermission(actor, "users.view") ? await visibleUsers(actor, "users.view", db) : null;
  const now = new Date();
  const assignments = users?.flatMap((user) => user.assignments.map((assignment) => ({ ...assignment, state: assignmentState(user.status, assignment, now) }))) ?? null;
  return {
    activeUsers: users?.filter((user) => user.status === "ACTIVE").length ?? null,
    invitedUsers: users?.filter((user) => user.status === "INVITED").length ?? null,
    suspendedUsers: users?.filter((user) => user.status === "SUSPENDED").length ?? null,
    roleCount: can(actor, "roles.view") ? await db.role.count() : null,
    activeAssignments: assignments?.filter((assignment) => assignment.state === "Activo").length ?? null,
    expiringAssignments: assignments?.filter((assignment) => assignment.state === "Activo" && assignment.validUntil && assignment.validUntil <= new Date(now.getTime() + 7 * 86_400_000)).length ?? null,
    latestActions: hasAnyPermission(actor, "audit.view") ? (await visibleAudit(actor, db)).slice(0, 8) : null,
  };
}
