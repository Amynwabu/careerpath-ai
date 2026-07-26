# Container security

The API image uses a digest-pinned Node Alpine base, a multi-stage build, and the
non-root `careerpath` runtime user. Local build size is approximately 65.6 MB.

The exact final image must receive an authenticated Trivy, Grype, Docker Scout, or
provider scan. Record scanner/version, image digest, severity counts, fixable
findings, and accepted risk without exposing registry credentials.

The current Docker Scout installation requires authentication, so no vulnerability
result is claimed. A missing scan blocks production approval.
