import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const workspaceRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const files = [
  "lib/api-client-react/src/generated/api.ts",
  "lib/api-client-react/src/generated/api.schemas.ts",
  "lib/api-zod/src/generated/api.ts",
];
for (const file of files) {
  const absolutePath = join(workspaceRoot,file);
  const normalized = `${readFileSync(absolutePath,"utf8").trimEnd()}\n`;
  writeFileSync(absolutePath,normalized);
}
