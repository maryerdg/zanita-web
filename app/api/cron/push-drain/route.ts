import { NextRequest, NextResponse } from 'next/server';
import { processPendingNotificationOutbox } from '@/lib/push/sender';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  // In production / preview, if CRON_SECRET is not configured, fail safely
  if (!cronSecret) {
    console.error('[push-drain] CRON_SECRET is not configured in environment. Rejecting request for security.');
    return NextResponse.json(
      { error: 'Server configuration error: CRON_SECRET is not configured' },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processPendingNotificationOutbox({ limit: 25 });
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
