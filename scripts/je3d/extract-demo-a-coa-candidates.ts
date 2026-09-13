import { readFileSync } from "node:fs";
import { buildFirstRunAccountCandidateReport } from "../../lib/journal-entry-governance/je3d-first-run-account-authority";
import { getSupabaseAdmin } from "../../lib/supabase-admin.js";

function loadEnv(path: string) {
  try {
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const eq = trimmed.indexOf("=");
        if (eq === -1) return;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
      });
  } catch {
    // optional
  }
}

loadEnv(".env");
loadEnv(".env.local");

const FIRM_CLIENT_ID = "aaaaaaaa-1111-4111-8111-111111111111";

async function main() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("qbo_coa_mirror")
    .select("external_account_id, account_name, account_type, account_subtype, active")
    .eq("firm_client_id", FIRM_CLIENT_ID);
  if (error) throw error;
  const rows = (data || []).map((row: {
    external_account_id: string;
    account_name: string | null;
    account_type: string | null;
    account_subtype: string | null;
    active: boolean;
  }) => ({
    accountId: String(row.external_account_id),
    accountName: String(row.account_name || ""),
    accountType: String(row.account_type || ""),
    accountSubtype: row.account_subtype ? String(row.account_subtype) : null,
    active: Boolean(row.active),
  }));
  const report = buildFirstRunAccountCandidateReport({
    firmClientId: FIRM_CLIENT_ID,
    rows,
  });
  console.log(
    JSON.stringify(
      {
        expense_eligible_count: report.eligible_expense_candidates.length,
        liability_eligible_count: report.eligible_liability_candidates.length,
        A_eligible_ordinary_expense_accounts:
          report.eligible_expense_candidates.map((c) => ({
            account_id: c.accountId,
            account_name: c.accountName,
            account_type: c.accountType,
            account_subtype: c.accountSubtype,
            active: c.active,
            is_control_account: c.is_control_account,
            exclusion_reasons: c.exclusion_reasons,
            why_eligible:
              "Expense or Other Expense type with no first-run exclusion rules",
          })),
        B_eligible_accrued_liability_accounts:
          report.eligible_liability_candidates.map((c) => ({
            account_id: c.accountId,
            account_name: c.accountName,
            account_type: c.accountType,
            account_subtype: c.accountSubtype,
            active: c.active,
            is_control_account: c.is_control_account,
            exclusion_reasons: c.exclusion_reasons,
            why_eligible:
              "Other Current Liability type with no first-run exclusion rules",
          })),
        other_current_liability_excluded_for_review: report.candidates
          .filter((c) => c.accountType === "Other Current Liability")
          .map((c) => ({
            account_id: c.accountId,
            account_name: c.accountName,
            account_subtype: c.accountSubtype,
            active: c.active,
            eligible_for_accrued_liability: c.eligible_for_accrued_liability,
            is_control_account: c.is_control_account,
            exclusion_reasons: c.exclusion_reasons,
          })),
      },
      null,
      2,
    ),
  );
}

void main();
