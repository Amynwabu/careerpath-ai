const JWT_PLACEHOLDERS = new Set([
  "replace-with-a-long-random-string",
  "careerpath-secret-key-change-in-production",
]);

export function cleanEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const quoteStart = trimmed[0];
  const quoteEnd = trimmed[trimmed.length - 1];
  const quoted =
    (quoteStart === `"` && quoteEnd === `"`) ||
    (quoteStart === `'` && quoteEnd === `'`);

  return (quoted ? trimmed.slice(1, -1).trim() : trimmed) || undefined;
}

export function requireJwtSecret(): string {
  const value = cleanEnv(process.env.JWT_SECRET);
  if (!value) {
    throw new Error("JWT_SECRET must be set");
  }
  if (value.length < 32 || JWT_PLACEHOLDERS.has(value)) {
    throw new Error("JWT_SECRET must be at least 32 characters and must not use the example placeholder value");
  }
  return value;
}

export function requireDatabaseUrl(): string {
  const value = cleanEnv(process.env.DATABASE_URL);
  if (!value) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
  }
  if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/i.test(value)) {
    throw new Error("DATABASE_URL must not point to localhost when NODE_ENV=production");
  }
  return value;
}
