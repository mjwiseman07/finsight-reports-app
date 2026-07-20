// File: scripts/seed-demo-tier-firms.ts
//
// Phase DEMO-2 — RA + RA Pro demo seed (pool-of-sandbox-holders model).
//
// Provisions two demo firms (RA and RA Pro), each with:
//   - complimentary pilot_slots row
//   - one firm_client (the demo shell)
//   - one companies row
//   - THREE sandbox holder auth users (Slot 1/2/3) — each can hold one Intuit
//     sandbox connection independently. The DEMO-3 picker swaps
//     firm_client.owner_user_id between them.
//   - Super-admin attached as firm_admin
//
// Idempotent. Safe to re-run.
//
// Usage:
//   npx tsx scripts/seed-demo-tier-firms.ts
//
// Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEMO_FIRMS,
  SUPER_ADMIN_USER_ID,
  type DemoFirmSpec,
  type SandboxHolderSpec,
} from "../lib/demo/constants";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, "..", ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

function bail(step: string, err: unknown): never {
  console.error(`[seed-demo-tier-firms] FAILED at ${step}:`, err);
  process.exit(1);
}

// -------- Holder auth users --------

async function ensureSandboxHolder(holder: SandboxHolderSpec): Promise<string> {
  // Look up by email — auth.admin.listUsers has no filter; we use the REST
  // endpoint via the admin API.
  const { data: list, error: listErr } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) bail(`listUsers`, listErr);
  const existing = list.users.find((u) => u.email === holder.email);

  if (existing) {
    // Ensure app_metadata carries our demo tag; refresh in case it drifted.
    const { error: updErr } = await supabase.auth.admin.updateUserById(
      existing.id,
      {
        app_metadata: {
          ...(existing.app_metadata ?? {}),
          is_demo_sandbox_holder: true,
          demo_label: holder.label,
        },
      },
    );
    if (updErr) bail(`updateUserById(${existing.id})`, updErr);
    console.log(`↻ holder ${holder.email} (${existing.id})`);
    return existing.id;
  }

  // Create fresh. email_confirm=true so Supabase does not send a magic link.
  // password is random and unused — this user never signs in interactively;
  // the super-admin picker binds firm_client.owner_user_id to them and the
  // Intuit OAuth callback attaches tokens to their user_id via
  // accounting_connections.
  const randomPassword =
    "demo-" + crypto.randomUUID().replace(/-/g, "") + "-" + Date.now();
  const { data: created, error: createErr } =
    await supabase.auth.admin.createUser({
      email: holder.email,
      password: randomPassword,
      email_confirm: true,
      app_metadata: {
        is_demo_sandbox_holder: true,
        demo_label: holder.label,
      },
    });
  if (createErr) bail(`createUser(${holder.email})`, createErr);
  if (!created?.user?.id) bail(`createUser(${holder.email}) no user returned`, null);
  console.log(`＋ holder ${holder.email} (${created.user.id})`);
  return created.user.id;
}

// -------- Firms / pilot_slots / memberships --------

async function upsertFirm(spec: DemoFirmSpec) {
  const { error } = await supabase.from("firms").upsert(
    {
      id: spec.firmId,
      name: spec.firmName,
      advisor_name:
        spec.tierKey === "review_assist_pro"
          ? "Demo RA Pro Controller"
          : "Demo RA Reviewer",
      reply_to_email:
        spec.tierKey === "review_assist_pro"
          ? "demo-rapro@advisacor.com"
          : "demo-ra@advisacor.com",
      is_demo: true,
    },
    { onConflict: "id" },
  );
  if (error) bail(`upsert firms(${spec.firmId})`, error);
  console.log(`✓ firm ${spec.firmName}`);
}

async function upsertPilotSlot(spec: DemoFirmSpec) {
  const { data: existing, error: readErr } = await supabase
    .from("pilot_slots")
    .select("id")
    .eq("firm_id", spec.firmId)
    .eq("tier_key", spec.tierKey)
    .maybeSingle();
  if (readErr) bail(`read pilot_slots(${spec.firmId})`, readErr);

  const payload = {
    firm_id: spec.firmId,
    company_id: null,
    tier_key: spec.tierKey,
    pilot_status: "complimentary" as const,
    pricing_structure: "complimentary" as const,
    pricing_cadence: "monthly" as const,
    complimentary_client_cap: spec.complimentaryCap,
    pilot_slot_number: null,
    notes:
      "Demo firm — provisioned by seed-demo-tier-firms.ts (super-admin impersonation only)",
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("pilot_slots")
      .update(payload)
      .eq("id", existing.id);
    if (error) bail(`update pilot_slots(${existing.id})`, error);
    console.log(`↻ pilot_slot(${spec.tierKey})`);
  } else {
    const { error } = await supabase.from("pilot_slots").insert(payload);
    if (error) bail(`insert pilot_slots(${spec.tierKey})`, error);
    console.log(`＋ pilot_slot(${spec.tierKey})`);
  }
}

async function upsertMembership(firmId: string, userId: string) {
  const { data: existing, error: readErr } = await supabase
    .from("firm_memberships")
    .select("id")
    .eq("firm_id", firmId)
    .eq("user_id", userId)
    .maybeSingle();
  if (readErr) bail(`read firm_memberships(${firmId})`, readErr);

  if (existing?.id) {
    const { error } = await supabase
      .from("firm_memberships")
      .update({ role: "firm_admin", status: "active", can_approve: true })
      .eq("id", existing.id);
    if (error) bail(`update firm_memberships(${existing.id})`, error);
    console.log(`↻ membership super-admin @ ${firmId}`);
  } else {
    const { error } = await supabase.from("firm_memberships").insert({
      firm_id: firmId,
      user_id: userId,
      role: "firm_admin",
      status: "active",
      can_approve: true,
    });
    if (error) bail(`insert firm_memberships(${firmId})`, error);
    console.log(`＋ membership super-admin @ ${firmId}`);
  }
}

