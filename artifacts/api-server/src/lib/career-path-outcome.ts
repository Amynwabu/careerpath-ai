export type CareerPathOutcomeStatus = "changed" | "confirmed" | "created";

export type CareerPathOutcome = {
  status: CareerPathOutcomeStatus;
  previousTargetRole: string | null;
  targetRole: string;
  message: string;
};

export function getCareerPathOutcome(
  previousTargetRole: string | null | undefined,
  targetRole: string,
): CareerPathOutcome {
  const previous = previousTargetRole?.trim() || null;
  const changed = previous
    ? previous.localeCompare(targetRole.trim(), undefined, { sensitivity: "base" }) !== 0
    : false;

  if (!previous) {
    return {
      status: "created",
      previousTargetRole: null,
      targetRole,
      message: `${targetRole} is your strongest current pathway based on the evidence you confirmed.`,
    };
  }

  if (changed) {
    return {
      status: "changed",
      previousTargetRole: previous,
      targetRole,
      message: `Your pathway changed from ${previous} to ${targetRole} based on your updated evidence.`,
    };
  }

  return {
    status: "confirmed",
    previousTargetRole: previous,
    targetRole,
    message: `${targetRole} remains the strongest pathway based on your updated evidence.`,
  };
}
