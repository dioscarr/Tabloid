# Tabloid Access Control

Internal identity and authorization authority for every Tabloid application.

Applications register their identity and capabilities here. Brain uses the decision endpoint before exposing tools or executing actions. Apps use the decision endpoint to enforce application-level permissions.

This service is separate from Brain: Brain orchestrates; Access Control decides.

Endpoints:
- GET /health
- GET /api/v1/applications
- POST /api/v1/applications
- GET /api/v1/roles
- POST /api/v1/decisions
- GET/POST /api/v1/access-requests
- GET /api/v1/audit

Set AUTHZ_SERVICE_TOKEN for server-to-server calls and mount AUTHZ_STORE on a persistent Podman volume.
