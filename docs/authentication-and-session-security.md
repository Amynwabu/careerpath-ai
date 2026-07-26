# Authentication and session security

CareerPathX authentication uses backend-signed short-lived access tokens in
`HttpOnly` cookies and rotating persisted refresh tokens. Hosted cookies are
`Secure`, `SameSite=Lax`, path-scoped, and optionally domain-scoped. Logout
revokes refresh state.

Hosted requests use allowlisted CORS with credentials and an origin guard on
state-changing methods. OAuth configuration validates callback URLs and state;
tokens are not intentionally persisted in browser storage.

The database identity model is backend-only access with transaction-local
`app.user_id`, repository authorization, and RLS. Pooled session-level identity
must never be used.
