export type AppEnvironment = "local" | "test" | "staging" | "production";

export interface RuntimeConfig {
  environment: AppEnvironment;
  applicationVersion: string;
  appOrigin: string;
  apiBaseUrl: string;
  allowedOrigins: string[];
  cookieSecure: boolean;
  cookieDomain?: string;
  databaseTlsRequired: boolean;
  exportExpirySeconds: number;
  storageBucket?: string;
  rateLimitNamespace: string;
}

export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const environment = (env.APP_ENV ?? (env.NODE_ENV === "test" ? "test" : "local")) as AppEnvironment;
  if (!["local", "test", "staging", "production"].includes(environment)) {
    throw configError("APP_ENV must be local, test, staging, or production.");
  }
  const hosted = environment === "staging" || environment === "production";
  const required = hosted
    ? ["DATABASE_URL","JWT_SECRET","APP_ORIGIN","API_BASE_URL","APPLICATION_VERSION",
      "ALLOWED_ORIGINS","SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY","CAREER_DOCUMENT_BUCKET",
      "RATE_LIMIT_NAMESPACE","WORKER_DATABASE_URL"]
    : [];
  const missing = required.filter((name) => !clean(env[name]));
  if (missing.length) throw configError(`Missing required configuration: ${missing.join(", ")}.`);

  const appOrigin = validUrl(env.APP_ORIGIN ?? "http://localhost:21588", "APP_ORIGIN", hosted);
  const apiBaseUrl = validUrl(env.API_BASE_URL ?? "http://localhost:8080", "API_BASE_URL", hosted);
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? appOrigin.origin).split(",").map((item) => item.trim()).filter(Boolean);
  if (hosted && allowedOrigins.includes("*")) throw configError("Wildcard CORS is forbidden in hosted environments.");
  for (const origin of allowedOrigins) validUrl(origin, "ALLOWED_ORIGINS", hosted);
  const databaseUrl = clean(env.DATABASE_URL);
  for (const [name, value] of [
    ["DATABASE_URL", databaseUrl],
    ["WORKER_DATABASE_URL", clean(env.WORKER_DATABASE_URL)],
  ] as const) {
    if (!value) continue;
    const parsed = validUrl(value, name, false);
    if (!["postgres:","postgresql:"].includes(parsed.protocol))
      throw configError(`${name} must use PostgreSQL.`);
    if (hosted && parsed.searchParams.get("sslmode") === "disable")
      throw configError(`Hosted ${name} TLS cannot be disabled.`);
  }
  const exportExpirySeconds = positiveInt(env.EXPORT_EXPIRY_SECONDS, 900);
  if (exportExpirySeconds > 3600) throw configError("EXPORT_EXPIRY_SECONDS must not exceed one hour.");
  if (hosted && clean(env.JWT_SECRET)!.length < 32) throw configError("JWT_SECRET must contain at least 32 characters.");

  return {
    environment,
    applicationVersion: clean(env.APPLICATION_VERSION) ?? "development",
    appOrigin: appOrigin.toString().replace(/\/$/, ""),
    apiBaseUrl: apiBaseUrl.toString().replace(/\/$/, ""),
    allowedOrigins,
    cookieSecure: hosted,
    cookieDomain: clean(env.COOKIE_DOMAIN),
    databaseTlsRequired: hosted,
    exportExpirySeconds,
    storageBucket: clean(env.CAREER_DOCUMENT_BUCKET),
    rateLimitNamespace: clean(env.RATE_LIMIT_NAMESPACE) ?? environment,
  };
}

export const runtimeConfig = loadRuntimeConfig();

function validUrl(value: string, name: string, httpsRequired: boolean) {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw configError(`${name} must contain valid URLs.`); }
  if (httpsRequired && parsed.protocol !== "https:" && !["postgres:","postgresql:"].includes(parsed.protocol)) {
    throw configError(`${name} must use HTTPS in hosted environments.`);
  }
  return parsed;
}
function clean(value: string | undefined) { return value?.trim() || undefined; }
function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
function configError(message: string) { return Object.assign(new Error(message), { code: "configuration_invalid" }); }
