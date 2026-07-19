import { NextRequest, NextResponse } from 'next/server';
import { resolveSuperAdminAccess, auditSuperAdminEvent } from '@/lib/super-admin-security';
import {
  seedTestEngagement,
  ensureDemoCompany,
  TEST_ENGAGEMENT_SEED_NAME,
} from '@/lib/audit-ready/seed-test-engagement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/audit-ready/seed-test-engagement
 *
 * Super-admin-only. Idempotently creates:
 *   - A demo company (is_demo=true) named "Advisacor Smoke Test Company"
 *   - A company_users row for the caller with role=company_admin
 *   - An audit_ready_engagements row named "Week 3 Smoke — PBC Ingest Fixture"
 *
 * Body: none.
 * Returns: { engagement_id, company_id, created: { company: bool, engagement: bool } }
 */
export async function POST(request: NextRequest) {
  const auth = await resolveSuperAdminAccess(request);
  if ('response' in auth && auth.response) return auth.response;

  try {
    const demo = await ensureDemoCompany(auth.userId);
    const engagement = await seedTestEngagement({
      demoCompanyId: demo.id,
      actorUserId: auth.userId,
      actorEmail: auth.email,
    });

    await auditSuperAdminEvent({
      eventType: 'seed_test_engagement',
      actorUserId: auth.userId,
      actorEmail: auth.email,
      targetUserId: null,
      companyId: demo.id,
      metadata: {
        engagement_id: engagement.id,
        engagement_name: TEST_ENGAGEMENT_SEED_NAME,
        company_created: demo.created,
        engagement_created: engagement.created,
      },
    });

    return NextResponse.json({
      ok: true,
      engagement_id: engagement.id,
      company_id: demo.id,
      created: {
        company: demo.created,
        engagement: engagement.created,
      },
      engagement_name: TEST_ENGAGEMENT_SEED_NAME,
      note: engagement.created
        ? 'Test engagement seeded.'
        : 'Test engagement already existed — returning existing id.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
