export const PERMISSIONS = [
  "dashboard.view",
  "machines.list",
  "machines.view",
  "machines.presentation.update",
  "machines.images.update",
  "alerts.view",
  "alerts.acknowledge",
  "alerts.assign",
  "alerts.update_status",
  "activity.view",
  "users.view",
  "users.create",
  "users.update",
  "users.suspend",
  "users.reset_password",
  "users.manage_access",
  "roles.view",
  "roles.create",
  "roles.update",
  "roles.delete",
  "roles.manage_permissions",
  "audit.view",
  "settings.view",
  "settings.update",
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

const viewer = [
  "dashboard.view",
  "machines.list",
  "machines.view",
  "alerts.view",
  "activity.view",
] as const;
const technician = [...viewer, "alerts.acknowledge", "alerts.update_status"] as const;
const supervisor = [...technician, "alerts.assign"] as const;

export const SYSTEM_ROLES: Record<string, readonly PermissionKey[]> = {
  SUPER_ADMIN: PERMISSIONS,
  ADMIN: PERMISSIONS.filter(
    (permission) => permission !== "settings.update" && permission !== "roles.manage_permissions",
  ),
  PLANT_MANAGER: [...supervisor, "machines.presentation.update", "machines.images.update"],
  SUPERVISOR: supervisor,
  TECHNICIAN: technician,
  VIEWER: viewer,
};
