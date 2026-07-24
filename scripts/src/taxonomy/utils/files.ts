import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { CsvRow } from "./csv";
import { parseCsv, stringifyCsv } from "./csv";

export async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function readText(path: string): Promise<string> {
  return readFile(path, "utf8");
}

export async function readCsv(path: string): Promise<CsvRow[]> {
  return parseCsv(await readText(path));
}

export async function writeText(path: string, text: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, "utf8");
}

export async function writeCsv(
  path: string,
  rows: CsvRow[],
  headers: string[],
): Promise<void> {
  await writeText(path, stringifyCsv(rows, headers));
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await writeText(path, `${JSON.stringify(value, null, 2)}\n`);
}

export async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  hash.update(await readFile(path));
  return hash.digest("hex");
}

export function sourcePath(inputRoot: string, relativePath: string): string {
  return join(inputRoot, relativePath);
}

export function stableJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, sortValue(nested)]),
  );
}

export function stableHash(value: unknown, length = 8): string {
  return createHash("sha256")
    .update(stableJson(value))
    .digest("hex")
    .slice(0, length);
}
