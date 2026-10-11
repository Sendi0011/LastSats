'use client';

import { useCallback, useEffect, useState } from 'react';

type WaitlistRow = {
  email: string;
  source: string | null;
  created_at: string;
};

type View = 'checking' | 'login' | 'ready';

const card: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 16,
};

export default function AdminPage() {
  const [view, setView] = useState<View>('checking');
  const [password, setPassword] = useState('');
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/waitlist', { cache: 'no-store' });
      if (res.status === 401) {
        setView('login');
        return;
      }
      if (!res.ok) {
        setError('Could not load the waitlist. Check the Supabase configuration.');
        setView('ready');
        return;
      }
      const data = (await res.json()) as { rows?: WaitlistRow[]; truncated?: boolean };
      setRows(data.rows ?? []);
      setTruncated(Boolean(data.truncated));
      setView('ready');
    } catch {
      setError('Network error while loading the waitlist.');
      setView('ready');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError('Incorrect password.');
        return;
      }
      setPassword('');
      await load();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' });
    setRows([]);
    setView('login');
  };

  const filtered = query
    ? rows.filter((row) => row.email.toLowerCase().includes(query.trim().toLowerCase()))
    : rows;

  if (view === 'checking') {
    return (
      <main style={{ padding: '80px var(--pad-x)', color: 'var(--text-muted)' }}>
        Loading…
      </main>
    );
  }

  if (view === 'login') {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px var(--pad-x)',
        }}
      >
        <form onSubmit={login} style={{ ...card, width: '100%', maxWidth: 380, padding: 32 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginBottom: 6,
            }}
          >
            Waitlist admin
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
            Enter the admin password to view signups.
          </p>
          <input
            type="password"
            className="input-field"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
            style={{ width: '100%', marginBottom: 12 }}
          />
          {error && (
            <p style={{ fontSize: 13, color: 'var(--accent-red)', marginBottom: 12 }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            className="btn-primary"
            disabled={busy}
            style={{ width: '100%', padding: '12px 20px', fontSize: 14 }}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main style={{ padding: '48px var(--pad-x)', maxWidth: 960, margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              fontWeight: 800,
              color: 'var(--text-primary)',
            }}
          >
            Waitlist
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {rows.length} signup{rows.length === 1 ? '' : 's'}
            {truncated ? ' (showing the most recent 1,000)' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => void load()}
            className="btn-secondary"
            disabled={busy}
            style={{ padding: '9px 16px', fontSize: 13 }}
          >
            Refresh
          </button>
          <a
            href="/api/admin/waitlist?format=csv"
            className="btn-secondary"
            style={{ padding: '9px 16px', fontSize: 13, textDecoration: 'none' }}
          >
            Export CSV
          </a>
          <button
            type="button"
            onClick={() => void logout()}
            className="btn-secondary"
            style={{ padding: '9px 16px', fontSize: 13 }}
          >
            Sign out
          </button>
        </div>
      </header>

      <input
        type="search"
        className="input-field"
        placeholder="Search by email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: '100%', maxWidth: 320, marginBottom: 16 }}
      />

      {error && (
        <p style={{ fontSize: 13, color: 'var(--accent-red)', marginBottom: 16 }}>
          {error}
        </p>
      )}

      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--surface-subtle, rgba(255,255,255,0.03))' }}>
                {['Email', 'Source', 'Joined'].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    style={{ padding: '28px 16px', color: 'var(--text-muted)', textAlign: 'center' }}
                  >
                    {rows.length === 0 ? 'No signups yet.' : 'No matches.'}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.email} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>
                      {row.email}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                      {row.source ?? '—'}
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
