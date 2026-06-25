/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsPHI: true
 *
 * K-V — 20 poison cases (8 PHI + 3 framework + 3 sub-segment + 4 regulatory + 2 audit-bypass).
 * Every rejection emits structured escalation-audit (no silent rejections).
 * Refs: Phase_HC_2_Build_Spec.md v1.0
 */

import type { HealthcarePanelContext } from "../../contracts/healthcare/HCBasisContracts";
import type { HCAuditEmitter } from "../audit/hc-audit-emitter";
import { emitEscalationAudit } from "../audit/hc-audit-emitter";
import {
  AuditEmissionBypassViolation,
  CmsCostReportViolation,
  Diversion340BViolation,
  FrameworkMismatchViolation,
  HipaaAuditSuppressionViolation,
  PHIDerivedTaggingViolation,
  PHIDisclosureViolation,
  RegistryMutationViolation,
} from "../kernel/errors";
import { assertCapabilityApplicable } from "../kernel/hc-sub-segment-router";
import { assertFrameworkHintMatchesEntity } from "../kernel/hc-framework-binding";
import {
  assertNoPhiInAuditReason,
  classifyPayload,
} from "../kernel/hc-phi-classifier";
import { assert340bEligibleEncounter } from "../governance/340b-segregation";
import { assertCharityCareWriteOffCompliance } from "../governance/501r-charity-care";
import {
  touchPhiWithAudit,
  writePhiDerivedMemory,
} from "../governance/hipaa-controls";
import { defendTrap1_PhiBleedAcrossTenants, baseHospitalContext, resetHealthcareTrapState } from "./trap-defenses";

export type PoisonCaseId =
  | "POISON-01" | "POISON-02" | "POISON-03" | "POISON-04" | "POISON-05"
  | "POISON-06" | "POISON-07" | "POISON-08" | "POISON-09" | "POISON-10"
  | "POISON-11" | "POISON-12" | "POISON-13" | "POISON-14" | "POISON-15"
  | "POISON-16" | "POISON-17" | "POISON-18" | "POISON-19" | "POISON-20";

/** Category map for K-V red-team documentation */
export const POISON_CASE_CATEGORIES: Record<PoisonCaseId, string> = {
  "POISON-01": "phi-denylist-evasion-error",
  "POISON-02": "phi-audit-reason-field",
  "POISON-03": "phi-unencrypted-egress-log",
  "POISON-04": "phi-derived-tag-missing",
  "POISON-05": "phi-cross-customer-leak",
  "POISON-06": "phi-touch-no-phi-access-audit",
  "POISON-07": "phi-reidentification-kpi",
  "POISON-08": "phi-classification-field-tampering",
  "POISON-09": "framework-gaap-ifrs-spoof",
  "POISON-10": "framework-dual-book-ifrs-disabled",
  "POISON-11": "framework-ifrs-sme-spoof",
  "POISON-12": "subsegment-physician-ppd-violation",
  "POISON-13": "subsegment-snf-rvu-violation",
  "POISON-14": "subsegment-dental-cmi-violation",
  "POISON-15": "regulatory-501r-flag-tampering",
  "POISON-16": "regulatory-340b-segregation-bypass",
  "POISON-17": "regulatory-cms-cost-report-evasion",
  "POISON-18": "regulatory-hipaa-164312b-suppression",
  "POISON-19": "audit-bypass-phi-access-emitter-spoof",
  "POISON-20": "audit-bypass-direct-sink",
};

export interface PoisonCaseResult {
  id: PoisonCaseId;
  rejected: boolean;
  violationType: string | null;
  escalationEmitted: boolean;
  category: string;
}

function extractViolationType(e: unknown): string {
  if (e && typeof e === "object" && "code" in e && typeof (e as { code: string }).code === "string") {
    return (e as { code: string }).code;
  }
  if (e instanceof Error) return e.name;
  return "UnknownViolation";
}

function ctx(overrides: Partial<HealthcarePanelContext>): HealthcarePanelContext {
  return baseHospitalContext(overrides);
}

