# Product Requirements Document (PRD)
## Real-Time Collaborative Text Editor

- **Working name:** SyncDraft
- **Document status:** MVP proposal
- **Version:** 1.0
- **Date:** 2026-10-30

## 1. Product summary

SyncDraft is a browser-based text editor where multiple people can edit the same document at the same time. Changes should appear to other collaborators with very low latency, without users having to manually refresh or resolve ordinary concurrent edits.

The product combines a familiar rich-text editing experience with document sharing, presence indicators, automatic persistence, and revision history. The MVP focuses on reliable collaborative writing—not on becoming a full office suite.

## 2. Problem statement

People working together on a document commonly exchange files, overwrite one another's changes, or coordinate edits through comments and messages. Traditional save-and-refresh workflows are not sufficient when several people are editing simultaneously.

SyncDraft should provide:
- A shared document that multiple authorized users can edit concurrently.
- Consistent document state despite concurrent edits and temporary network interruptions.
- Clear visibility into who is viewing or editing.
- Automatic persistence and recovery after reconnecting.
- Simple access control and sharing.

## 3. Goals and non-goals

### 3.1 MVP goals

1. Users can register, sign in, and sign out.
2. Users can create, rename, open, and delete documents they own.
3. Owners can invite collaborators or share a document with a controlled permission.
4. Multiple users can edit one document concurrently.
5. Text and formatting changes synchronize in near real time.
6. The editor displays collaborator presence, such as name, avatar, and cursor/selection.
7. Changes persist automatically and survive browser refreshes and reconnects.
8. Users can view a basic list of saved documents and their last-updated time.
9. The system enforces document permissions on both HTTP and WebSocket connections.

### 3.2 Explicit non-goals for MVP

- Full Microsoft Word / Google Docs feature parity.
- Spreadsheet, slide, or page-layout editing.
- Offline-first mobile applications.
- Native desktop applications.
- Real-time voice/video calls.
- AI writing, summarization, or document chat.
- Advanced comments, suggestion mode, and track changes.
- Public anonymous editing links.
- Enterprise SSO, SCIM, audit exports, and complex organization administration.

These may be considered after the core collaboration model is proven.

## 4. Target users and use cases

### Primary users
- Individuals drafting notes, plans, and articles.
- Small teams writing specifications, meeting notes, and shared documents.
- Students or collaborators preparing a shared text document.

### Core use cases
1. A user creates a document and invites a teammate.
2. Two or more users type in the same paragraph; each sees the other's changes without overwriting them.
3. A user opens a document on another browser after a network interruption and receives the latest state.
4. An owner changes a collaborator from editor to viewer or removes access.
5. A user returns to the dashboard and finds their recent documents.

## 5. Product principles

- **Correctness before feature count:** concurrent edits must converge reliably.
- **No silent data loss:** persist updates, monitor persistence failures, and make recovery observable.
- **Permission checks at every boundary:** a hidden UI control is not access control.
- **Responsive by default:** editing should work on laptop and tablet-sized screens.
- **Progressive complexity:** start with a focused rich-text editor and add advanced writing features later.

## 6. Functional requirements

Priority legend: **P0** = required for MVP; **P1** = next release; **P2** = later.

### 6.1 Authentication and user profile

| ID | Requirement | Priority |
|---|---|---|
| AUTH-01 | A user can register with email and password. | P0 |
| AUTH-02 | A user can sign in and sign out. | P0 |
| AUTH-03 | Passwords are stored using a modern password hash (Argon2id or bcrypt with appropriate cost). | P0 |
| AUTH-04 | A user can set a display name and avatar color/image. | P1 |
| AUTH-05 | Sessions can be revoked and expire according to configured policy. | P0 |

### 6.2 Document management

| ID | Requirement | Priority |
|---|---|---|
| DOC-01 | An authenticated user can create a document. | P0 |
| DOC-02 | An owner can rename a document. | P0 |
| DOC-03 | A user can list documents they own or can access. | P0 |
| DOC-04 | A user can open a document by ID only if authorized. | P0 |
| DOC-05 | An owner can soft-delete and restore a document. | P1 |
| DOC-06 | The dashboard shows last activity and the user's role. | P1 |
| DOC-07 | A user can search their document titles. | P1 |

