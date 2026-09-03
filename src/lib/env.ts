import { z } from "zod";

const result = z
  .object({
    DATABASE_URL: z.string().url().optional(),
  })
  .safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
  });

if (!result.success) {
  throw new Error(`Invalid environment variables: ${result.error.message}`);
}

export const env = result.data;
