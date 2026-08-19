/**
 * CC-2A4 authoritative AR+AP+Inventory observation runner.
 *
 * Orchestration only. FRESH_CAPTURE mints a new accounting_syncs.id via combined
 * acquisition. REPLAY_EXISTING_SYNC loads an already-persisted trio and reruns
 * snapshot-backed resolvers. Those modes never share a provider/sync path.
 */

import { randomUUID } from "node:crypto";
import { acquireAndPersistAccountingStateWithArApInventorySnapshots } from "@/lib/audit-ready/measurement-snapshots/acquisition";
import {
  loadAccountingSyncForArSnapshot,
  loadApMeasurementSnapshot,
  loadArMeasurementSnapshot,
  loadInventoryMeasurementSnapshot,
} from "@/lib/audit-ready/measurement-snapshots/repository";
import {
  CombinedAcquisitionPartialError,
  MeasurementSnapshotError,
  type AccountingSyncForArSnapshot,
  type TieOutApMeasurementSnapshot,
  type TieOutArMeasurementSnapshot,
  type TieOutInventoryMeasurementSnapshot,
} from "@/lib/audit-ready/measurement-snapshots/types";
import { asIsoDate } from "@/lib/audit-ready/measurement-snapshots/validate";
import { runApResolver, type ApResolverOutput } from "@/lib/audit-ready/tie-out/ap-resolver";
import { runArResolver, type ArResolverOutput } from "@/lib/audit-ready/tie-out/ar-resolver";
import { selectLatestCompletedTieOutRunForSync } from "@/lib/audit-ready/tie-out/baseline-sync-custody";
import { runInventoryResolver, type InventoryResolverOutput } from "@/lib/audit-ready/tie-out/inventory-resolver";
import { loadAuthoritativeObservationContext } from "./context";
import {
  assertNoTriggeredByImpersonation,
  requireVerifiedUserPrincipal,
} from "./principal";
import {
  AUTHORITATIVE_OBSERVATION_ERROR,
  AUTHORITATIVE_OBSERVATION_MODES,
  AuthoritativeObservationError,
  type AuthoritativeFailure,
  type AuthoritativeFailureRecon,
  type AuthoritativeObservationContext,
  type AuthoritativeObservationExecutionContext,
  type AuthoritativeObservationInput,
  type AuthoritativeObservationMode,
  type AuthoritativeObservationResult,
  type AuthoritativeReconSlot,
} from "./types";
import {
  loadTieOutRunForVerification,
  verifySelectorExactRun,
  verifyTieOutRunRow,
} from "./verification";

type ResolverOutput = ArResolverOutput | ApResolverOutput | InventoryResolverOutput;

type SnapshotTrio = {
  accountingSyncId: string;
  companyId: string;
  connectionId: string;
  provider: string;
  tenantOrRealmId: string;
  ar: TieOutArMeasurementSnapshot;
  ap: TieOutApMeasurementSnapshot;
  inventory: TieOutInventoryMeasurementSnapshot;
  acquisitionId: string | null;
};

export type AuthoritativeObservationDeps = {
  loadContext: (
    input: AuthoritativeObservationInput,
    executionContext: AuthoritativeObservationExecutionContext,
  ) => Promise<AuthoritativeObservationContext>;
  acquireCombined: typeof acquireAndPersistAccountingStateWithArApInventorySnapshots;
  loadParentSync: typeof loadAccountingSyncForArSnapshot;
  loadArSnapshot: typeof loadArMeasurementSnapshot;
  loadApSnapshot: typeof loadApMeasurementSnapshot;
  loadInventorySnapshot: typeof loadInventoryMeasurementSnapshot;
  runAr: typeof runArResolver;
  runAp: typeof runApResolver;
  runInventory: typeof runInventoryResolver;
  loadTieOutRun: typeof loadTieOutRunForVerification;
  selectCompletedForSync: typeof selectLatestCompletedTieOutRunForSync;
  newObservationId: () => string;
};

const SECRET_JSON_RE =
  /access[_-]?token|refresh[_-]?token|"authorization"|authorization:/i;

function isObservationMode(value: unknown): value is AuthoritativeObservationMode {
  return (
    typeof value === "string" &&
    (AUTHORITATIVE_OBSERVATION_MODES as readonly string[]).includes(value)
  );
}

