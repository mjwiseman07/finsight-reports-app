import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';

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
