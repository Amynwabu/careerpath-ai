import type { SourceValidationResult } from "../types";

export function assertValidSources(results: SourceValidationResult[]): void {
  const errors = results.flatMap((result) =>
    result.errors.map((error) => `${result.sourceId}: ${error}`),
  );
  if (errors.length > 0) {
    throw new Error(`Source validation failed:\n${errors.join("\n")}`);
  }
}
