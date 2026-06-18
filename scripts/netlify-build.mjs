import { spawnSync } from "node:child_process";

function cleanEnv(value) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  return (quoted ? trimmed.slice(1, -1).trim() : trimmed) || undefined;
}

function run(command) {
  const result = spawnSync(command, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

process.env.PORT ??= "21588";
process.env.BASE_PATH ??= "/";
process.env.API_ORIGIN ??= cleanEnv(process.env.API_BASE_URL) ?? "http://127.0.0.1:8080";

if (cleanEnv(process.env.RUN_DB_MIGRATIONS)?.toLowerCase() === "true") {
  run("node scripts/apply-release-migrations.mjs");
} else {
  console.log("Skipping release migrations. Set RUN_DB_MIGRATIONS=true to apply them.");
}

run("pnpm --filter @workspace/api-server run build");
run("pnpm --filter @workspace/careerpath-ai run build");