function assertModeContract(input: AuthoritativeObservationInput): void {
  if (!input || !isObservationMode((input as { mode?: unknown }).mode)) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.MODE_REQUIRED,
      "mode is required and must be FRESH_CAPTURE or REPLAY_EXISTING_SYNC.",
      "context",
    );
  }
  if (input.mode === "FRESH_CAPTURE") {
    const supplied = String(
      (input as { accountingSyncId?: unknown }).accountingSyncId || "",
    ).trim();
    if (supplied) {
      throw new AuthoritativeObservationError(
        AUTHORITATIVE_OBSERVATION_ERROR.FRESH_SYNC_ID_FORBIDDEN,
        "FRESH_CAPTURE must not accept accountingSyncId. A fresh provider observation always mints a new accounting_syncs.id.",
        "context",
      );
    }
    return;
  }
  if (input.mode === "REPLAY_EXISTING_SYNC") {
    if (!String(input.accountingSyncId || "").trim()) {
      throw new AuthoritativeObservationError(
        AUTHORITATIVE_OBSERVATION_ERROR.REPLAY_SYNC_ID_REQUIRED,
        "REPLAY_EXISTING_SYNC requires accountingSyncId.",
        "context",
      );
    }
    return;
  }
  throw new AuthoritativeObservationError(
    AUTHORITATIVE_OBSERVATION_ERROR.UNKNOWN_MODE,
    "Unknown authoritative observation mode.",
    "context",
  );
}

function emptyResult(args: {
  observationId: string;
  input: AuthoritativeObservationInput;
  mode: AuthoritativeObservationMode | null;
  status: AuthoritativeObservationResult["status"];
  failures: AuthoritativeFailure[];
  companyId?: string | null;
  periodEnd?: string | null;
  accountingSyncId?: string | null;
  acquisitionId?: string | null;
  snapshotsPresent?: AuthoritativeObservationResult["custody"]["snapshotsPresent"];
  snapshotHashes?: AuthoritativeObservationResult["custody"]["snapshotHashes"];
  reconciliations?: AuthoritativeObservationResult["reconciliations"];
}): AuthoritativeObservationResult {
  return sanitizeObservationResult({
    observationId: args.observationId,
    acquisitionId: args.acquisitionId ?? null,
    mode: args.mode,
    accountingSyncId: args.accountingSyncId ?? null,
    companyId: args.companyId ?? null,
    engagementId: args.input.engagementId,
    periodEnd: args.periodEnd ?? null,
    status: args.status,
    reconciliations: args.reconciliations ?? {
      ar: null,
      ap: null,
      inventory: null,
    },
    custody: {
      allSameSync: Boolean(args.accountingSyncId) && (args.snapshotsPresent?.length ?? 0) > 0,
      snapshotsPresent: args.snapshotsPresent ?? [],
      snapshotHashes: args.snapshotHashes,
    },
    failures: args.failures,
  });
}

function failureFromUnknown(error: unknown, recon?: AuthoritativeFailureRecon): AuthoritativeFailure {
  if (error instanceof AuthoritativeObservationError) {
    return { code: error.code, message: error.message, recon: error.recon || recon };
  }
  if (error instanceof CombinedAcquisitionPartialError) {
    return { code: error.code, message: error.message, recon: "acquisition" };
  }
  if (error instanceof MeasurementSnapshotError) {
    return { code: error.code, message: error.message, recon: recon || "acquisition" };
  }
  return {
    code: "observation_failed",
    message: error instanceof Error ? error.message : "unknown",
    recon,
  };
}

function snapshotsPresentFrom(args: {
  ar?: TieOutArMeasurementSnapshot | null;
  ap?: TieOutApMeasurementSnapshot | null;
  inventory?: TieOutInventoryMeasurementSnapshot | null;
}): AuthoritativeObservationResult["custody"]["snapshotsPresent"] {
  const present: AuthoritativeObservationResult["custody"]["snapshotsPresent"] = [];
  if (args.ar) present.push("ar_aging");
  if (args.ap) present.push("ap_aging");
  if (args.inventory) present.push("inventory");
  return present;
}

