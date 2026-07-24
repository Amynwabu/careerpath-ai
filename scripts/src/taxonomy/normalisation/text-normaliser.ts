const spellingPairs: Array<[RegExp, string]> = [
  [/\bprogramme\b/g, "program"],
  [/\bprogrammes\b/g, "programs"],
  [/\borganisation\b/g, "organization"],
  [/\borganisations\b/g, "organizations"],
  [/\bbehaviour\b/g, "behavior"],
  [/\bbehavioural\b/g, "behavioral"],
  [/\bmodelling\b/g, "modeling"],
  [/\blabour\b/g, "labor"],
  [/\bcentre\b/g, "center"],
];

const punctuationPairs: Array<[RegExp, string]> = [
  [/[‐‑‒–—―]/g, "-"],
  [/[⁄∕]/g, "/"],
  [/&/g, " and "],
  [/[()]/g, " "],
];

export function normaliseDisplayText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function normaliseForMatch(value: string): string {
  let normalised = normaliseDisplayText(value).toLocaleLowerCase("en-GB");
  for (const [pattern, replacement] of punctuationPairs) {
    normalised = normalised.replace(pattern, replacement);
  }
  normalised = normalised.replace(/[^\p{L}\p{N}/+\-. ]/gu, " ");
  for (const [pattern, replacement] of spellingPairs) {
    normalised = normalised.replace(pattern, replacement);
  }
  return normalised.replace(/\s+/g, " ").trim();
}

export function tokenise(value: string): string[] {
  return normaliseForMatch(value)
    .split(/[\s/+-]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function jaccardSimilarity(left: string, right: string): number {
  const leftTokens = new Set(tokenise(left));
  const rightTokens = new Set(tokenise(right));
  if (leftTokens.size === 0 && rightTokens.size === 0) return 1;
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }
  return intersection / (leftTokens.size + rightTokens.size - intersection);
}

export function textSimilarity(left: string, right: string): number {
  const exactLeft = normaliseForMatch(left);
  const exactRight = normaliseForMatch(right);
  if (!exactLeft || !exactRight) return 0;
  if (exactLeft === exactRight) return 1;
  return roundScore(jaccardSimilarity(exactLeft, exactRight));
}

export function roundScore(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}
