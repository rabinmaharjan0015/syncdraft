import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  AlignLeft, ArrowLeft, Bell, BookOpen, Check, ChevronDown, CircleHelp, Clock3,
  FileText, Folder, Grid2X2, LogOut, Plus, Search, Settings2,
  Share2, Sparkles, Star, Users, Wifi, WifiOff, LoaderCircle,
} from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";
type User = { id: string; email: string; display_name: string; avatar_url: string | null };
type Doc = { id: string; title: string; owner_id: string; role: "owner" | "editor" | "viewer"; updated_at: string };
type Ticket = { token: string; websocket_url: string; expires_at: string; role: string };
type AuthMode = "login" | "register";

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const token = localStorage.getItem("syncdraft_access_token");
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [activeDoc, setActiveDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    const [me, documents] = await Promise.all([api<User>("/auth/me"), api<Doc[]>("/documents")]);
    setUser(me);
    setDocs(documents);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("syncdraft_access_token")) { setLoading(false); return; }
    refresh().catch(() => localStorage.removeItem("syncdraft_access_token")).finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const requestedId = new URLSearchParams(window.location.search).get("document");
    if (requestedId && docs.length) {
      const requested = docs.find((item) => item.id === requestedId);
      if (requested) setActiveDoc(requested);
    }
  }, [docs]);

  const signOut = async () => {
    try { await api("/auth/logout", { method: "POST" }); } catch { /* local sign-out still applies */ }
    localStorage.removeItem("syncdraft_access_token");
    setUser(null); setActiveDoc(null); setDocs([]);
  };

  const createDoc = async () => {
    setError("");
    try {
      const doc = await api<Doc>("/documents", { method: "POST", body: JSON.stringify({ title: "Untitled document" }) });
      setDocs((current) => [doc, ...current]); setActiveDoc(doc);
    } catch (e) { setError(messageOf(e)); }
  };

  if (loading) return <div className="loading-screen"><div className="brand-mark"><AlignLeft size={19}/></div><span>Preparing your workspace…</span></div>;
  if (!user) return <AuthScreen onAuthenticated={(nextUser) => { setUser(nextUser); refresh().catch((e) => setError(messageOf(e))); }} />;
  if (activeDoc) return <CollaborativeEditor document={activeDoc} user={user} onBack={() => { window.history.replaceState({}, "", window.location.pathname); setActiveDoc(null); refresh().catch(() => undefined); }} />;

  const filtered = docs.filter((doc) => doc.title.toLowerCase().includes(query.toLowerCase()));
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><AlignLeft size={19}/></div><span>syncdraft</span></div>
      <button className="workspace-switch"><div className="workspace-avatar">{user.display_name.slice(0, 1).toUpperCase()}</div><span><b>Personal workspace</b><small>{user.email}</small></span><ChevronDown size={15}/></button>
      <button className="new-doc" onClick={createDoc}><Plus size={17}/> New document <span>⌘ N</span></button>
      <div className="nav-label">WORKSPACE</div>
      <nav className="nav-list"><NavItem icon={<Grid2X2 size={17}/>} label="All documents" active/><NavItem icon={<Users size={17}/>} label="Shared with me"/><NavItem icon={<Star size={17}/>} label="Favorites"/><NavItem icon={<Clock3 size={17}/>} label="Recent"/></nav>
      <div className="nav-label folder-label">YOUR SPACE</div>
      <nav className="nav-list"><NavItem icon={<Folder size={17}/>} label="My documents"/></nav>
      <div className="sidebar-bottom"><div className="upgrade-card"><div className="upgrade-icon"><Sparkles size={15}/></div><b>Ideas work better together</b><p>Invite a teammate and see your words come alive in real time.</p><button onClick={createDoc}>Create a document <span>→</span></button></div><NavItem icon={<Settings2 size={17}/>} label="Settings"/><NavItem icon={<CircleHelp size={17}/>} label="Help & feedback"/><div className="profile"><div className="profile-avatar">{initials(user.display_name)}</div><span><b>{user.display_name}</b><small>{user.email}</small></span><button className="quiet-icon" onClick={signOut} title="Sign out"><LogOut size={16}/></button></div></div>
    </aside>
    <main className="main-area"><header className="topbar"><div className="breadcrumbs"><span>Workspace</span><span className="slash">/</span><b>All documents</b></div><div className="top-actions"><span className="api-live"><i/> API connected</span><button className="icon-button"><Bell size={18}/></button><div className="profile-avatar small">{initials(user.display_name)}</div></div></header>
      <section className="content"><div className="welcome-row"><div><div className="eyebrow"><Sparkles size={13}/> YOUR CREATIVE SPACE</div><h1>Welcome back, {user.display_name.split(" ")[0]} <span>✳</span></h1><p>Pick up where you left off, or start with a fresh page.</p></div><button className="primary-button" onClick={createDoc}><Plus size={17}/> Create document</button></div>
        <div className="quick-stats"><div className="stat-card"><div className="stat-icon purple"><FileText size={18}/></div><div><strong>{docs.length}</strong><small>Total documents</small></div></div><div className="stat-card"><div className="stat-icon blue"><Users size={18}/></div><div><strong>{docs.filter((d) => d.role !== "owner").length}</strong><small>Shared with you</small></div></div><div className="stat-card"><div className="stat-icon amber"><Wifi size={18}/></div><div><strong>Live</strong><small>Collaboration engine</small></div></div></div>
        <div className="section-heading"><div><h2>Your documents</h2><p>Your latest thoughts, all in one place.</p></div><div className="document-actions"><label className="search-box"><Search size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents…"/></label></div></div>
        {error && <div className="error-banner">{error}</div>}
        <div className="document-grid">{filtered.map((doc, i) => <button className="document-card" key={doc.id} onClick={() => setActiveDoc(doc)}><div className={`doc-preview ${["lavender", "peach", "mint"][i % 3]}`}><div className="preview-paper"><div className="paper-kicker">{doc.role.toUpperCase()} / DOCUMENT</div><div className="paper-title">{doc.title}</div><div className="paper-line long"/><div className="paper-line"/><div className="paper-line short"/><div className="paper-gap"/><div className="paper-line long"/><div className="paper-line short"/></div><span className="card-role">{doc.role}</span></div><div className="doc-info"><div><h3>{doc.title}</h3><p>Updated {new Date(doc.updated_at).toLocaleDateString()}</p></div><span className="doc-open">Open <span>↗</span></span></div></button>)}
          <button className="create-card" onClick={createDoc}><div className="create-circle"><Plus size={21}/></div><b>Create a new document</b><span>Start with a blank canvas</span></button>
        </div>
        <div className="template-banner"><div className="template-art"><BookOpen size={25}/></div><div><b>Made for ideas that move together.</b><p>Every change syncs live across everyone in the document.</p></div><span className="banner-status"><i/> Yjs powered</span></div>
        <footer className="footer"><span>© 2026 SyncDraft</span><span>Made for ideas that move together <span className="footer-heart">✳</span></span><span>Private by design</span></footer>
      </section>
    </main>
  </div>;
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (mode === "register") await api("/auth/register", { method: "POST", body: JSON.stringify({ display_name: name, email, password }) });
      const token = await api<{ access_token: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      localStorage.setItem("syncdraft_access_token", token.access_token);
      const user = await api<User>("/auth/me"); onAuthenticated(user);
    } catch (e) { setError(messageOf(e)); } finally { setBusy(false); }
  };
  return <div className="auth-page"><div className="auth-art"><div className="auth-brand"><div className="brand-mark"><AlignLeft size={19}/></div> syncdraft</div><div className="art-copy"><span className="eyebrow">A SHARED SPACE FOR BIG IDEAS</span><h1>Good ideas get<br/><em>better together.</em></h1><p>A calm, collaborative space to think clearly, write freely, and create something meaningful with your team.</p><div className="art-orbit"><div className="orbit-paper"><div/><div/><div/><div/></div><span className="orbit-avatar one">AM</span><span className="orbit-avatar two">JD</span><span className="orbit-avatar three">SK</span><span className="orbit-spark">✳</span></div></div></div><div className="auth-panel"><div className="auth-card"><div className="mobile-brand"><div className="brand-mark"><AlignLeft size={19}/></div> syncdraft</div><div className="auth-kicker">YOUR WORKSPACE AWAITS</div><h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2><p className="auth-subtitle">{mode === "login" ? "Sign in to pick up where you left off." : "Start creating together in just a moment."}</p><form onSubmit={submit}>{mode === "register" && <label>Your name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Morgan" minLength={2} required/></label>}<label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required/></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "register" ? "At least 10 characters" : "Your password"} minLength={mode === "register" ? 10 : 1} required/></label>{error && <div className="error-banner">{error}</div>}<button className="auth-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : null}{mode === "login" ? "Sign in" : "Create account"}<span>→</span></button></form><div className="auth-switch">{mode === "login" ? "New to SyncDraft?" : "Already have an account?"} <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "Create an account" : "Sign in"}</button></div><div className="auth-foot"><span><Check size={13}/> Your work stays yours</span><span>Secure workspace</span></div></div></div></div>;
}

