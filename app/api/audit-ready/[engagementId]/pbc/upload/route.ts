import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/service';
import {
  createAuditReadyServerClient,
  requireAuditReadyUser,
} from '@/lib/audit-ready/server-auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ALLOWED = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'message/rfc822',
  'text/plain',
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> },
) {
  try {
    const { engagementId } = await params;
    const auth = await requireAuditReadyUser();
    if ('error' in auth) return auth.error;

    const supabase = await createAuditReadyServerClient();
    const { data: eng, error: engErr } = await supabase
      .from('audit_ready_engagements')
      .select('id, status')
      .eq('id', engagementId)
      .single();

    if (engErr || !eng) {
      return NextResponse.json({ error: 'engagement_not_found' }, { status: 404 });
    }
    if (
      eng.status === 'closed' ||
      eng.status === 'cancelled' ||
      eng.status === 'timeout_expired'
    ) {
      return NextResponse.json({ error: 'engagement_not_writable' }, { status: 409 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'no_file' }, { status: 400 });
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: 'unsupported_content_type', received: file.type },
        { status: 415 },
      );
    }
    if (file.size > 52_428_800) {
      return NextResponse.json({ error: 'file_too_large' }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const service = createServiceClient();

    const { data: existing } = await service
      .from('audit_ready_pbc_uploads')
      .select('*')
      .eq('engagement_id', engagementId)
      .eq('file_sha256', sha256)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ upload: existing, deduped: true }, { status: 200 });
    }

    const storagePath = `${engagementId}/${sha256}-${file.name.replace(/[^\w.\-]/g, '_')}`;
    const { error: upErr } = await service.storage
      .from('audit-ready-pbc')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });
    if (upErr) {
      return NextResponse.json(
        { error: 'storage_upload_failed', detail: upErr.message },
        { status: 500 },
      );
    }

    const { data: row, error: insErr } = await service
      .from('audit_ready_pbc_uploads')
      .insert({
        engagement_id: engagementId,
        uploaded_by_user_id: auth.user.id,
        storage_path: storagePath,
        original_filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
        file_sha256: sha256,
        status: 'uploaded',
      })
      .select()
      .single();

    if (insErr) {
      return NextResponse.json(
        { error: 'db_insert_failed', detail: insErr.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ upload: row, deduped: false }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('pbc/upload route uncaught', err);
    return NextResponse.json(
      { error: 'route_uncaught', detail: message },
      { status: 500 },
    );
  }
}
