import { normaliseForMatch, tokenise } from "./text-normaliser";

const skillAliases: Array<[RegExp, string]> = [
  [/\bp6\b/g, "primavera p6"],
  [/\boracle primavera\b/g, "primavera p6"],
  [/\bms project\b/g, "microsoft project"],
  [/\bpower bi\b/g, "power bi"],
];

const toolTokens = new Set([
  "primavera",
  "p6",
  "microsoft",
  "excel",
  "python",
  "sql",
  "jira",
  "autocad",
]);

export interface NormalisedSkill {
  display: string;
  normalised: string;
  skillCategory: string;
  isTool: boolean;
}

export function normaliseSkill(value: string): NormalisedSkill {
  let normalised = normaliseForMatch(value);
  for (const [pattern, replacement] of skillAliases) {
    normalised = normalised.replace(pattern, replacement);
  }
  normalised = normalised.replace(/\s+/g, " ").trim();
  const tokens = tokenise(normalised);
  const isTool = tokens.some((token) => toolTokens.has(token));

  return {
    display: value.trim(),
    normalised,
    skillCategory: inferSkillCategory(tokens, isTool),
    isTool,
  };
}

export function areEquivalentSkills(left: string, right: string): boolean {
  const leftSkill = normaliseSkill(left);
  const rightSkill = normaliseSkill(right);
  if (leftSkill.normalised === rightSkill.normalised) return true;
  if (leftSkill.isTool !== rightSkill.isTool) return false;
  return false;
}

function inferSkillCategory(tokens: string[], isTool: boolean): string {
  if (isTool) return "tool";
  if (
    tokens.some((token) =>
      ["compliance", "regulatory", "safety"].includes(token),
    )
  ) {
    return "regulatory";
  }
  if (
    tokens.some((token) =>
      ["leadership", "governance", "stakeholder"].includes(token),
    )
  ) {
    return "leadership";
  }
  if (
    tokens.some((token) =>
      ["project", "program", "planning", "delivery"].includes(token),
    )
  ) {
    return "project_delivery";
  }
  if (
    tokens.some((token) => ["commercial", "cost", "contract"].includes(token))
  ) {
    return "commercial";
  }
  if (
    tokens.some((token) =>
      ["python", "sql", "data", "software"].includes(token),
    )
  ) {
    return "technical";
  }
  return "transferable";
}
