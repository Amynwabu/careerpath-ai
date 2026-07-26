import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git",["ls-files","--cached","--others","--exclude-standard","-z"],{ encoding:"utf8" }).split("\0").filter(Boolean);
const excluded = new Set(["pnpm-lock.yaml",".env.example"]);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:SUPABASE_SERVICE_ROLE_KEY|JWT_SECRET|GOOGLE_CLIENT_SECRET)\s*=\s*["']?[A-Za-z0-9_+./=-]{24,}/,
  /\bpostgres(?:ql)?:\/\/[^:\s]+:[^@\s]{12,}@/,
  /\b(?:sk_live_|service_role\.)[A-Za-z0-9._-]{20,}/,
];
const findings = [];
for (const file of files) {
  if (excluded.has(file) || /\.env(?:\.[^.]+)?\.example$/.test(file)) continue;
  let text;
  try { text = readFileSync(file,"utf8"); } catch { continue; }
  text.split(/\r?\n/).forEach((line,index) => {
    if (patterns.some((pattern) => pattern.test(line))) findings.push(`${file}:${index+1}`);
  });
}
if (findings.length) {
  process.stderr.write(`Potential committed secrets:\n${findings.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(`Secret scan passed for ${files.length} tracked and untracked files.\n`);
