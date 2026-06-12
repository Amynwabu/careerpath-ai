import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import { setBaseUrl, setCookiePrefix } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

setBaseUrl(import.meta.env.VITE_API_BASE_URL ?? null);
setCookiePrefix(import.meta.env.VITE_COOKIE_PREFIX ?? null);

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  });
}

createRoot(document.getElementById("root")!).render(<App />);
