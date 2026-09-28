import "server-only";
import { getPrisma } from "@/lib/db/prisma";
import type { Db } from "./db";
import type { ResourceContext, ScopeType } from "./policy";

export function listResources(db: Db = getPrisma()) {
  return db.accessResource.findMany({ orderBy: [{ scopeType: "asc" }, { name: "asc" }] });
}

export async function getResourceContext(scopeType: ScopeType, scopeRef: string | null, db: Db = getPrisma()): Promise<ResourceContext> {
  if (scopeType === "GLOBAL") {
    if (scopeRef) throw new Error("El ámbito global no admite referencia.");
    return {};
  }
  if (!scopeRef) throw new Error("Falta la referencia del ámbito.");
  const resources = await listResources(db);
  let item = resources.find((resource) => resource.scopeType === scopeType && resource.scopeRef === scopeRef);
  if (!item) throw new Error("El recurso de acceso no existe.");
  const context: ResourceContext = {};
  const fields = { ORGANIZATION: "organizationRef", PLANT: "plantRef", AREA: "areaRef", MACHINE: "machineRef" } as const;
  const seen = new Set<string>();
  while (item) {
    if (seen.has(item.id) || item.scopeType === "GLOBAL") throw new Error("Jerarquía de acceso inválida.");
    seen.add(item.id);
    context[fields[item.scopeType]] = item.scopeRef;
    item = item.parentId ? resources.find((parent) => parent.id === item?.parentId) : undefined;
  }
  return context;
}
