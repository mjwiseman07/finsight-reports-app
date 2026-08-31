import type { JeExecutionStatus } from "./execution-types";

export type ProductionJeExceptionAction =
  | "HALT_CREATE"
  | "EXACT_ID_GET"
  | "DISCOVERY_READBACK"
  | "MANUAL_RESOLUTION"
  | "MARK_REVERSAL_REQUIRED"
  | "PREPARE_GOVERNED_REVERSAL";

export type ProductionJeExceptionDisposition = {
  queue: string;
  ownerRole: "controller" | "incident_controller";
  severity: "high" | "critical";
  responseMinutes: number;
  permittedActions: readonly ProductionJeExceptionAction[];
  providerPostPermitted: false;
};

const DISPOSITIONS: Partial<
  Record<JeExecutionStatus, ProductionJeExceptionDisposition>
> = {
  POSTED_UNVERIFIED: {
    queue: "je_provider_verification",
    ownerRole: "controller",
    severity: "high",
    responseMinutes: 30,
    permittedActions: ["HALT_CREATE", "EXACT_ID_GET"],
    providerPostPermitted: false,
  },
  UNKNOWN_COMMIT: {
    queue: "je_unknown_commit",
    ownerRole: "incident_controller",
    severity: "critical",
    responseMinutes: 15,
    permittedActions: [
      "HALT_CREATE",
      "DISCOVERY_READBACK",
      "MANUAL_RESOLUTION",
      "MARK_REVERSAL_REQUIRED",
    ],
    providerPostPermitted: false,
  },
  VERIFICATION_MISMATCH: {
    queue: "je_verification_mismatch",
    ownerRole: "incident_controller",
    severity: "critical",
    responseMinutes: 15,
    permittedActions: [
      "HALT_CREATE",
      "MANUAL_RESOLUTION",
      "MARK_REVERSAL_REQUIRED",
    ],
    providerPostPermitted: false,
  },
  REVERSAL_REQUIRED: {
    queue: "je_reversal_required",
    ownerRole: "controller",
    severity: "high",
    responseMinutes: 30,
    permittedActions: ["HALT_CREATE", "PREPARE_GOVERNED_REVERSAL"],
    providerPostPermitted: false,
  },
};

export function getProductionJeExceptionDisposition(
  status: JeExecutionStatus,
): ProductionJeExceptionDisposition | null {
  return DISPOSITIONS[status] ?? null;
}
