# Environment management

`APP_ENV` is one of `local`, `test`, `staging`, or `production`. Hosted startup
fails when database, signing, origin, storage, namespace, version, or URL
configuration is absent or unsafe. Hosted origins must use HTTPS, wildcard CORS
is forbidden, database TLS cannot be disabled, and export links expire within
one hour.

Secrets belong in encrypted deployment-environment stores. Staging and
production values must be separate. Rotate database, JWT, storage, scanner,
email, monitoring, webhook, and migration credentials by creating a replacement,
deploying consumers, revoking the prior credential, and recording the change.
Never copy production data or credentials into staging.

`.env.staging.example` is a key-name template only. It contains no usable
credentials.