function CollaborativeEditor({ document, user, onBack }: { document: Doc; user: User; onBack: () => void }) {
  const ydoc = useMemo(() => new Y.Doc(), [document.id]);
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [status, setStatus] = useState("connecting"); const [connectedUsers, setConnectedUsers] = useState<Array<{ name: string; color: string }>>([]);
  const [ticketError, setTicketError] = useState(""); const [title, setTitle] = useState(document.title); const [renaming, setRenaming] = useState(false);
  useEffect(() => {
    let cancelled = false; let nextProvider: HocuspocusProvider | null = null;
    api<Ticket>(`/documents/${document.id}/collaboration-ticket`, { method: "POST" }).then((ticket) => {
      if (cancelled) return;
      let firstTicket: string | null = ticket.token;
      nextProvider = new HocuspocusProvider({
        url: ticket.websocket_url, name: document.id, document: ydoc,
        token: async () => {
          if (firstTicket) { const initial = firstTicket; firstTicket = null; return initial; }
          const refreshed = await api<Ticket>(`/documents/${document.id}/collaboration-ticket`, { method: "POST" });
          return refreshed.token;
        },
      });
      nextProvider.setAwarenessField("user", { name: user.display_name, color: colorFor(user.id) });
      nextProvider.on("status", ({ status: nextStatus }) => setStatus(nextStatus));
      const updatePresence = () => {
        const states = Array.from(nextProvider!.awareness.getStates().values());
        setConnectedUsers(states.map((state: any) => state.user).filter(Boolean));
      };
      nextProvider.awareness.on("change", updatePresence); updatePresence(); setProvider(nextProvider);
    }).catch((e) => setTicketError(messageOf(e)));
    return () => { cancelled = true; nextProvider?.destroy(); ydoc.destroy(); };
  }, [document.id, user, ydoc]);

  const [editor, setEditor] = useState<ReturnType<typeof useEditor>>(null);
  const saveTitle = async () => {
    setRenaming(false);
    if (title.trim() && title.trim() !== document.title && document.role === "owner") {
      try { await api(`/documents/${document.id}`, { method: "PATCH", body: JSON.stringify({ title: title.trim() }) }); }
      catch (e) { setTicketError(messageOf(e)); setTitle(document.title); }
    }
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.origin + `/?document=${document.id}`); } catch { setTicketError("Clipboard access was blocked by your browser."); }
  };
  const statusText = ticketError ? "Connection unavailable" : status === "connected" ? "Live · changes synced" : status === "connecting" ? "Connecting…" : "Reconnecting…";

  return <div className="editor-shell"><header className="editor-topbar"><button className="brand editor-brand" onClick={onBack}><div className="brand-mark"><AlignLeft size={18}/></div><span>syncdraft</span></button><div className="editor-crumb"><button onClick={onBack}>My documents</button><span>/</span>{renaming ? <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle} onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setTitle(document.title); setRenaming(false); } }}/> : <button className="crumb-title" onClick={() => document.role === "owner" && setRenaming(true)}>{title}</button>}</div><div className="editor-right"><div className="presence">{connectedUsers.slice(0, 4).map((person, i) => <span key={`${person.name}-${i}`} className="presence-avatar" style={{ background: person.color }}>{initials(person.name)}</span>)}<small>{connectedUsers.length} here</small></div><span className={`saved-indicator ${status === "connected" ? "is-saved" : "is-waiting"}`}>{status === "connected" ? <Wifi size={13}/> : <WifiOff size={13}/>} {statusText}</span><button className="share-button" onClick={copyLink}><Share2 size={15}/> Copy link</button><button className="icon-button" onClick={onBack}><ArrowLeft size={18}/></button></div></header>
    <div className="editor-toolbar"><div className="toolbar-group"><span className="toolbar-doc-label">{document.role === "viewer" ? "VIEW ONLY" : "EDITING"}</span><i/>{["B", "I", "S"].map((label) => <button key={label} className="format-button" disabled={!editor || document.role === "viewer"} onClick={() => { if (label === "B") editor?.chain().focus().toggleBold().run(); if (label === "I") editor?.chain().focus().toggleItalic().run(); if (label === "S") editor?.chain().focus().toggleStrike().run(); }}>{label === "B" ? <b>B</b> : label === "I" ? <i>I</i> : <s>S</s>}</button>)}<i/><button className="format-button" disabled={!editor || document.role === "viewer"} onClick={() => editor?.chain().focus().toggleBulletList().run()}>• List</button><button className="format-button" disabled={!editor || document.role === "viewer"} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1. List</button><button className="format-button" disabled={!editor || document.role === "viewer"} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>“ Quote</button></div><div className="toolbar-hint">Your changes sync as you type</div></div>
    {ticketError ? <div className="collab-error"><WifiOff size={18}/><b>Couldn’t connect to this document</b><p>{ticketError}</p><button onClick={onBack}>Back to documents</button></div> : <><main className="writing-canvas"><div className="document-meta"><span className="doc-badge"><FileText size={13}/> DOCUMENT</span><span>{statusText}</span></div><h1>{title}</h1><p className="editor-subtitle">A shared page for ideas, notes, and everything in between.</p><div className="editor-divider"/>{provider ? <CollaborativeEditorCanvas provider={provider} ydoc={ydoc} user={user} editable={document.role !== "viewer"} onEditorReady={setEditor}/> : <div className="editor-loading"><LoaderCircle className="spin" size={18}/> Establishing a secure connection…</div>}</main><aside className="editor-outline"><div className="outline-title">LIVE COLLABORATION</div><span className="outline-active">{connectedUsers.length} collaborator{connectedUsers.length === 1 ? "" : "s"} online</span><div className="outline-note">Everyone in this document sees edits and cursors in real time.</div><div className="outline-permission">Access: <b>{document.role}</b></div></aside></>}
  </div>;
}

