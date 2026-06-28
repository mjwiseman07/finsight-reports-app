import type { GapEntry } from "../../../scripts/external-truth/types";
import { RegisterClassificationMismatchError } from "./errors";
import type { CrossoverContext, CrossoverValidatorResult } from "./types";

export const VALIDATOR_NAME = "register-classification";

const B6_GAP_IDS = ["GAP-0174", "GAP-0177", "GAP-0180"] as const;

export function validateRegisterClassification(ctx: CrossoverContext): CrossoverValidatorResult {
  for (const gap of ctx.register.gaps) {
    if (gap.closed_in && gap.triage !== "satisfied") {
      throw new RegisterClassificationMismatchError(
        `${gap.id}: closed_in present but triage is ${gap.triage}`,
      );
    }
    if (gap.triage === "satisfied" && !gap.closed_in) {
      throw new RegisterClassificationMismatchError(`${gap.id}: satisfied without closed_in`);
    }
    if (
      gap.closure_mechanism === "emitter-satisfaction" &&
      gap.triage === "satisfied" &&
      !gap.emitter_path
    ) {
      throw new RegisterClassificationMismatchError(`${gap.id}: emitter-satisfaction without emitter_path`);
    }
  }

  for (const gapId of B6_GAP_IDS) {
    const gap = ctx.register.gaps.find((g: GapEntry) => g.id === gapId);
    if (!gap) {
      throw new RegisterClassificationMismatchError(`${gapId}: missing from register`);
    }
    if (gap.triage !== "document-limitation") {
      throw new RegisterClassificationMismatchError(
        `${gapId}: expected document-limitation, got ${gap.triage}`,
      );
    }
    if (!gap.message.includes("channel-disaggregation")) {
      throw new RegisterClassificationMismatchError(
        `${gapId}: expected rtl/channel-disaggregation, got ${gap.message.split(":")[0]}`,
      );
    }
    if (gap.framework !== "us-gaap") {
      throw new RegisterClassificationMismatchError(`${gapId}: expected us-gaap framework`);
    }
  }

  return {
    validator: VALIDATOR_NAME,
    passed: true,
    haltOnFailure: true,
    detail: `validated ${ctx.register.gaps.length} register entries; B6 GAP-0174/0177/0180 channel-disag doc-lim confirmed`,
  };
}
