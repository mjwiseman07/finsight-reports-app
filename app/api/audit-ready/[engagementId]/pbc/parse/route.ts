import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { parsePbcUpload } from '@/lib/audit-ready/pbc-parser';
import {
  isEngagementAccessDenial,
  recheckEngagementAccess,
  requireEngagementAccess,
} from '@/lib/audit-ready/require-engagement-access';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> },
) {
  try {
    const { engagementId } = await params;

    const access = await requireEngagementAccess({
      engagementId,
      capability: 'write',
    });
    if (isEngagementAccessDenial(access)) return access;

    const body = await req.json().catch(() => ({}));
    const uploadId = body.upload_id as string | undefined;
    if (!uploadId) {
      return NextResponse.json({ error: 'upload_id_required' }, { status: 400 });
    }

    // TOCTOU: recheck before service-role upload load.
    const beforeLoad = await recheckEngagementAccess({
      engagementId,
      userId: access.userId,
      capability: 'write',
    });
    if (isEngagementAccessDenial(beforeLoad)) return beforeLoad;

    const service = createServiceClient();
    const { data: upload, error: upErr } = await service
      .from('audit_ready_pbc_uploads')
      .select('id, engagement_id, status, storage_path, content_type')
      .eq('id', uploadId)
      .eq('engagement_id', engagementId)
      .maybeSingle();

    // Same generic denial for missing upload, wrong engagement, or cross-tenant id.
    if (upErr || !upload || upload.engagement_id !== engagementId) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (upload.status === 'parsed') {
      return NextResponse.json(
        {
          upload: {
            id: upload.id,
            engagement_id: upload.engagement_id,
            status: upload.status,
          },
          already_parsed: true,
        },
        { status: 200 },
      );
    }
    if (upload.status === 'parsing') {
      return NextResponse.json(
        {
          upload: {
            id: upload.id,
            engagement_id: upload.engagement_id,
            status: upload.status,
          },
          already_in_progress: true,
        },
        { status: 202 },
      );
    }

    // TOCTOU: recheck again immediately before privileged parse / Bedrock spend.
    const beforeParse = await recheckEngagementAccess({
      engagementId,
      userId: access.userId,
      capability: 'write',
    });
    if (isEngagementAccessDenial(beforeParse)) return beforeParse;

    try {
      const result = await parsePbcUpload({
        engagementId,
        uploadId: upload.id,
        calledByUserId: access.userId,
        storagePath: upload.storage_path,
        contentType: upload.content_type,
      });
      return NextResponse.json({ ok: true, ...result }, { status: 200 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.startsWith('engagement_cap_exceeded') ? 402 : 500;
      return NextResponse.json(
        { error: status === 402 ? 'engagement_cap_exceeded' : 'parse_failed' },
        { status },
      );
    }
  } catch (err) {
    console.error('pbc/parse route uncaught', err);
    return NextResponse.json({ error: 'route_uncaught' }, { status: 500 });
  }
}
