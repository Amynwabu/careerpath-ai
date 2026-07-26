import { writeFileSync } from "node:fs";
const root = "artifacts/careerpath-ai/dist/public";
writeFileSync(`${root}/robots.txt`,"User-agent: *\nDisallow: /\n");
writeFileSync(`${root}/_headers`, `/*
  X-Robots-Tag: noindex, nofollow, noarchive
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Content-Security-Policy: default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'; img-src 'self' data: https:; connect-src 'self' https:; script-src 'self'; style-src 'self' 'unsafe-inline'
`);
