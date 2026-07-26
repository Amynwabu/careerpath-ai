import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const directory = join(process.cwd(), "lib/db/drizzle");
const files = readdirSync(directory).filter((name) => /^\d{4}.*\.sql$/.test(name)).sort();
const issues = [];
for (const name of files) {
  const sql = readFileSync(join(directory, name), "utf8");
  if (/\bDROP\s+TABLE\b/i.test(sql)) issues.push(`${name}: DROP TABLE requires explicit release approval`);
  if (/\bTRUNCATE\b/i.test(sql)) issues.push(`${name}: TRUNCATE requires explicit release approval`);
  for (const match of sql.matchAll(/CREATE TABLE\s+(career_data_[a-z0-9_]+)/gi)) {
    const table = match[1];
    if (!new RegExp(`ALTER TABLE\\s+${table}\\s+ENABLE ROW LEVEL SECURITY`, "i").test(sql) &&
        !files.slice(files.indexOf(name)+1).some((later) =>
          new RegExp(`ALTER TABLE\\s+${table}\\s+ENABLE ROW LEVEL SECURITY`, "i")
            .test(readFileSync(join(directory,later),"utf8")))) {
      issues.push(`${name}: ${table} has no RLS enablement`);
    }
  }
}
if (issues.length) {
  process.stderr.write(`${issues.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(`Migration governance passed for ${files.length} reviewed SQL files.\n`);
