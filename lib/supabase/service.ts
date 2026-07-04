/**
 * Service-role Supabase client accessor.
 *
 * Thin adapter over the established `getSupabaseAdmin()` factory in
 * `@/lib/supabase-admin.js`. Provides the `createServiceClient()` API surface
 * that the D-Platform event modules (and downstream phases) import. Keeping a
 * single sanctioned accessor means the service-role wiring lives in one place.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

export function createServiceClient(): SupabaseClient {
  return getSupabaseAdmin() as unknown as SupabaseClient;
}
