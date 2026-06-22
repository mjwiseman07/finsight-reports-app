// executable: false
// containsVerticalComplianceLogic: false
// composes-with: 42.5V hipaaPackScopeBoundary (NPRM is OUT OF SCOPE for 42.5V; this is the explicit gap surface)
// purpose: gap-register schema integrity + LOCK-time status snapshot accessor

import fs from "fs";
import path from "path";

const LOCK_TIME_STATUS_PATH = path.join(__dirname, "NPRM_LOCK_TIME_STATUS.json");

export type GapSize = "S" | "M" | "L";

export type GapStatus =
  | "open"
  | "in-progress"
  | "mitigated-via-existing-control"
  | "deferred-to-counsel-42.6G";

export interface NprmGapRegisterRow {
  rowId: string;
  nprmProvisionId: string;
  currentRuleReference: string;
  nprmTargetState: string;
  primarySourceUrl: string;
  primarySourceVerifiedAt: string;
  gapSize: GapSize;
  founderEffortEstimate: string;
  owner: string;
  triggerDate: string | null;
  status: GapStatus;
  notes: string;
}

export interface NprmLockTimeStatus {
  capturedAt: string;
  federalRegisterUrl: string;
  reginfoRinUrl: string;
  isFinal: false;
  finalizationTargetMissed: boolean;
  publicCommentsCount: number;
  withdrawalRequestsCount: number;
  notes: string;
}

export interface RegisterAssertionResult {
  decision: "DENY" | "ALLOW";
  reason: string;
  violations: ReadonlyArray<{
    rowId: string;
    violation: string;
  }>;
}

export interface NprmGapRegister {
  assertRegisterSchemaValid(rows: ReadonlyArray<NprmGapRegisterRow>): RegisterAssertionResult;
  getLockTimeStatus(): NprmLockTimeStatus;
}

export interface NprmGapRegisterMarker {
  nprmGapRegisterId: string;
  nprmGapRegisterKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
}

const ALLOWED_GAP_SIZES: ReadonlySet<string> = new Set(["S", "M", "L"]);

function isPrimarySourceUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === "federalregister.gov" || host.endsWith(".federalregister.gov")) {
      return true;
    }
    if (host === "reginfo.gov" || host.endsWith(".reginfo.gov")) {
      return true;
    }
    if (host === "hhs.gov" || host.endsWith(".hhs.gov")) {
      return parsed.pathname.toLowerCase().includes("/hipaa");
    }
    return false;
  } catch {
    return false;
  }
}

function deny(reason: string, violations: RegisterAssertionResult["violations"]): RegisterAssertionResult {
  return { decision: "DENY", reason, violations };
}

function allow(reason: string): RegisterAssertionResult {
  return { decision: "ALLOW", reason, violations: [] };
}

export function assertRegisterSchemaValid(
  rows: ReadonlyArray<NprmGapRegisterRow>,
): RegisterAssertionResult {
  if (!Array.isArray(rows) || rows.length === 0) {
    return deny("empty_register_rows", [{ rowId: "unknown", violation: "empty-register" }]);
  }

  const seenRowIds = new Set<string>();
  const violations: Array<{ rowId: string; violation: string }> = [];

  for (const row of rows) {
    const rowId = row?.rowId ?? "unknown";

    if (!row?.rowId || seenRowIds.has(row.rowId)) {
      violations.push({
        rowId,
        violation: seenRowIds.has(row.rowId) ? "duplicate-row-id" : "missing-row-id",
      });
      continue;
    }
    seenRowIds.add(row.rowId);

    if (!row.owner || row.owner.trim().length === 0) {
      violations.push({ rowId, violation: "unowned-gap-row" });
    }

    if (!isPrimarySourceUrl(row.primarySourceUrl ?? "")) {
      violations.push({ rowId, violation: "non-primary-source" });
    }

    if (!ALLOWED_GAP_SIZES.has(row.gapSize)) {
      violations.push({ rowId, violation: "invalid-gap-size" });
    }

    if (
      row.status === "mitigated-via-existing-control" &&
      row.currentRuleReference === "not-currently-required"
    ) {
      violations.push({ rowId, violation: "mitigation-claim-against-missing-control" });
    }
  }

  if (violations.length > 0) {
    return deny("register_schema_violations", violations);
  }

  return allow("register_schema_valid_all_rows_owned_primary_sourced");
}

function loadLockTimeStatus(): NprmLockTimeStatus {
  const raw = JSON.parse(fs.readFileSync(LOCK_TIME_STATUS_PATH, "utf8")) as NprmLockTimeStatus & {
    finalizationTargetOriginal?: string;
    verifiedAtBuildTime?: boolean;
    frApiType?: string | null;
    frPublicationDate?: string | null;
  };

  if (raw.isFinal !== false) {
    throw new Error("nprm_lock_time_status_is_final_obsolescence_guard");
  }

  return Object.freeze({
    capturedAt: raw.capturedAt,
    federalRegisterUrl: raw.federalRegisterUrl,
    reginfoRinUrl: raw.reginfoRinUrl,
    isFinal: false as const,
    finalizationTargetMissed: raw.finalizationTargetMissed,
    publicCommentsCount: raw.publicCommentsCount,
    withdrawalRequestsCount: raw.withdrawalRequestsCount,
    notes: raw.notes,
  });
}

export function getLockTimeStatus(): NprmLockTimeStatus {
  return loadLockTimeStatus();
}

export function assertLockTimeStatusNotFinal(): RegisterAssertionResult {
  try {
    const status = loadLockTimeStatus();
    return assertNprmNotFinalInvariant(status.isFinal);
  } catch (error) {
    return deny("lock_time_status_invalid", [
      {
        rowId: "lock-time-status",
        violation: error instanceof Error ? error.message : "lock-time-status-error",
      },
    ]);
  }
}

export function assertNprmNotFinalInvariant(isFinal: unknown): RegisterAssertionResult {
  if (isFinal !== false) {
    return deny("lock_time_status_is_final", [
      { rowId: "lock-time-status", violation: "nprm-final-obsolescence-guard" },
    ]);
  }
  return allow("lock_time_status_not_final");
}

export const nprmGapRegister: NprmGapRegister & NprmGapRegisterMarker = {
  assertRegisterSchemaValid,
  getLockTimeStatus,
  nprmGapRegisterId: "nprm-gap-register:42.5W",
  nprmGapRegisterKey: "nprm-gap-register:42.5W",
  containsVerticalComplianceLogic: false,
  executable: false,
};
