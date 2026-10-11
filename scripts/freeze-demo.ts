// Run with --conditions=react-server --import tsx. Dry run by default; --apply commits.
import "dotenv/config";
import assert from "node:assert/strict";
import { z } from "zod";
import { PERMISSIONS, SYSTEM_ROLES } from "../src/modules/identity/catalog";
import { DEMO_ACCOUNTS } from "../src/modules/identity/demo";

const ownerEmail = "impulseguarddev@gmail.com";
const inputSchema = z.object({
  DEMO_OWNER_EMAIL: z.literal(ownerEmail),
});

type Owner = {
  email: string;
  status: string;
  passwordHash: string | null;
  mustChangePassword: boolean;
  assignments: {
    scopeType: string;
    scopeRef: string | null;
    validFrom: Date | null;
    validUntil: Date | null;
    role: { name: string; isSystem: boolean; permissions: { permission: { key: string } }[] };
  }[];
};

function assertOwner(owner: Owner | null, now: Date) {
  assert.ok(owner && owner.email === ownerEmail && owner.status === "ACTIVE" && owner.passwordHash && !owner.mustChangePassword,
    "The owner must exist with an active account and an established password.");
  assert.ok(owner.assignments.some((assignment) => assignment.scopeType === "GLOBAL" && assignment.scopeRef === null
    && (!assignment.validFrom || assignment.validFrom <= now) && assignment.validUntil === null
    && assignment.role.name === "SUPER_ADMIN" && assignment.role.isSystem
    && PERMISSIONS.every((key) => assignment.role.permissions.some((entry) => entry.permission.key === key))),
  "The owner must have a current, unlimited GLOBAL SUPER_ADMIN assignment with every permission.");
}

function selfCheck() {
  const validInput = { DEMO_OWNER_EMAIL: ownerEmail };
  assert.ok(inputSchema.safeParse(validInput).success);
  assert.ok(!inputSchema.safeParse({ ...validInput, DEMO_OWNER_EMAIL: "other@example.com" }).success);
  assert.ok(!inputSchema.safeParse({}).success);
  const now = new Date("2026-10-11T00:00:00Z");
  const owner: Owner = { email: ownerEmail, status: "ACTIVE", passwordHash: "existing-hash", mustChangePassword: false,
    assignments: [{ scopeType: "GLOBAL", scopeRef: null, validFrom: null, validUntil: null,
      role: { name: "SUPER_ADMIN", isSystem: true, permissions: PERMISSIONS.map((key) => ({ permission: { key } })) } }] };
  assertOwner(owner, now);
  assert.throws(() => assertOwner(null, now));
  assert.throws(() => assertOwner({ ...owner, status: "SUSPENDED" }, now));
  assert.throws(() => assertOwner({ ...owner, mustChangePassword: true }, now));
  assert.throws(() => assertOwner({ ...owner, assignments: [{ ...owner.assignments[0], validUntil: new Date("2031-10-11T00:00:00Z") }] }, now));
  assert.throws(() => assertOwner({ ...owner, assignments: [{ ...owner.assignments[0], scopeType: "MACHINE" }] }, now));
  assert.throws(() => assertOwner({ ...owner, assignments: [{ ...owner.assignments[0], role: { ...owner.assignments[0].role, permissions: [] } }] }, now));
  console.log("PASS freeze input validation and owner preservation checks.");
}

