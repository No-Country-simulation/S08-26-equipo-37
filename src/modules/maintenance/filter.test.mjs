import assert from "node:assert/strict";
import test from "node:test";
import { can } from "../identity/policy.ts";
import { filterMaintenanceData } from "./filter.ts";
import { machines, alerts, activityEvents, notifications } from "../../features/maintenance/mock-data.ts";

const source = { machines, alerts, activityEvents, notifications };
const context = id => ({ plantRef: id === "M-01" ? "PLANT-A" : "PLANT-B", machineRef: id });
function actor(keys, scopeType = "MACHINE", scopeRef = "M-01") {
  return { id: "viewer", status: "ACTIVE", mustChangePassword: false, assignments: [{
    id: "assignment", roleId: "role", scopeType, scopeRef, validFrom: null, validUntil: null,
    role: { id: "role", name: "VIEWER", permissions: keys.map(key => ({ permission: { key } })) },
  }] };
}
const readPermissions = ["dashboard.view", "machines.list", "machines.view", "alerts.view", "activity.view"];
const filtered = user => filterMaintenanceData(source, (permission, ref) => can(user, permission, context(ref)));

test("scoped dashboard payload and every derived count exclude other plants", () => {
  const result = filtered(actor(readPermissions, "PLANT", "PLANT-A"));
  assert.deepEqual(result.machines.map(machine => machine.id), ["M-01"]);
  assert.deepEqual(result.priorityMachines.map(machine => machine.id), ["M-01"]);
  for (const items of [result.alerts, result.activityEvents, result.notifications]) {
    assert.ok(items.every(item => item.machineId === "M-01"));
  }
  assert.equal(result.dashboardSummary.total, 1);
  assert.equal(result.dashboardSummary.highCriticality, 1);
  assert.deepEqual(result.dashboardSummary.counts, { healthy: 0, watch: 0, critical: 1, maintenance: 0 });
  assert.equal(result.dashboardSummary.activeAlerts, 1);
});

test("without machine view no linked records or names are serialized even with alerts permission", () => {
  const result = filtered(actor(readPermissions.filter(key => key !== "machines.view")));
  for (const items of [result.machines, result.alerts, result.activityEvents, result.notifications]) assert.deepEqual(items, []);
  assert.equal(result.dashboardSummary.total, 0);
});

test("alert and activity permissions independently restrict records and notifications", () => {
  const result = filtered(actor(["dashboard.view", "machines.list", "machines.view"]));
  assert.equal(result.machines.length, 1);
  assert.deepEqual(result.alerts, []);
  assert.deepEqual(result.activityEvents, []);
  assert.deepEqual(result.notifications, []);
  assert.equal(result.dashboardSummary.activeAlerts, 0);
  assert.equal(result.canViewAlerts, false);
});

test("dashboard permission must cover the same resource and inactive users receive no records", () => {
  const user = actor(readPermissions.filter(key => key !== "dashboard.view"), "GLOBAL", null);
  user.assignments.push(...actor(["dashboard.view"]).assignments);
  assert.deepEqual(filtered(user).machines.map(machine => machine.id), ["M-01"]);
  user.status = "SUSPENDED";
  assert.deepEqual(filtered(user).machines, []);
});
