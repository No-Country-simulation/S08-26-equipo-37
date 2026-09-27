import assert from "node:assert/strict";
import test from "node:test";
import { assignmentSchema, newUserSchema, resourceSchema, updateUserSchema, userCommandSchema } from "./validation.ts";

const assignment = { userId: "user-1", assignmentId: "", roleId: "viewer", scopeResourceId: "machine-resource-1", validFrom: "", validUntil: "", confirmed: "yes" };
const user = { name: "María Díaz", email: "MARIA@example.com", avatarUrl: "", confirmed: "yes" };

test("access dates are parsed as UTC and reject rollover, equal or reversed intervals", () => {
  const parsed = assignmentSchema.parse({ ...assignment, validFrom: "2026-09-27T09:00", validUntil: "2026-09-28T18:00" });
  assert.equal(parsed.validFrom.toISOString(), "2026-09-27T09:00:00.000Z");
  assert.equal(parsed.validUntil.toISOString(), "2026-09-28T18:00:00.000Z");
  assert.equal(assignmentSchema.parse(assignment).validUntil, null);
  for (const dates of [
    { validFrom: "2026-02-30T09:00", validUntil: "" },
    { validFrom: "2026-09-27T09:00Z", validUntil: "" },
    { validFrom: "2026-09-27T09:00", validUntil: "2026-09-27T09:00" },
    { validFrom: "2026-09-28T09:00", validUntil: "2026-09-27T09:00" },
  ]) assert.equal(assignmentSchema.safeParse({ ...assignment, ...dates }).success, false);
});

test("inviting a user requires explicit confirmation and an initial access", () => {
  const parsed = newUserSchema.parse({ ...user, ...assignment });
  assert.equal(parsed.email, "maria@example.com");
  assert.equal(parsed.avatarUrl, null);
  assert.equal(newUserSchema.safeParse(user).success, false);
  assert.equal(newUserSchema.safeParse({ ...user, ...assignment, confirmed: undefined }).success, false);
  assert.equal(userCommandSchema.safeParse({ userId: "user-1", command: "suspend" }).success, false);
});

test("user edits reject active avatar schemes and URLs containing credentials", () => {
  for (const avatarUrl of ["javascript:alert(1)", "data:image/svg+xml,svg", "https://user:secret@example.com/avatar.png"]) {
    assert.equal(updateUserSchema.safeParse({ ...user, userId: "user-1", avatarUrl }).success, false);
  }
  assert.equal(updateUserSchema.safeParse({ ...user, userId: "user-1", avatarUrl: "https://example.com/avatar.png" }).success, true);
});

test("authorization resources require a valid reference and cannot represent GLOBAL", () => {
  const resource = { resourceId: "", scopeType: "PLANT", scopeRef: "PLANT-A", name: "Planta A", parentId: "", confirmed: "yes" };
  assert.equal(resourceSchema.parse(resource).parentId, null);
  assert.equal(resourceSchema.safeParse({ ...resource, scopeType: "GLOBAL" }).success, false);
  assert.equal(resourceSchema.safeParse({ ...resource, scopeRef: "../plant" }).success, false);
});
