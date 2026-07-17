import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const isSupabaseAdminConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);

function createMissingSupabaseError() {
  return {
    message: "Supabase is not configured for this deployment.",
  };
}

const disabledSupabaseClient = {
  auth: {
    async getSession() {
      return { data: { session: null }, error: createMissingSupabaseError() };
    },
    async getUser() {
      return { data: { user: null }, error: createMissingSupabaseError() };
    },
    async signInWithPassword() {
      return { data: null, error: createMissingSupabaseError() };
    },
    async signUp() {
      return { data: null, error: createMissingSupabaseError() };
    },
    async resetPasswordForEmail() {
      return { data: null, error: createMissingSupabaseError() };
    },
    async exchangeCodeForSession() {
      return { data: { session: null }, error: createMissingSupabaseError() };
    },
    async updateUser() {
      return { data: { user: null }, error: createMissingSupabaseError() };
    },
    async signOut() {
      return { error: null };
    },
  },
};

// Phase TCP1 W2.5 Block 9a: switched from @supabase/supabase-js createClient
// (localStorage-only) to @supabase/ssr createBrowserClient so the browser
// writes session to cookies. This lets server routes using createServerClient
// (e.g. /api/checkout/create-session) read auth via cookies — previously
// server saw no session because localStorage never syncs to cookies.
export const supabase = isSupabaseConfigured
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : disabledSupabaseClient;

// Server-side only: never import supabaseAdmin in frontend or client-rendered code.
export const supabaseAdmin = isSupabaseAdminConfigured
  ? createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
    )
  : null;
