# Phase 3 — Real-time collaboration

## Implemented

- FastAPI issues a 90-second collaboration JWT after checking the user's document membership.
- Collaboration JWTs use the API signing secret, `iss=syncdraft-api`, `aud=syncdraft-collab`, and are scoped to one document ID and role.
- Hocuspocus validates the ticket and exact room/document match before accepting the WebSocket connection.
- Viewer connections are placed in Hocuspocus read-only mode; owners and editors can submit Yjs updates.
- Yjs state is loaded from and persisted to the PostgreSQL `document_snapshots` table.
- Snapshot writes are debounced by Hocuspocus and update the document's `updated_at` timestamp.
- The frontend now has register/login, authenticated document listing/creation, TipTap editing, Yjs synchronization, collaborator cursors, online presence, and reconnect status.
- The editor disables TipTap's local history extension because Yjs collaboration provides shared undo/redo semantics.
- Docker Compose passes the same signing secret to FastAPI and Hocuspocus and gives the collaboration service access to PostgreSQL.

## Run

```bash
cp .env.example .env
# Set JWT_SECRET to a random value of at least 32 characters.
docker compose up --build
```

Open `http://localhost:5173`, create two accounts in separate browsers, and create a document in the first account. Sharing/inviting other users is not implemented yet, so the second account cannot join that document until Phase 4 adds membership management and invitations. For a local synchronization smoke test, open the same authenticated account in two browser profiles.

## Important behavior and limitations

- The current collaboration deployment is a single Hocuspocus process. Do not scale it horizontally without adding cross-instance Yjs update distribution and coordinated persistence.
- Collaboration tickets expire after 90 seconds, but an already-authenticated WebSocket remains connected until disconnected. Session revocation and membership revocation do not yet actively terminate established WebSockets.
- PostgreSQL snapshots are durable, but this phase does not yet include snapshot history, periodic backups, restore tooling, or a persistence integration test.
- The API issues viewer/editor roles when matching `document_members` rows exist. The UI does not yet expose member invitation or role-management endpoints.
- A copied document URL only works for a user who already has access to that document.
- The frontend currently uses localStorage for the API access token. Production should consider secure same-site cookies or a hardened token-storage strategy, plus CSRF protections where applicable.

## Verification still required

Run the Docker stack and verify database migrations, account registration/login, WebSocket authorization, two-browser simultaneous edits, cursor/presence updates, page reload recovery, and viewer write denial. These runtime checks were not executed in the generation environment.
