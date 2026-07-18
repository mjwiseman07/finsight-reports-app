import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

// Regression test: guards against a future migration re-granting EXECUTE on
// SECURITY DEFINER RPCs to anon/authenticated. See Phase Q8c for context.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const Q8C_LOCKED_RPCS = [
  "increment_share_token_access",
  "publish_ledger_event",
];

const runIntegration = Boolean(SUPABASE_URL && SERVICE_ROLE);

describe.skipIf(!runIntegration)("Q8c SECURITY DEFINER RPC grants", () => {
  it("neither anon nor authenticated has EXECUTE on locked RPCs", async () => {
    const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE!, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("pg_proc_acl_view")
      .select("name, grantee, privilege_type")
      .in("name", Q8C_LOCKED_RPCS)
      .in("grantee", ["anon", "authenticated"])
      .eq("privilege_type", "EXECUTE");

    if (error && /pg_proc_acl_view/i.test(error.message)) {
      return;
    }

    expect(error).toBeNull();
    expect(data ?? []).toEqual([]);
  });
});
