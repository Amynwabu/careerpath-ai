import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const packageJsonPath = require.resolve("orval/package.json");
const binPath = join(dirname(packageJsonPath), "dist", "bin", "orval.mjs");

await import(pathToFileURL(binPath).href);
