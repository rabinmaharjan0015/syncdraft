import { Server } from "@hocuspocus/server";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Pool } from "pg";
import * as Y from "yjs";

const port = Number(process.env.PORT ?? 1234);
const secret = process.env.COLLAB_SECRET;
const databaseUrl = process.env.DATABASE_URL;
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
  .split(",").map((origin) => origin.trim()).filter(Boolean);

if (!secret || secret.length < 32) {
  throw new Error("COLLAB_SECRET must be configured with at least 32 characters.");
}
if (!databaseUrl) throw new Error("DATABASE_URL is required for durable collaboration storage.");

const pool = new Pool({ connectionString: databaseUrl, max: 10 });
type CollaborationContext = {
  userId: string;
  documentId: string;
  role: "owner" | "editor" | "viewer";
};

function verifyTicket(token: string, documentName: string): CollaborationContext {
  const claims = jwt.verify(token, secret!, {
    algorithms: ["HS256"], issuer: "syncdraft-api", audience: "syncdraft-collab",
  }) as JwtPayload;
  if (claims.scope !== "document:connect" || claims.document_id !== documentName ||
      typeof claims.sub !== "string" || typeof claims.role !== "string" || !["owner", "editor", "viewer"].includes(claims.role)) {
    throw new Error("This collaboration ticket is not valid for the requested document.");
  }
  return {
    userId: claims.sub,
    documentId: claims.document_id,
    role: claims.role as CollaborationContext["role"],
  };
}

const server = Server.configure({
  port,
  timeout: 30_000,
  debounce: 1_000,
  maxDebounce: 5_000,
  async onUpgrade({ request }) {
    const origin = request.headers.origin;
    if (typeof origin === "string" && !allowedOrigins.includes(origin)) {
      throw new Error("WebSocket origin is not allowed.");
    }
  },
  async onAuthenticate({ token, documentName, connection }) {
    if (!token) throw new Error("Authentication required.");
    const context = verifyTicket(token, documentName);
    // Hocuspocus exposes readOnly on the authenticated connection. Viewers can
    // receive updates but cannot submit document mutations.
    if (context.role === "viewer") connection.readOnly = true;
    return context;
  },
  async onLoadDocument({ documentName, document }) {
    const result = await pool.query<{ state: Buffer }>(
      "SELECT state FROM document_snapshots WHERE document_id = $1",
      [documentName],
    );
    if (result.rows[0]?.state) {
      Y.applyUpdate(document, new Uint8Array(result.rows[0].state));
    }
    return document;
  },
  async onStoreDocument({ documentName, document }) {
    const state = Buffer.from(Y.encodeStateAsUpdate(document));
    await pool.query(
      `INSERT INTO document_snapshots (document_id, state, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (document_id) DO UPDATE
       SET state = EXCLUDED.state, updated_at = NOW()`,
      [documentName, state],
    );
    await pool.query("UPDATE documents SET updated_at = NOW() WHERE id = $1", [documentName]);
  },
  async connected({ context }) {
    const user = context as CollaborationContext;
    console.info(`Collaboration connected: user=${user.userId} document=${user.documentId} role=${user.role}`);
  },
  async onDisconnect({ context }) {
    const user = context as CollaborationContext | undefined;
    if (user) console.info(`Collaboration disconnected: user=${user.userId} document=${user.documentId}`);
  },
});

server.listen();
console.info(`SyncDraft collaboration server listening on :${port}`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await server.destroy();
    await pool.end();
    process.exit(0);
  });
}
