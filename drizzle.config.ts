// @ts-nocheck

import type { Config } from "drizzle-kit";
export default {
  schema: "./drizzle/schema.ts",
  out:    "./drizzle/migrations/",
  driver: "better-sqlite", 
  dbCredentials: {
    file: "./drizzle/storage/sqlite.db",
  },
} satisfies Config;
