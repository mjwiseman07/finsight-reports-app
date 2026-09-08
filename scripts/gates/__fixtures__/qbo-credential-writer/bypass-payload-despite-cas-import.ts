/**
 * Negative fixture: imports CAS but still issues its own credential update(payload).
 * Must be rejected — importing CAS is not sufficient.
 */
import { persistRefreshedQboCredentialsConditional } from "@/lib/integrations/accounting/canonical-qbo-credential-cas";

type FixtureAdmin = {
  from: (table: string) => {
    update: (payload: Record<string, string>) => {
      eq: (column: string, value: string) => Promise<void>;
    };
  };
};

type FixtureSnapshot = { id: string };
type FixtureTokens = { access: string; refresh: string; expires: string };

export async function looksLikeCasCaller(
  admin: FixtureAdmin,
  snapshot: FixtureSnapshot,
  tokens: FixtureTokens,
) {
  void persistRefreshedQboCredentialsConditional;
  const payload = {
    access_token: tokens.access,
    refresh_token: tokens.refresh,
    token_expires_at: tokens.expires,
    updated_at: new Date().toISOString(),
  };
  await admin.from("accounting_connections").update(payload).eq("id", snapshot.id);
}
