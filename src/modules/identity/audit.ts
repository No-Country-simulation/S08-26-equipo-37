import "server-only";
import type { Prisma, ScopeType } from "@/generated/prisma/client";
import type { Db } from "./db";

type AuditEntry = {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeData?: Prisma.InputJsonValue;
  afterData?: Prisma.InputJsonValue;
  scopeType?: ScopeType;
  scopeRef?: string | null;
  ipAddress?: string;
  userAgent?: string;
};

function assertNoSecrets(value: unknown): void {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (/password|token|secret|authorization|cookie/i.test(key) && !["mustChangePassword", "passwordChangedAt"].includes(key)) throw new Error("La auditoría no admite credenciales.");
    assertNoSecrets(child);
  }
}

export async function audit(db: Db, entry: AuditEntry) {
  assertNoSecrets(entry.beforeData);
  assertNoSecrets(entry.afterData);
  return db.auditLog.create({ data: entry });
}
