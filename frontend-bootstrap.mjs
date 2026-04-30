#!/usr/bin/env node
// Bootstrap script: creates the frontend/ folder tree and writes every file.
// Usage:  node frontend-bootstrap.mjs
// Idempotent: re-running overwrites files.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

const FILES = {};

// ---- frontend/package.json ---------------------------------------------------
FILES['frontend/package.json'] = `{
  "name": "propintel-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b --noCheck && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b --noEmit"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.59.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2",
    "zustand": "^4.5.5"
  },
  "devDependencies": {
    "@types/react": "^18.3.10",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.6.2",
    "vite": "^5.4.8"
  }
}
`;

// ---- frontend/vite.config.ts ------------------------------------------------
FILES['frontend/vite.config.ts'] = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { port: 5173, host: true },
});
`;

// ---- frontend/tsconfig.json -------------------------------------------------
FILES['frontend/tsconfig.json'] = `{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
`;

FILES['frontend/tsconfig.node.json'] = `{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "skipLibCheck": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
`;

FILES['frontend/.env.example'] = `VITE_API_URL=http://localhost:3000/api/v1
`;

FILES['frontend/.gitignore'] = `node_modules
dist
*.local
.env
.env.local
.vite
coverage
`;

FILES['frontend/index.html'] = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PropIntel</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

// ---- entry --------------------------------------------------------------------
FILES['frontend/src/main.tsx'] = `import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles.css';

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
`;

FILES['frontend/src/styles.css'] = `:root {
  --bg: #0b1020; --surface: #11172a; --surface-2: #1a2240;
  --text: #e8ecf6; --muted: #8a93a6;
  --primary: #4f8cff; --primary-hover: #3a78ee;
  --danger: #ff5d5d; --success: #45c08a;
  --border: #232b46; --radius: 8px;
}
*{box-sizing:border-box}html,body,#root{height:100%}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;background:var(--bg);color:var(--text);font-size:14px;line-height:1.5}
a{color:var(--primary);text-decoration:none}a:hover{text-decoration:underline}
.shell{display:grid;grid-template-columns:240px 1fr;min-height:100vh}
.sidebar{background:var(--surface);border-right:1px solid var(--border);padding:20px}
.sidebar h1{font-size:18px;margin:0 0 24px}
.sidebar nav a{display:block;padding:8px 12px;border-radius:6px;color:var(--text);margin-bottom:4px}
.sidebar nav a.active,.sidebar nav a:hover{background:var(--surface-2);text-decoration:none}
.main{padding:24px 32px;max-width:1200px}
.main h2{margin:0 0 16px;font-size:22px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:16px}
.input,.select,.textarea{width:100%;padding:10px 12px;background:var(--surface-2);color:var(--text);border:1px solid var(--border);border-radius:6px;font:inherit}
.input:focus,.select:focus,.textarea:focus{outline:none;border-color:var(--primary)}
.label{display:block;font-size:12px;color:var(--muted);margin:12px 0 6px}
.btn{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;background:var(--primary);color:#fff;border:0;border-radius:6px;font:inherit;cursor:pointer}
.btn:hover{background:var(--primary-hover)}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn.secondary{background:var(--surface-2);color:var(--text);border:1px solid var(--border)}
.btn.danger{background:var(--danger)}
.row{display:flex;gap:12px;align-items:center}.spacer{flex:1}
.muted{color:var(--muted)}.error{color:var(--danger);font-size:13px;margin-top:4px}.success{color:var(--success)}
table{width:100%;border-collapse:collapse}
th,td{padding:10px 12px;text-align:left;border-bottom:1px solid var(--border)}
th{color:var(--muted);font-weight:500;font-size:12px;text-transform:uppercase}
.center{display:grid;place-items:center;min-height:100vh}
.auth-card{width:380px;max-width:92vw}
.badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;background:var(--surface-2);color:var(--muted);border:1px solid var(--border)}
.badge.completed{color:var(--success);border-color:var(--success)}
.badge.failed{color:var(--danger);border-color:var(--danger)}
.badge.pending{color:var(--primary);border-color:var(--primary)}
`;

// ---- lib --------------------------------------------------------------------
FILES['frontend/src/lib/authStore.ts'] = `import { create } from 'zustand';

export type AuthUser = {
  id: string; email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  tenantId: string; fullName?: string;
};

type State = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setSession: (s: { accessToken: string; refreshToken: string; user: AuthUser }) => void;
  setAccessToken: (t: string) => void;
  setRefreshToken: (t: string) => void;
  clear: () => void;
  hydrate: () => void;
};

const KEY = 'propintel.session.v1';

export const useAuth = create<State>((set, get) => ({
  accessToken: null, refreshToken: null, user: null,
  setSession: ({ accessToken, refreshToken, user }) => {
    localStorage.setItem(KEY, JSON.stringify({ accessToken, refreshToken, user }));
    set({ accessToken, refreshToken, user });
  },
  setAccessToken: (t) => {
    const cur = get();
    const next = { accessToken: t, refreshToken: cur.refreshToken, user: cur.user };
    localStorage.setItem(KEY, JSON.stringify(next));
    set({ accessToken: t });
  },
  setRefreshToken: (t) => {
    const cur = get();
    const next = { accessToken: cur.accessToken, refreshToken: t, user: cur.user };
    localStorage.setItem(KEY, JSON.stringify(next));
    set({ refreshToken: t });
  },
  clear: () => {
    localStorage.removeItem(KEY);
    set({ accessToken: null, refreshToken: null, user: null });
  },
  hydrate: () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      set(JSON.parse(raw));
    } catch { /* ignore */ }
  },
}));
`;

FILES['frontend/src/lib/api.ts'] = `import { useAuth } from './authStore';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  status: number; code: string; details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status; this.code = code; this.details = details;
  }
}

