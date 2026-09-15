import assert from "node:assert/strict";
import test from "node:test";

import { scaleTrendPoints } from "../src/app/_components/trend-scale.ts";
import {
  activityEvents,
  alerts,
  dashboardSummary,
  filterMachinesByStatus,
  machines,
  markNotificationsRead,
  notifications,
  priorityMachines,
} from "../src/features/maintenance/mock-data.ts";

test("mock maintenance records reference known machines", () => {
  const machineIds = new Set(machines.map((machine) => machine.id));

  for (const record of [...alerts, ...notifications, ...activityEvents]) {
    assert.ok(machineIds.has(record.machineId), `${record.id} references ${record.machineId}`);
  }

  assert.ok(machines.every((machine) => machine.riskScore >= 0 && machine.riskScore <= 100));
});

test("dashboard summary is derived from the mock records", () => {
  assert.equal(dashboardSummary.total, machines.length);

  for (const status of ["healthy", "watch", "critical", "maintenance"]) {
    assert.equal(
      dashboardSummary.counts[status],
      machines.filter((machine) => machine.status === status).length,
    );
  }

  assert.equal(
    dashboardSummary.highCriticality,
    machines.filter((machine) => machine.criticality === "Alta").length,
  );
  assert.equal(dashboardSummary.activeAlerts, alerts.filter((alert) => alert.status !== "closed").length);
});

test("priority machines are ordered by descending demo risk index", () => {
  assert.ok(
    priorityMachines.every(
      (machine, index) => index === 0 || priorityMachines[index - 1].riskScore >= machine.riskScore,
    ),
  );
});

test("machine status filters keep all items or select one status", () => {
  assert.equal(filterMachinesByStatus(machines, "all"), machines);
  assert.deepEqual(
    filterMachinesByStatus(machines, "critical").map((machine) => machine.id),
    ["M-01", "M-03"],
  );
});

test("notifications can be marked read individually or together", () => {
  const oneRead = markNotificationsRead(notifications, "NOT-002");

  assert.equal(oneRead.find((item) => item.id === "NOT-001")?.read, false);
  assert.equal(oneRead.find((item) => item.id === "NOT-002")?.read, true);
  assert.ok(markNotificationsRead(notifications).every((item) => item.read));
  assert.equal(notifications.find((item) => item.id === "NOT-002")?.read, false);
});

test("scaleTrendPoints keeps gaps and gives constant readings a visible baseline", () => {
  assert.deepEqual(scaleTrendPoints([10, null, 20]), [18, null, 100]);
  assert.deepEqual(scaleTrendPoints([5, 5]), [55, 55]);
  assert.deepEqual(scaleTrendPoints([null, null]), [null, null]);
});