function assertSnapshotMatchesContext(args: {
  snapshot: {
    accountingSyncId: string;
    asOfDate: string;
    companyId: string;
    accountingConnectionId: string;
    provider: string;
    tenantOrRealmId: string;
  };
  accountingSyncId: string;
  context: AuthoritativeObservationContext;
}): void {
  if (args.snapshot.accountingSyncId !== args.accountingSyncId) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.SNAPSHOT_CUSTODY_MISMATCH,
      "Snapshot accountingSyncId does not match the observation sync.",
      "verification",
    );
  }
  if (asIsoDate(args.snapshot.asOfDate) !== args.context.periodEnd) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.SNAPSHOT_CUSTODY_MISMATCH,
      "Snapshot asOfDate does not match the observation period.",
      "verification",
    );
  }
  if (args.snapshot.companyId !== args.context.companyId) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.CROSS_COMPANY_FORBIDDEN,
      "Snapshot company does not match the engagement company.",
      "verification",
    );
  }
  if (args.snapshot.accountingConnectionId !== args.context.connectionId) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.SNAPSHOT_CUSTODY_MISMATCH,
      "Snapshot connection does not match the resolved connection.",
      "verification",
    );
  }
  if (
    args.snapshot.provider !== args.context.provider ||
    args.snapshot.tenantOrRealmId !== args.context.tenantOrRealmId
  ) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.SNAPSHOT_CUSTODY_MISMATCH,
      "Snapshot provider/realm does not match resolved connection identity.",
      "verification",
    );
  }
}

function assertParentMatchesContext(args: {
  parent: AccountingSyncForArSnapshot;
  context: AuthoritativeObservationContext;
}): void {
  if (String(args.parent.validation_status || "") !== "SUCCESS") {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.REPLAY_PARENT_NOT_SUCCESS,
      "Replay parent accounting_syncs.validation_status must be SUCCESS.",
      "acquisition",
    );
  }
  if (args.parent.company_id !== args.context.companyId) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.REPLAY_PARENT_COMPANY_MISMATCH,
      "Replay parent company_id does not match the engagement company.",
      "acquisition",
    );
  }
  if (args.parent.connection_id !== args.context.connectionId) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.REPLAY_PARENT_CONNECTION_MISMATCH,
      "Replay parent connection_id does not match the resolved connection.",
      "acquisition",
    );
  }
  if (asIsoDate(args.parent.report_period_end) !== args.context.periodEnd) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.REPLAY_PARENT_PERIOD_MISMATCH,
      "Replay parent report_period_end does not match the observation period.",
      "acquisition",
    );
  }
}

function notRunSlot(): AuthoritativeReconSlot {
  return {
    runId: null,
    status: "not_run",
    totalsStatus: null,
    baselineSyncId: null,
    measurementSource: null,
    authoritative: false,
  };
}

function failedSlot(error: AuthoritativeFailure): AuthoritativeReconSlot {
  return {
    runId: null,
    status: "failed",
    totalsStatus: null,
    baselineSyncId: null,
    measurementSource: null,
    authoritative: false,
    errorCode: error.code,
    errorMessage: error.message,
  };
}

function normalizeResolverOutput(output: ResolverOutput): AuthoritativeReconSlot {
  return {
    runId: output.runId ? String(output.runId) : null,
    status: output.status,
    totalsStatus: output.totalsStatus,
    baselineSyncId: output.baselineSyncId,
    measurementSource: output.measurementSource,
    authoritative: false,
    errorCode: output.errorCode,
    errorMessage: output.errorMessage,
  };
}

function isAuthoritativeSlot(slot: AuthoritativeReconSlot | null): boolean {
  return Boolean(slot?.authoritative);
}

function observationStatusFromSlots(args: {
  trioComplete: boolean;
  slots: AuthoritativeObservationResult["reconciliations"];
}): AuthoritativeObservationResult["status"] {
  if (!args.trioComplete) return "failed";
  const list = [args.slots.ar, args.slots.ap, args.slots.inventory];
  const authoritativeCount = list.filter(isAuthoritativeSlot).length;
  if (authoritativeCount === 3) return "completed";
  if (authoritativeCount >= 1) return "partial";
  return "failed";
}

function sanitizeObservationResult(
  result: AuthoritativeObservationResult,
): AuthoritativeObservationResult {
  const json = JSON.stringify(result);
  if (SECRET_JSON_RE.test(json)) {
    throw new AuthoritativeObservationError(
      "result_contains_secrets",
      "Observation result must not contain tokens or authorization headers.",
      "context",
    );
  }
  return result;
}

