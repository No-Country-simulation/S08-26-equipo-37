import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { can, type ResourceContext } from "./policy";
import { hashToken, newToken } from "./crypto";
import { appUrl } from "./tokens";
import type { Db } from "./db";
import { canAccessDemo, canModifyAccount, demoAccount, DEMO_ACCOUNTS, getDemoConfig } from "./demo";

export const publicUserSelect = {
  id: true, name: true, email: true, avatarUrl: true, theme: true, status: true,
  lastLoginAt: true, passwordChangedAt: true, mustChangePassword: true,
  createdAt: true, updatedAt: true, disabledAt: true,
  assignments: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
} satisfies Prisma.UserSelect;

export type CurrentUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }> & { readOnly?: boolean };
export const SESSION_COOKIE = "pm_session";
const DEMO_COOKIE = "pm_demo";

export async function getActor(db: Db, userId: string): Promise<CurrentUser> {
  const actor = await db.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!actor || actor.status !== "ACTIVE" || !canAccessDemo(actor.email)) throw new Error("La sesión ya no está habilitada.");
  return { ...actor, readOnly: !canModifyAccount(actor.email) };
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const theme = jar.get(DEMO_COOKIE)?.value;
  const demo = getDemoConfig() && DEMO_ACCOUNTS.find((account) => account.theme === theme);
  if (demo) {
    // This cookie selects a public demonstration; it never authenticates an administrator.
    const user = await getPrisma().user.findUnique({ where: { email: demo.email }, select: publicUserSelect });
    return user?.status === "ACTIVE" && !user.mustChangePassword ? { ...user, readOnly: true } : null;
  }
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await getPrisma().session.findUnique({ where: { tokenHash: hashToken(token) }, select: { expiresAt: true, user: { select: publicUserSelect } } });
  if (!session || session.expiresAt <= new Date() || session.user.status !== "ACTIVE" || !canAccessDemo(session.user.email)) return null;
  return { ...session.user, readOnly: !canModifyAccount(session.user.email) };
});

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

export async function createSession(userId: string, verifiedPasswordHash: string | null): Promise<void> {
  const actor = await getActor(getPrisma(), userId);
  const demo = demoAccount(actor.email);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const options = { httpOnly: true, secure: appUrl().startsWith("https:"), sameSite: "lax" as const, path: "/", expires: expiresAt };
  if (demo) {
    if (actor.mustChangePassword) throw new Error("La sesión de demostración no está disponible.");
    const jar = await cookies();
    jar.delete(SESSION_COOKIE);
    jar.set(DEMO_COOKIE, demo.theme, options);
    return;
  }
  if (!verifiedPasswordHash) throw new Error("Email o contraseña incorrectos.");
  const token = newToken();
  await getPrisma().$transaction(async (db) => {
    await getActor(db, userId);
    const credential = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (credential?.passwordHash !== verifiedPasswordHash) throw new Error("Las credenciales cambiaron. Volvé a iniciar sesión.");
    await db.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
    await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  }, { isolationLevel: "Serializable" });
  const jar = await cookies();
  jar.delete(DEMO_COOKIE);
  jar.set(SESSION_COOKIE, token, options);
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    const session = await getPrisma().session.findUnique({ where: { tokenHash: hashToken(token) }, select: { user: { select: { email: true } } } });
    if (session && canModifyAccount(session.user.email)) await getPrisma().session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  jar.delete(DEMO_COOKIE);
  jar.delete(SESSION_COOKIE);
}
