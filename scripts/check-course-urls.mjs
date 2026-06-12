import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const DEFAULT_CATALOG = "lib/taxonomy/src/courses.ts";
const DEFAULT_MARKDOWN_REPORT = ".course-url-report.md";
const DEFAULT_JSON_REPORT = ".course-url-report.json";
const CONCURRENCY = 6;
const TIMEOUT_MS = 12_000;
const USER_AGENT = "CareerPathAI-CourseLinkCheck/1.0";

const args = parseArgs(process.argv.slice(2));
const catalogPath = resolve(args.catalog ?? DEFAULT_CATALOG);
const markdownReportPath = resolve(args.report ?? DEFAULT_MARKDOWN_REPORT);
const jsonReportPath = resolve(args.json ?? DEFAULT_JSON_REPORT);

const catalogSource = await readFile(catalogPath, "utf8");
const courseLinks = extractCourseLinks(catalogSource);

if (courseLinks.length === 0) {
  throw new Error(`No course URLs found in ${catalogPath}`);
}

const results = await mapLimit(courseLinks, CONCURRENCY, checkCourseUrl);
const broken = results.filter((result) => result.kind === "broken");
const warnings = results.filter((result) => result.kind === "warning");

const summary = {
  checkedAt: new Date().toISOString(),
  total: results.length,
  broken: broken.length,
  warnings: warnings.length,
  results,
};

await writeFile(jsonReportPath, `${JSON.stringify(summary, null, 2)}\n`);
await writeFile(markdownReportPath, buildMarkdownReport(summary));

console.log(`Checked ${results.length} course URLs.`);
if (broken.length > 0) {
  console.error(`${broken.length} course URL(s) returned 404/410. See ${markdownReportPath}.`);
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn(`${warnings.length} course URL(s) could not be fully verified. See ${markdownReportPath}.`);
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function extractCourseLinks(source) {
  const links = [];
  let current = null;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "{") {
      current = {};
      continue;
    }

    if (!current) continue;

    const id = line.match(/^id:\s*"([^"]+)"/)?.[1];
    const provider = line.match(/^provider:\s*"([^"]+)"/)?.[1];
    const title = line.match(/^title:\s*"([^"]+)"/)?.[1];
    const url = line.match(/^url:\s*"([^"]+)"/)?.[1];

    if (id) current.id = id;
    if (provider) current.provider = provider;
    if (title) current.title = title;
    if (url) current.url = url;

    if (line === "}," || line === "}" || line === "}]") {
      if (current.id && current.title && current.url) {
        links.push({
          id: current.id,
          provider: current.provider ?? "Unknown",
          title: current.title,
          url: current.url,
        });
      }
      current = null;
    }
  }

  return links;
}

async function checkCourseUrl(course) {
  try {
    const head = await request(course.url, "HEAD");
    if (isBrokenStatus(head.status)) return result("broken", course, head);
    if (isOkStatus(head.status)) return result("ok", course, head);

    if (head.status === 405 || head.status === 501) {
      const get = await request(course.url, "GET");
      if (isBrokenStatus(get.status)) return result("broken", course, get);
      if (isOkStatus(get.status)) return result("ok", course, get);
      return result("warning", course, get);
    }

    return result("warning", course, head);
  } catch (error) {
    return {
      kind: "warning",
      ...course,
      status: null,
      method: "HEAD",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function request(url, method) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "User-Agent": USER_AGENT,
      },
      redirect: "follow",
      signal: controller.signal,
    });

    return {
      status: response.status,
      method,
      detail: response.statusText,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function isOkStatus(status) {
  return (status >= 200 && status < 400) || status === 401 || status === 403;
}

function isBrokenStatus(status) {
  return status === 404 || status === 410;
}

function result(kind, course, response) {
  return {
    kind,
    ...course,
    status: response.status,
    method: response.method,
    detail: response.detail,
  };
}

async function mapLimit(items, limit, mapper) {
  const output = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      output[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return output;
}

function buildMarkdownReport(summary) {
  const lines = [
    "# Course URL Health Report",
    "",
    `Checked at: ${summary.checkedAt}`,
    `Total URLs: ${summary.total}`,
    `Confirmed broken URLs: ${summary.broken}`,
    `Warnings: ${summary.warnings}`,
    "",
  ];

  if (summary.broken > 0) {
    lines.push("## Confirmed Broken Links", "");
    lines.push("| Course | Provider | Status | URL |");
    lines.push("| --- | --- | --- | --- |");
    for (const item of summary.results.filter((resultItem) => resultItem.kind === "broken")) {
      lines.push(`| ${escapeTable(item.title)} | ${escapeTable(item.provider)} | ${item.status} | ${item.url} |`);
    }
    lines.push("");
  }

  if (summary.warnings > 0) {
    lines.push("## Warnings", "");
    lines.push("These links did not return 404/410, but the checker could not fully verify them.");
    lines.push("");
    lines.push("| Course | Provider | Status | Detail | URL |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const item of summary.results.filter((resultItem) => resultItem.kind === "warning")) {
      lines.push(`| ${escapeTable(item.title)} | ${escapeTable(item.provider)} | ${item.status ?? "n/a"} | ${escapeTable(item.detail ?? "")} | ${item.url} |`);
    }
    lines.push("");
  }

  if (summary.broken === 0 && summary.warnings === 0) {
    lines.push("All course URLs responded successfully.");
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function escapeTable(value) {
  return String(value).replaceAll("|", "\\|");
}
