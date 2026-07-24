import { normaliseForMatch, tokenise } from "./text-normaliser";

const abbreviationExpansions: Array<[RegExp, string]> = [
  [/\bsr\.?/g, "senior"],
  [/\bjr\.?/g, "junior"],
  [/\bpm\b/g, "project manager"],
  [/\bmgr\b/g, "manager"],
  [/\bprog\b/g, "program"],
  [/\bops\b/g, "operations"],
  [/\beng\b/g, "engineer"],
  [/\bai\b/g, "artificial intelligence"],
];

const seniorityTokens = [
  "assistant",
  "junior",
  "entry",
  "associate",
  "practitioner",
  "senior",
  "principal",
  "lead",
  "manager",
  "director",
  "head",
  "executive",
];

const sectorKeywords: Record<string, string[]> = {
  "Energy and Utilities": [
    "energy",
    "utilities",
    "power",
    "transmission",
    "grid",
  ],
  "Construction and Built Environment": [
    "construction",
    "built",
    "building",
    "civil",
    "infrastructure",
  ],
  "Digital, Data and Artificial Intelligence": [
    "digital",
    "data",
    "analytics",
    "artificial",
    "intelligence",
    "software",
  ],
  "Project and Programme Management": [
    "project",
    "program",
    "programme",
    "pmo",
  ],
  "Business and Operations": [
    "business",
    "operations",
    "commercial",
    "process",
  ],
};

export interface NormalisedTitle {
  display: string;
  normalised: string;
  baseRole: string;
  seniority: string;
  sector: string;
  discipline: string;
  specialism: string;
}

export function normaliseTitle(value: string): NormalisedTitle {
  let expanded = normaliseForMatch(value);
  for (const [pattern, replacement] of abbreviationExpansions) {
    expanded = expanded.replace(pattern, replacement);
  }
  expanded = expanded.replace(/\s+/g, " ").trim();

  const tokens = tokenise(expanded);
  const seniority =
    seniorityTokens.find((token) => tokens.includes(token)) ?? "";
  const sector = inferSector(tokens);
  const discipline = inferDiscipline(tokens);
  const baseRole = tokens
    .filter((token) => token !== seniority)
    .filter(
      (token) =>
        !["power", "transmission", "energy", "utilities"].includes(token),
    )
    .join(" ");

  return {
    display: value.trim(),
    normalised: expanded,
    baseRole,
    seniority,
    sector,
    discipline,
    specialism: inferSpecialism(tokens),
  };
}

function inferSector(tokens: string[]): string {
  for (const [sector, keywords] of Object.entries(sectorKeywords)) {
    if (keywords.some((keyword) => tokens.includes(keyword))) return sector;
  }
  return "";
}

function inferDiscipline(tokens: string[]): string {
  if (tokens.includes("civil")) return "Civil Engineering";
  if (tokens.includes("data")) return "Data";
  if (tokens.includes("software")) return "Software";
  if (tokens.includes("project") || tokens.includes("program"))
    return "Project Delivery";
  return "";
}

function inferSpecialism(tokens: string[]): string {
  if (tokens.includes("transmission")) return "Power Transmission";
  if (tokens.includes("utilities")) return "Utilities";
  if (tokens.includes("artificial") && tokens.includes("intelligence"))
    return "AI";
  return "";
}
