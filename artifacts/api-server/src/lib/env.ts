const JWT_PLACEHOLDERS = new Set([
  "replace-with-a-long-random-string",
  "careerpath-secret-key-change-in-production",
]);

export function requireJwtSecret(): string {
  const value = process.env.JWT_SECRET?.trim();
  if (!value) {
    throw new Error("JWT_SECRET must be set");
  }
  if (value.length < 32 || JWT_PLACEHOLDERS.has(value)) {
    throw new Error("JWT_SECRET must be at least 32 characters and must not use the example placeholder value");
  }
  return value;
}

export function requireDatabaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
  }
  if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/i.test(value)) {
    throw new Error("DATABASE_URL must not point to localhost when NODE_ENV=production");
  }
  return value;
}
