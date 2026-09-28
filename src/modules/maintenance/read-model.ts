import "server-only";

import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { activityEvents, alerts, machines, notifications } from "@/features/maintenance/mock-data";
import type { Machine } from "@/features/maintenance/types";
import { getActor } from "@/modules/identity/auth";
import { can, hasAnyPermission, type Actor, type ResourceContext } from "@/modules/identity/policy";
import { getResourceContext } from "@/modules/identity/resources";
import { getMachinePresentations, primaryImage } from "@/modules/machine-presentation/service";
import type { PresentationView } from "@/modules/machine-presentation/types";
import { filterMaintenanceData } from "./filter";
import type { DashboardReadModel, MachineView } from "./types";

function presentMachine(machine: Machine, presentation: PresentationView | undefined): MachineView {
  const image = presentation ? primaryImage(presentation) : null;
  return {
    ...machine,
    name: presentation?.displayNameOverride ?? machine.name,
    summary: presentation?.shortDescription ?? machine.summary,
    image: image ? { url: image.url, alt: image.alt } : null,
  };
}

export async function getDashboardReadModel(actor: Actor): Promise<DashboardReadModel> {
  const db = getPrisma();
  const fresh = await getActor(db, actor.id);
  if (!hasAnyPermission(fresh, "dashboard.view")) redirect("/forbidden");
  const registered = await db.accessResource.findMany({ where: { scopeType: "MACHINE" }, select: { scopeRef: true } });
  const contexts = new Map<string, ResourceContext>();
  for (const resource of registered) contexts.set(resource.scopeRef, await getResourceContext("MACHINE", resource.scopeRef, db));
  const filtered = filterMaintenanceData({ machines, alerts, activityEvents, notifications }, (permission, machineRef) => {
    const context = contexts.get(machineRef);
    return !!context && can(fresh, permission, context);
  });
  const presentations = await getMachinePresentations(fresh, filtered.machines.map((machine) => machine.id));
  const views = filtered.machines.map((machine) => presentMachine(machine, presentations.find((item) => item.machineRef === machine.id)));
  return { ...filtered, machines: views, priorityMachines: [...views].sort((left, right) => right.riskScore - left.riskScore) };
}

export async function getMachineReadModel(actor: Actor, machineRef: string) {
  const db = getPrisma();
  const fresh = await getActor(db, actor.id);
  const resource = await db.accessResource.findUnique({ where: { scopeType_scopeRef: { scopeType: "MACHINE", scopeRef: machineRef } }, select: { id: true } });
  if (!resource) return null;
  const context = await getResourceContext("MACHINE", machineRef, db);
  if (!can(fresh, "machines.view", context)) return null;
  const machine = machines.find((item) => item.id === machineRef);
  if (!machine) return null;
  const [presentation] = await getMachinePresentations(fresh, [machineRef]);
  const canViewAlerts = can(fresh, "alerts.view", context);
  const canViewActivity = can(fresh, "activity.view", context);
  return {
    machine: presentMachine(machine, presentation), canViewAlerts, canViewActivity,
    alerts: canViewAlerts ? alerts.filter((alert) => alert.machineId === machineRef) : [],
    activityEvents: canViewActivity ? activityEvents.filter((event) => event.machineId === machineRef) : [],
  };
}
