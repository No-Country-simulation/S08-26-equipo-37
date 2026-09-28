import "dotenv/config";
import { z } from "zod";
import { getPrisma } from "../src/lib/db/prisma";
import { PERMISSIONS, SYSTEM_ROLES } from "../src/modules/identity/catalog";
import { hashPassword } from "../src/modules/identity/crypto";
import { machines } from "../src/features/maintenance/mock-data";

const db = getPrisma();
try {
  await db.$transaction(async (tx) => {
    for (const key of PERMISSIONS) await tx.permission.upsert({ where: { key }, create: { key }, update: {} });
    for (const [name, permissions] of Object.entries(SYSTEM_ROLES)) {
      const existing = await tx.role.findUnique({ where: { name } });
      const role = await tx.role.upsert({ where: { name }, create: { name, isSystem: true }, update: {} });
      // Never overwrite permission edits on a subsequent seed.
      if (!existing) for (const key of permissions) {
        const permission = await tx.permission.findUniqueOrThrow({ where: { key } });
        await tx.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
      }
    }
    for (const machine of machines) await tx.accessResource.upsert({
      where: { scopeType_scopeRef: { scopeType: "MACHINE", scopeRef: machine.id } },
      create: { scopeType: "MACHINE", scopeRef: machine.id, name: machine.name }, update: {},
    });
  });
  if (process.env.BOOTSTRAP_ADMIN_EMAIL || process.env.BOOTSTRAP_ADMIN_PASSWORD) {
    const credentials = z.object({ email: z.email().toLowerCase(), password: z.string().min(12).max(128), name: z.string().min(2).max(100) }).parse({
      email: process.env.BOOTSTRAP_ADMIN_EMAIL, password: process.env.BOOTSTRAP_ADMIN_PASSWORD, name: process.env.BOOTSTRAP_ADMIN_NAME ?? "Administración",
    });
    const existing = await db.user.findUnique({ where: { email: credentials.email }, select: { id: true } });
    if (!existing) {
      const passwordHash = await hashPassword(credentials.password);
      await db.$transaction(async (tx) => {
        const role = await tx.role.findUniqueOrThrow({ where: { name: "SUPER_ADMIN" } });
        const user = await tx.user.create({ data: { name: credentials.name, email: credentials.email, passwordHash, status: "ACTIVE", mustChangePassword: true, passwordChangedAt: new Date(), assignments: { create: { roleId: role.id, scopeType: "GLOBAL" } } } });
        await tx.auditLog.create({ data: { action: "USER_CREATED", entityType: "User", entityId: user.id, afterData: { source: "bootstrap", status: "ACTIVE" } } });
      });
      console.log("Initial administrator created; password change required on first login.");
    } else console.log("Existing administrator email left unchanged.");
  }
  console.log("Roles, permissions and machine references seeded.");
} finally { await db.$disconnect(); }
