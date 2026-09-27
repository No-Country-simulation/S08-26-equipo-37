import assert from "node:assert/strict";
import test from "node:test";

import { PERMISSIONS, SYSTEM_ROLES } from "../src/modules/identity/catalog.ts";
import {
  assignmentState,
  can,
  canDelegate,
  hasAnyPermission,
  scopeMatches,
} from "../src/modules/identity/policy.ts";

const now = new Date("2026-09-27T12:00:00Z");
const before = new Date("2026-09-26T12:00:00Z");
const after = new Date("2026-09-28T12:00:00Z");
const later = new Date("2026-09-29T12:00:00Z");
const machineA = { organizationRef: "ORG-A", plantRef: "PLANT-A", areaRef: "AREA-A", machineRef: "M-01" };
const machineB = { organizationRef: "ORG-B", plantRef: "PLANT-B", areaRef: "AREA-B", machineRef: "M-02" };

function assignment(roleName = "VIEWER", scopeType = "GLOBAL", scopeRef = null, extra = {}) {
  return {
    id: "assignment-1",
    roleId: roleName,
    scopeType,
    scopeRef,
    validFrom: null,
    validUntil: null,
    role: {
      id: roleName,
      name: roleName,
      permissions: SYSTEM_ROLES[roleName].map((key) => ({ permission: { key } })),
    },
    ...extra,
  };
}

function actor(...assignments) {
  return { id: "user-1", status: "ACTIVE", mustChangePassword: false, assignments };
}

function request(scopeType, scopeRef, validFrom = null, validUntil = null) {
  return { scopeType, scopeRef, validFrom, validUntil };
}

test("system role catalog has only known, distinct permission keys", () => {
  assert.equal(new Set(PERMISSIONS).size, PERMISSIONS.length);
  assert.deepEqual(Object.keys(SYSTEM_ROLES), ["SUPER_ADMIN", "ADMIN", "PLANT_MANAGER", "SUPERVISOR", "TECHNICIAN", "VIEWER"]);
  for (const permissions of Object.values(SYSTEM_ROLES)) {
    assert.equal(new Set(permissions).size, permissions.length);
    assert.ok(permissions.every((key) => PERMISSIONS.includes(key)));
  }
});

test("SUPER_ADMIN permissions authorize globally without special-casing the role name", () => {
  const admin = actor(assignment("SUPER_ADMIN"));
  for (const permission of PERMISSIONS) {
    assert.equal(can(admin, permission, undefined, now), true, permission);
    assert.equal(can(admin, permission, machineA, now), true, permission);
    assert.equal(can(admin, permission, machineB, now), true, permission);
  }
  const emptyRole = assignment("SUPER_ADMIN");
  emptyRole.role.permissions = [];
  assert.equal(can(actor(emptyRole), "dashboard.view", undefined, now), false);
  assert.equal(can(admin, "unknown.permission", machineA, now), false);
});

test("VIEWER can read but cannot modify or administer", () => {
  const viewer = actor(assignment());
  assert.equal(can(viewer, "machines.view", machineA, now), true);
  for (const key of ["machines.images.update", "alerts.acknowledge", "users.manage_access", "settings.update"]) {
    assert.equal(can(viewer, key, machineA, now), false, key);
  }
});

test("scope isolation applies at organization, plant, area and machine levels", () => {
  for (const [scopeType, scopeRef] of [["ORGANIZATION", "ORG-A"], ["PLANT", "PLANT-A"], ["AREA", "AREA-A"], ["MACHINE", "M-01"]]) {
    const user = actor(assignment("SUPERVISOR", scopeType, scopeRef));
    assert.equal(can(user, "machines.view", machineA, now), true, scopeType);
    assert.equal(can(user, "machines.view", machineB, now), false, scopeType);
    assert.equal(can(user, "machines.view", undefined, now), false, scopeType);
    assert.equal(can(user, "machines.view", {}, now), false, scopeType);
    assert.equal(hasAnyPermission(user, "machines.view", now), true, scopeType);
  }
  const technician = actor(assignment("TECHNICIAN", "MACHINE", "M-01"));
  assert.equal(can(technician, "alerts.acknowledge", machineA, now), true);
  assert.equal(can(technician, "alerts.acknowledge", machineB, now), false);
  assert.equal(can(technician, "alerts.assign", machineA, now), false);
});

test("missing or invalid scope references never grant access", () => {
  for (const scopeType of ["ORGANIZATION", "PLANT", "AREA", "MACHINE"]) {
    for (const scopeRef of [null, "", " "]) {
      const user = actor(assignment("SUPER_ADMIN", scopeType, scopeRef));
      assert.equal(can(user, "users.view", machineA, now), false);
      assert.equal(hasAnyPermission(user, "users.view", now), false);
    }
  }
  assert.equal(scopeMatches({ scopeType: "GLOBAL", scopeRef: "PLANT-A" }, machineA), false);
  assert.equal(scopeMatches({ scopeType: "INVALID", scopeRef: "M-01" }, machineA), false);
});

test("assignment periods include the start and exclude the expiration", () => {
  for (const [validFrom, validUntil, allowed, state] of [
    [null, null, true, "Activo"],
    [now, after, true, "Activo"],
    [before, now, false, "Vencido"],
    [after, later, false, "Pendiente"],
    [after, before, false, "Vencido"],
    [now, now, false, "Vencido"],
    [new Date("invalid"), null, false, "Vencido"],
    [null, new Date("invalid"), false, "Vencido"],
  ]) {
    const grant = assignment("VIEWER", "GLOBAL", null, { validFrom, validUntil });
    assert.equal(can(actor(grant), "dashboard.view", undefined, now), allowed);
    assert.equal(hasAnyPermission(actor(grant), "dashboard.view", now), allowed);
    assert.equal(assignmentState("ACTIVE", grant, now), state);
  }
  assert.equal(can(actor(assignment()), "dashboard.view", undefined, new Date("invalid")), false);
});

