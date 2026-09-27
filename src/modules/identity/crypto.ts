import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const cost = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, cost, (error, key) => error ? reject(error) : resolve(key));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return `scrypt-v1$${salt}$${(await derive(password, salt)).toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [version, salt, hash, extra] = encoded.split("$");
  if (version !== "scrypt-v1" || !/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(hash ?? "") || extra !== undefined) return false;
  return timingSafeEqual(await derive(password, salt), Buffer.from(hash, "hex"));
}

export const newToken = () => randomBytes(32).toString("hex");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
