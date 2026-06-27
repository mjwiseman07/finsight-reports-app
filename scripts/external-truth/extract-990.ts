/**
 * Phase G7-C5.5 — Form 990 extraction (Parts I/VIII/IX/X + narrative sections).
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ExternalTruthVertical, NumericFact, ReportingFramework } from "./types";
import { writeJson } from "./utils";
import { extractFromManualJson } from "./extract-xbrl";
import { writeExpected } from "./generate-expected";

export interface Irs990ExtractInput {
  filingId: string;
  vertical: ExternalTruthVertical;
  framework: ReportingFramework;
  formType: string;
  ein?: string;
}

interface ProPublicaFilingRow {
  totrevenue?: number;
  total_revenue?: number;
  totassetsend?: number;
  total_assets?: number;
  totfuncexpns?: number;
  totexpns?: number;
  tax_prd_yr?: string | number;
  tax_prd?: string;
}

export function extract990Payload(
  orgJson: Record<string, unknown>,
  entry: Irs990ExtractInput,
): {
  numericFacts: NumericFact[];
  narrativeSnippets: string[];
  entityName: string;
  partI: Record<string, number | string>;
  partVIII: Record<string, number>;
  partIX: Record<string, number>;
  partX: Record<string, number>;
} {
  const org = (orgJson.organization ?? orgJson) as Record<string, unknown>;
  const filings = (orgJson.filings_with_data ?? orgJson.filings ?? []) as ProPublicaFilingRow[];
  const latest = filings[0] ?? {};
  const revenue = Number(latest.totrevenue ?? latest.total_revenue ?? 0);
  const assets = Number(latest.totassetsend ?? latest.total_assets ?? 0);
  const expenses = Number(latest.totfuncexpns ?? latest.totexpns ?? 0);
  const entityName = String(org.name ?? org.organization_name ?? entry.filingId);
  const periodEnd = String(latest.tax_prd_yr ?? latest.tax_prd ?? "");

  const partI: Record<string, number | string> = {
    organizationName: entityName,
    ein: String(org.ein ?? entry.ein ?? ""),
    taxPeriod: periodEnd,
    totalRevenue: revenue,
    totalAssets: assets,
  };

  const partVIII: Record<string, number> = {
    totalRevenue: revenue,
  };

  const partIX: Record<string, number> = {
    totalFunctionalExpenses: expenses,
  };

  const partX: Record<string, number> = {
    totalAssetsEnd: assets,
  };

  const numericFacts: NumericFact[] = [];
  if (Number.isFinite(revenue) && revenue > 0) {
    numericFacts.push({
      tag: "totrevenue",
      label: "Form 990 Part VIII — Total revenue",
      value: revenue,
      unit: "USD",
      periodEnd,
    });
  }
  if (Number.isFinite(expenses) && expenses > 0) {
    numericFacts.push({
      tag: "totfuncexpns",
      label: "Form 990 Part IX — Total functional expenses",
      value: expenses,
      unit: "USD",
      periodEnd,
    });
  }
  if (Number.isFinite(assets) && assets > 0) {
    numericFacts.push({
      tag: "totassetsend",
      label: "Form 990 Part X — Total assets (EOY)",
      value: assets,
      unit: "USD",
      periodEnd,
    });
  }

  const narrativeSnippets = [
    String(org.mission ?? ""),
    String(org.ntee_code ?? ""),
    filings.length ? `990 filing rows: ${filings.length}` : "990 organization profile",
  ].filter((snippet) => snippet.trim().length > 0);

  return {
    entityName,
    numericFacts,
    narrativeSnippets,
    partI,
    partVIII,
    partIX,
    partX,
  };
}

export function extract990FilingDir(filingPath: string): boolean {
  const rawPath = join(filingPath, "raw/organization.json");
  const sourcePath = join(filingPath, "source.json");
  if (!existsSync(rawPath) || !existsSync(sourcePath)) {
    return false;
  }
  const orgJson = JSON.parse(readFileSync(rawPath, "utf8")) as Record<string, unknown>;
  const source = JSON.parse(readFileSync(sourcePath, "utf8")) as {
    filingId: string;
    vertical: ExternalTruthVertical;
    framework: ReportingFramework;
    formType: string;
    notes?: string;
  };
  const ein = source.notes?.match(/ein=(\d+)/)?.[1];
  const payload = extract990Payload(orgJson, {
    filingId: source.filingId,
    vertical: source.vertical,
    framework: source.framework,
    formType: source.formType,
    ein,
  });

  const extracted = extractFromManualJson(filingPath, {
    filingId: source.filingId,
    vertical: source.vertical,
    framework: source.framework,
    formType: source.formType,
    entityName: payload.entityName,
    numericFacts: payload.numericFacts,
    narrativeSnippets: payload.narrativeSnippets,
  });
  const withParts: typeof extracted = {
    ...extracted,
    form990: {
      partI: payload.partI,
      partVIII: payload.partVIII,
      partIX: payload.partIX,
      partX: payload.partX,
    },
  };
  writeJson(join(filingPath, "extracted.json"), withParts);
  writeExpected(filingPath, withParts);
  return true;
}
