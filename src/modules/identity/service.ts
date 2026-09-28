import "server-only";
import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { hashPassword, hashToken, verifyPassword } from "./crypto";
import { audit } from "./audit";
import { issuePasswordReset } from "./tokens";

export const emailSchema = z.email().trim().toLowerCase().max(254);
export const passwordSchema = z.string().min(12, "Usá al menos 12 caracteres.").max(128, "Máximo 128 caracteres.");
export const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
const dummyHash = `scrypt-v1$${"0".repeat(32)}$${"0".repeat(128)}`;

export async function rateLimit(kind: string, identifier: string, limit: number, minutes: number): Promise<boolean> {
  const key = hashToken(`${kind}:${identifier}`);
  const resetAt = new Date(Date.now() + minutes * 60_000);
  const rows = await getPrisma().$queryRaw<{ attempts: number }[]>`
    INSERT INTO "AuthRateLimit" ("key", "attempts", "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "AuthRateLimit"."resetAt" <= NOW() THEN 1 ELSE "AuthRateLimit"."attempts" + 1 END,
      "resetAt" = CASE WHEN "AuthRateLimit"."resetAt" <= NOW() THEN EXCLUDED."resetAt" ELSE "AuthRateLimit"."resetAt" END
    RETURNING "attempts"`;
  return rows[0].attempts <= limit;
}

export async function authenticate(emailInput: unknown, passwordInput: unknown) {
  const { email, password } = z.object({ email: emailSchema, password: z.string().min(1).max(128) }).parse({ email: emailInput, password: passwordInput });
  if (!await rateLimit("login", email, 10, 15)) throw new Error("Demasiados intentos. Esperá 15 minutos.");
  const user = await getPrisma().user.findUnique({ where: { email }, select: { id: true, status: true, passwordHash: true, mustChangePassword: true } });
  const valid = await verifyPassword(password, user?.passwordHash ?? dummyHash);
  if (!valid || !user || user.status !== "ACTIVE" || !user.passwordHash) throw new Error("Email o contraseña incorrectos.");
  return { id: user.id, verifiedPasswordHash: user.passwordHash, mustChangePassword: user.mustChangePassword };
}

export async function requestPasswordReset(emailInput: unknown) {
  const email = emailSchema.parse(emailInput);
  if (!await rateLimit("reset", email, 3, 60)) return null;
  return getPrisma().$transaction(async (db) => {
    const user = await db.user.findUnique({ where: { email }, select: { id: true, status: true } });
    if (!user || user.status !== "ACTIVE") return null;
    const link = await issuePasswordReset(db, user.id);
    await audit(db, { action: "PASSWORD_RESET_REQUESTED", entityType: "User", entityId: user.id });
    return { email, link };
  }, { isolationLevel: "Serializable" });
}

export async function inspectAccountToken(kind: "invitation" | "reset", token: string) {
  if (!tokenSchema.safeParse(token).success) return { valid: false };
  const db = getPrisma();
  const tokenHash = hashToken(token);
  if (kind === "invitation") {
    const record = await db.invitation.findUnique({ where: { tokenHash }, select: { email: true, expiresAt: true, acceptedAt: true } });
    if (!record || record.acceptedAt || record.expiresAt <= new Date()) return { valid: false };
    const user = await db.user.findUnique({ where: { email: record.email }, select: { status: true } });
    return { valid: user?.status === "INVITED", email: record.email };
  }
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash }, select: { expiresAt: true, usedAt: true, user: { select: { status: true } } } });
  return { valid: !!record && !record.usedAt && record.expiresAt > new Date() && record.user.status === "ACTIVE" };
}

export async function consumeAccountToken(kind: "invitation" | "reset", tokenInput: unknown, passwordInput: unknown): Promise<void> {
  const token = tokenSchema.parse(tokenInput);
  const password = passwordSchema.parse(passwordInput);
  if (!await rateLimit("token", token, 8, 15)) throw new Error("Demasiados intentos. Esperá 15 minutos.");
  const passwordHash = await hashPassword(password);
  const tokenHash = hashToken(token);
  await getPrisma().$transaction(async (db) => {
    const now = new Date();
    let userId: string;
    if (kind === "invitation") {
      const record = await db.invitation.findUnique({ where: { tokenHash } });
      if (!record || record.acceptedAt || record.expiresAt <= now) throw new Error("El enlace venció o ya fue utilizado.");
      const user = await db.user.findUnique({ where: { email: record.email } });
      if (!user || user.status !== "INVITED") throw new Error("La invitación ya no está disponible.");
      const claimed = await db.invitation.updateMany({ where: { id: record.id, acceptedAt: null, expiresAt: { gt: now } }, data: { acceptedAt: now } });
      if (claimed.count !== 1) throw new Error("El enlace ya fue utilizado.");
      userId = user.id;
      await db.user.update({ where: { id: userId }, data: { status: "ACTIVE", passwordHash, passwordChangedAt: now, mustChangePassword: false } });
    } else {
      const record = await db.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: { select: { status: true } } } });
      if (!record || record.usedAt || record.expiresAt <= now || record.user.status !== "ACTIVE") throw new Error("El enlace venció o ya fue utilizado.");
      const claimed = await db.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
      if (claimed.count !== 1) throw new Error("El enlace ya fue utilizado.");
      userId = record.userId;
      await db.user.update({ where: { id: userId }, data: { passwordHash, passwordChangedAt: now, mustChangePassword: false } });
    }
    await db.session.deleteMany({ where: { userId } });
    await db.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: now } });
    await audit(db, { actorUserId: userId, action: "PASSWORD_CHANGED", entityType: "User", entityId: userId });
  }, { isolationLevel: "Serializable" });
}

export async function changePassword(userId: string, currentInput: unknown, nextInput: unknown): Promise<void> {
  const current = z.string().min(1).max(128).parse(currentInput);
  const password = passwordSchema.parse(nextInput);
  if (current === password) throw new Error("Elegí una contraseña diferente de la actual.");
  if (!await rateLimit("change", userId, 8, 15)) throw new Error("Demasiados intentos. Esperá 15 minutos.");
  const nextHash = await hashPassword(password);
  await getPrisma().$transaction(async (db) => {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== "ACTIVE" || !user.passwordHash || !await verifyPassword(current, user.passwordHash)) throw new Error("La contraseña actual es incorrecta.");
    const now = new Date();
    await db.user.update({ where: { id: userId }, data: { passwordHash: nextHash, passwordChangedAt: now, mustChangePassword: false } });
    await db.session.deleteMany({ where: { userId } });
    await db.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: now } });
    await audit(db, { actorUserId: userId, action: "PASSWORD_CHANGED", entityType: "User", entityId: userId });
  }, { isolationLevel: "Serializable" });
}
