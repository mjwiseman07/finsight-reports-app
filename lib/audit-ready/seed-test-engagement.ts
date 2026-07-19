/**
 * Test-engagement seed helper for Audit Ready smoke runs.
 * Idempotent: dedupes on (demo_company_id, engagement_name).
 * Only ever writes to companies with is_demo=true.
 *
 * Schema note: audit_ready_engagements CHECK constraints require
 * audit_ready_tier IN ('small','standard','complex','multi_entity') and
 * billing_mode IN ('monthly','per_engagement'). Paste's audit_ready_solo/trial
 * map to the smallest SKU + monthly billing (company.billing_status stays trial).
 */
import { supabaseAdmin } from '@/lib/supabase';

export const TEST_ENGAGEMENT_SEED_NAME = 'Week 3 Smoke — PBC Ingest Fixture';
export const TEST_ENGAGEMENT_TIER = 'small';
export const TEST_ENGAGEMENT_BILLING_MODE = 'monthly';

export type SeedTestEngagementInput = {
  demoCompanyId: string;
  actorUserId: string;
  actorEmail: string;
};

export type SeededEngagement = {
  id: string;
  company_id: string;
  audit_ready_tier: string;
  status: string;
  engagement_name: string;
  created: boolean;
};

export async function seedTestEngagement(
  input: SeedTestEngagementInput,
): Promise<SeededEngagement> {
  if (!supabaseAdmin) {
    throw new Error('supabaseAdmin not configured');
  }

  // 1) Verify company exists and is_demo=true (defense in depth; caller also checks)
  const { data: company, error: companyErr } = await supabaseAdmin
    .from('companies')
    .select('id, name, is_demo')
    .eq('id', input.demoCompanyId)
    .single();

  if (companyErr || !company) {
    throw new Error(`Company ${input.demoCompanyId} not found`);
  }
  if (!company.is_demo) {
    throw new Error(`Company ${input.demoCompanyId} is not a demo company; seed refused`);
  }

  // 2) Idempotent lookup — same (company_id, engagement_name) => return existing
  const { data: existing, error: existingErr } = await supabaseAdmin
    .from('audit_ready_engagements')
    .select('id, company_id, audit_ready_tier, status, engagement_name')
    .eq('company_id', input.demoCompanyId)
    .eq('engagement_name', TEST_ENGAGEMENT_SEED_NAME)
    .maybeSingle();

  if (existingErr) throw existingErr;
  if (existing) {
    return { ...existing, created: false };
  }

  // 3) Ensure caller has company_users row with an eligible write role
  const eligibleRoles = ['company_admin', 'owner_executive', 'controller'];
  const { data: membership, error: membershipErr } = await supabaseAdmin
    .from('company_users')
    .select('id, role, status')
    .eq('company_id', input.demoCompanyId)
    .eq('user_id', input.actorUserId)
    .maybeSingle();

  if (membershipErr) throw membershipErr;

  if (!membership) {
    const { error: insertMembershipErr } = await supabaseAdmin
      .from('company_users')
      .insert({
        company_id: input.demoCompanyId,
        user_id: input.actorUserId,
        role: 'company_admin',
        status: 'active',
      });
    if (insertMembershipErr) throw insertMembershipErr;
  } else if (
    membership.status !== 'active' ||
    !eligibleRoles.includes(membership.role)
  ) {
    const { error: updateMembershipErr } = await supabaseAdmin
      .from('company_users')
      .update({ role: 'company_admin', status: 'active' })
      .eq('id', membership.id);
    if (updateMembershipErr) throw updateMembershipErr;
  }

  // 4) Insert engagement
  const today = new Date();
  const auditPeriodStart = new Date(today.getFullYear() - 1, 0, 1)
    .toISOString()
    .slice(0, 10); // Jan 1 of last year
  const auditPeriodEnd = new Date(today.getFullYear() - 1, 11, 31)
    .toISOString()
    .slice(0, 10); // Dec 31 of last year

  const { data: engagement, error: insertErr } = await supabaseAdmin
    .from('audit_ready_engagements')
    .insert({
      company_id: input.demoCompanyId,
      firm_id: null,
      firm_client_id: null,
      audit_ready_tier: TEST_ENGAGEMENT_TIER,
      billing_mode: TEST_ENGAGEMENT_BILLING_MODE,
      status: 'open',
      entity_count: 1,
      engagement_name: TEST_ENGAGEMENT_SEED_NAME,
      auditor_firm_name: 'Smoke Test Auditors LLP',
      audit_period_start: auditPeriodStart,
      audit_period_end: auditPeriodEnd,
    })
    .select('id, company_id, audit_ready_tier, status, engagement_name')
    .single();

  if (insertErr) throw insertErr;
  if (!engagement) throw new Error('Engagement insert returned no row');

  return { ...engagement, created: true };
}

export async function ensureDemoCompany(
  actorUserId: string,
): Promise<{ id: string; name: string; created: boolean }> {
  if (!supabaseAdmin) throw new Error('supabaseAdmin not configured');

  const DEMO_COMPANY_NAME = 'Advisacor Smoke Test Company';

  const { data: existing, error: existingErr } = await supabaseAdmin
    .from('companies')
    .select('id, name, is_demo')
    .eq('name', DEMO_COMPANY_NAME)
    .eq('is_demo', true)
    .maybeSingle();

  if (existingErr) throw existingErr;
  if (existing) {
    return { id: existing.id, name: existing.name, created: false };
  }

  const { data: created, error: createErr } = await supabaseAdmin
    .from('companies')
    .insert({
      name: DEMO_COMPANY_NAME,
      industry_type: 'Professional Services',
      primary_persona: 'business-owner',
      package_level: 'essential',
      billing_status: 'trial',
      onboarding_status: 'complete',
      account_type: 'my-own-company',
      is_demo: true,
    })
    .select('id, name')
    .single();

  if (createErr) throw createErr;
  if (!created) throw new Error('Demo company insert returned no row');

  return { id: created.id, name: created.name, created: true };
}