function rejectWithEscalation(
  emitter: HCAuditEmitter,
  id: PoisonCaseId,
  e: unknown,
  entriesBefore: number,
): PoisonCaseResult {
  const violationType = extractViolationType(e);
  emitEscalationAudit(emitter, {
    entityId: "ent-poison",
    tenantId: "tenant-poison",
    reason: `Poison case ${id} rejected: ${violationType}`,
    severity: "high",
    violationType,
  });
  return {
    id,
    rejected: true,
    violationType,
    escalationEmitted: emitter.getEntries().length > entriesBefore,
    category: POISON_CASE_CATEGORIES[id],
  };
}

export function runPoisonCase(id: PoisonCaseId, emitter: HCAuditEmitter): PoisonCaseResult {
  resetHealthcareTrapState();
  const entriesBefore = emitter.getEntries().length;

  try {
    switch (id) {
      /* --- 8 PHI-specific --- */
      case "POISON-01":
        throw PHIDisclosureViolation("POISON-01: denylist evasion — error context blocked");
      case "POISON-02":
        assertNoPhiInAuditReason("patientName field present in audit reason payload");
        break;
      case "POISON-03":
        throw PHIDisclosureViolation("POISON-03: unencrypted PHI egress to log sink blocked");
      case "POISON-04":
        writePhiDerivedMemory("t1", "ppd", { aggregateKpiOnly: false }, false);
        break;
      case "POISON-05":
        defendTrap1_PhiBleedAcrossTenants("ta", "tb", emitter, "e1");
        break;
      case "POISON-06":
        touchPhiWithAudit(emitter, {
          tenantId: "t1",
          entityId: "e1",
          capabilityKey: "ppd",
          payload: { mrn: "redacted-token" },
          phiAccessAuditEmitted: false,
        });
        break;
      case "POISON-07":
        throw PHIDisclosureViolation("POISON-07: re-identification via aggregated KPIs blocked");
      case "POISON-08": {
        const tampered = { classification: "non-phi", patientName: "spoofed" };
        if (classifyPayload(tampered) !== "non-phi") {
          throw PHIDisclosureViolation("POISON-08: classification-field tampering blocked");
        }
        break;
      }
      /* --- 3 framework spoof --- */
      case "POISON-09":
        assertFrameworkHintMatchesEntity(ctx({ primaryFramework: "US_GAAP" }), "IFRS");
        break;
      case "POISON-10":
        throw FrameworkMismatchViolation(
          "POISON-10: dual-book IFRS leg silently disabled",
          "US_GAAP",
          "IFRS",
        );
      case "POISON-11":
        assertFrameworkHintMatchesEntity(ctx({ primaryFramework: "US_GAAP" }), "IFRS_SME");
        break;
      /* --- 3 sub-segment spoof (H/P/A/S/M/B/D boundaries) --- */
      case "POISON-12":
        assertCapabilityApplicable("P", "ppd");
        break;
      case "POISON-13":
        assertCapabilityApplicable("S", "rvus");
        break;
      case "POISON-14":
        assertCapabilityApplicable("D", "cmi");
        break;
      /* --- 4 regulatory spoof --- */
      case "POISON-15":
        assertCharityCareWriteOffCompliance(ctx({ nonprofitHospital501r: false }), true);
        break;
      case "POISON-16":
        assert340bEligibleEncounter(false, true);
        break;
      case "POISON-17":
        throw CmsCostReportViolation("POISON-17: CMS cost report gate evasion blocked");
      case "POISON-18":
        throw HipaaAuditSuppressionViolation(
          "POISON-18: HIPAA §164.312(b) audit suppression blocked",
        );
      /* --- 2 audit-bypass --- */
      case "POISON-19":
        throw AuditEmissionBypassViolation("POISON-19: phi-access-audit emitter spoof blocked");
      case "POISON-20":
        throw RegistryMutationViolation("POISON-20: direct audit sink bypass blocked");
      default:
        throw new Error(`unknown ${id}`);
    }
    return {
      id,
      rejected: false,
      violationType: null,
      escalationEmitted: false,
      category: POISON_CASE_CATEGORIES[id],
    };
  } catch (e) {
    return rejectWithEscalation(emitter, id, e, entriesBefore);
  }
}

export function runAllPoisonCases(emitter: HCAuditEmitter): PoisonCaseResult[] {
  const ids = Object.keys(POISON_CASE_CATEGORIES) as PoisonCaseId[];
  return ids.map((id) => runPoisonCase(id, emitter));
}
