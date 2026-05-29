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
    async signInWithPassword() {
      return { data: null, error: createMissingSupabaseError() };
    },
    async signUp() {
      return { data: null, error: createMissingSupabaseError() };
    },
    async signOut() {
      return { error: null };
    },
  },
};

export const supabase = isSupabaseConfigured
  ? createClient(
      supabaseUrl,
      supabaseAnonKey,
    )
  : disabledSupabaseClient;

// Server-side only: never import supabaseAdmin in frontend or client-rendered code.
export const supabaseAdmin = isSupabaseAdminConfigured
  ? createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
    )
  : null;
