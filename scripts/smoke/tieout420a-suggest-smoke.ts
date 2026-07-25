import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

const ENGAGEMENT_ID = "724546e9-6deb-4f7f-b8ad-88e5ee65353d";
const INVESTIGATED_BY = "a4ebf834-a698-4f79-a945-8498f2e6c45d";
const SOURCE_ID = "62f2b597-d733-49b7-971f-f1e677baf5b2";
const QBO_ACCOUNT_ID = "84";

type RpcRow = {
  investigation_id: string;
  investigated_at: string;
  note: string;
  resolution_code: string | null;
};

async function similar(qboAccountId: string): Promise<RpcRow[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc(
    "get_similar_kickout_resolutions",
    {
      p_engagement_id: ENGAGEMENT_ID,
      p_source_type: "bs_summary_line",
      p_source_key: { qbo_account_id: qboAccountId },
    },
  );
  if (error) throw error;
  return (data ?? []) as RpcRow[];
}

async function insertInvestigation(
  note: string,
  investigatedAt: string,
): Promise<string> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("audit_ready_kickout_investigations")
    .insert({
      engagement_id: ENGAGEMENT_ID,
      kickout_source_type: "bs_summary_line",
      kickout_source_id: SOURCE_ID,
      investigated_by: INVESTIGATED_BY,
      investigated_at: investigatedAt,
      note,
      resolution_status: "resolved",
      resolution_code: "immaterial",
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("smoke_insert_failed");
  return data.id as string;
}

async function main() {
  const admin = getSupabaseAdmin();
  const tag = `Block A smoke ${new Date().toISOString()}`;
  const minutesAgo = (minutes: number) =>
    new Date(Date.now() - minutes * 60_000).toISOString();

  console.log("1. Seed one recent resolved investigation");
  const firstId = await insertInvestigation(`${tag} / 1`, minutesAgo(40));
  const first = await similar(QBO_ACCOUNT_ID);
  if (first.length !== 1 || first[0].investigation_id !== firstId) {
    throw new Error(`step_1_expected_one: ${JSON.stringify(first)}`);
  }
  console.log("PASS", first.map((row) => row.investigation_id));

  console.log("2. Matching RPC returns one row");
  if (first[0].resolution_code !== "immaterial") {
    throw new Error("step_2_resolution_code_missing");
  }
  console.log("PASS", first[0]);

  console.log("3. Different account returns zero rows");
  const different = await similar("__block_a_no_match__");
  if (different.length !== 0) {
    throw new Error(`step_3_expected_zero: ${JSON.stringify(different)}`);
  }
  console.log("PASS []");

  console.log("4. Two more rows return three in descending order");
  const secondId = await insertInvestigation(`${tag} / 2`, minutesAgo(30));
  const thirdId = await insertInvestigation(`${tag} / 3`, minutesAgo(20));
  const three = await similar(QBO_ACCOUNT_ID);
  const expectedThree = [thirdId, secondId, firstId];
  if (
    three.length !== 3 ||
    three.map((row) => row.investigation_id).join(",") !==
      expectedThree.join(",")
  ) {
    throw new Error(`step_4_order_mismatch: ${JSON.stringify(three)}`);
  }
  console.log("PASS", expectedThree);

  console.log("5. Fourth row still returns LIMIT 3");
  const fourthId = await insertInvestigation(`${tag} / 4`, minutesAgo(10));
  const limited = await similar(QBO_ACCOUNT_ID);
  if (
    limited.length !== 3 ||
    limited[0].investigation_id !== fourthId ||
    limited.some((row) => row.investigation_id === firstId)
  ) {
    throw new Error(`step_5_limit_failed: ${JSON.stringify(limited)}`);
  }
  console.log("PASS", limited.map((row) => row.investigation_id));

  console.log("6. Seven-month-old row is excluded");
  const sevenMonthsAgo = new Date();
  sevenMonthsAgo.setUTCMonth(sevenMonthsAgo.getUTCMonth() - 7);
  const { error: backdateError } = await admin
    .from("audit_ready_kickout_investigations")
    .update({ investigated_at: sevenMonthsAgo.toISOString() })
    .eq("id", firstId);
  if (backdateError) throw backdateError;
  const afterBackdate = await similar(QBO_ACCOUNT_ID);
  if (
    afterBackdate.length !== 3 ||
    afterBackdate.some((row) => row.investigation_id === firstId)
  ) {
    throw new Error(`step_6_window_failed: ${JSON.stringify(afterBackdate)}`);
  }
  console.log("PASS", afterBackdate.map((row) => row.investigation_id));

  console.log("SMOKE_PASS", {
    engagementId: ENGAGEMENT_ID,
    sourceId: SOURCE_ID,
    qboAccountId: QBO_ACCOUNT_ID,
  });
}

main().catch((error) => {
  console.error("SMOKE_FAIL", error);
  process.exit(1);
});
