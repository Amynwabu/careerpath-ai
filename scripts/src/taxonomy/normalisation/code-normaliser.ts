export function normaliseExternalCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function cpxCode(
  entity: "occupation" | "skill",
  discriminator: string,
): string {
  const prefix = entity === "occupation" ? "CPX-OCC" : "CPX-SKL";
  return `${prefix}-AUTO-${discriminator.toUpperCase()}`;
}
