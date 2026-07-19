import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/service';
import {
  resolveEntitlementsForCompany,
  resolveEntitlementsForFirm,
  type ResolvedEntitlements,
} from '@/lib/entitlements';
import { withV15RaProFlags } from '@/lib/entitlements/tier-registry';
import { V1_5_FLAGS } from '@/lib/entitlements/v1_5-flags';
import type { AuditReadyEngagement } from '@/lib/entitlements/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getSupabaseSsr() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // read-only context
          }
        },
        remove: (name: string, options: CookieOptions) => {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // read-only context
          }
        },
      },
    },
  );
}

async function loadAuditReadyEngagementState(
  supabase: SupabaseClient,
  subjectId: string,
  subjectType: 'company' | 'firm',
): Promise<{
  audit_ready_engagements: AuditReadyEngagement[];
  audit_ready_active: boolean;
}> {
  const filterCol = subjectType === 'company' ? 'company_id' : 'firm_id';
  const { data, error } = await supabase
    .from('audit_ready_engagements')
    .select(
      'id, audit_ready_tier, billing_mode, status, entity_count, pbc_request_count, auditor_user_count, opened_at, prep_window_ends_at, hard_timeout_at',
    )
    .eq(filterCol, subjectId)
    .in('status', ['open', 'prep_window']);

  if (error) {
    return { audit_ready_engagements: [], audit_ready_active: false };
  }

  const rows = (data ?? []) as AuditReadyEngagement[];
  return {
    audit_ready_engagements: rows,
    audit_ready_active: rows.length > 0,
  };
}

function mergeV15Flags(ent: ResolvedEntitlements): ResolvedEntitlements {
  if (ent.tier_key !== 'review_assist_pro') {
    return {
      ...ent,
      entitlement_flags: {
        ...ent.entitlement_flags,
        audit_ready_enabled: false,
      },
    };
  }

  return {
    ...ent,
    entitlement_flags: withV15RaProFlags(
      ent.entitlement_flags as Record<string, unknown>,
    ) as ResolvedEntitlements['entitlement_flags'],
  };
}

export async function GET(req: NextRequest) {
  const supabaseSsr = await getSupabaseSsr();
  const {
    data: { user },
    error: authError,
  } = await supabaseSsr.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const companyIdParam = url.searchParams.get('company_id');
  const firmIdParam = url.searchParams.get('firm_id');

  const admin = createServiceClient();

  let subjectType: 'company' | 'firm' | null = null;
  let subjectId: string | null = null;

  if (firmIdParam) {
    const { data: membership } = await admin
      .from('firm_memberships')
      .select('firm_id')
      .eq('user_id', user.id)
      .eq('firm_id', firmIdParam)
      .eq('status', 'active')
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    subjectType = 'firm';
    subjectId = firmIdParam;
  } else if (companyIdParam) {
    const { data: membership } = await admin
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', companyIdParam)
      .eq('status', 'active')
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    subjectType = 'company';
    subjectId = companyIdParam;
  } else {
    const { data: firmMembership } = await admin
      .from('firm_memberships')
      .select('firm_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    if (firmMembership?.firm_id) {
      subjectType = 'firm';
      subjectId = firmMembership.firm_id;
    } else {
      const { data: companyMembership } = await admin
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (companyMembership?.company_id) {
        subjectType = 'company';
        subjectId = companyMembership.company_id;
      }
    }
  }

  if (!subjectType || !subjectId) {
    return NextResponse.json({
      subject_type: null,
      subject_id: null,
      entitlements: null,
      v1_5_flag_catalog: V1_5_FLAGS,
      audit_ready_engagements: [],
      audit_ready_active: false,
    });
  }

  const resolved =
    subjectType === 'firm'
      ? await resolveEntitlementsForFirm(subjectId)
      : await resolveEntitlementsForCompany(subjectId);

  const entitlements = resolved ? mergeV15Flags(resolved) : null;
  const auditReadyState = await loadAuditReadyEngagementState(
    admin,
    subjectId,
    subjectType,
  );

  return NextResponse.json({
    subject_type: subjectType,
    subject_id: subjectId,
    entitlements,
    v1_5_flag_catalog: V1_5_FLAGS,
    ...auditReadyState,
  });
}
