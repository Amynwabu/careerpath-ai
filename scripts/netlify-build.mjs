import { spawnSync } from "node:child_process";

function cleanEnv(value) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const quoteStart = trimmed[0];
  const quoteEnd = trimmed[trimmed.length - 1];
  const quoted =
    (quoteStart === `"` && quoteEnd === `"`) ||
    (quoteStart === `'` && quoteEnd === `'`);

  return (quoted ? trimmed.slice(1, -1).trim() : trimmed) || undefined;
}

const pnpmCommand = cleanEnv(process.env.PNPM_CMD) || "pnpm";

function run(command) {
  const result = spawnSync(command, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const runMigrations = process.env.RUN_DB_MIGRATIONS === "true";

if (runMigrations) {
  const migrationDatabaseUrl = cleanEnv(process.env.MIGRATION_DATABASE_URL) || cleanEnv(process.env.DATABASE_URL);

  if (!migrationDatabaseUrl) {
    console.error(
      "RUN_DB_MIGRATIONS=true but MIGRATION_DATABASE_URL or DATABASE_URL is not set.",
    );
    process.exit(1);
  }

  run(`${pnpmCommand} --filter @workspace/db run migrate`);
} else {
  console.log("Skipping database migrations. Set RUN_DB_MIGRATIONS=true to run them during Netlify builds.");
}

run(`${pnpmCommand} --filter @workspace/api-server run build`);
run(`${pnpmCommand} --filter @workspace/careerpath-ai run build`);
