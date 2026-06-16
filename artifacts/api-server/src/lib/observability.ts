import * as Sentry from "@sentry/node";
import { cleanEnv } from "./env";

export function initObservability(): void {
  const dsn = cleanEnv(process.env.SENTRY_DSN);
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: cleanEnv(process.env.SENTRY_ENVIRONMENT) ?? process.env.NODE_ENV ?? "development",
    release: cleanEnv(process.env.SENTRY_RELEASE),
    tracesSampleRate: Number(cleanEnv(process.env.SENTRY_TRACES_SAMPLE_RATE) ?? 0.1),
  });
}

export { Sentry };
