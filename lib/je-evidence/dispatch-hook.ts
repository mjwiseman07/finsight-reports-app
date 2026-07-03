// D6.4a: Fire-and-forget hook to trigger backup packet generation after a JE
// successfully posts. Called from D2's post-success path. Never throws.
// Same pattern as D6.3 rule-runner trigger.
// Wiring deferred to D6.4b (lib/erp/** frozen in D6.4a).

import type { SupabaseClient } from "@supabase/supabase-js";
import { generateBackupPacket } from "./packet-generator";

export function dispatchBackupPacket(
  db: SupabaseClient,
  attemptId: string,
  firmClientId: string,
): void {
  void generateBackupPacket({ db, attemptId, firmClientId }).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn("[d6.4a] backup packet dispatch failed", {
      attemptId,
      firmClientId,
      err: err instanceof Error ? err.message : String(err),
    });
  });
}
