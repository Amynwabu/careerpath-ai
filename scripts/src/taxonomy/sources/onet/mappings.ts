export function onetImportanceToWeight(value: string): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0.5;
  return clamp(Number((numeric / 5).toFixed(4)), 0.05, 1);
}

export function onetLevelToCpxLevel(value: string): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 3;
  if (numeric >= 6) return 5;
  if (numeric >= 4.5) return 4;
  if (numeric >= 3) return 3;
  if (numeric >= 1.5) return 2;
  return 1;
}

export function onetRequirementType(importance: string): string {
  const numeric = Number(importance);
  if (!Number.isFinite(numeric)) return "desirable";
  if (numeric >= 4) return "essential";
  if (numeric >= 3) return "desirable";
  return "emerging";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
