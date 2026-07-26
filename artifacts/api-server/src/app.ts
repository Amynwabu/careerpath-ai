import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { runtimeConfig } from "./lib/runtime-config";
import { csrfOriginGuard, platformSecurityHeaders } from "./middlewares/platform-security";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    customProps: () => ({
      environment: runtimeConfig.environment,
      service: "careerpathx-api",
      applicationVersion: runtimeConfig.applicationVersion,
    }),
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
app.disable("x-powered-by");
app.use(platformSecurityHeaders);
app.use(cors({
  origin(origin, callback) {
    if (!origin || runtimeConfig.allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("origin_not_allowed"));
  },
  credentials: true,
  methods: ["GET","HEAD","POST","PUT","PATCH","DELETE","OPTIONS"],
}));
app.use(cookieParser());
app.use(csrfOriginGuard);
// Base64 expands an allowed 8 MiB document by roughly one third. Keep the
// larger body allowance scoped to the stateless document parser.
app.use(
  "/api/profile/documents/parse",
  express.json({ limit: "11mb" }),
);
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true, limit: "8mb" }));

app.use("/api", router);

export default app;
