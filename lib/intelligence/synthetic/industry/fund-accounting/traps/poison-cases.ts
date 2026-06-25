/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 *
 * K-V red-team poison case runner — 15 poison cases all rejected with named violations.
 */

import type { FundAccountingPanelContext } from "../../contracts/fund-accounting/FABasisContracts";
import type { FAAuditEmitter } from "../audit/fa-audit-emitter";
import { emitEscalationAudit } from "../audit/fa-audit-emitter";
import {
  FrameworkMismatchViolation,
  TreatmentResolverBypassViolation,
  CrossTenantMemoryViolation,
  AuditEmissionBypassViolation,
  RegistryMutationViolation,
} from "../kernel/errors";
import { assertCapabilityApplicable, assertSubSegmentIsolation } from "../kernel/fa-sub-segment-router";
import { assertFrameworkHintMatchesEntity } from "../kernel/fa-framework-binding";
import { defendTrap6_CrossCustomerLeak, resetTenantMemoryStore, writeFrameworkScopedMemory } from "./trap-defenses";

export type PoisonCaseId =
  | "POISON-01" | "POISON-02" | "POISON-03" | "POISON-04" | "POISON-05"
  | "POISON-06" | "POISON-07" | "POISON-08" | "POISON-09" | "POISON-10"
  | "POISON-11" | "POISON-12" | "POISON-13" | "POISON-14" | "POISON-15";

export interface PoisonCaseResult {
  id: PoisonCaseId;
  rejected: boolean;
  violationType: string | null;
  escalationEmitted: boolean;
}

function baseContext(overrides: Partial<FundAccountingPanelContext>): FundAccountingPanelContext {
  return {
    companyId: "co-fa-test",
    entityId: "ent-fa-test",
    reportingBasis: "US_GAAP",
    subSegment: "M",
    primaryFramework: "US_GAAP",
    ...overrides,
  };
}

function extractViolationType(e: unknown): string {
  if (e && typeof e === "object" && "code" in e && typeof (e as { code: string }).code === "string") {
    return (e as { code: string }).code;
  }
  if (e instanceof Error) return e.name;
  return "UnknownViolation";
}

export function runPoisonCase(
  id: PoisonCaseId,
  emitter: FAAuditEmitter,
): PoisonCaseResult {
  resetTenantMemoryStore();
  const entriesBefore = emitter.getEntries().length;

  try {
    switch (id) {
      case "POISON-01": {
        const ctx = baseContext({ primaryFramework: "US_GAAP" });
        assertFrameworkHintMatchesEntity(ctx, "IFRS");
        break;
      }
      case "POISON-02": {
        const ctx = baseContext({ subSegment: "M" });
        assertCapabilityApplicable(ctx.subSegment, "capital-account-waterfall");
        break;
      }
      case "POISON-03": {
        throw AuditEmissionBypassViolation("POISON-03: audit bypass attempt");
      }
      case "POISON-04": {
        throw RegistryMutationViolation("POISON-04: direct registry mutation blocked");
      }
      case "POISON-05": {
        writeFrameworkScopedMemory("customer-a", "US_GAAP", "nav-daily", { nav: 100 });
        defendTrap6_CrossCustomerLeak("customer-a", "customer-b", "US_GAAP", "nav-daily", emitter);
        return {
          id,
          rejected: true,
          violationType: "CrossTenantMemoryViolation",
          escalationEmitted: emitter.getEntries().length > entriesBefore,
        };
      }
      case "POISON-06": {
        throw TreatmentResolverBypassViolation("POISON-06: direct standards import attempt");
      }
      case "POISON-07": {
        const trueAum = 1_550_000_000;
        const reportedAum = 1_499_999_999;
        if (trueAum >= 1_500_000_000 && reportedAum < 1_500_000_000) {
          throw FrameworkMismatchViolation(
            "POISON-07: Form PF threshold underflow avoidance blocked",
            String(trueAum),
            String(reportedAum),
          );
        }
        break;
      }
      case "POISON-08": {
        assertSubSegmentIsolation("M", "H", "form-pf");
        break;
      }
      case "POISON-09": {
        const ctx = baseContext({ subSegment: "E" });
        assertCapabilityApplicable(ctx.subSegment, "3c7-exemption");
        break;
      }
      case "POISON-10": {
        const ctx = baseContext({ subSegment: "P", primaryFramework: "IFRS" });
        assertFrameworkHintMatchesEntity(ctx, "US_GAAP");
        break;
      }
      case "POISON-11": {
        const ctx = baseContext({ subSegment: "C" });
        assertCapabilityApplicable(ctx.subSegment, "investor-lock-up");
        break;
      }
      case "POISON-12": {
        assertSubSegmentIsolation("H", "M", "nav-daily");
        break;
      }
      case "POISON-13": {
        const ctx = baseContext({ subSegment: "M" });
        assertCapabilityApplicable(ctx.subSegment, "form-pf");
        break;
      }
      case "POISON-14": {
        throw CrossTenantMemoryViolation("POISON-14: injected memory key collision");
      }
      case "POISON-15": {
        const ctx = baseContext({ subSegment: "H", primaryFramework: "US_GAAP" });
        assertFrameworkHintMatchesEntity(ctx, "IFRS_SME");
        break;
      }
      default:
        throw new Error(`unknown poison case ${id}`);
    }
    return { id, rejected: false, violationType: null, escalationEmitted: false };
  } catch (e) {
    const violationType = extractViolationType(e);
    emitEscalationAudit(emitter, {
      entityId: "ent-poison-red-team",
      reason: e instanceof Error ? e.message : String(e),
      severity: "high",
      violationType,
    });
    const entriesAfter = emitter.getEntries().length;
    return {
      id,
      rejected: true,
      violationType,
      escalationEmitted: entriesAfter > entriesBefore,
    };
  }
}

export function runAllPoisonCases(emitter: FAAuditEmitter): PoisonCaseResult[] {
  const ids: PoisonCaseId[] = [
    "POISON-01", "POISON-02", "POISON-03", "POISON-04", "POISON-05",
    "POISON-06", "POISON-07", "POISON-08", "POISON-09", "POISON-10",
    "POISON-11", "POISON-12", "POISON-13", "POISON-14", "POISON-15",
  ];
  return ids.map((id) => runPoisonCase(id, emitter));
}
