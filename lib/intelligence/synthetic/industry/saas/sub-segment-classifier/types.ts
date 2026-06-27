import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";


export type SaaSSubSegment = "P" | "H" | "U" | "F" | "V";

export class SaaSSubSegmentAmbiguityError extends Error {
  escalationAudits: { channel: "escalation-audit"; code: string; message: string }[];
  constructor(message: string, matches: SaaSSubSegment[]) {
    super(message);
    this.name = "SaaSSubSegmentAmbiguityError";
    this.escalationAudits = [{
      channel: "escalation-audit",
      code: "SAAS_SUBSEGMENT_AMBIGUITY",
      message: `${message}: ${matches.join(",")}`,
    }];
  }
}

export interface SaaSSubSegmentClassifierInput {
  naicsCode?: string;
  hostingOnly?: boolean;
  subscriptionPricing?: boolean;
  onPremLicense?: boolean;
  professionalServicesPct?: number;
  billingModel?: "subscription" | "consumption" | "metered" | "freemium";
  freeTier?: boolean;
  paidConversionPath?: boolean;
  verticalSignal?: "health" | "accounting" | "legal" | "none";
  revenueMix?: Partial<Record<SaaSSubSegment, number>>;
  containsSaaSARRData?: boolean;
}

