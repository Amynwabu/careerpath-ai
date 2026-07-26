import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
    "*.password","*.token","*.secret","*.signedUrl","*.databaseUrl",
    "password","token","secret","signedUrl","databaseUrl",
  ],
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});

const sensitiveKey = /(password|token|secret|authorization|cookie|signed.?url|database.?url|cv.?text|interview.?response|evidence|note)/i;
export function sanitizeLogObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeLogObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key,item]) => [
    key, sensitiveKey.test(key) ? "[REDACTED]" : sanitizeLogObject(item),
  ]));
}
