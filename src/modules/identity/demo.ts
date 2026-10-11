import "server-only";
import { z } from "zod";

export const DEMO_ACCOUNTS = [
  { email: "demo.light@example.com", theme: "light" },
  { email: "demo.dark@example.com", theme: "dark" },
] as const;
export const DEMO_PASSWORD = "DemoMaintenance2026!";
export const DEMO_READ_ONLY_MESSAGE = "La demostración es de solo lectura. Solo la cuenta propietaria puede guardar cambios.";

const configuration = z.object({
  ownerEmail: z.email().trim().toLowerCase(),
}).refine((value) => !DEMO_ACCOUNTS.some((account) => account.email === value.ownerEmail), "La cuenta propietaria no puede ser una cuenta demo.");

export function getDemoConfig() {
  if (!process.env.DEMO_OWNER_EMAIL) return null;
  return configuration.parse({
    ownerEmail: process.env.DEMO_OWNER_EMAIL,
  });
}

export function canAccessDemo(email: string): boolean {
  const config = getDemoConfig();
  return !config || email === config.ownerEmail || DEMO_ACCOUNTS.some((account) => account.email === email);
}

export function canModifyAccount(email: string): boolean {
  const config = getDemoConfig();
  return !config || email === config.ownerEmail;
}

export function assertAccountWritable(email: string): void {
  if (!canModifyAccount(email)) throw new Error(DEMO_READ_ONLY_MESSAGE);
}

export function demoAccount(email: string) {
  return getDemoConfig() ? DEMO_ACCOUNTS.find((account) => account.email === email) : undefined;
}