### 6.3 Collaborative editing

| ID | Requirement | Priority |
|---|---|---|
| COL-01 | Multiple authorized users can edit one document concurrently. | P0 |
| COL-02 | Concurrent operations merge without last-write-wins overwrites. | P0 |
| COL-03 | Remote changes appear without a page refresh. | P0 |
| COL-04 | The editor shows remote cursors and selections. | P0 |
| COL-05 | The editor shows connected collaborators. | P0 |
| COL-06 | Local edits remain available during a brief disconnect and synchronize after reconnect. | P0 |
| COL-07 | The editor shows connection/synchronization status. | P0 |
| COL-08 | A viewer can read but cannot modify document content. | P0 |
| COL-09 | A user who loses permission is disconnected or prevented from further edits. | P0 |
| COL-10 | Large documents remain usable; performance is measured with representative test documents. | P1 |

### 6.4 Sharing and permissions

Roles:
- **Owner:** full control; can delete document, manage access, and edit.
- **Editor:** can edit content and view collaborators.
- **Viewer:** read-only access.

| ID | Requirement | Priority |
|---|---|---|
| SHARE-01 | Owner can invite an existing registered user by email. | P0 |
| SHARE-02 | Owner can set a collaborator's role. | P0 |
| SHARE-03 | Owner can revoke a collaborator's access. | P0 |
| SHARE-04 | Unauthorized users cannot fetch document content or join its WebSocket room. | P0 |
| SHARE-05 | Sharing changes take effect for active sessions promptly. | P0 |
| SHARE-06 | Email invitation links with expiry are supported. | P1 |
| SHARE-07 | Public link sharing can be enabled with explicit restrictions. | P2 |

### 6.5 Persistence and history

| ID | Requirement | Priority |
|---|---|---|
| SAVE-01 | Collaboration updates are persisted automatically. | P0 |
| SAVE-02 | A document can be reconstructed from its latest snapshot plus subsequent updates. | P0 |
| SAVE-03 | Persistence is idempotent; retrying an update does not corrupt state. | P0 |
| SAVE-04 | The system periodically compacts updates into snapshots. | P1 |
| SAVE-05 | Users can inspect and restore named or timestamped revisions. | P2 |

### 6.6 User experience

- Dashboard with document list and create-document action.
- Editor header with document title, sharing controls, and save/connection status.
- Rich-text editing toolbar for headings, bold, italic, lists, links, and undo/redo.
- Collaborator avatars and live cursor labels.
- Clear loading, empty, permission-denied, offline, reconnecting, and error states.
- Confirm destructive actions.

## 7. UX flows

### Flow A: Create and edit
1. User signs in.
2. User selects **New document**.
3. Backend creates document metadata and initial collaboration state.
4. Frontend opens the editor and joins the document's collaboration room.
5. User types; local editor updates immediately.
6. CRDT updates are broadcast to peers and persisted.
7. UI indicates connected/synchronized state.

### Flow B: Invite collaborator
1. Owner opens Share.
2. Owner enters an email and selects Editor or Viewer.
3. Backend verifies ownership and creates or updates membership.
4. Collaborator receives an invitation/notification (email may be P1).
5. Collaborator opens the document; server validates access before joining the room.

### Flow C: Reconnect
1. Network connection drops.
2. UI displays Reconnecting/Offline.
3. Local Yjs state continues to accept edits while the browser remains open.
4. Client reconnects and exchanges state with the collaboration server.
5. CRDT merges updates; server persists the resulting update stream.
6. UI displays Connected after synchronization completes.

## 8. Non-functional requirements

