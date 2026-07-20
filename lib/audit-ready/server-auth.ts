import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase-admin.js';
import { isAllowedSuperAdminEmail } from '@/lib/super-admin';

/**
 * Cookie-backed Supabase SSR client for Audit Ready API routes.
 * Mirrors the pattern used by /api/entitlements.
 */
export async function createAuditReadyServerClient() {
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

export async function requireAuditReadyUser(): Promise<
  { user: User } | { error: Response }
> {
  const supabase = await createAuditReadyServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return {
      error: Response.json({ error: 'unauthenticated' }, { status: 401 }),
    };
  }
  return { user: data.user };
}

export type EngagementActor = {
  userId: string;
  canRead: boolean;
  canWrite: boolean;
  scope: 'company' | 'firm' | 'super_admin';
};

const COMPANY_WRITE_ROLES = new Set([
  'company_admin',
  'owner_executive',
  'controller',
]);
const FIRM_WRITE_ROLES = new Set([
  'firm_admin',
  'controller',
  'fractional_cfo',
]);

/**
 * Resolve whether the current cookie session may read/write an engagement.
 * Reuses requireAuditReadyUser (no getServerSessionUser in this repo).
 * Super-admin via isAllowedSuperAdminEmail — no super_admins table.
 */
export async function getEngagementActor(
  engagementId: string,
): Promise<EngagementActor | null> {
  const auth = await requireAuditReadyUser();
  if ('error' in auth) return null;
  const user = auth.user;

  const supabase = getSupabaseAdmin();
  const { data: eng } = await supabase
    .from('audit_ready_engagements')
    .select('id, company_id, firm_id, firm_client_id')
    .eq('id', engagementId)
    .maybeSingle();
  if (!eng) return null;

  if (isAllowedSuperAdminEmail(user.email ?? '')) {
    return {
      userId: user.id,
      canRead: true,
      canWrite: true,
      scope: 'super_admin',
    };
  }

  if (eng.company_id) {
    const { data: cu } = await supabase
      .from('company_users')
      .select('role, status')
      .eq('company_id', eng.company_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    if (cu) {
      return {
        userId: user.id,
        canRead: true,
        canWrite: COMPANY_WRITE_ROLES.has(String(cu.role)),
        scope: 'company',
      };
    }
  }

  if (eng.firm_id) {
    const { data: fm } = await supabase
      .from('firm_memberships')
      .select('role, status')
      .eq('firm_id', eng.firm_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    if (fm) {
      return {
        userId: user.id,
        canRead: true,
        canWrite: FIRM_WRITE_ROLES.has(String(fm.role)),
        scope: 'firm',
      };
    }
  }

  return null;
}
