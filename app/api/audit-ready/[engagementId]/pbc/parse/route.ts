import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { parsePbcUpload } from '@/lib/audit-ready/pbc-parser';
import { requireAuditReadyUser } from '@/lib/audit-ready/server-auth';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> },
) {
  try {
    const { engagementId } = await params;
    const auth = await requireAuditReadyUser();
    if ('error' in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const uploadId = body.upload_id as string | undefined;
    if (!uploadId) {
      return NextResponse.json({ error: 'upload_id_required' }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: upload, error: upErr } = await service
      .from('audit_ready_pbc_uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('engagement_id', engagementId)
      .single();

    if (upErr || !upload) {
      return NextResponse.json({ error: 'upload_not_found' }, { status: 404 });
    }
    if (upload.status === 'parsed') {
      return NextResponse.json({ upload, already_parsed: true }, { status: 200 });
    }
    if (upload.status === 'parsing') {
      return NextResponse.json(
        { upload, already_in_progress: true },
        { status: 202 },
      );
    }

    try {
      const result = await parsePbcUpload({
        engagementId,
        uploadId: upload.id,
        calledByUserId: auth.user.id,
        storagePath: upload.storage_path,
        contentType: upload.content_type,
      });
      return NextResponse.json({ ok: true, ...result }, { status: 200 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.startsWith('engagement_cap_exceeded') ? 402 : 500;
      return NextResponse.json({ error: message }, { status });
    }
  } catch (err) {
    // Last-resort envelope: catch anything (module-load pathologies, formData
    // parse crashes, cookie handler throws) so the client always sees JSON,
    // never Vercel's HTML 500 page.
    const message = err instanceof Error ? err.message : String(err);
    console.error('pbc/parse route uncaught', err);
    return NextResponse.json(
      { error: 'route_uncaught', detail: message },
      { status: 500 },
    );
  }
}