| Area | MVP target |
|---|---|
| Collaboration latency | Target p95 under 300 ms for connected users in the same deployment region, excluding client/network latency outside service control. |
| Availability | Target 99.5% monthly for MVP; define maintenance and incident policy. |
| Data durability | Persist accepted updates; backups and restore tests required before production. |
| Security | TLS in transit, password hashing, authorization on every API and collaboration join, secrets outside source control. |
| Scalability | Start with horizontally scalable stateless API and a collaboration service whose room ownership/persistence behavior is explicitly designed. |
| Browser support | Current Chrome, Edge, Firefox, and Safari desktop versions. |
| Accessibility | Keyboard-operable controls, visible focus, semantic labels, adequate contrast. |
| Observability | Structured logs, metrics for WebSocket connections, update persistence, sync errors, and latency. |

## 9. Success metrics

MVP success is measured by product usage and correctness, not just feature completion.

- Successful document creation rate.
- Weekly active editors and documents.
- Average collaborators per active document.
- Collaboration connection success rate.
- p95 update propagation latency.
- Persistence failure rate and time to recover.
- Number of reported lost/duplicated edits (target: zero confirmed cases).
- Reconnect success rate.
- Editor load time for defined document-size benchmarks.

## 10. MVP acceptance criteria

The MVP is acceptable when all of the following pass in a staging environment:

1. Two users can edit the same document concurrently in separate browsers.
2. Simultaneous edits at the same cursor region converge to the same content in both clients.
3. A client that disconnects, makes local edits, and reconnects converges with the server and another client.
4. Refreshing either browser restores the persisted document.
5. A viewer cannot modify content through the UI or by sending a forged collaboration update.
6. A user without membership cannot read the document through REST or join its WebSocket room.
7. Revoking a user's access prevents subsequent edits and terminates or invalidates the active session.
8. A simulated persistence outage is visible in metrics/logs and does not falsely report durable save success.
9. Automated tests cover authorization, document lifecycle, collaboration convergence, and reconnect behavior.

## 11. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Incorrect CRDT persistence or replay | Data loss or corruption | Use supported Yjs persistence patterns; test replay, snapshots, and reconnects. |
| WebSocket authorization gaps | Unauthorized document access | Authenticate handshake and authorize every room; revalidate membership changes. |
| Multiple collaboration server instances | Inconsistent room/persistence behavior | Define room routing and shared persistence before horizontal scaling. |
| Unbounded update history | Storage and load-time growth | Snapshot/compaction policy and retention monitoring. |
| Rich-text schema changes | Old documents may render incorrectly | Version editor schema and implement migrations. |
| Browser memory growth | Poor editing performance | Benchmark large docs; cap/monitor document size in MVP. |
| Network instability | Confusing user experience | Reconnect strategy, status UI, and convergence tests. |

## 12. Release plan

### Phase 0 — Technical proof
- Validate TipTap + Yjs + collaboration provider integration.
- Prove two-client convergence and reconnect.
- Prove server-side authorization and persistence.
- Decide whether to use Hocuspocus or a custom provider only after the spike.

### Phase 1 — MVP foundation
- Authentication and user profile.
- Document CRUD and membership roles.
- Editor shell and basic rich-text schema.
- WebSocket collaboration, presence, persistence.
- Docker-based local development and CI tests.

### Phase 2 — MVP hardening
- Access revocation for active sessions.
- Snapshot/compaction and backup/restore.
- Observability, rate limits, load tests, and security review.
- Staging deployment and acceptance testing.

### Phase 3 — Post-MVP
- Invitation emails, search, revision history, comments.
- Organization/workspace support.
- Public links, templates, export, and mobile improvements.

## 13. Open product decisions

These should be resolved before implementation expands:
- Is the product primarily plain-text/Markdown or rich-text? This PRD assumes rich-text with a constrained schema.
- Are documents private by default? **Assumption: yes.**
- Is email invitation required for the first usable release? **Assumption: membership by registered email is sufficient for initial MVP.**
- What is the expected maximum document size and concurrent collaborators? Establish explicit limits through load testing.
- Is the product single-user/self-hosted initially or multi-tenant SaaS? **Architecture assumes multi-tenant SaaS with tenant isolation at the data/authorization layer.**
