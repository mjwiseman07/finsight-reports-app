import { NextResponse, type NextRequest } from 'next/server';
import { getEngagementUsageSummary } from '@/lib/audit-ready/llm-usage';
import {
  createAuditReadyServerClient,
  requireAuditReadyUser,
} from '@/lib/audit-ready/server-auth';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> },
) {
  const { engagementId } = await params;
  const auth = await requireAuditReadyUser();
  if ('error' in auth) return auth.error;

  const supabase = await createAuditReadyServerClient();
  const { data: eng, error: engErr } = await supabase
    .from('audit_ready_engagements')
    .select('id')
    .eq('id', engagementId)
    .single();

  if (engErr || !eng) {
    return NextResponse.json({ error: 'engagement_not_found' }, { status: 404 });
  }

  const summary = await getEngagementUsageSummary(engagementId);
  return NextResponse.json(summary, { status: 200 });
}
