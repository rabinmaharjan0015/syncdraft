# Phase 2 — Authentication, Database, and Document API

## Included
- SQLAlchemy 2 async database configuration.
- PostgreSQL models: users, user sessions, documents, and document members.
- Alembic initial migration.
- Argon2 password hashing using pwdlib.
- Signed JWT access tokens with issuer, audience, expiry, and session ID.
- Database-backed session revocation on logout.
- Registration, login, current-user, and logout endpoints.
- Document create, list, read, rename, and soft-delete endpoints.
- Owner/member-aware document access checks.

## Apply migrations

From repository root:

```bash
docker compose up -d postgres redis
docker compose run --rm api alembic upgrade head
docker compose up --build
```

## API examples

Register:

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alex@example.com","password":"a-long-demo-password","display_name":"Alex Morgan"}'
```

Login:

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alex@example.com","password":"a-long-demo-password"}'
```

Use returned access token:

```bash
curl http://localhost:8000/api/v1/auth/me -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
curl -X POST http://localhost:8000/api/v1/documents \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H 'Content-Type: application/json' -d '{"title":"Project notes"}'
curl http://localhost:8000/api/v1/documents -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Limitations to resolve before production
- No refresh-token rotation, email verification, or password reset.
- Membership management endpoints are not exposed yet.
- Collaboration ticket issuance and Yjs persistence are not included in this phase.
- The frontend has not yet been wired to these APIs.
- Browser token storage needs a deliberate security decision. Prefer secure HttpOnly cookies with CSRF protection, or a carefully designed in-memory access-token flow.
- Set a strong JWT_SECRET before deployment.