async function verifyCompletedSlot(args: {
  slot: AuthoritativeReconSlot;
  context: AuthoritativeObservationContext;
  accountingSyncId: string;
  tieOutKind: "ar_aging" | "ap_aging" | "inventory";
  recon: AuthoritativeFailureRecon;
  loadTieOutRun: typeof loadTieOutRunForVerification;
  selectCompletedForSync: typeof selectLatestCompletedTieOutRunForSync;
}): Promise<AuthoritativeReconSlot> {
  if (args.slot.status !== "completed" || !args.slot.runId) {
    return {
      ...args.slot,
      authoritative: false,
    };
  }
  if (args.slot.measurementSource !== "persisted_sync_snapshot") {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.MEASUREMENT_SOURCE_INVALID,
      "Authoritative observation requires measurementSource persisted_sync_snapshot.",
      args.recon,
    );
  }
  if (String(args.slot.baselineSyncId || "") !== args.accountingSyncId) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.BASELINE_SYNC_MISMATCH,
      "Resolver baselineSyncId does not match the observation accounting_syncs.id.",
      args.recon,
    );
  }
  const row = await args.loadTieOutRun(args.slot.runId);
  verifyTieOutRunRow({
    row,
    runId: args.slot.runId,
    engagementId: args.context.engagementId,
    periodEnd: args.context.periodEnd,
    tieOutKind: args.tieOutKind,
    accountingSyncId: args.accountingSyncId,
    recon: args.recon,
  });
  const selected = await args.selectCompletedForSync({
    engagementId: args.context.engagementId,
    periodEnd: args.context.periodEnd,
    tieOutKind: args.tieOutKind,
    baselineSyncId: args.accountingSyncId,
  });
  verifySelectorExactRun({
    selected,
    runId: args.slot.runId,
    recon: args.recon,
  });
  return { ...args.slot, authoritative: true };
}

export function createDefaultAuthoritativeObservationDeps(): AuthoritativeObservationDeps {
  return {
    loadContext: loadAuthoritativeObservationContext,
    acquireCombined: acquireAndPersistAccountingStateWithArApInventorySnapshots,
    loadParentSync: loadAccountingSyncForArSnapshot,
    loadArSnapshot: loadArMeasurementSnapshot,
    loadApSnapshot: loadApMeasurementSnapshot,
    loadInventorySnapshot: loadInventoryMeasurementSnapshot,
    runAr: runArResolver,
    runAp: runApResolver,
    runInventory: runInventoryResolver,
    loadTieOutRun: loadTieOutRunForVerification,
    selectCompletedForSync: selectLatestCompletedTieOutRunForSync,
    newObservationId: () => randomUUID(),
  };
}

async function captureFreshTrio(
  input: Extract<AuthoritativeObservationInput, { mode: "FRESH_CAPTURE" }>,
  context: AuthoritativeObservationContext,
  deps: AuthoritativeObservationDeps,
): Promise<SnapshotTrio> {
  const acquired = await deps.acquireCombined({
    connection: context.acquisitionConnection,
    userId: context.actor.userId,
    asOfDate: context.periodEnd,
    reportPeriod: context.reportPeriod,
  });
  const accountingSyncId = acquired.accountingSync.syncId;
  if (acquired.accountingSync.companyId !== context.companyId) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.CROSS_COMPANY_FORBIDDEN,
      "Persisted accounting_syncs.company_id does not match the engagement company.",
      "acquisition",
    );
  }
  if (acquired.accountingSync.connectionId !== context.connectionId) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.SNAPSHOT_CUSTODY_MISMATCH,
      "Persisted accounting_syncs.connection_id does not match the resolved connection.",
      "acquisition",
    );
  }
  if (asIsoDate(acquired.accountingSync.reportPeriodEnd) !== context.periodEnd) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.SNAPSHOT_CUSTODY_MISMATCH,
      "Persisted accounting_syncs.report_period_end does not match the observation period.",
      "acquisition",
    );
  }
  for (const snapshot of [
    acquired.arMeasurementSnapshot,
    acquired.apMeasurementSnapshot,
    acquired.inventoryMeasurementSnapshot,
  ]) {
    assertSnapshotMatchesContext({
      snapshot,
      accountingSyncId,
      context,
    });
  }
  return {
    accountingSyncId,
    companyId: acquired.accountingSync.companyId,
    connectionId: acquired.accountingSync.connectionId,
    provider: context.provider,
    tenantOrRealmId: context.tenantOrRealmId,
    ar: acquired.arMeasurementSnapshot,
    ap: acquired.apMeasurementSnapshot,
    inventory: acquired.inventoryMeasurementSnapshot,
    acquisitionId: acquired.acquisitionId,
  };
}

