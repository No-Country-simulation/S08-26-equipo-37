// Run: node --conditions=react-server --import tsx scripts/check-identity-integration.ts
// Uses only the dedicated local E2E database; retains synthetic fixtures for UI checks.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { z } from "zod";

// Database checks require the explicit standalone command, never unit-test discovery.
if (process.env.NODE_TEST_CONTEXT || !process.execArgv.includes("--conditions=react-server")) {
  console.log("SKIP local DB integration; run explicitly with --conditions=react-server --import tsx.");
  process.exit(0);
}

const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
assert.equal(databaseUrl.hostname, "127.0.0.1", "Integration checks require local PostgreSQL.");
assert.ok(["postgres:", "postgresql:"].includes(databaseUrl.protocol));
databaseUrl.pathname = "/predictive_maintenance_e2e";
databaseUrl.search = "";
assert.ok(databaseUrl.pathname.endsWith("_e2e"));
process.env.DATABASE_URL = databaseUrl.toString();
process.env.APP_URL = "http://127.0.0.1:3001";
// Do this before application imports: the test must never send real mail.
for (const key of Object.keys(process.env)) if (key.startsWith("SMTP_")) delete process.env[key];
// Standalone Node lacks Next's RSC module aliases. Keep this alias in the runner only.
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === "next/navigation" ? "next/dist/api/navigation.react-server.js" : specifier, context);
  },
});

const { getPrisma } = await import("../src/lib/db/prisma");
const { hashPassword, hashToken, newToken } = await import("../src/modules/identity/crypto");
const { publicUserSelect } = await import("../src/modules/identity/auth");
const { can } = await import("../src/modules/identity/policy");
const { PERMISSIONS } = await import("../src/modules/identity/catalog");
const identity = await import("../src/modules/identity/service");
const admin = await import("../src/modules/admin/service");
const db = getPrisma();
const fixturePath = ".cache/e2e-fixtures.json";
const fixtureCredentials = z.object({ id: z.string(), email: z.email(), password: z.string().min(12) });
const fixtureSchema = z.object({
  database: z.literal("predictive_maintenance_e2e"),
  baseUrl: z.literal("http://127.0.0.1:3001"),
  admin: fixtureCredentials,
}).passthrough();
const runId = randomUUID();
const startedAt = new Date();
const passwords = ["Local-only-E2E-2026!", `Initial-E2E-${runId}!`, `Reset-E2E-${runId}!`, "Local-only-E2E-2026!"];
const sensitiveValues = new Set(passwords);
let currentCheck = "fixture preparation";
let passed = 0;

async function check(label: string, work: () => Promise<void>) {
  currentCheck = label;
  await work();
  passed += 1;
  console.log(`PASS ${label}`);
}

function tokenFromLink(link: string | undefined): string {
  assert.ok(link, "Expected a local account link.");
  const url = new URL(link);
  assert.equal(url.origin, process.env.APP_URL);
  const token = url.pathname.split("/").at(-1);
  assert.ok(token && /^[a-f0-9]{64}$/.test(token), "Expected an opaque account token.");
  sensitiveValues.add(token);
  return token;
}

async function sessionsFor(userId: string) {
  const rows = Array.from({ length: 2 }, () => {
    const token = newToken();
    sensitiveValues.add(token);
    return { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60_000) };
  });
  await db.session.createMany({ data: rows });
  assert.equal(await db.session.count({ where: { userId } }), 2);
}

function inspectAuditData(value: unknown): void {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    assert.ok(!/password|token|secret|authorization|cookie/i.test(key) || ["mustChangePassword", "passwordChangedAt"].includes(key), "Audit contains a credential field.");
    inspectAuditData(child);
  }
}

