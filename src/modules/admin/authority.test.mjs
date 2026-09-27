import assert from "node:assert/strict";
import test from "node:test";
import { can } from "../identity/policy.ts";
import { authorityForRemainingValidity } from "./authority.ts";

const now = new Date("2026-09-27T12:00:00Z");
const tomorrow = new Date("2026-09-28T12:00:00Z");
const later = new Date("2026-09-29T12:00:00Z");
const role = { id: "admin", name: "Administrador", permissions: [{ permission: { key: "users.reset_password" } }] };
const assignment = { id: "own", roleId: role.id, scopeType: "PLANT", scopeRef: "PLANT-A", validFrom: null, validUntil: tomorrow, role };
const actor = { id: "admin-1", status: "ACTIVE", mustChangePassword: false, assignments: [assignment] };
const context = { plantRef: "PLANT-A" };
const canReset = (authority) => can(authority, "users.reset_password", context, now);

test("a temporary identity administrator cannot control permanent or longer-lived accounts", () => {
  assert.equal(canReset(actor), true);
  assert.equal(canReset(authorityForRemainingValidity(actor, { validFrom: null, validUntil: null }, now)), false);
  assert.equal(canReset(authorityForRemainingValidity(actor, { validFrom: null, validUntil: later }, now)), false);
  assert.equal(canReset(authorityForRemainingValidity(actor, { validFrom: tomorrow, validUntil: later }, now)), false);
});

test("identity authority covers the remaining interval, not the target's historical start", () => {
  const recentAdmin = { ...actor, assignments: [{ ...assignment, validFrom: new Date("2026-09-27T11:00:00Z") }] };
  assert.equal(canReset(authorityForRemainingValidity(recentAdmin, { validFrom: null, validUntil: tomorrow }, now)), true);
  const permanentAdmin = { ...actor, assignments: [{ ...assignment, validUntil: null }] };
  assert.equal(canReset(authorityForRemainingValidity(permanentAdmin, { validFrom: null, validUntil: null }, now)), true);
});

test("separate periods cannot be combined to extend identity authority", () => {
  const splitActor = { ...actor, assignments: [assignment, { ...assignment, id: "future", validFrom: tomorrow, validUntil: later }] };
  assert.equal(canReset(authorityForRemainingValidity(splitActor, { validFrom: null, validUntil: later }, now)), false);
  assert.equal(canReset(authorityForRemainingValidity(actor, { validFrom: later, validUntil: tomorrow }, now)), false);
});
