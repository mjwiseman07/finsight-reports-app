import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';
import { handleRefundIntentRequest, buildGenericErrorResponse } from '@/lib/refunds/handler.js';

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: 'pulse-refund-intent', limit: 20, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin client is not configured' }, { status: 500 });
    }

    const authorization = request.headers.get('authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : '';
    if (!token) {
      return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const message = String(body.message || '').trim();
    if (!message || message.length > 1200) {
      return NextResponse.json({ error: 'Message is required and must be under 1,200 characters.' }, { status: 400 });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user?.id) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const userId = body.user_id || authData.user.id;
    const companyId = body.company_id || body.companyId || null;

    const result = await handleRefundIntentRequest({
      userId,
      userEmail: authData.user.email || '',
      companyId,
      message,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[pulse/refund-intent] failed', error);
    return NextResponse.json(
      {
        path: 'NONE',
        response: buildGenericErrorResponse(),
        refund_request_id: null,
        escalated: false,
        error: 'handler_failed',
      },
      { status: 500 },
    );
  }
}