async function loadReplayTrio(
  input: Extract<AuthoritativeObservationInput, { mode: "REPLAY_EXISTING_SYNC" }>,
  context: AuthoritativeObservationContext,
  deps: AuthoritativeObservationDeps,
): Promise<SnapshotTrio> {
  const accountingSyncId = String(input.accountingSyncId).trim();
  const parent = await deps.loadParentSync(accountingSyncId);
  assertParentMatchesContext({ parent, context });
  const ar = await deps.loadArSnapshot({
    accountingSyncId,
    asOfDate: context.periodEnd,
  });
  if (!ar) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.REPLAY_AR_SNAPSHOT_MISSING,
      "REPLAY_EXISTING_SYNC requires a persisted AR snapshot for this sync and period.",
      "acquisition",
    );
  }
  const ap = await deps.loadApSnapshot({
    accountingSyncId,
    asOfDate: context.periodEnd,
  });
  if (!ap) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.REPLAY_AP_SNAPSHOT_MISSING,
      "REPLAY_EXISTING_SYNC requires a persisted AP snapshot for this sync and period.",
      "acquisition",
    );
  }
  const inventory = await deps.loadInventorySnapshot({
    accountingSyncId,
    asOfDate: context.periodEnd,
  });
  if (!inventory) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.REPLAY_INVENTORY_SNAPSHOT_MISSING,
      "REPLAY_EXISTING_SYNC requires a persisted Inventory snapshot for this sync and period.",
      "acquisition",
    );
  }
  for (const snapshot of [ar, ap, inventory]) {
    assertSnapshotMatchesContext({ snapshot, accountingSyncId, context });
  }
  return {
    accountingSyncId,
    companyId: parent.company_id,
    connectionId: parent.connection_id,
    provider: parent.source_system,
    tenantOrRealmId: parent.tenant_id,
    ar,
    ap,
    inventory,
    acquisitionId: null,
  };
}

async function runOneResolver(args: {
  kind: "ar" | "ap" | "inventory";
  input: AuthoritativeObservationInput;
  context: AuthoritativeObservationContext;
  trio: SnapshotTrio;
  deps: AuthoritativeObservationDeps;
}): Promise<AuthoritativeReconSlot> {
  const shared = {
    engagementId: args.context.engagementId,
    realmId: args.trio.tenantOrRealmId,
    accessToken: "",
    asOfDate: args.context.periodEnd,
    policy: args.context.policy,
    triggeredByUserId: args.context.triggeredByUserId,
    triggerReason: args.input.triggerReason,
    companyId: args.trio.companyId,
    accountingConnectionId: args.trio.connectionId,
    provider: args.trio.provider,
  };
  let output: ResolverOutput;
  if (args.kind === "ar") {
    output = await args.deps.runAr({
      ...shared,
      pbcRequestId: args.context.pbcRequestIds.ar,
      arAccountId: args.context.arAccountId,
      measurement: { mode: "persisted_snapshot", snapshot: args.trio.ar },
    });
  } else if (args.kind === "ap") {
    output = await args.deps.runAp({
      ...shared,
      pbcRequestId: args.context.pbcRequestIds.ap,
      apAccountId: args.context.apAccountId,
      measurement: { mode: "persisted_snapshot", snapshot: args.trio.ap },
    });
  } else {
    output = await args.deps.runInventory({
      ...shared,
      pbcRequestId: args.context.pbcRequestIds.inventory,
      inventoryAccountId: args.context.inventoryAccountId,
      measurement: { mode: "persisted_snapshot", snapshot: args.trio.inventory },
    });
  }
  const slot = normalizeResolverOutput(output);
  const tieOutKind =
    args.kind === "ar" ? "ar_aging" : args.kind === "ap" ? "ap_aging" : "inventory";
  try {
    return await verifyCompletedSlot({
      slot,
      context: args.context,
      accountingSyncId: args.trio.accountingSyncId,
      tieOutKind,
      recon: args.kind,
      loadTieOutRun: args.deps.loadTieOutRun,
      selectCompletedForSync: args.deps.selectCompletedForSync,
    });
  } catch (error) {
    const failure = failureFromUnknown(error, args.kind);
    return {
      ...slot,
      authoritative: false,
      errorCode: failure.code,
      errorMessage: failure.message,
    };
  }
}

