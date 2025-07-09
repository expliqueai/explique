import type { Config } from "drizzle-kit";
export default {
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations/",
  driver: "better-sqlite3",
  dbCredentials: { url: "./drizzle/storage/sqlite.db" },
} satisfies Config;