import { spawnSync } from "node:child_process";

const pnpmCommand = process.env.PNPM_CMD?.trim() || "pnpm";

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
  const migrationDatabaseUrl = process.env.MIGRATION_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();

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