test("inactive users, forced password changes and inconsistent roles deny all permissions", () => {
  const user = actor(assignment("SUPER_ADMIN"));
  for (const status of ["INVITED", "SUSPENDED", "UNKNOWN"]) {
    const inactive = { ...user, status };
    assert.equal(can(inactive, "dashboard.view", machineA, now), false);
    assert.equal(hasAnyPermission(inactive, "users.view", now), false);
    assert.equal(canDelegate(inactive, request("GLOBAL", null), ["users.view"], {}, now), false);
  }
  assert.equal(assignmentState("INVITED", user.assignments[0], now), "Pendiente");
  assert.equal(assignmentState("SUSPENDED", user.assignments[0], now), "Suspendido");
  assert.equal(can({ ...user, mustChangePassword: true }, "dashboard.view", machineA, now), false);
  assert.equal(hasAnyPermission({ ...user, mustChangePassword: true }, "users.view", now), false);
  assert.equal(canDelegate({ ...user, mustChangePassword: true }, request("GLOBAL", null), PERMISSIONS, {}, now), false);
  assert.equal(can(null, "dashboard.view", machineA, now), false);
  assert.equal(can(actor(), "dashboard.view", machineA, now), false);
  assert.equal(can(actor(assignment("SUPER_ADMIN", "GLOBAL", null, { roleId: "other-role" })), "users.view", machineA, now), false);
});

test("scoped administrators can delegate only existing permissions to the same or narrower scope", () => {
  const admin = actor(assignment("ADMIN", "PLANT", "PLANT-A"));
  assert.equal(canDelegate(admin, request("PLANT", "PLANT-A"), SYSTEM_ROLES.VIEWER, machineA, now), true);
  assert.equal(canDelegate(admin, request("MACHINE", "M-01"), SYSTEM_ROLES.TECHNICIAN, machineA, now), true);
  assert.equal(canDelegate(admin, request("GLOBAL", null), SYSTEM_ROLES.VIEWER, machineA, now), false);
  assert.equal(canDelegate(admin, request("ORGANIZATION", "ORG-A"), SYSTEM_ROLES.VIEWER, machineA, now), false);
  assert.equal(canDelegate(admin, request("PLANT", "PLANT-B"), SYSTEM_ROLES.VIEWER, machineB, now), false);
  assert.equal(canDelegate(admin, request("MACHINE", "M-02"), SYSTEM_ROLES.VIEWER, machineA, now), false);
  assert.equal(canDelegate(admin, request("PLANT", "PLANT-A"), SYSTEM_ROLES.SUPER_ADMIN, machineA, now), false);
  assert.equal(canDelegate(actor(assignment("VIEWER", "PLANT", "PLANT-A")), request("MACHINE", "M-01"), SYSTEM_ROLES.VIEWER, machineA, now), false);
});

test("delegation cannot combine narrower permission scopes into a wider grant", () => {
  const user = actor(
    assignment("ADMIN", "PLANT", "PLANT-A"),
    assignment("SUPER_ADMIN", "MACHINE", "M-01"),
    assignment("SUPER_ADMIN", "MACHINE", "M-02"),
  );
  assert.equal(canDelegate(user, request("PLANT", "PLANT-A"), ["settings.update"], machineA, now), false);
  assert.equal(canDelegate(user, request("MACHINE", "M-01"), ["settings.update"], machineA, now), true);
  assert.equal(canDelegate(user, request("GLOBAL", null), ["settings.update"], machineA, now), false);
});

test("delegation is bounded by the full validity of both management and delegated permissions", () => {
  const temporary = actor(assignment("ADMIN", "PLANT", "PLANT-A", { validFrom: before, validUntil: after }));
  assert.equal(canDelegate(temporary, request("MACHINE", "M-01", now, after), SYSTEM_ROLES.VIEWER, machineA, now), true);
  assert.equal(canDelegate(temporary, request("MACHINE", "M-01", before, after), SYSTEM_ROLES.VIEWER, machineA, now), true);
  for (const [from, until] of [[null, after], [now, null], [now, later], [now, now], [after, before], [new Date("invalid"), after]]) {
    assert.equal(canDelegate(temporary, request("MACHINE", "M-01", from, until), SYSTEM_ROLES.VIEWER, machineA, now), false);
  }
  const adjacent = actor(...temporary.assignments, assignment("ADMIN", "PLANT", "PLANT-A", { validFrom: after, validUntil: later }));
  assert.equal(canDelegate(adjacent, request("MACHINE", "M-01", now, later), SYSTEM_ROLES.VIEWER, machineA, now), false);
  const temporaryPermission = actor(
    assignment("ADMIN", "PLANT", "PLANT-A"),
    assignment("SUPER_ADMIN", "PLANT", "PLANT-A", { validFrom: before, validUntil: after }),
  );
  assert.equal(canDelegate(temporaryPermission, request("MACHINE", "M-01", now, later), ["settings.update"], machineA, now), false);
  assert.equal(canDelegate(temporaryPermission, request("MACHINE", "M-01", now, after), ["settings.update"], machineA, now), true);
});
