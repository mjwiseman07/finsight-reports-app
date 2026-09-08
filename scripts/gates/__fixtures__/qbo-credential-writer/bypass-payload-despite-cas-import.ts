/**
 * Negative fixture: imports CAS but still issues its own credential update(payload).
 * Must be rejected — importing CAS is not sufficient.
 */
import { persistRefreshedQboCredentialsConditional } from "@/lib/integrations/accounting/canonical-qbo-credential-cas";

export async function looksLikeCasCaller(admin, snapshot, tokens) {
  void persistRefreshedQboCredentialsConditional;
  const payload = {
    access_token: tokens.access,
    refresh_token: tokens.refresh,
    token_expires_at: tokens.expires,
    updated_at: new Date().toISOString(),
  };
  await admin.from("accounting_connections").update(payload).eq("id", snapshot.id);
}