function CollaborativeEditorCanvas({
  provider, ydoc, user, editable, onEditorReady,
}: {
  provider: HocuspocusProvider;
  ydoc: Y.Doc;
  user: User;
  editable: boolean;
  onEditorReady: (editor: ReturnType<typeof useEditor>) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider,
        user: { name: user.display_name, color: colorFor(user.id) },
      }),
    ],
    editable,
    editorProps: { attributes: { class: "tiptap-content", spellcheck: "true" } },
  }, [provider, ydoc, editable]);

  useEffect(() => {
    onEditorReady(editor);
    return () => onEditorReady(null);
  }, [editor, onEditorReady]);

  if (!editor) {
    return <div className="editor-loading"><LoaderCircle className="spin" size={18}/> Preparing your document…</div>;
  }
  return <EditorContent editor={editor}/>;
}

function NavItem({ icon, label, active = false }: { icon: ReactNode; label: string; active?: boolean }) { return <button className={`nav-item ${active ? "active" : ""}`}>{icon}<span>{label}</span></button>; }
function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join(""); }
function colorFor(seed: string) { const colors = ["#7468e8", "#df916f", "#4c9b83", "#4f8cc9", "#b17bc4", "#c49a48"]; return colors[[...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length]; }
function messageOf(error: unknown) { return error instanceof Error ? error.message : "Something went wrong. Please try again."; }

export default App;
