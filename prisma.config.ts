import "dotenv/config";

import { defineConfig } from "prisma/config";

import { env } from "./src/lib/env";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env.DATABASE_URL,
  },
});
