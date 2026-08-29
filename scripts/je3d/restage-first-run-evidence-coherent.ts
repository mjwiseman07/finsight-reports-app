/* eslint-disable no-console */
/**
 * JE-3D — Evidence-coherent restage gate (HARD STOP).
 *
 * Prior restage used ap_aging + RESIDUAL_DELTA -100 for an expense ↔ accrued-
 * liability JE. That overclaims: the JE does not change AP aging subledger or
 * AP control GL, and v1 forbids AP-control posting.
 *
 * Production probe (Demo A engagement 74da484f-…):
 *   - only ar_aging + ap_aging recons exist
 *   - no expense_cutoff / bs_account_recon / grni rows
 *   - JE_SOURCE_RECON_KINDS today = ar_aging | ap_aging | inventory only
 *
 * Therefore this script refuses to create another custody chain until a
 * coherent source authority exists (expense_cutoff and/or bs_account_recon
 * for accrued liability 1150040002) AND JE-1 source-kind policy accepts it.
 *
 * Usage:
 *   npx tsx scripts/je3d/restage-first-run-evidence-coherent.ts
 */
import { JE_SOURCE_RECON_KINDS } from "../../lib/journal-entry-governance/types";
import {
  FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED,
} from "../../lib/journal-entry-governance/je3d-first-run-account-authority";
import {
  FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED,
  FIRST_RUN_STAGED_EXECUTION_ID,
} from "../../lib/journal-entry-governance/je3d-first-run-execution-authority";
import {
  isJe3dCreateCapabilityEnabled,
  isJe3dVerifyCapabilityEnabled,
} from "../../lib/journal-entry-governance/je3d-activation-policy";
import { resolveJe3dActivationPolicy } from "../../lib/journal-entry-governance/je3d-first-controlled-create-activation";
import { validateFirstRunEvidenceCoherence } from "../../lib/journal-entry-governance/je3d-first-run-evidence-coherence";

const SUPERSEDED_AP_CHAIN = {
  execution_id: "f08ba852-534a-40f5-b606-867a3b98c879",
  proposal_id: "c5ac0d79-c1e0-48a2-92f5-c026190d9e88",
  approval_id: "eb47034d-3637-4512-8c99-4123d60a15f7",
  source_recon_id: "470a0b3d-7f65-4bf5-9882-5dc0c2f78c11",
  note: "Superseded for audit history — do not mutate; do not dispatch.",
};

function main() {
  const policy = resolveJe3dActivationPolicy();

  const regression = validateFirstRunEvidenceCoherence({
    originType: "ACCRUAL",
    reasonCode: "cutoff_accrual",
    sourceReconRunIds: [SUPERSEDED_AP_CHAIN.source_recon_id],
    expectedEffects: [
      {
        type: "RESIDUAL_DELTA",
        reconKind: "ap_aging",
        expectedDeltaCents: -100,
      },
      {
        type: "ACCOUNT_RECLASS",
        fromAccountId: "15",
        toAccountId: "1150040002",
        amountCents: 100,
      },
    ],
    sourceReconKindsById: new Map([
      [SUPERSEDED_AP_CHAIN.source_recon_id, "ap_aging"],
    ]),
  });

  const report = {
    recommendation: "NO COHERENT SOURCE AUTHORITY — STOP",
    coherent_existing_source_authority: false,
    exact_source_recon_kind: null,
    exact_source_recon_id: null,
    exact_measurement_changed_by_je: null,
    why_expense_accrual_changes_that_measurement: null,
    expected_effects: null,
    new_proposal_id: null,
    new_approval_id: null,
    new_execution_id: null,
    reason:
      "Demo A has no expense_cutoff or accrued-liability bs_account_recon. " +
      "JE-1 only accepts ar_aging|ap_aging|inventory. AP-aging RESIDUAL_DELTA " +
      "is economically incoherent for DR expense / CR accrued liability.",
    je_source_recon_kinds_accepted_today: [...JE_SOURCE_RECON_KINDS],
    superseded_ap_aging_chain: SUPERSEDED_AP_CHAIN,
    staged_execution_id_constant: FIRST_RUN_STAGED_EXECUTION_ID,
    regression_ap_aging_residual_rejected: regression.ok === false,
    regression_code:
      regression.ok === false ? regression.code : null,
    CREATE_SANDBOX_JE: isJe3dCreateCapabilityEnabled(policy),
    VERIFY_SANDBOX_JE: isJe3dVerifyCapabilityEnabled(policy),
    sandboxDispatchKillSwitch: policy.sandboxDispatchKillSwitch,
    FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED:
      FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED,
    FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED:
      FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED,
    qbo_post: false,
    qbo_get: false,
    memory: false,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(2);
}

main();
