export const GENERIC_TREATMENT_11_US_GAAP_TOPIC_IDENTIFIER = "generic_smb_ar_allowance_cecl" as const;
export const GENERIC_TREATMENT_11_IFRS_IASB_TOPIC_IDENTIFIER = "generic_smb_ar_allowance_ecl" as const;

/** @deprecated Use GENERIC_TREATMENT_11_US_GAAP_TOPIC_IDENTIFIER */
export const GENERIC_TREATMENT_11_TOPIC_IDENTIFIER = GENERIC_TREATMENT_11_US_GAAP_TOPIC_IDENTIFIER;

export const GENERIC_TREATMENT_11_AR_ALLOWANCE_TOPIC_IDENTIFIERS = [
  GENERIC_TREATMENT_11_US_GAAP_TOPIC_IDENTIFIER,
  GENERIC_TREATMENT_11_IFRS_IASB_TOPIC_IDENTIFIER,
] as const;

export function isGenericTreatment11ArAllowanceTopic(topicIdentifier: string): boolean {
  return (GENERIC_TREATMENT_11_AR_ALLOWANCE_TOPIC_IDENTIFIERS as readonly string[]).includes(
    topicIdentifier,
  );
}

export interface GenericTreatmentApplicabilityGuardRequiresAttestation {
  poolName: "string";
  nonPatientCharacterization: "string";
  authoritativeBasis: "string";
  attestor: "LIB-2 shape";
  specialistReviewerOfRecord: "LIB-2 shape, REQUIRED";
}

export interface GenericTreatmentApplicabilityGuard {
  blockedIndustries: ["healthcare_provider"];
  blockReason: string;
  overrideAllowed: false;
  bypassRequiresEngineering: true;
  nonPatientPoolException: {
    allowed: true;
    poolLevelOnly: true;
    requiresAttestation: GenericTreatmentApplicabilityGuardRequiresAttestation;
  };
}

export interface GenericTreatmentForcedRecalibrationConstraint {
  appliesWhen: "determinationOutcome == 'no_relevant_history'";
  thresholdMonths: 24;
  warningSchedule: [18, 21, 23];
  blockBehavior: "refuse_period_close";
  resolutionPaths: [
    "history_sufficient_transition",
    "no_history_reattestation",
    "treatment_unbind",
    "support_grace_extension",
  ];
  gracePeriodDays: 60;
  gracePeriodRenewable: false;
}

export interface GenericTreatmentExecutionConstraints {
  forcedRecalibration: GenericTreatmentForcedRecalibrationConstraint;
}

export const GENERIC_TREATMENT_11_APPLICABILITY_GUARD: GenericTreatmentApplicabilityGuard = {
  blockedIndustries: ["healthcare_provider"],
  blockReason:
    "Patient service revenue receivables are measured under ASC 606 implicit price concession methodology (42M Treatments 1 and 3), not ASC 326-20 CECL.",
  overrideAllowed: false,
  bypassRequiresEngineering: true,
  nonPatientPoolException: {
    allowed: true,
    poolLevelOnly: true,
    requiresAttestation: {
      poolName: "string",
      nonPatientCharacterization: "string",
      authoritativeBasis: "string",
      attestor: "LIB-2 shape",
      specialistReviewerOfRecord: "LIB-2 shape, REQUIRED",
    },
  },
};

export const GENERIC_TREATMENT_11_EXECUTION_CONSTRAINTS: GenericTreatmentExecutionConstraints = {
  forcedRecalibration: {
    appliesWhen: "determinationOutcome == 'no_relevant_history'",
    thresholdMonths: 24,
    warningSchedule: [18, 21, 23],
    blockBehavior: "refuse_period_close",
    resolutionPaths: [
      "history_sufficient_transition",
      "no_history_reattestation",
      "treatment_unbind",
      "support_grace_extension",
    ],
    gracePeriodDays: 60,
    gracePeriodRenewable: false,
  },
};
