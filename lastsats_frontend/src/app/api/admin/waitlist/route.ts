import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-auth';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ROWS = 1000;

function csvCell(value: unknown): string {
  const str = value == null ? '' : String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export async function GET(req: NextRequest) {
  if (!(await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value))) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('waitlist')
    .select('email, source, created_at')
    .order('created_at', { ascending: false })
    .limit(MAX_ROWS);

  if (error) {
    console.error('admin/waitlist: query failed', error);
    return NextResponse.json({ error: 'Query failed.' }, { status: 500 });
  }

  const rows = data ?? [];

  if (new URL(req.url).searchParams.get('format') === 'csv') {
    const header = 'email,source,created_at';
    const body = rows
      .map((row) => [row.email, row.source, row.created_at].map(csvCell).join(','))
      .join('\n');
    const filename = `lastsats-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(`${header}\n${body}\n`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  return NextResponse.json({ count: rows.length, truncated: rows.length >= MAX_ROWS, rows });
}
