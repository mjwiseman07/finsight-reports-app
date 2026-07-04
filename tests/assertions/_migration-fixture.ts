import { readFileSync } from "node:fs";
import path from "node:path";
import { ASSERTION_IDS, ACCOUNT_CATEGORIES } from "@/lib/pre-close/assertions-types";

const MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase/migrations/20260707120000_d_assertions_part_1_schema_and_backfill.sql",
);

export const EXPECTED_RULE_IDS = [
  "gen.accrual_reversal_check",
  "gen.ap_missed_vendor_check",
  "gen.cash_negative_check",
  "gen.depreciation_scheduled_check",
  "gen.duplicate_vendor_bill_check",
  "gen.gl_mapping_variance_check",
  "gen.je_balance_check",
  "gen.je_period_check",
  "gen.prepaid_amortization_check",
  "gen.revenue_cutoff_check",
  "gen.reversing_entry_period_check",
  "gen.subledger_tie_check",
  "mfg.absorption_check",
  "mfg.cogs_variance_check",
  "mfg.freight_capitalization_check",
  "mfg.inventory_reconciliation_check",
  "mfg.scrap_variance_check",
  "mfg.standard_cost_capitalization_check",
  "mfg.warranty_accrual_check",
  "mfg.wip_cutoff_check",
  "ps.bill_rate_variance_check",
  "ps.contract_asset_reclass_check",
  "ps.project_margin_flag_check",
  "ps.revenue_percent_complete_check",
  "ps.unbilled_receivables_check",
  "ps.wip_billable_hours_check",
  "rtl.cogs_recognition_check",
  "rtl.gift_card_liability_check",
  "rtl.inventory_shrink_check",
  "rtl.loyalty_reward_liability_check",
  "rtl.sales_returns_reserve_check",
  "rtl.seasonal_markdown_check",
] as const;

export function readMigrationSql(): string {
  return readFileSync(MIGRATION_PATH, "utf8");
}

export function parseAssertionCatalogSeeds(sql: string): string[] {
  const block = sql.match(
    /insert into public\.assertions_catalog[\s\S]*?on conflict \(assertion_id\)/i,
  );
  if (!block) return [];
  const ids: string[] = [];
  const re = /\('([^']+)',/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block[0])) !== null) ids.push(m[1]);
  return ids;
}

export function parseRelevanceMatrixSeeds(sql: string): Array<{ account: string; assertion: string }> {
  const block = sql.match(
    /insert into public\.assertion_relevance_matrix[\s\S]*?on conflict \(account_category, assertion_id\)/i,
  );
  if (!block) return [];
  const rows: Array<{ account: string; assertion: string }> = [];
  const re = /\('([^']+)','([^']+)','(relevant|usually_not_primary|not_applicable)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block[0])) !== null) {
    rows.push({ account: m[1], assertion: m[2] });
  }
  return rows;
}

export function parseRuleCoverageSeeds(sql: string): Array<{
  rule_id: string;
  assertion_id: string;
  coverage_strength: string;
  account_categories: string[];
}> {
  const rows: Array<{
    rule_id: string;
    assertion_id: string;
    coverage_strength: string;
    account_categories: string[];
  }> = [];
  const re =
    /\('([^']+)','([^']+)','(primary|secondary|partial)','(\{[^']*\})','[^']*','[^']*'\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    const cats = m[4]
      .replace(/[{}]/g, "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    rows.push({
      rule_id: m[1],
      assertion_id: m[2],
      coverage_strength: m[3],
      account_categories: cats,
    });
  }
  return rows;
}

export function assertEnumCoverage() {
  const sql = readMigrationSql();
  const catalog = parseAssertionCatalogSeeds(sql);
  const matrix = parseRelevanceMatrixSeeds(sql);
  const coverage = parseRuleCoverageSeeds(sql);
  return { sql, catalog, matrix, coverage };
}

export const ASSERTION_ID_SET = new Set<string>(ASSERTION_IDS);
export const ACCOUNT_CATEGORY_SET = new Set<string>(ACCOUNT_CATEGORIES);

const PART2_MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase/migrations/20260707130000_d_assertions_part_2_coverage_projection.sql",
);

export function readPart2MigrationSql(): string {
  return readFileSync(PART2_MIGRATION_PATH, "utf8");
}

export function parseRootCauseSeeds(sql: string): string[] {
  const block = sql.match(
    /insert into public\.assertion_gap_root_causes[\s\S]*?on conflict \(root_cause_code\)/i,
  );
  if (!block) return [];
  const codes: string[] = [];
  const re = /\('([^']+)',/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block[0])) !== null) codes.push(m[1]);
  return codes;
}

export function parseAdvisacorFlagSeeds(sql: string): string[] {
  const block = sql.match(/insert into public\.advisacor_flags[\s\S]*?on conflict \(flag_key\)/i);
  if (!block) return [];
  const keys: string[] = [];
  const re = /\('([^']+)',/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block[0])) !== null) keys.push(m[1]);
  return keys;
}

export function seedPart2Migration() {
  const sql = readPart2MigrationSql();
  const rootCauses = parseRootCauseSeeds(sql);
  const flags = parseAdvisacorFlagSeeds(sql);
  return { sql, rootCauses, flags };
}
