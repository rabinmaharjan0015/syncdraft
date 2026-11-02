# SyncDraft

A real-time collaborative text editor built with React, TypeScript, Vite, TipTap, Yjs, Hocuspocus, FastAPI, PostgreSQL, and Redis.

## Current implementation

- Phase 1: application shell and Docker infrastructure.
- Phase 2: Argon2 password hashing, JWT sessions, authentication endpoints, SQLAlchemy models, Alembic initial migration, and document CRUD.
- Phase 3: short-lived document-scoped collaboration tickets, Hocuspocus room authorization, read-only viewer connections, PostgreSQL Yjs snapshots, TipTap/Yjs editing, collaborator cursors, presence, and authenticated frontend flows.

## Run with Docker

```bash
cp .env.example .env
# Replace JWT_SECRET with a cryptographically random secret (32+ characters).
docker compose up --build
```

Open:
- Frontend: http://localhost:5173
- API docs: http://localhost:8000/docs
- API health: http://localhost:8000/health
- Collaboration WebSocket: ws://localhost:1234

Database migrations run automatically when the API container starts.

## Project structure

```text
syncdraft/
  frontend/       React + TypeScript + Vite + TipTap + Yjs
  backend/        FastAPI auth, documents, tickets, SQLAlchemy, Alembic
  collaboration/  Hocuspocus WebSocket and PostgreSQL Yjs persistence
  docs/           PRD, architecture, and phase notes
```

## Current limitations

Document invitations/member management, live session revocation, collaboration integration tests, backup/restore, and multi-instance collaboration scaling remain future work. This is a runnable implementation target, not a verified production deployment. See `docs/PHASE-3.md` for the Phase 3 verification checklist and known limitations.
