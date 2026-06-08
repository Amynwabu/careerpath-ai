# MakZeon Website

## Lead capture and analytics configuration

The contact form posts to `/api/contact` and is implemented for both Vercel (`api/contact.ts`) and Netlify (`netlify/functions/contact.ts`). Configure at least one delivery path in the hosting environment before launch. SMTP/Nodemailer is supported with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_TO`, and `CONTACT_FROM`. Alternatively, use `RESEND_API_KEY` or `CONTACT_WEBHOOK_URL`.

Analytics loads from the Vite app when `VITE_GA4_ID` and/or `VITE_LINKEDIN_PARTNER_ID` are present. These values must be set in the deployment environment; no placeholder tracking IDs are hard-coded into source.

