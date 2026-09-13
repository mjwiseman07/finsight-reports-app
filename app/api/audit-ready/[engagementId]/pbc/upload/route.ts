import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/service';
import {
  engagementNotWritable,
  isEngagementAccessDenial,
  recheckEngagementAccess,
  requireEngagementAccess,
} from '@/lib/audit-ready/require-engagement-access';
import { getSupabaseAdmin } from '@/lib/supabase-admin.js';

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

function publicUploadView(row: Record<string, unknown>) {
  return {
    id: row.id,
    engagement_id: row.engagement_id,
    status: row.status,
    original_filename: row.original_filename,
    content_type: row.content_type,
    size_bytes: row.size_bytes,
    file_sha256: row.file_sha256,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

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

    const admin = getSupabaseAdmin();
    const { data: eng, error: engErr } = await admin
      .from('audit_ready_engagements')
      .select('id, status')
      .eq('id', engagementId)
      .maybeSingle();

    // Membership already proven; still fail closed if row vanished / closed.
    if (engErr || !eng) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (
      eng.status === 'closed' ||
      eng.status === 'cancelled' ||
      eng.status === 'timeout_expired'
    ) {
      return engagementNotWritable();
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'no_file' }, { status: 400 });
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: 'unsupported_content_type' }, { status: 415 });
    }
    if (file.size > 52_428_800) {
      return NextResponse.json({ error: 'file_too_large' }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    // TOCTOU: recheck write membership before any service-role storage/DB work.
    const rechecked = await recheckEngagementAccess({
      engagementId,
      userId: access.userId,
      capability: 'write',
    });
    if (isEngagementAccessDenial(rechecked)) return rechecked;

    const service = createServiceClient();

    const { data: existing } = await service
      .from('audit_ready_pbc_uploads')
      .select(
        'id, engagement_id, status, original_filename, content_type, size_bytes, file_sha256, created_at, updated_at',
      )
      .eq('engagement_id', engagementId)
      .eq('file_sha256', sha256)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { upload: publicUploadView(existing as Record<string, unknown>), deduped: true },
        { status: 200 },
      );
    }

    const safeName = file.name.replace(/[^\w.\-]/g, '_');
    const storagePath = `${engagementId}/${sha256}-${safeName}`;
    const { error: upErr } = await service.storage
      .from('audit-ready-pbc')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });
    if (upErr) {
      return NextResponse.json({ error: 'storage_upload_failed' }, { status: 500 });
    }

    const { data: row, error: insErr } = await service
      .from('audit_ready_pbc_uploads')
      .insert({
        engagement_id: engagementId,
        uploaded_by_user_id: access.userId,
        storage_path: storagePath,
        original_filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
        file_sha256: sha256,
        status: 'uploaded',
      })
      .select(
        'id, engagement_id, status, original_filename, content_type, size_bytes, file_sha256, created_at, updated_at',
      )
      .single();

    if (insErr || !row) {
      return NextResponse.json({ error: 'db_insert_failed' }, { status: 500 });
    }

    return NextResponse.json(
      { upload: publicUploadView(row as Record<string, unknown>), deduped: false },
      { status: 201 },
    );
  } catch (err) {
    console.error('pbc/upload route uncaught', err);
    return NextResponse.json({ error: 'route_uncaught' }, { status: 500 });
  }
}
