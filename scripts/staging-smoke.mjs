const base = process.env.STAGING_BASE_URL;
if (!base || !base.startsWith("https://")) throw new Error("STAGING_BASE_URL must be HTTPS.");
const gateHeaders = process.env.STAGING_ACCESS_TOKEN
  ? { "X-Staging-Access-Token": process.env.STAGING_ACCESS_TOKEN } : {};
const expectedHeaders = [
  "content-security-policy", "strict-transport-security", "x-frame-options",
  "x-content-type-options", "referrer-policy", "permissions-policy",
  "cross-origin-opener-policy", "cross-origin-resource-policy",
];
for (const path of ["/api/live","/api/ready"]) {
  const response = await fetch(new URL(path,base),{ headers: gateHeaders,redirect:"error" });
  if (!response.ok) throw new Error(`${path} failed with ${response.status}`);
  for (const header of expectedHeaders)
    if (!response.headers.has(header)) throw new Error(`${path} is missing ${header}`);
}

for (const path of ["/api/health/database","/api/health/storage","/api/health/jobs"]) {
  const response = await fetch(new URL(path,base), {
    headers: { ...gateHeaders, "X-Health-Check-Token": process.env.HEALTH_CHECK_TOKEN ?? "" },
    redirect: "error",
  });
  if (!response.ok) throw new Error(`${path} failed with ${response.status}`);
}

const allowedPreflight = await fetch(new URL("/api/auth/logout",base), {
  method: "OPTIONS",
  headers: {
    ...gateHeaders, Origin: new URL(base).origin,
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type,x-csrf-token",
  },
});
if (allowedPreflight.headers.get("access-control-allow-origin") !== new URL(base).origin ||
    allowedPreflight.headers.get("access-control-allow-credentials") !== "true")
  throw new Error("Allowed credentialed CORS preflight failed");

const deniedPreflight = await fetch(new URL("/api/auth/logout",base), {
  method: "OPTIONS",
  headers: {
    ...gateHeaders, Origin: "https://cross-origin.invalid",
    "Access-Control-Request-Method": "POST",
  },
});
if (deniedPreflight.headers.has("access-control-allow-origin"))
  throw new Error("Disallowed origin received a CORS grant");

const missingCsrf = await fetch(new URL("/api/auth/refresh",base), {
  method: "POST", headers: { ...gateHeaders, Origin: new URL(base).origin },
});
if (missingCsrf.status !== 403) throw new Error("Missing CSRF token was not denied");

const invalidCsrf = await fetch(new URL("/api/auth/refresh",base), {
  method: "POST",
  headers: {
    ...gateHeaders, Origin: new URL(base).origin,
    Cookie: "careerpath_csrf=fixture-cookie",
    "X-CSRF-Token": "fixture-header",
  },
});
if (invalidCsrf.status !== 403) throw new Error("Invalid CSRF token was not denied");

if (process.env.STAGING_CLIENT_EMAIL && process.env.STAGING_CLIENT_PASSWORD) {
  const login = await fetch(new URL("/api/auth/login",base), {
    method: "POST",
    headers: { ...gateHeaders, Origin: new URL(base).origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.STAGING_CLIENT_EMAIL,
      password: process.env.STAGING_CLIENT_PASSWORD,
    }),
  });
  if (!login.ok) throw new Error(`Synthetic login failed with ${login.status}`);
  const cookies = new Map();
  for (const value of login.headers.getSetCookie())
    cookies.set(value.split("=",1)[0], value.split(";",1)[0].split("=").slice(1).join("="));
  const cookieHeader = () => [...cookies].map(([name,value]) => `${name}=${value}`).join("; ");
  const csrf = cookies.get("careerpath_csrf");
  if (!csrf) throw new Error("Synthetic login did not issue CSRF protection");
  const me = await fetch(new URL("/api/auth/me",base), {
    headers: { ...gateHeaders, Cookie: cookieHeader() },
  });
  if (!me.ok) throw new Error("Authenticated synthetic session was unavailable");
  const logout = await fetch(new URL("/api/auth/logout",base), {
    method: "POST",
    headers: {
      ...gateHeaders, Origin: new URL(base).origin, Cookie: cookieHeader(),
      "X-CSRF-Token": csrf,
    },
  });
  if (!logout.ok) throw new Error(`Synthetic logout failed with ${logout.status}`);
  const revokedRefresh = await fetch(new URL("/api/auth/refresh",base), {
    method: "POST",
    headers: {
      ...gateHeaders, Origin: new URL(base).origin, Cookie: cookieHeader(),
      "X-CSRF-Token": csrf,
    },
  });
  if (revokedRefresh.status !== 401)
    throw new Error("Logout did not revoke the synthetic refresh-token family");
}
process.stdout.write("Private staging smoke checks passed.\n");
