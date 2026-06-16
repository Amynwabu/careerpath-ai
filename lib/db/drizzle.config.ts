import { defineConfig } from "drizzle-kit";

function cleanEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const quoteStart = trimmed[0];
  const quoteEnd = trimmed[trimmed.length - 1];
  const quoted =
    (quoteStart === `"` && quoteEnd === `"`) ||
    (quoteStart === `'` && quoteEnd === `'`);

  return (quoted ? trimmed.slice(1, -1).trim() : trimmed) || undefined;
}

const databaseUrl = cleanEnv(process.env.MIGRATION_DATABASE_URL) || cleanEnv(process.env.DATABASE_URL);

if (!databaseUrl) {
  throw new Error(
    "MIGRATION_DATABASE_URL or DATABASE_URL must be set before running Drizzle migrations",
  );
}

export default defineConfig({
  schema: "./src/schema/*.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
