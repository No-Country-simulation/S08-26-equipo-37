import "server-only";
import { z } from "zod";
import type { Db } from "./db";
import { hashToken, newToken } from "./crypto";

export function appUrl(): string {
  const value = z.url().parse(process.env.APP_URL ?? "http://127.0.0.1:3000");
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" || !["http:", "https:"].includes(url.protocol)) throw new Error("APP_URL debe ser el origen de la aplicación.");
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("APP_URL requiere HTTPS fuera del entorno local.");
  return url.origin;
}

export async function issueInvitation(db: Db, email: string, actorId: string): Promise<string> {
  const token = newToken();
  await db.invitation.deleteMany({ where: { email, acceptedAt: null } });
  await db.invitation.create({ data: { email, createdByUserId: actorId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) } });
  return `${appUrl()}/invite/${token}`;
}

export async function issuePasswordReset(db: Db, userId: string): Promise<string> {
  const token = newToken();
  await db.passwordResetToken.deleteMany({ where: { userId, usedAt: null } });
  await db.passwordResetToken.create({ data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
  return `${appUrl()}/reset-password/${token}`;
}
