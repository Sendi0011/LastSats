import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

// Best-effort in-memory rate limit. Serverless instances are ephemeral, so this
// is a first line of defence rather than a hard guarantee.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { email, company, source } = (body ?? {}) as {
    email?: unknown;
    company?: unknown;
    source?: unknown;
  };

  // Honeypot: real users never fill the hidden "company" field.
  if (typeof company === 'string' && company.trim() !== '') {
    return NextResponse.json({ ok: true });
  }

  if (typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  const normalized = email.trim().toLowerCase();
  if (normalized.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(normalized)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again in a minute.' },
      { status: 429 },
    );
  }

  if (!isSupabaseConfigured()) {
    console.error('waitlist: Supabase env vars are missing');
    return NextResponse.json(
      { error: 'The waitlist is not available right now.' },
      { status: 503 },
    );
  }

  const { error } = await getSupabaseAdmin().from('waitlist').insert({
    email: normalized,
    source: typeof source === 'string' ? source.slice(0, 40) : 'landing',
  });

  // 23505 = unique_violation → already subscribed. Treat as success.
  if (error && error.code !== '23505') {
    console.error('waitlist: insert failed', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
