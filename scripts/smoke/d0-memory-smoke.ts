/**
 * D0 smoke test — memory service + rule execution end-to-end.
 *
 * Requires the D0 migration applied and env:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Run:  npx tsx scripts/smoke/d0-memory-smoke.ts
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Minimal .env loader (no dotenv dependency). Existing process.env wins.
function loadEnv(path: string) {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv(".env.local");
loadEnv(".env");

import {
  recordMemory,
  queryMemory,
  reinforceMemory,
  recordOverride,
} from "../../lib/memory/client-memory-service";
import { executeRulesForClient } from "../../lib/rules/rule-execution-service";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let passCount = 0;
let failCount = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    passCount++;
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failCount++;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function getOrCreateTestFirmClient(): Promise<string> {
  // Reuse an existing firm_client with a company_id if present.
  const { data: existing } = await supabase
    .from("firm_clients")
    .select("id, company_id, industry_vertical, accounting_method")
    .not("company_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (existing?.id) {
    console.log(`Using existing firm_client ${existing.id} (company_id ${existing.company_id})`);
    return existing.id as string;
  }

  // Otherwise create one. Requires a firm to attach to.
  const { data: firm } = await supabase.from("firms").select("id").limit(1).maybeSingle();
  const insertRow: Record<string, unknown> = {
    name: "D0 Smoke Test Client",
    company_id: crypto.randomUUID(),
    industry_vertical: "general",
    accounting_method: "accrual",
  };
  if (firm?.id) insertRow.firm_id = firm.id;
  const { data: created, error } = await supabase
    .from("firm_clients")
    .insert(insertRow)
    .select("id")
    .single();
  if (error) throw new Error(`could not create test firm_client: ${error.message}`);
  console.log(`Created test firm_client ${created.id}`);
  return created.id as string;
}

async function main() {
  console.log("=== D0 memory + rules smoke test ===\n");
  const firmClientId = await getOrCreateTestFirmClient();
  const closePeriodId = crypto.randomUUID(); // rules don't validate this in D0

  // 1. recordMemory (vendor_cadence)
  const rec = await recordMemory({
    firmClientId,
    memoryType: "vendor_cadence",
    memoryKey: `smoke_vendor_${Date.now()}`,
    payload: { vendor: "Acme Utilities", cadence: "monthly", avg_amount: 412.5 },
    confidenceScore: 0.6,
    evidenceStrength: "moderate",
    sourceSystem: "d0_smoke",
  });
  check("recordMemory persisted", rec.persistence_status === "persisted", `id=${rec.memory_id}`);

  // 2. queryMemory
  const found = await queryMemory({ firmClientId, memoryType: "vendor_cadence" });
  const match = found.find((m) => m.memory_id === rec.memory_id);
  check("queryMemory returns recorded memory", Boolean(match), `count=${found.length}`);
  const startConfidence = match?.confidence_score ?? 0;

  // 3. reinforceMemory success -> confidence up
  await reinforceMemory(rec.memory_id, "success");
  const afterReinforce = await queryMemory({ firmClientId, memoryType: "vendor_cadence" });
  const reinforced = afterReinforce.find((m) => m.memory_id === rec.memory_id);
  check(
    "reinforceMemory(success) raised confidence",
    (reinforced?.confidence_score ?? 0) > startConfidence,
    `${startConfidence} -> ${reinforced?.confidence_score}`,
  );

  // 4. recordOverride -> human_approved
  const override = await recordOverride({
    firmClientId,
    memoryKey: `smoke_override_${Date.now()}`,
    memoryType: "threshold_override",
    payload: { threshold: "materiality", value: 5000 },
  });
  const { data: overrideRow } = await supabase
    .from("company_memory_records")
    .select("governance_status, confidence_score")
    .eq("memory_id", override.memory_id)
    .maybeSingle();
  check(
    "recordOverride governance_status=human_approved",
    overrideRow?.governance_status === "human_approved",
    `confidence=${overrideRow?.confidence_score}`,
  );

  // 5. executeRulesForClient -> all general rules skip
  const exec = await executeRulesForClient(firmClientId, closePeriodId);
  const allSkip = exec.results.length > 0 && exec.results.every((r) => r.status === "skip");
  check(
    "executeRulesForClient all rules skip",
    allSkip,
    `executed=${exec.executed} skipped=${exec.skipped}`,
  );
  check(
    "executeRulesForClient ran >= 8 general rules",
    exec.executed >= 8,
    `executed=${exec.executed}`,
  );

  console.log(`\n=== SUMMARY: ${passCount} passed, ${failCount} failed ===`);
  process.exit(failCount === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("SMOKE TEST ERROR:", err);
  process.exit(1);
});
