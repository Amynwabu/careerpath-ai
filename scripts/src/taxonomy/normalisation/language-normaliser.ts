export function normaliseLanguage(
  value: string | undefined,
  fallback = "en",
): string {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed) return fallback;
  return trimmed.split(/[-_]/)[0] ?? fallback;
}

export function normaliseCountry(
  value: string | undefined,
  fallback = "",
): string {
  const trimmed = value?.trim().toUpperCase();
  if (!trimmed) return fallback;
  return trimmed.slice(0, 2);
}