export async function runAuthoritativeArApInventoryObservation(
  input: AuthoritativeObservationInput,
  executionContext: AuthoritativeObservationExecutionContext,
  deps?: Partial<AuthoritativeObservationDeps>,
): Promise<AuthoritativeObservationResult> {
  const resolved: AuthoritativeObservationDeps = {
    ...createDefaultAuthoritativeObservationDeps(),
    ...deps,
  };
  const observationId = resolved.newObservationId();
  const mode = isObservationMode((input as { mode?: unknown })?.mode)
    ? (input as AuthoritativeObservationInput).mode
    : null;

  try {
    assertModeContract(input);
    const identity = requireVerifiedUserPrincipal(executionContext);
    assertNoTriggeredByImpersonation(input, identity.userId);
  } catch (error) {
    return emptyResult({
      observationId,
      input,
      mode,
      status: "failed",
      failures: [failureFromUnknown(error, "context")],
    });
  }

  let context: AuthoritativeObservationContext;
  try {
    context = await resolved.loadContext(input, executionContext);
  } catch (error) {
    return emptyResult({
      observationId,
      input,
      mode: input.mode,
      status: "failed",
      failures: [failureFromUnknown(error, "context")],
    });
  }

  let trio: SnapshotTrio;
  try {
    if (input.mode === "FRESH_CAPTURE") {
      trio = await captureFreshTrio(input, context, resolved);
    } else {
      trio = await loadReplayTrio(input, context, resolved);
    }
  } catch (error) {
    const snapshots =
      error instanceof CombinedAcquisitionPartialError
        ? snapshotsPresentFrom({
            ar: error.arMeasurementSnapshot,
            ap: error.apMeasurementSnapshot,
            inventory: error.inventoryMeasurementSnapshot,
          })
        : [];
    return emptyResult({
      observationId,
      input,
      mode: input.mode,
      status: "failed",
      companyId: context.companyId,
      periodEnd: context.periodEnd,
      accountingSyncId:
        error instanceof CombinedAcquisitionPartialError
          ? error.accountingSyncId
          : null,
      snapshotsPresent: snapshots,
      snapshotHashes:
        error instanceof CombinedAcquisitionPartialError
          ? {
              ar: error.arMeasurementSnapshot?.payloadHash ?? null,
              ap: error.apMeasurementSnapshot?.payloadHash ?? null,
              inventory: error.inventoryMeasurementSnapshot?.payloadHash ?? null,
            }
          : undefined,
      failures: [failureFromUnknown(error, "acquisition")],
      reconciliations: {
        ar: notRunSlot(),
        ap: notRunSlot(),
        inventory: notRunSlot(),
      },
    });
  }

  const failures: AuthoritativeFailure[] = [];
  const reconciliations: AuthoritativeObservationResult["reconciliations"] = {
    ar: notRunSlot(),
    ap: notRunSlot(),
    inventory: notRunSlot(),
  };

  for (const kind of ["ar", "ap", "inventory"] as const) {
    try {
      const slot = await runOneResolver({
        kind,
        input,
        context,
        trio,
        deps: resolved,
      });
      reconciliations[kind] = slot;
      if (!slot.authoritative) {
        failures.push({
          code: slot.errorCode || "resolver_not_authoritative",
          message: slot.errorMessage || `${kind} reconciliation is not authoritative.`,
          recon: kind === "ar" || kind === "ap" || kind === "inventory" ? kind : "verification",
        });
      }
    } catch (error) {
      const failure = failureFromUnknown(error, kind);
      failures.push(failure);
      reconciliations[kind] = failedSlot(failure);
    }
  }

  const status = observationStatusFromSlots({
    trioComplete: true,
    slots: reconciliations,
  });

  return sanitizeObservationResult({
    observationId,
    acquisitionId: trio.acquisitionId,
    mode: input.mode,
    accountingSyncId: trio.accountingSyncId,
    companyId: context.companyId,
    engagementId: context.engagementId,
    periodEnd: context.periodEnd,
    status,
    reconciliations,
    custody: {
      allSameSync: true,
      snapshotsPresent: ["ar_aging", "ap_aging", "inventory"],
      snapshotHashes: {
        ar: trio.ar.payloadHash,
        ap: trio.ap.payloadHash,
        inventory: trio.inventory.payloadHash,
      },
    },
    failures,
  });
}
