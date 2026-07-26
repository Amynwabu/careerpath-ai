const base = process.env.STAGING_BASE_URL;
if (!base || !base.startsWith("https://")) throw new Error("STAGING_BASE_URL must be HTTPS.");
const headers = process.env.STAGING_ACCESS_TOKEN
  ? { Authorization: `Bearer ${process.env.STAGING_ACCESS_TOKEN}` } : {};
for (const path of ["/api/live","/api/ready"]) {
  const response = await fetch(new URL(path,base),{ headers,redirect:"error" });
  if (!response.ok) throw new Error(`${path} failed with ${response.status}`);
  if (response.headers.get("x-content-type-options") !== "nosniff") {
    throw new Error(`${path} is missing security headers`);
  }
}
process.stdout.write("Private staging smoke checks passed.\n");
