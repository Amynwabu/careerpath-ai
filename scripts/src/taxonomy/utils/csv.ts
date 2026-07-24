export type CsvRow = Record<string, string>;

export function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      row.push(field);
      field = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }

  row.push(field);
  if (row.some((value) => value.length > 0)) rows.push(row);
  if (rows.length === 0) return [];

  const headers = rows[0]!.map((header) => header.trim());
  return rows.slice(1).map((values) => {
    const result: CsvRow = {};
    for (const [index, header] of headers.entries()) {
      result[header] = values[index]?.trim() ?? "";
    }
    return result;
  });
}

export function stringifyCsv(rows: CsvRow[], headers: string[]): string {
  const lines = [headers.map(escapeCsv).join(",")];
  const sortedRows = [...rows];
  for (const row of sortedRows) {
    lines.push(headers.map((header) => escapeCsv(row[header] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function escapeCsv(value: string): string {
  if (!/[",\n\r]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

export function splitList(value: string): string[] {
  return value
    .split(/[|;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
