import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, verifyPassword, hashToken, newToken } from "../src/modules/identity/crypto.ts";

test("password derivation is salted and token storage is one-way", async () => {
  const password = "contraseña de prueba segura";
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(first.includes(password), false);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword("incorrecta", first), false);
  assert.equal(await verifyPassword(password, "invalid"), false);
  const token = newToken();
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.notEqual(newToken(), token);
  assert.notEqual(hashToken(token), token);
  assert.equal(hashToken(token), hashToken(token));
});
