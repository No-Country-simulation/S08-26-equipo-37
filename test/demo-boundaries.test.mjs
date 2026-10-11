import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("frozen demo authentication and rejected mutations never write to the database", () => {
  const result = spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "--input-type=module", "-e", `
    import assert from "node:assert/strict";
    import { registerHooks } from "node:module";
    const jar = new Map();
    globalThis.demoCookies = {
      get: (name) => jar.has(name) ? { value: jar.get(name) } : undefined,
      set: (name, value) => jar.set(name, value),
      delete: (name) => jar.delete(name),
      has: (name) => jar.has(name),
    };
    registerHooks({ resolve(specifier, context, nextResolve) {
      if (specifier === "next/headers") return { url: "data:text/javascript,export const cookies = async () => globalThis.demoCookies", shortCircuit: true };
      return nextResolve(specifier === "next/navigation" ? "next/dist/api/navigation.react-server.js" : specifier, context);
    } });
    const owner = { id: "owner", email: "impulseguarddev@gmail.com", status: "ACTIVE", passwordHash: null, mustChangePassword: false, assignments: [] };
    const demo = { ...owner, id: "demo", email: "demo.light@example.com" };
    const oldMember = { ...owner, id: "former", email: "former@example.com" };
    let writes = 0;
    const forbiddenWrite = () => { writes++; throw new Error("Unexpected database write"); };
    const db = {
      user: {
        findUnique: async ({ where }) => [owner, demo, oldMember].find((user) => user.id === where.id || user.email === where.email) ?? null,
        update: forbiddenWrite,
      },
      session: { create: forbiddenWrite, deleteMany: forbiddenWrite },
      invitation: { findUnique: async () => ({ email: demo.email, expiresAt: new Date(Date.now() + 60_000), acceptedAt: null }), updateMany: forbiddenWrite },
      passwordResetToken: { findUnique: async () => ({ user: demo, expiresAt: new Date(Date.now() + 60_000), usedAt: null }), updateMany: forbiddenWrite },
      $queryRaw: forbiddenWrite,
      $transaction: async (work) => work(db),
    };
    globalThis.prisma = db;
    const service = await import("./src/modules/identity/service.ts");
    const auth = await import("./src/modules/identity/auth.ts");
    const config = await import("./src/modules/identity/demo.ts");
    const admin = await import("./src/modules/admin/service.ts");
    const presentation = await import("./src/modules/machine-presentation/service.ts");
    assert.equal((await service.authenticate(demo.email, config.DEMO_PASSWORD)).id, demo.id);
    await auth.createSession(demo.id, null);
    assert.equal(jar.get("pm_demo"), "light");
    assert.equal((await auth.getCurrentUser()).readOnly, true);
    await auth.destroySession();
    assert.equal(jar.has("pm_demo"), false);
    jar.set("pm_demo", "owner");
    assert.equal(await auth.getCurrentUser(), null);
    jar.clear();
    await assert.rejects(service.authenticate(demo.email, "incorrect"), /incorrectos/);
    await assert.rejects(service.authenticate(oldMember.email, config.DEMO_PASSWORD), /incorrectos/);
    assert.equal((await auth.getActor(db, demo.id)).readOnly, true);
    assert.equal((await auth.getActor(db, owner.id)).readOnly, false);
    await assert.rejects(auth.getActor(db, oldMember.id), /habilitada/);
    await assert.rejects(service.updateThemePreference(demo.id, "dark"), /solo lectura/);
    await assert.rejects(service.changePassword(demo.id, config.DEMO_PASSWORD, "DifferentPassword2026!"), /solo lectura/);
    assert.equal(await service.requestPasswordReset(demo.email), null);
    assert.equal(await service.requestPasswordReset(oldMember.email), null);
    for (const kind of ["invitation", "reset"]) {
      assert.equal((await service.inspectAccountToken(kind, "a".repeat(64))).valid, false);
      await assert.rejects(service.consumeAccountToken(kind, "a".repeat(64), "DifferentPassword2026!"), /venció/);
    }
    await assert.rejects(admin.revokeAssignment(demo.id, { assignmentId: "grant", confirmed: "yes" }), /solo lectura/);
    await assert.rejects(presentation.updatePresentation(demo, { machineRef: "M-01", displayNameOverride: "Changed", shortDescription: "Changed" }), /solo lectura/);
    assert.equal(writes, 0);
    assert.equal(config.canAccessDemo(oldMember.email), false);
    assert.equal(config.canModifyAccount(owner.email), true);
    db.user.update = async () => { writes++; return owner; };
    await service.updateThemePreference(owner.id, "dark");
    assert.equal(writes, 1);
    db.session.findUnique = async () => ({ user: owner });
    db.session.deleteMany = async () => { writes++; return { count: 1 }; };
    jar.set("pm_demo", "invalid");
    jar.set("pm_session", "b".repeat(64));
    await auth.destroySession();
    assert.equal(writes, 2);
    assert.equal(jar.size, 0);
    const { PERMISSIONS } = await import("./src/modules/identity/catalog.ts");
    const users = [owner, demo, oldMember].map((user) => ({ ...user, assignments: [{
      id: user.id + "-grant", userId: user.id, roleId: "super", scopeType: "GLOBAL", scopeRef: null, validFrom: null, validUntil: null,
      role: { id: "super", name: "SUPER_ADMIN", permissions: PERMISSIONS.map((key) => ({ permission: { key } })) },
    }] }));
    db.user.findUnique = async ({ where }) => structuredClone(users.find((user) => user.id === where.id || user.email === where.email) ?? null);
    db.user.findMany = async () => structuredClone(users.filter((user) => user.status === "ACTIVE" && !user.mustChangePassword));
    db.user.update = async ({ where, data }) => {
      const index = users.findIndex((user) => user.id === where.id);
      users[index] = { ...users[index], ...data };
      return structuredClone(users[index]);
    };
    db.session.deleteMany = db.passwordResetToken.deleteMany = db.invitation.deleteMany = async () => ({ count: 0 });
    db.userRoleAssignment = {
      findUnique: async ({ where }) => structuredClone(users.flatMap((user) => user.assignments).find((assignment) => assignment.id === where.id) ?? null),
      delete: async ({ where }) => { for (const user of users) user.assignments = user.assignments.filter((assignment) => assignment.id !== where.id); },
    };
    db.$transaction = async (work) => {
      const before = structuredClone(users);
      try { return await work(db); }
      catch (error) { users.splice(0, users.length, ...before); throw error; }
    };
    const unchanged = structuredClone(users);
    await assert.rejects(admin.updateUser(owner.id, { userId: owner.id, email: "renamed@example.com", name: "Owner", avatarUrl: "", confirmed: "yes" }), /Debe permanecer/);
    assert.deepEqual(users, unchanged);
    await assert.rejects(admin.userCommand(owner.id, { userId: owner.id, command: "suspend", confirmed: "yes" }), /Debe permanecer/);
    assert.deepEqual(users, unchanged);
    await assert.rejects(admin.revokeAssignment(owner.id, { assignmentId: owner.id + "-grant", confirmed: "yes" }), /Debe permanecer/);
    assert.deepEqual(users, unchanged);
    delete process.env.DEMO_OWNER_EMAIL;
    assert.equal(config.canAccessDemo(oldMember.email), true);
    db.$queryRaw = async () => [{ attempts: 1 }];
    await assert.rejects(service.authenticate(demo.email, config.DEMO_PASSWORD), /incorrectos/);
  `], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    env: { ...process.env, DEMO_OWNER_EMAIL: "impulseguarddev@gmail.com", APP_URL: "http://127.0.0.1:3000", DATABASE_URL: "postgresql://test:test@127.0.0.1:1/demo_test" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
