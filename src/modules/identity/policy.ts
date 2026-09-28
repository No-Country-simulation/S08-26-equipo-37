export type ScopeType = "GLOBAL" | "ORGANIZATION" | "PLANT" | "AREA" | "MACHINE";

export interface ResourceContext {
  organizationRef?: string;
  plantRef?: string;
  areaRef?: string;
  machineRef?: string;
}

export interface Assignment {
  id: string;
  roleId: string;
  scopeType: ScopeType;
  scopeRef: string | null;
  validFrom: Date | null;
  validUntil: Date | null;
  role: {
    id: string;
    name: string;
    permissions: readonly { permission: { key: string } }[];
  };
}

export interface Actor {
  id: string;
  status: string;
  mustChangePassword: boolean;
  assignments: readonly Assignment[];
}

type Scope = Pick<Assignment, "scopeType" | "scopeRef">;
type Validity = Pick<Assignment, "validFrom" | "validUntil">;
export type RequestedAssignment = Scope & Validity;

const scopeFields = {
  ORGANIZATION: "organizationRef",
  PLANT: "plantRef",
  AREA: "areaRef",
  MACHINE: "machineRef",
} as const;
const scopeOrder: Record<ScopeType, number> = {
  GLOBAL: 0,
  ORGANIZATION: 1,
  PLANT: 2,
  AREA: 3,
  MACHINE: 4,
};

function bounds(assignment: Validity) {
  return [
    assignment.validFrom === null ? -Infinity : assignment.validFrom.getTime(),
    assignment.validUntil === null ? Infinity : assignment.validUntil.getTime(),
  ] as const;
}

export function assignmentState(
  userStatus: string,
  assignment: Validity,
  now: Date = new Date(),
): "Activo" | "Pendiente" | "Vencido" | "Suspendido" {
  if (userStatus === "INVITED") return "Pendiente";
  if (userStatus !== "ACTIVE") return "Suspendido";
  const [start, end] = bounds(assignment);
  const time = now.getTime();
  if (!(start < end) || !Number.isFinite(time) || end <= time) return "Vencido";
  return start > time ? "Pendiente" : "Activo";
}

// Context must be resolved from trusted server data, never from a client-supplied ancestry.
export function scopeMatches(scope: Scope, context?: ResourceContext): boolean {
  if (scope.scopeType === "GLOBAL") return scope.scopeRef === null;
  const field = scopeFields[scope.scopeType];
  return Boolean(
    field &&
      typeof scope.scopeRef === "string" &&
      scope.scopeRef.trim() &&
      context?.[field] === scope.scopeRef,
  );
}

function activeActor(actor: Actor | null): actor is Actor {
  return Boolean(actor?.id && actor.status === "ACTIVE" && !actor.mustChangePassword);
}

function grants(assignment: Assignment, permission: string, now: Date): boolean {
  return (
    assignmentState("ACTIVE", assignment, now) === "Activo" &&
    assignment.roleId === assignment.role.id &&
    assignment.role.permissions.some((entry) => entry.permission.key === permission)
  );
}

export function can(
  actor: Actor | null,
  permission: string,
  resource?: ResourceContext,
  now: Date = new Date(),
): boolean {
  return (
    activeActor(actor) &&
    actor.assignments.some(
      (assignment) => grants(assignment, permission, now) && scopeMatches(assignment, resource),
    )
  );
}

// Navigation only: this does not authorize reading or mutating any particular resource.
export function hasAnyPermission(
  actor: Actor | null,
  permission: string,
  now: Date = new Date(),
): boolean {
  return (
    activeActor(actor) &&
    actor.assignments.some((assignment) => {
      const context =
        assignment.scopeType === "GLOBAL"
          ? undefined
          : { [scopeFields[assignment.scopeType]]: assignment.scopeRef };
      return grants(assignment, permission, now) && scopeMatches(assignment, context);
    })
  );
}

export function canDelegate(
  actor: Actor | null,
  requested: RequestedAssignment,
  permissionKeys: readonly string[],
  context: ResourceContext,
  now: Date = new Date(),
): boolean {
  if (!activeActor(actor) || !scopeMatches(requested, context)) return false;
  const [start, end] = bounds(requested);
  if (!(start < end) || !(end > now.getTime())) return false;

  // Each permission, including delegation itself, must cover the complete grant independently.
  // Adjacent periods or smaller scopes cannot be combined into a broader assignment.
  return ["users.manage_access", ...permissionKeys].every((permission) =>
    actor.assignments.some((assignment) => {
      const [ownStart, ownEnd] = bounds(assignment);
      return (
        grants(assignment, permission, now) &&
        scopeOrder[assignment.scopeType] <= scopeOrder[requested.scopeType] &&
        scopeMatches(assignment, context) &&
        ownStart <= start &&
        ownEnd >= end
      );
    }),
  );
}