// -------- Company + firm_client --------

async function upsertCompany(spec: DemoFirmSpec) {
  const { error } = await supabase.from("companies").upsert(
    {
      id: spec.companyId,
      name: spec.companyName,
      industry: "Professional Services",
      industry_type: "Professional Services",
      primary_persona:
        spec.tierKey === "review_assist_pro" ? "controller" : "bookkeeper",
      package_level: "essential",
      billing_status: "trial",
      onboarding_status: "complete",
      is_demo: true,
      account_type: "client-of-firm",
    },
    { onConflict: "id" },
  );
  if (error) bail(`upsert companies(${spec.companyId})`, error);
  console.log(`✓ company ${spec.companyName}`);
}

async function upsertFirmClient(spec: DemoFirmSpec, defaultOwnerUserId: string) {
  // On first insert we set owner_user_id to Slot 1's holder. On re-runs we
  // must NOT overwrite the owner_user_id — the super-admin picker may have
  // swapped it. So the update path omits owner_user_id.
  const { data: existing, error: readErr } = await supabase
    .from("firm_clients")
    .select("id, owner_user_id")
    .eq("id", spec.firmClientId)
    .maybeSingle();
  if (readErr) bail(`read firm_clients(${spec.firmClientId})`, readErr);

  const commonPayload = {
    firm_id: spec.firmId,
    company_id: spec.companyId,
    name: spec.clientName,
    package_level: "Essential",
    subscription_status: "active",
    health_status: "Healthy",
    health_score: 92,
    accounting_method: "accrual" as const,
    is_demo: true,
    timezone: "America/New_York",
    vertical_rules_enabled: true,
    qbo_write_enabled: spec.tierKey === "review_assist_pro",
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("firm_clients")
      .update(commonPayload)
      .eq("id", spec.firmClientId);
    if (error) bail(`update firm_clients(${spec.firmClientId})`, error);
    console.log(
      `↻ firm_client ${spec.clientName} (owner preserved: ${existing.owner_user_id ?? "null"})`,
    );
  } else {
    const { error } = await supabase.from("firm_clients").insert({
      id: spec.firmClientId,
      ...commonPayload,
      owner_user_id: defaultOwnerUserId,
    });
    if (error) bail(`insert firm_clients(${spec.firmClientId})`, error);
    console.log(`＋ firm_client ${spec.clientName} (owner=Slot 1)`);
  }
}

// -------- Verification --------

async function verify() {
  const firmIds = DEMO_FIRMS.map((f) => f.firmId);

  const { data: firms } = await supabase
    .from("firms")
    .select("id, name, is_demo")
    .in("id", firmIds);
  const { data: pilots } = await supabase
    .from("pilot_slots")
    .select("firm_id, tier_key, pilot_status, complimentary_client_cap")
    .in("firm_id", firmIds);
  const { data: clients } = await supabase
    .from("firm_clients")
    .select("id, firm_id, name, owner_user_id, is_demo")
    .in("firm_id", firmIds);
  const { data: memberships } = await supabase
    .from("firm_memberships")
    .select("firm_id, role, status")
    .in("firm_id", firmIds)
    .eq("user_id", SUPER_ADMIN_USER_ID);

  // Sandbox holders via app_metadata tag
  const { data: usersList } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const holders = usersList.users.filter(
    (u) =>
      (u.app_metadata as Record<string, unknown> | null)?.[
        "is_demo_sandbox_holder"
      ] === true,
  );

  console.log("\n=== Verification ===");
  console.log(
    JSON.stringify(
      {
        firms,
        pilots,
        clients,
        memberships,
        sandbox_holders: holders.map((h) => ({ id: h.id, email: h.email })),
      },
      null,
      2,
    ),
  );

  const ok =
    (firms?.length ?? 0) === 2 &&
    (pilots?.length ?? 0) === 2 &&
    (clients?.length ?? 0) === 2 &&
    (memberships?.length ?? 0) === 2 &&
    holders.length === 6;

  if (!ok) {
    console.error("\n✗ Verification FAILED — counts do not match expected.");
    process.exit(1);
  }
  console.log("\n✓ All demo rows verified.");
}

async function main() {
  console.log("Seeding Advisacor RA + RA Pro demo firms…\n");

  for (const spec of DEMO_FIRMS) {
    // 1. Sandbox holder users (auth.users) — must exist before firm_client
    //    default owner assignment.
    const holderIds: string[] = [];
    for (const holder of spec.holders) {
      const id = await ensureSandboxHolder(holder);
      holderIds.push(id);
    }
    const defaultOwner = holderIds[0];
    if (!defaultOwner) bail("no holder id for default owner", null);

    // 2. Firm + pilot slot + super-admin membership
    await upsertFirm(spec);
    await upsertPilotSlot(spec);
    await upsertMembership(spec.firmId, SUPER_ADMIN_USER_ID);

    // 3. Company + firm_client (owner defaults to Slot 1 on first insert
    //    only; existing owner is preserved on re-runs).
    await upsertCompany(spec);
    await upsertFirmClient(spec, defaultOwner);

    console.log("");
  }

  await verify();
}

main().catch((err) => bail("main", err));
