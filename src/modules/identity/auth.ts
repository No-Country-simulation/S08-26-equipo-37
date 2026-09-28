import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { can, type ResourceContext } from "./policy";
import { hashToken, newToken } from "./crypto";
import { appUrl } from "./tokens";
import type { Db } from "./db";

export const publicUserSelect = {
  id: true, name: true, email: true, avatarUrl: true, status: true,
  lastLoginAt: true, passwordChangedAt: true, mustChangePassword: true,
  createdAt: true, updatedAt: true, disabledAt: true,
  assignments: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
} satisfies Prisma.UserSelect;

export type CurrentUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;
export const SESSION_COOKIE = "pm_session";

export async function getActor(db: Db, userId: string): Promise<CurrentUser> {
  const actor = await db.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!actor || actor.status !== "ACTIVE") throw new Error("La sesión ya no está habilitada.");
  return actor;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await getPrisma().session.findUnique({ where: { tokenHash: hashToken(token) }, select: { expiresAt: true, user: { select: publicUserSelect } } });
  if (!session || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") return null;
  return session.user;
}

export async function requireAuthenticatedUser(options: { allowPasswordChange?: boolean } = {}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword && !options.allowPasswordChange) redirect("/profile?password=required");
  return user;
}

export async function requirePermission(permission: string, resource?: ResourceContext) {
  const user = await requireAuthenticatedUser();
  if (!can(user, permission, resource)) redirect("/forbidden");
  return user;
}

export async function createSession(userId: string, verifiedPasswordHash: string): Promise<void> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await getPrisma().$transaction(async (db) => {
    await getActor(db, userId);
    const credential = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (credential?.passwordHash !== verifiedPasswordHash) throw new Error("Las credenciales cambiaron. Volvé a iniciar sesión.");
    await db.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
    await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  }, { isolationLevel: "Serializable" });
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: appUrl().startsWith("https:"), sameSite: "lax", path: "/", expires: expiresAt });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await getPrisma().session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}