try {
  const superRole = await db.role.findUniqueOrThrow({ where: { name: "SUPER_ADMIN" } });
  const adminRole = await db.role.findUniqueOrThrow({ where: { name: "ADMIN" } });
  const viewerRole = await db.role.findUniqueOrThrow({ where: { name: "VIEWER" } });
  let fixtures: z.infer<typeof fixtureSchema>;
  try {
    fixtures = fixtureSchema.parse(JSON.parse(await readFile(fixturePath, "utf8")));
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    assert.equal(await db.user.count(), 0, "An existing E2E database needs its matching fixture file.");
    const created = await db.user.create({ data: {
      name: "Local E2E administrator", email: `e2e-admin-${runId}@example.test`, status: "ACTIVE",
      passwordHash: await hashPassword(passwords[0]), passwordChangedAt: new Date(),
      assignments: { create: { roleId: superRole.id, scopeType: "GLOBAL" } },
    } });
    fixtures = { database: "predictive_maintenance_e2e", baseUrl: "http://127.0.0.1:3001", admin: { id: created.id, email: created.email, password: passwords[0] } };
    await mkdir(".cache", { recursive: true });
    await writeFile(fixturePath, JSON.stringify(fixtures, null, 2), { mode: 0o600 });
  }
  const administrator = await db.user.findUniqueOrThrow({ where: { id: fixtures.admin.id }, select: publicUserSelect });
  assert.equal(administrator.email, fixtures.admin.email);
  assert.ok(PERMISSIONS.every((key) => can(administrator, key)));

  await check("last global administrator mutations roll back", async () => {
    const active = await db.user.findMany({ where: { status: "ACTIVE", mustChangePassword: false }, select: publicUserSelect });
    const permanentAdmins = active.filter((user) => PERMISSIONS.every((key) => can({ ...user, assignments: user.assignments.filter((assignment) => assignment.scopeType === "GLOBAL" && !assignment.validUntil) }, key)));
    assert.equal(permanentAdmins.length, 1, "This fixture requires exactly one permanent global administrator.");
    const assignment = administrator.assignments.find((item) => item.roleId === superRole.id && item.scopeType === "GLOBAL");
    assert.ok(assignment);
    const protectedAdmin = /Debe permanecer al menos un administrador/;
    await assert.rejects(admin.userCommand(administrator.id, { userId: administrator.id, command: "suspend", confirmed: "yes" }), protectedAdmin);
    await assert.rejects(admin.userCommand(administrator.id, { userId: administrator.id, command: "force-password", confirmed: "yes" }), protectedAdmin);
    await assert.rejects(admin.revokeAssignment(administrator.id, { assignmentId: assignment.id, confirmed: "yes" }), protectedAdmin);
    const unchanged = await db.user.findUniqueOrThrow({ where: { id: administrator.id } });
    assert.equal(unchanged.status, "ACTIVE");
    assert.equal(unchanged.mustChangePassword, false);
    assert.ok(await db.userRoleAssignment.findUnique({ where: { id: assignment.id } }));
  });

  const email = `e2e-viewer-${runId}@example.test`;
  const invitation = await admin.createUser(administrator.id, {
    name: "Local E2E viewer", email, avatarUrl: "", roleId: viewerRole.id,
    scopeResourceId: "GLOBAL", validFrom: "", validUntil: "", confirmed: "yes",
  });
  const viewer = await db.user.findUniqueOrThrow({ where: { email } });
  const invitationToken = tokenFromLink(invitation.link);
  await check("invitation stores a digest and accepts one activation", async () => {
    const record = await db.invitation.findUniqueOrThrow({ where: { tokenHash: hashToken(invitationToken) } });
    assert.notEqual(record.tokenHash, invitationToken);
    assert.equal((await identity.inspectAccountToken("invitation", invitationToken)).valid, true);
    await assert.rejects(identity.authenticate(email, passwords[1]), /Email o contraseña incorrectos/);
    await identity.consumeAccountToken("invitation", invitationToken, passwords[1]);
    assert.equal((await identity.authenticate(email, passwords[1])).id, viewer.id);
    assert.equal((await identity.inspectAccountToken("invitation", invitationToken)).valid, false);
    await assert.rejects(identity.consumeAccountToken("invitation", invitationToken, passwords[1]), /enlace|invitación/);
  });

  await check("password reset is single-use and revokes every session", async () => {
    await sessionsFor(viewer.id);
    const reset = await identity.requestPasswordReset(email);
    const token = tokenFromLink(reset?.link);
    assert.equal((await identity.inspectAccountToken("reset", token)).valid, true);
    await identity.consumeAccountToken("reset", token, passwords[2]);
    assert.equal(await db.session.count({ where: { userId: viewer.id } }), 0);
    assert.equal((await identity.inspectAccountToken("reset", token)).valid, false);
    await assert.rejects(identity.consumeAccountToken("reset", token, passwords[2]), /enlace/);
    await assert.rejects(identity.authenticate(email, passwords[1]), /Email o contraseña incorrectos/);
    assert.equal((await identity.authenticate(email, passwords[2])).id, viewer.id);
  });

  await check("password change revokes sessions and pending reset links", async () => {
    await sessionsFor(viewer.id);
    const reset = await identity.requestPasswordReset(email);
    const token = tokenFromLink(reset?.link);
    await identity.changePassword(viewer.id, passwords[2], passwords[3]);
    assert.equal(await db.session.count({ where: { userId: viewer.id } }), 0);
    assert.equal((await identity.inspectAccountToken("reset", token)).valid, false);
    await assert.rejects(identity.consumeAccountToken("reset", token, passwords[2]), /enlace/);
    await assert.rejects(identity.authenticate(email, passwords[2]), /Email o contraseña incorrectos/);
    assert.equal((await identity.authenticate(email, passwords[3])).id, viewer.id);
  });

  await check("suspension blocks authentication and revokes sessions", async () => {
    await sessionsFor(viewer.id);
    await admin.userCommand(administrator.id, { userId: viewer.id, command: "suspend", confirmed: "yes" });
    assert.equal(await db.session.count({ where: { userId: viewer.id } }), 0);
    await assert.rejects(identity.authenticate(email, passwords[3]), /Email o contraseña incorrectos/);
    await admin.userCommand(administrator.id, { userId: viewer.id, command: "reactivate", confirmed: "yes" });
    assert.equal((await identity.authenticate(email, passwords[3])).id, viewer.id);
  });

  const plantA = await db.accessResource.create({ data: { scopeType: "PLANT", scopeRef: `e2e-a-${runId}`, name: "E2E test plant A" } });
  const plantB = await db.accessResource.create({ data: { scopeType: "PLANT", scopeRef: `e2e-b-${runId}`, name: "E2E test plant B" } });
  const fixtureHash = await hashPassword(passwords[0]);
  sensitiveValues.add(fixtureHash);
  const scopedAdministrator = await db.user.create({ data: {
    name: "Local E2E plant administrator", email: `e2e-scoped-${runId}@example.test`, status: "ACTIVE", passwordHash: fixtureHash,
    assignments: { create: { roleId: adminRole.id, scopeType: "PLANT", scopeRef: plantA.scopeRef } },
  } });
  const outsider = await db.user.create({ data: {
    name: "Local E2E other plant", email: `e2e-other-${runId}@example.test`, status: "ACTIVE", passwordHash: fixtureHash,
    assignments: { create: { roleId: viewerRole.id, scopeType: "PLANT", scopeRef: plantB.scopeRef } },
  } });
  const denied = /No tenés permiso|No podés delegar|supera lo que podés delegar|no está disponible dentro/;
  const assignmentInput = { userId: scopedAdministrator.id, assignmentId: "", validFrom: "", validUntil: "", confirmed: "yes" };
  await check("scoped administration rejects broader permissions and scope", async () => {
    await assert.rejects(admin.saveAssignment(scopedAdministrator.id, { ...assignmentInput, roleId: adminRole.id, scopeResourceId: "GLOBAL" }), denied);
    await assert.rejects(admin.saveAssignment(scopedAdministrator.id, { ...assignmentInput, roleId: superRole.id, scopeResourceId: plantA.id }), denied);
    assert.equal(await db.userRoleAssignment.count({ where: { userId: scopedAdministrator.id } }), 1);
  });
  await check("scoped administration leaves other plant accounts unchanged", async () => {
    await assert.rejects(admin.updateUser(scopedAdministrator.id, { userId: outsider.id, name: "Should stay unchanged", email: outsider.email, avatarUrl: "", confirmed: "yes" }), denied);
    await assert.rejects(admin.userCommand(scopedAdministrator.id, { userId: outsider.id, command: "suspend", confirmed: "yes" }), denied);
    const unchanged = await db.user.findUniqueOrThrow({ where: { id: outsider.id } });
    assert.equal(unchanged.name, outsider.name);
    assert.equal(unchanged.status, "ACTIVE");
  });

  const temporary = await db.user.create({ data: {
    name: "Local E2E temporary administrator", email: `e2e-temporary-${runId}@example.test`, status: "ACTIVE", passwordHash: fixtureHash,
    assignments: { create: { roleId: adminRole.id, scopeType: "PLANT", scopeRef: plantA.scopeRef, validUntil: new Date(Date.now() + 86_400_000) } },
  } });
  await check("temporary administrator cannot grant permanent access or control a permanent account", async () => {
    const rejectedEmail = `e2e-not-created-${runId}@example.test`;
    await assert.rejects(admin.createUser(temporary.id, { name: "Not created", email: rejectedEmail, avatarUrl: "", roleId: viewerRole.id, scopeResourceId: plantA.id, validFrom: "", validUntil: "", confirmed: "yes" }), denied);
    assert.equal(await db.user.count({ where: { email: rejectedEmail } }), 0);
    await assert.rejects(admin.userCommand(temporary.id, { userId: scopedAdministrator.id, command: "suspend", confirmed: "yes" }), denied);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: scopedAdministrator.id } })).status, "ACTIVE");
  });

  await check("audit records contain changes without credentials or account links", async () => {
    const logs = await db.auditLog.findMany({ where: { createdAt: { gte: startedAt } } });
    for (const action of ["USER_CREATED", "ACCESS_GRANTED", "PASSWORD_CHANGED", "PASSWORD_RESET_REQUESTED", "USER_SUSPENDED", "USER_REACTIVATED"]) assert.ok(logs.some((entry) => entry.action === action));
    const credentials = await db.user.findMany({ where: { id: { in: [viewer.id, scopedAdministrator.id, outsider.id, temporary.id] } }, select: { passwordHash: true } });
    for (const credential of credentials) if (credential.passwordHash) sensitiveValues.add(credential.passwordHash);
    for (const entry of logs) { inspectAuditData(entry.beforeData); inspectAuditData(entry.afterData); }
    const serialized = JSON.stringify(logs);
    for (const sensitiveValue of sensitiveValues) assert.equal(serialized.includes(sensitiveValue), false, "Audit contains a sensitive value.");
    assert.equal(serialized.includes("/reset-password/"), false);
    assert.equal(serialized.includes("/invite/"), false);
  });

  const machine = await db.accessResource.findUniqueOrThrow({ where: { scopeType_scopeRef: { scopeType: "MACHINE", scopeRef: "M-01" } } });
  const viewerAssignment = await db.userRoleAssignment.findFirstOrThrow({ where: { userId: viewer.id } });
  await admin.saveAssignment(administrator.id, { userId: viewer.id, assignmentId: viewerAssignment.id, roleId: viewerRole.id, scopeResourceId: machine.id, validFrom: "", validUntil: "", confirmed: "yes" });
  // Preserve the active UI admin and any fixture metadata created by another local check.
  const latest = fixtureSchema.parse(JSON.parse(await readFile(fixturePath, "utf8")));
  await writeFile(fixturePath, JSON.stringify({ ...latest,
    viewer: { id: viewer.id, email, password: passwords[3], scopeType: "MACHINE", scopeRef: "M-01" },
    scopedAdmin: { id: scopedAdministrator.id, email: scopedAdministrator.email, password: passwords[0], plantRef: plantA.scopeRef },
  }, null, 2), { mode: 0o600 });
  console.log(`Completed ${passed} local identity integration checks. Synthetic UI fixtures retained in .cache/e2e-fixtures.json.`);
} catch (error) {
  // Assertion values and DB diagnostics may contain credentials. Print only the test label/type.
  console.error(`FAIL ${currentCheck} (${error instanceof Error ? error.name : "unknown error"}). No credentials or token details emitted.`);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
