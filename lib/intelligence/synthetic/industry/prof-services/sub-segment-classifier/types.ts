import { assertContainsProfessionalEngagementData } from "../../../standards/doctrine/containsProfessionalEngagementData";


export type ProfServicesSubSegment = "L" | "A" | "M" | "I" | "E" | "K";

export class SubSegmentAmbiguityError extends Error {
  escalationAudits: { channel: "escalation-audit"; code: string; message: string }[];
  constructor(message: string, matches: ProfServicesSubSegment[]) {
    super(message);
    this.name = "SubSegmentAmbiguityError";
    this.escalationAudits = [{
      channel: "escalation-audit",
      code: "PS_SUBSEGMENT_AMBIGUITY",
      message: `${message}: ${matches.join(",")}`,
    }];
  }
}

export interface ProfServicesClassifierInput {
  naicsCode: string;
  revenueMix?: Partial<Record<ProfServicesSubSegment, number>>;
  containsProfessionalEngagementData?: boolean;
}

