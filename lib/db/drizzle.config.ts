import { defineConfig } from "drizzle-kit";

const env = (globalThis as any).process?.env as Record<string, string | undefined> | undefined;

if (!env?.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