async function freeze() {
  assert.ok(process.argv.slice(2).every((argument) => argument === "--apply"), "Only --apply or --self-check is supported.");
  const parsed = inputSchema.safeParse(process.env);
  assert.ok(parsed.success, "Set DEMO_OWNER_EMAIL to the documented owner account.");
  const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["postgres:", "postgresql:"].includes(databaseUrl.protocol), "DATABASE_URL must select PostgreSQL.");
  const apply = process.argv.includes("--apply");
  const demos = DEMO_ACCOUNTS.map((demo) => ({ ...demo, name: demo.theme === "light" ? "Demo · Claro" : "Demo · Oscuro" }));
  const { getPrisma } = await import("../src/lib/db/prisma");
  const db = getPrisma();
  try {
    const summary = await db.$transaction(async (tx) => {
      const now = new Date();
      const owner = await tx.user.findUnique({ where: { email: ownerEmail }, select: {
        id: true, email: true, status: true, passwordHash: true, mustChangePassword: true,
        assignments: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      } });
      assertOwner(owner, now);
      assert.ok(owner);
      const viewer = await tx.role.findUnique({ where: { name: "VIEWER" }, include: { permissions: { include: { permission: true } } } });
      assert.ok(viewer?.isSystem && viewer.permissions.length === SYSTEM_ROLES.VIEWER.length
        && SYSTEM_ROLES.VIEWER.every((key) => viewer.permissions.some((entry) => entry.permission.key === key)),
      "The system VIEWER role must contain exactly the catalog's read-only permissions.");
      const otherUsers = { email: { notIn: [ownerEmail, ...demos.map((demo) => demo.email)] } };
      const nonOwner = { userId: { not: owner.id } };
      const summary = { mode: apply ? "apply" : "dry-run", database: `${databaseUrl.hostname}${databaseUrl.pathname}`, owner: ownerEmail,
        accountsToSuspend: await tx.user.count({ where: { ...otherUsers, status: { not: "SUSPENDED" } } }),
        assignmentsToExpire: await tx.userRoleAssignment.count({ where: { ...nonOwner, OR: [{ validUntil: null }, { validUntil: { gt: now } }] } }),
        sessionsToRevoke: await tx.session.count({ where: nonOwner }),
        demos: demos.map(({ email, theme }) => ({ email, theme })) };
      if (!apply) return summary;
      await tx.user.updateMany({ where: { ...otherUsers, status: { not: "SUSPENDED" } }, data: { status: "SUSPENDED", disabledAt: now } });
      await tx.userRoleAssignment.updateMany({ where: { ...nonOwner, OR: [{ validUntil: null }, { validUntil: { gt: now } }] }, data: { validUntil: now } });
      await tx.session.deleteMany({ where: nonOwner });
      await tx.passwordResetToken.updateMany({ where: { ...nonOwner, usedAt: null, expiresAt: { gt: now } }, data: { expiresAt: now } });
      await tx.invitation.updateMany({ where: { acceptedAt: null, expiresAt: { gt: now } }, data: { expiresAt: now } });
      for (const demo of demos) {
        const data = { name: demo.name, theme: demo.theme, passwordHash: null, status: "ACTIVE" as const, mustChangePassword: false, disabledAt: null, passwordChangedAt: null };
        const user = await tx.user.upsert({ where: { email: demo.email }, create: { email: demo.email, ...data }, update: data });
        const assignment = await tx.userRoleAssignment.findFirst({ where: { userId: user.id, roleId: viewer.id, scopeType: "GLOBAL", scopeRef: null }, orderBy: { createdAt: "asc" } });
        if (assignment) await tx.userRoleAssignment.update({ where: { id: assignment.id }, data: { validFrom: null, validUntil: null } });
        else await tx.userRoleAssignment.create({ data: { userId: user.id, roleId: viewer.id, scopeType: "GLOBAL" } });
      }
      assert.equal(await tx.user.count({ where: { ...otherUsers, status: { not: "SUSPENDED" } } }), 0, "A previous account is still enabled.");
      assert.equal(await tx.session.count({ where: nonOwner }), 0, "A nonowner session survived revocation.");
      assert.equal(await tx.userRoleAssignment.count({ where: { user: otherUsers, OR: [{ validUntil: null }, { validUntil: { gt: now } }] } }), 0, "A previous account still has a future or current grant.");
      await tx.auditLog.create({ data: { actorUserId: owner.id, action: "DEMO_FROZEN", entityType: "Application", afterData: summary } });
      return summary;
    }, { isolationLevel: "Serializable", timeout: 30_000 });
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await db.$disconnect();
  }
}

if (process.argv.includes("--self-check")) selfCheck();
else await freeze();