type Opts = { method?: string; body?: unknown; auth?: boolean; signal?: AbortSignal };

let refreshing: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  const { refreshToken, setAccessToken, setRefreshToken, clear } = useAuth.getState();
  if (!refreshToken) { clear(); return null; }
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(\`\${BASE}/auth/refresh\`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) { clear(); return null; }
        const data = await res.json();
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        return data.accessToken as string;
      } catch { clear(); return null; }
      finally { refreshing = null; }
    })();
  }
  return refreshing;
}

async function rawFetch(p: string, opts: Opts, token: string | null) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = \`Bearer \${token}\`;
  return fetch(\`\${BASE}\${p}\`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });
}

export async function api<T = unknown>(p: string, opts: Opts = {}): Promise<T> {
  const auth = opts.auth !== false;
  let token = auth ? useAuth.getState().accessToken : null;
  let res = await rawFetch(p, opts, token);
  if (auth && res.status === 401) {
    const newToken = await tryRefresh();
    if (newToken) { token = newToken; res = await rawFetch(p, opts, token); }
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const e = data?.error || {};
    throw new ApiError(res.status, e.code || 'ERR', e.message || res.statusText, e.details);
  }
  return data as T;
}
`;

// ---- components -------------------------------------------------------------
FILES['frontend/src/components/auth/RequireAuth.tsx'] = `import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/authStore';
import type { ReactNode } from 'react';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const loc = useLocation();
  if (!accessToken) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}
`;

FILES['frontend/src/components/auth/RoleGuard.tsx'] = `import type { ReactNode } from 'react';
import { useAuth, type AuthUser } from '../../lib/authStore';

type Role = AuthUser['role'];

export default function RoleGuard({ allow, children, fallback = null }:
  { allow: Role[]; children: ReactNode; fallback?: ReactNode }) {
  const { user } = useAuth();
  if (!user || !allow.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
}
`;

FILES['frontend/src/components/layout/AppShell.tsx'] = `import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/authStore';
import { api } from '../../lib/api';

export default function AppShell() {
  const { user, refreshToken, clear } = useAuth();
  const nav = useNavigate();
  const logout = async () => {
    try { if (refreshToken) await api('/auth/logout', { method: 'POST', body: { refreshToken } }); }
    catch { /* ignore */ }
    clear(); nav('/login');
  };
  const link = ({ isActive }: { isActive: boolean }) => isActive ? 'active' : '';
  return (
    <div className="shell">
      <aside className="sidebar">
        <h1>PropIntel</h1>
        <nav>
          <NavLink to="/" end className={link}>Dashboard</NavLink>
          <NavLink to="/properties" className={link}>Properties</NavLink>
          <NavLink to="/valuations" className={link}>Valuations</NavLink>
          <NavLink to="/reports" className={link}>Reports</NavLink>
          <NavLink to="/settings/members" className={link}>Members</NavLink>
          <NavLink to="/settings/tenant" className={link}>Tenant</NavLink>
        </nav>
        <div style={{ marginTop: 24, fontSize: 12, color: 'var(--muted)' }}>
          {user && <div>{user.email}<br /><span className="badge">{user.role}</span></div>}
          <button className="btn secondary" onClick={logout} style={{ marginTop: 12, width: '100%' }}>Sign out</button>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}
`;

// ---- pages: auth ------------------------------------------------------------
FILES['frontend/src/pages/Login.tsx'] = `import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const setSession = useAuth((s) => s.setSession);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setLoading(true);
    try {
      const data = await api<{ accessToken: string; refreshToken: string; user: any }>(
        '/auth/login',
        { method: 'POST', body: { email, password, tenantSlug: tenantSlug || undefined }, auth: false },
      );
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: { ...data.user, role: data.user.role },
      });
      nav('/');
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="center">
      <form className="card auth-card" onSubmit={onSubmit}>
        <h2>Sign in</h2>
        <label className="label">Email</label>
        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="label">Password</label>
        <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <label className="label">Tenant slug <span className="muted">(optional)</span></label>
        <input className="input" value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} placeholder="acme" />
        {err && <div className="error">{err}</div>}
        <button className="btn" disabled={loading} style={{ marginTop: 16, width: '100%' }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="muted" style={{ marginTop: 12, textAlign: 'center' }}>
          No account? <Link to="/register">Create one</Link>
        </p>
      </form>
    </div>
  );
}
`;

FILES['frontend/src/pages/Register.tsx'] = `import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/authStore';

export default function Register() {
  const [form, setForm] = useState({
    email: '', password: '', fullName: '', tenantName: '', tenantSlug: '',
  });
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const setSession = useAuth((s) => s.setSession);
  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setLoading(true);
    try {
      const data = await api<{ accessToken: string; refreshToken: string; user: any; tenant: any }>(
        '/auth/register', { method: 'POST', body: form, auth: false },
      );
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: { ...data.user, tenantId: data.tenant.id, role: data.user.role },
      });
      nav('/');
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="center">
      <form className="card auth-card" onSubmit={onSubmit}>
        <h2>Create your workspace</h2>
        <label className="label">Tenant name</label>
        <input className="input" required value={form.tenantName} onChange={upd('tenantName')} />
        <label className="label">Tenant slug</label>
        <input className="input" required value={form.tenantSlug} onChange={upd('tenantSlug')}
               pattern="^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$" placeholder="acme-co" />
        <label className="label">Full name</label>
        <input className="input" required value={form.fullName} onChange={upd('fullName')} />
        <label className="label">Email</label>
        <input className="input" type="email" required value={form.email} onChange={upd('email')} />
        <label className="label">Password <span className="muted">(min 10, upper+lower+digit)</span></label>
        <input className="input" type="password" required minLength={10} value={form.password} onChange={upd('password')} />
        {err && <div className="error">{err}</div>}
        <button className="btn" disabled={loading} style={{ marginTop: 16, width: '100%' }}>
          {loading ? 'Creating…' : 'Create account'}
        </button>
        <p className="muted" style={{ marginTop: 12, textAlign: 'center' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
`;

FILES['frontend/src/pages/Dashboard.tsx'] = `import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';

type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

export default function Dashboard() {
  const properties = useQuery({
    queryKey: ['properties', { page: 1, pageSize: 5 }],
    queryFn: () => api<Page<any>>('/properties?page=1&pageSize=5'),
  });
  const valuations = useQuery({
    queryKey: ['valuations', { page: 1, pageSize: 5 }],
    queryFn: () => api<Page<any>>('/valuations?page=1&pageSize=5'),
  });
  return (
    <div>
      <h2>Dashboard</h2>
      <div className="card">
        <div className="row"><strong>Properties</strong><span className="spacer" /><Link to="/properties">View all →</Link></div>
        <p className="muted">{properties.data ? \`\${properties.data.total} total\` : 'Loading…'}</p>
      </div>
      <div className="card">
        <div className="row"><strong>Recent valuations</strong><span className="spacer" /><Link to="/valuations">View all →</Link></div>
        {valuations.data && valuations.data.items.length === 0 && <p className="muted">None yet.</p>}
        {valuations.data && valuations.data.items.length > 0 && (
          <table>
            <thead><tr><th>ID</th><th>Method</th><th>Status</th><th>Estimated</th></tr></thead>
            <tbody>
              {valuations.data.items.map((v: any) => (
                <tr key={v.id}>
                  <td><Link to={\`/valuations/\${v.id}\`}>{v.id.slice(0, 8)}…</Link></td>
                  <td>{v.method}</td>
                  <td><span className={\`badge \${v.status}\`}>{v.status}</span></td>
                  <td>{v.estimated_value ? \`\${v.estimated_value} \${v.currency}\` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
`;

FILES['frontend/src/pages/Properties/List.tsx'] = `import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

type Property = { id: string; address: string; city: string; property_type: string; area_sqm?: number };
type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

export default function PropertiesList() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (q) params.set('q', q);
  const { data, isLoading, error } = useQuery({
    queryKey: ['properties', { page, q }],
    queryFn: () => api<Page<Property>>(\`/properties?\${params.toString()}\`),
  });
  return (
    <div>
      <div className="row" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Properties</h2>
        <span className="spacer" />
        <Link to="/properties/new" className="btn">+ New property</Link>
      </div>
      <div className="card">
        <input className="input" placeholder="Search address or external ref…"
               value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
               style={{ marginBottom: 12 }} />
        {isLoading && <p className="muted">Loading…</p>}
        {error && <p className="error">{(error as Error).message}</p>}
        {data && (
          <>
            <table>
              <thead><tr><th>Address</th><th>City</th><th>Type</th><th>Area</th><th></th></tr></thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id}>
                    <td>{p.address}</td><td>{p.city}</td><td>{p.property_type}</td>
                    <td>{p.area_sqm ?? '—'}</td>
                    <td><Link to={\`/properties/\${p.id}\`}>Open →</Link></td>
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 24 }}>No properties yet.</td></tr>
                )}
              </tbody>
            </table>
            <div className="row" style={{ marginTop: 12 }}>
              <span className="muted">{data.total} total</span><span className="spacer" />
              <button className="btn secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
              <span>Page {data.page}</span>
              <button className="btn secondary" disabled={data.page * data.pageSize >= data.total}
                      onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
`;

FILES['frontend/src/pages/Properties/New.tsx'] = `import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';

const TYPES = ['apartment', 'house', 'office', 'retail', 'land', 'other'] as const;

export default function NewProperty() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    address: '', city: '', propertyType: 'apartment',
    areaSqm: '', rooms: '', floor: '', yearBuilt: '', externalRef: '',
  });
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setLoading(true);
    const payload: Record<string, unknown> = {
      address: form.address, city: form.city, propertyType: form.propertyType,
    };
    if (form.areaSqm) payload.areaSqm = Number(form.areaSqm);
    if (form.rooms) payload.rooms = Number(form.rooms);
    if (form.floor) payload.floor = Number(form.floor);
    if (form.yearBuilt) payload.yearBuilt = Number(form.yearBuilt);
    if (form.externalRef) payload.externalRef = form.externalRef;
    try {
      const created = await api<{ id: string }>('/properties', { method: 'POST', body: payload });
      nav(\`/properties/\${created.id}\`);
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Failed to create'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h2>New property</h2>
      <form className="card" onSubmit={onSubmit} style={{ maxWidth: 640 }}>
        <label className="label">Address</label>
        <input className="input" required value={form.address} onChange={upd('address')} />
        <label className="label">City</label>
        <input className="input" required value={form.city} onChange={upd('city')} />
        <label className="label">Type</label>
        <select className="select" value={form.propertyType} onChange={upd('propertyType')}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="row" style={{ gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="label">Area (sqm)</label>
            <input className="input" type="number" value={form.areaSqm} onChange={upd('areaSqm')} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Rooms</label>
            <input className="input" type="number" step="0.5" value={form.rooms} onChange={upd('rooms')} />
          </div>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="label">Floor</label>
            <input className="input" type="number" value={form.floor} onChange={upd('floor')} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Year built</label>
            <input className="input" type="number" value={form.yearBuilt} onChange={upd('yearBuilt')} />
          </div>
        </div>
        <label className="label">External reference</label>
        <input className="input" value={form.externalRef} onChange={upd('externalRef')} />
        {err && <div className="error">{err}</div>}
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn" disabled={loading}>{loading ? 'Saving…' : 'Create'}</button>
          <button type="button" className="btn secondary" onClick={() => nav(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
`;

FILES['frontend/src/pages/Properties/Detail.tsx'] = `import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

type Property = {
  id: string; address: string; city: string; property_type: string;
  area_sqm?: number; rooms?: number; floor?: number; year_built?: number;
  external_ref?: string;
};
type Valuation = { id: string; method: string; status: string; estimated_value?: number; currency?: string; created_at: string };
type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

export default function PropertyDetail() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();

  const property = useQuery({ queryKey: ['property', id], queryFn: () => api<Property>(\`/properties/\${id}\`) });
  const valuations = useQuery({
    queryKey: ['valuations', { propertyId: id }],
    queryFn: () => api<Page<Valuation>>(\`/valuations?propertyId=\${id}\`),
  });

  const createValuation = useMutation({
    mutationFn: () => api<Valuation>('/valuations', { method: 'POST', body: { propertyId: id, method: 'comparables' } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['valuations'] }),
  });
  const remove = useMutation({
    mutationFn: () => api(\`/properties/\${id}\`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['properties'] }); nav('/properties'); },
  });

  if (property.isLoading) return <p className="muted">Loading…</p>;
  if (property.error) return <p className="error">{(property.error as Error).message}</p>;
  const p = property.data!;
  return (
    <div>
      <div className="row" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{p.address}</h2>
        <span className="spacer" />
        <button className="btn danger" onClick={() => { if (confirm('Delete this property?')) remove.mutate(); }}>Delete</button>
      </div>
      <div className="card">
        <div><strong>City:</strong> {p.city}</div>
        <div><strong>Type:</strong> {p.property_type}</div>
        <div><strong>Area:</strong> {p.area_sqm ?? '—'} sqm</div>
        <div><strong>Rooms:</strong> {p.rooms ?? '—'}</div>
        <div><strong>Floor:</strong> {p.floor ?? '—'}</div>
        <div><strong>Year built:</strong> {p.year_built ?? '—'}</div>
        {p.external_ref && <div><strong>External ref:</strong> {p.external_ref}</div>}
      </div>
      <div className="card">
        <div className="row">
          <strong>Valuations</strong>
          <span className="spacer" />
          <button className="btn" disabled={createValuation.isPending} onClick={() => createValuation.mutate()}>
            {createValuation.isPending ? 'Running…' : 'Run valuation'}
          </button>
        </div>
        {valuations.data && (
          <table style={{ marginTop: 12 }}>
            <thead><tr><th>Date</th><th>Method</th><th>Status</th><th>Value</th><th></th></tr></thead>
            <tbody>
              {valuations.data.items.map((v) => (
                <tr key={v.id}>
                  <td>{new Date(v.created_at).toLocaleString()}</td>
                  <td>{v.method}</td>
                  <td><span className={\`badge \${v.status}\`}>{v.status}</span></td>
                  <td>{v.estimated_value ? \`\${v.estimated_value} \${v.currency || ''}\` : '—'}</td>
                  <td><Link to={\`/valuations/\${v.id}\`}>Open →</Link></td>
                </tr>
              ))}
              {valuations.data.items.length === 0 && (
                <tr><td colSpan={5} className="muted">No valuations yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
`;

FILES['frontend/src/pages/Valuations/List.tsx'] = `import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

type Valuation = { id: string; method: string; status: string; estimated_value?: number; currency?: string; created_at: string };
type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

export default function ValuationsList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['valuations'], queryFn: () => api<Page<Valuation>>('/valuations?pageSize=50'),
  });
  return (
    <div>
      <h2>Valuations</h2>
      <div className="card">
        {isLoading && <p className="muted">Loading…</p>}
        {error && <p className="error">{(error as Error).message}</p>}
        {data && (
          <table>
            <thead><tr><th>Date</th><th>Method</th><th>Status</th><th>Estimated</th><th></th></tr></thead>
            <tbody>
              {data.items.map((v) => (
                <tr key={v.id}>
                  <td>{new Date(v.created_at).toLocaleString()}</td>
                  <td>{v.method}</td>
                  <td><span className={\`badge \${v.status}\`}>{v.status}</span></td>
                  <td>{v.estimated_value ? \`\${v.estimated_value} \${v.currency || ''}\` : '—'}</td>
                  <td><Link to={\`/valuations/\${v.id}\`}>Open →</Link></td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr><td colSpan={5} className="muted">No valuations yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
`;

FILES['frontend/src/pages/Valuations/Detail.tsx'] = `import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../lib/api';

type Valuation = {
  id: string; method: string; status: string; property_id: string;
  estimated_value?: number; currency?: string; confidence?: number;
  result?: Record<string, unknown>; error?: string; created_at: string;
};

export default function ValuationDetail() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [reportTitle, setReportTitle] = useState('Appraisal Report');
  const [format, setFormat] = useState<'json' | 'markdown' | 'pdf'>('markdown');

  const v = useQuery({ queryKey: ['valuation', id], queryFn: () => api<Valuation>(\`/valuations/\${id}\`) });
  const createReport = useMutation({
    mutationFn: () => api<{ id: string }>('/reports', {
      method: 'POST', body: { valuationId: id, title: reportTitle, format },
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });

  if (v.isLoading) return <p className="muted">Loading…</p>;
  if (v.error) return <p className="error">{(v.error as Error).message}</p>;
  const data = v.data!;
  return (
    <div>
      <h2>Valuation</h2>
      <div className="card">
        <div><strong>Property:</strong> <Link to={\`/properties/\${data.property_id}\`}>{data.property_id}</Link></div>
        <div><strong>Method:</strong> {data.method}</div>
        <div><strong>Status:</strong> <span className={\`badge \${data.status}\`}>{data.status}</span></div>
        <div><strong>Estimated value:</strong> {data.estimated_value ? \`\${data.estimated_value} \${data.currency}\` : '—'}</div>
        <div><strong>Confidence:</strong> {data.confidence ?? '—'}</div>
        {data.error && <div className="error">{data.error}</div>}
      </div>
      {data.result && (
        <div className="card">
          <strong>Result breakdown</strong>
          <pre style={{ overflow: 'auto', background: 'var(--surface-2)', padding: 12, borderRadius: 6 }}>
{JSON.stringify(data.result, null, 2)}
          </pre>
        </div>
      )}
      {data.status === 'completed' && (
        <div className="card">
          <strong>Generate report</strong>
          <label className="label">Title</label>
          <input className="input" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} />
          <label className="label">Format</label>
          <select className="select" value={format} onChange={(e) => setFormat(e.target.value as any)}>
            <option value="json">JSON</option>
            <option value="markdown">Markdown</option>
            <option value="pdf">PDF (recorded)</option>
          </select>
          <button className="btn" style={{ marginTop: 12 }} disabled={createReport.isPending}
                  onClick={() => createReport.mutate()}>
            {createReport.isPending ? 'Creating…' : 'Create report'}
          </button>
          {createReport.isSuccess && (
            <p className="success" style={{ marginTop: 8 }}>
              Report created: <Link to="/reports">View reports →</Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
`;

FILES['frontend/src/pages/Reports/List.tsx'] = `import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

type Report = { id: string; title: string; format: string; valuation_id: string; created_at: string };
type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

export default function ReportsList() {
  const { data, isLoading } = useQuery({
    queryKey: ['reports'], queryFn: () => api<Page<Report>>('/reports?pageSize=50'),
  });
  return (
    <div>
      <h2>Reports</h2>
      <div className="card">
        {isLoading && <p className="muted">Loading…</p>}
        {data && (
          <table>
            <thead><tr><th>Title</th><th>Format</th><th>Valuation</th><th>Created</th></tr></thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td>{r.format}</td>
                  <td><Link to={\`/valuations/\${r.valuation_id}\`}>{r.valuation_id.slice(0, 8)}…</Link></td>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr><td colSpan={4} className="muted">No reports yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
`;

FILES['frontend/src/pages/Settings/Members.tsx'] = `import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/authStore';
import RoleGuard from '../../components/auth/RoleGuard';

type User = { id: string; email: string; full_name: string; role: string; status: string; last_login_at?: string };
type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

export default function Members() {
  const me = useAuth((s) => s.user);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: () => api<Page<User>>('/users?pageSize=100') });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api(\`/users/\${id}/role\`, { method: 'PATCH', body: { role } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(\`/users/\${id}\`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <div>
      <h2>Members</h2>
      <div className="card">
        {isLoading && <p className="muted">Loading…</p>}
        {data && (
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id}>
                  <td>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td>
                    <RoleGuard allow={['owner', 'admin']} fallback={<span className="badge">{u.role}</span>}>
                      <select className="select" style={{ width: 'auto' }}
                              defaultValue={u.role}
                              disabled={u.id === me?.id}
                              onChange={(e) => changeRole.mutate({ id: u.id, role: e.target.value })}>
                        <option value="owner">owner</option>
                        <option value="admin">admin</option>
                        <option value="member">member</option>
                        <option value="viewer">viewer</option>
                      </select>
                    </RoleGuard>
                  </td>
                  <td><span className="badge">{u.status}</span></td>
                  <td>
                    <RoleGuard allow={['owner', 'admin']}>
                      <button className="btn danger" disabled={u.id === me?.id}
                              onClick={() => { if (confirm(\`Remove \${u.email}?\`)) remove.mutate(u.id); }}>
                        Remove
                      </button>
                    </RoleGuard>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
`;

FILES['frontend/src/pages/Settings/Tenant.tsx'] = `import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import RoleGuard from '../../components/auth/RoleGuard';

type Tenant = { id: string; name: string; slug: string; status: string; created_at: string };

export default function TenantSettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['tenant'], queryFn: () => api<Tenant>('/tenants/me') });
  const [name, setName] = useState('');
  useEffect(() => { if (data?.name) setName(data.name); }, [data?.name]);
  const updateName = useMutation({
    mutationFn: () => api<Tenant>('/tenants/me', { method: 'PATCH', body: { name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant'] }),
  });
  return (
    <div>
      <h2>Tenant settings</h2>
      <div className="card" style={{ maxWidth: 540 }}>
        {isLoading && <p className="muted">Loading…</p>}
        {data && (
          <>
            <label className="label">Slug</label>
            <input className="input" value={data.slug} disabled />
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            <RoleGuard allow={['owner']} fallback={<p className="muted" style={{ marginTop: 12 }}>Only owners can change tenant settings.</p>}>
              <button className="btn" style={{ marginTop: 12 }}
                      disabled={updateName.isPending || name === data.name}
                      onClick={() => updateName.mutate()}>
                {updateName.isPending ? 'Saving…' : 'Save'}
              </button>
            </RoleGuard>
          </>
        )}
      </div>
    </div>
  );
}
`;

FILES['frontend/src/App.tsx'] = `import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/authStore';
import RequireAuth from './components/auth/RequireAuth';
import AppShell from './components/layout/AppShell';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PropertiesList from './pages/Properties/List';
import NewProperty from './pages/Properties/New';
import PropertyDetail from './pages/Properties/Detail';
import ValuationsList from './pages/Valuations/List';
import ValuationDetail from './pages/Valuations/Detail';
import ReportsList from './pages/Reports/List';
import Members from './pages/Settings/Members';
import TenantSettings from './pages/Settings/Tenant';

export default function App() {
  const hydrate = useAuth((s) => s.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="properties" element={<PropertiesList />} />
        <Route path="properties/new" element={<NewProperty />} />
        <Route path="properties/:id" element={<PropertyDetail />} />
        <Route path="valuations" element={<ValuationsList />} />
        <Route path="valuations/:id" element={<ValuationDetail />} />
        <Route path="reports" element={<ReportsList />} />
        <Route path="settings/members" element={<Members />} />
        <Route path="settings/tenant" element={<TenantSettings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
`;

FILES['frontend/README.md'] = `# PropIntel Frontend (MVP)

React 18 + Vite + TypeScript SPA for the PropIntel SaaS backend.

## Stack
- React 18 + React Router 6
- TanStack Query (server state) + Zustand (auth/session)
- Plain CSS (easy to swap for any design system)

## Quick start
\`\`\`bash
cd frontend
cp .env.example .env
npm install
npm run dev      # http://localhost:5173
\`\`\`
The backend must be running at \`VITE_API_URL\` (default http://localhost:3000/api/v1).

## Pages
- \`/login\`, \`/register\`
- \`/\` Dashboard
- \`/properties\` list / \`/properties/new\` / \`/properties/:id\`
- \`/valuations\` list / \`/valuations/:id\` (generate report here)
- \`/reports\` list
- \`/settings/members\` (owner/admin can change roles + remove)
- \`/settings/tenant\` (owner can rename)

## Auth flow
- Login/Register store \`accessToken\` + \`refreshToken\` in \`localStorage\`.
- \`lib/api.ts\` retries once on 401 by calling \`/auth/refresh\` (single in-flight refresh).
- On refresh failure the session is cleared and the user is bounced to \`/login\`.
`;

// ----- write all -----
let written = 0;
for (const [rel, contents] of Object.entries(FILES)) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents);
  console.log('✓ ' + rel);
  written++;
}
console.log(`\nWrote ${written} files into ${path.join(root, 'frontend')}`);
console.log('Next:\n  cd frontend\n  cp .env.example .env\n  npm install\n  npm run dev');
