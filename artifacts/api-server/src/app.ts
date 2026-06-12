import express, { type ErrorRequestHandler, type Express } from "express";
import cors, { type CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import pinoHttp from "pino-http";
import multer from "multer";
import router from "./routes";
import { logger } from "./lib/logger";
import { initObservability, Sentry } from "./lib/observability";
import { csrfProtection } from "./middlewares/csrf";

initObservability();

const app: Express = express();

function parseAllowedOrigins(): Set<string> {
  const configured = [
    process.env.FRONTEND_ORIGIN,
    process.env.CORS_ORIGINS,
  ]
    .filter(Boolean)
    .flatMap((value) => value!.split(","))
    .map((value) => value.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  return new Set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ...configured,
  ]);
}

const allowedOrigins = parseAllowedOrigins();

function contentSecurityPolicyDirectives() {
  const connectSrc = [
    "'self'",
    ...allowedOrigins,
    ...(process.env.NODE_ENV !== "production"
      ? ["https://*.trycloudflare.com", "ws://localhost:5173", "ws://127.0.0.1:5173"]
      : []),
  ];

  return {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    connectSrc,
    fontSrc: ["'self'", "data:"],
    frameAncestors: ["'none'"],
    imgSrc: ["'self'", "data:", "blob:", "https:"],
    objectSrc: ["'none'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    ...(process.env.NODE_ENV === "production" ? { upgradeInsecureRequests: [] } : {}),
  };
}

const corsOptions: CorsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = origin.replace(/\/+$/, "");
    const isAllowed =
      allowedOrigins.has(normalizedOrigin) ||
      (process.env.NODE_ENV !== "production" &&
        /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i.test(normalizedOrigin));

    callback(isAllowed ? null : new Error(`Origin not allowed by CORS: ${origin}`), isAllowed);
  },
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again later." },
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

const cvImportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many CV import attempts. Please try again later." },
});

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  req.log?.error({ err }, "Unhandled request error");
  Sentry.captureException(err);

  if (res.headersSent) {
    return;
  }

  if (err instanceof multer.MulterError) {
    res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
      error: err.code === "LIMIT_FILE_SIZE" ? "Uploaded file is too large" : "Invalid upload",
    });
    return;
  }

  if (err instanceof Error && err.message.includes("PDF and DOCX")) {
    res.status(400).json({ error: "Only PDF and DOCX files are supported" });
    return;
  }

  res.status(500).json({ error: "Internal server error" });
};

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: contentSecurityPolicyDirectives(),
    },
  }),
);
app.use(cors(corsOptions));
app.use("/api", globalLimiter);
app.use(["/api/auth/login", "/api/auth/register"], authLimiter);
app.use("/api/profile/import-cv", cvImportLimiter);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(csrfProtection);

app.use("/api", router);
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}
app.use(errorHandler);

export default app;
