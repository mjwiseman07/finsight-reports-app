/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 */

import type { GcAuditEmitter } from "../audit/gc-audit-emitter";
import type { AllowabilityInput, AllowabilityResult } from "../types";
import { evaluateAllowability_31_205_1 } from "./evaluate-31-205-1";
import { evaluateAllowability_31_205_2 } from "./evaluate-31-205-2";
import { evaluateAllowability_31_205_3 } from "./evaluate-31-205-3";
import { evaluateAllowability_31_205_4 } from "./evaluate-31-205-4";
import { evaluateAllowability_31_205_5 } from "./evaluate-31-205-5";
import { evaluateAllowability_31_205_7 } from "./evaluate-31-205-7";
import { evaluateAllowability_31_205_8 } from "./evaluate-31-205-8";
import { evaluateAllowability_31_205_9 } from "./evaluate-31-205-9";
import { evaluateAllowability_31_205_10 } from "./evaluate-31-205-10";
import { evaluateAllowability_31_205_11 } from "./evaluate-31-205-11";
import { evaluateAllowability_31_205_12 } from "./evaluate-31-205-12";
import { evaluateAllowability_31_205_13 } from "./evaluate-31-205-13";
import { evaluateAllowability_31_205_14 } from "./evaluate-31-205-14";
import { evaluateAllowability_31_205_15 } from "./evaluate-31-205-15";
import { evaluateAllowability_31_205_16 } from "./evaluate-31-205-16";
import { evaluateAllowability_31_205_17 } from "./evaluate-31-205-17";
import { evaluateAllowability_31_205_18 } from "./evaluate-31-205-18";
import { evaluateAllowability_31_205_19 } from "./evaluate-31-205-19";
import { evaluateAllowability_31_205_20 } from "./evaluate-31-205-20";
import { evaluateAllowability_31_205_21 } from "./evaluate-31-205-21";
import { evaluateAllowability_31_205_22 } from "./evaluate-31-205-22";
import { evaluateAllowability_31_205_23 } from "./evaluate-31-205-23";
import { evaluateAllowability_31_205_24 } from "./evaluate-31-205-24";
import { evaluateAllowability_31_205_25 } from "./evaluate-31-205-25";
import { evaluateAllowability_31_205_26 } from "./evaluate-31-205-26";
import { evaluateAllowability_31_205_27 } from "./evaluate-31-205-27";
import { evaluateAllowability_31_205_28 } from "./evaluate-31-205-28";
import { evaluateAllowability_31_205_29 } from "./evaluate-31-205-29";
import { evaluateAllowability_31_205_30 } from "./evaluate-31-205-30";
import { evaluateAllowability_31_205_31 } from "./evaluate-31-205-31";
import { evaluateAllowability_31_205_32 } from "./evaluate-31-205-32";
import { evaluateAllowability_31_205_33 } from "./evaluate-31-205-33";
import { evaluateAllowability_31_205_34 } from "./evaluate-31-205-34";
import { evaluateAllowability_31_205_35 } from "./evaluate-31-205-35";
import { evaluateAllowability_31_205_36 } from "./evaluate-31-205-36";
import { evaluateAllowability_31_205_37 } from "./evaluate-31-205-37";
import { evaluateAllowability_31_205_38 } from "./evaluate-31-205-38";
import { evaluateAllowability_31_205_39 } from "./evaluate-31-205-39";
import { evaluateAllowability_31_205_40 } from "./evaluate-31-205-40";
import { evaluateAllowability_31_205_41 } from "./evaluate-31-205-41";
import { evaluateAllowability_31_205_42 } from "./evaluate-31-205-42";
import { evaluateAllowability_31_205_43 } from "./evaluate-31-205-43";
import { evaluateAllowability_31_205_44 } from "./evaluate-31-205-44";
import { evaluateAllowability_31_205_45 } from "./evaluate-31-205-45";
import { evaluateAllowability_31_205_47 } from "./evaluate-31-205-47";
import { evaluateAllowability_31_205_48 } from "./evaluate-31-205-48";
import { evaluateAllowability_31_205_49 } from "./evaluate-31-205-49";
import { evaluateAllowability_31_205_50 } from "./evaluate-31-205-50";
import { evaluateAllowability_31_205_51 } from "./evaluate-31-205-51";
import { evaluateAllowability_31_205_52 } from "./evaluate-31-205-52";
import { evaluateAllowability_31_205_6 } from "./evaluate-31-205-6";
import { evaluateAllowability_31_205_46 } from "./evaluate-31-205-46";

export const FAR_31_205_SUBSECTION_COUNT = 50;

const DISPATCH: Record<string, (input: AllowabilityInput, emitter: GcAuditEmitter) => AllowabilityResult> = {
  "1": evaluateAllowability_31_205_1,
  "2": evaluateAllowability_31_205_2,
  "3": evaluateAllowability_31_205_3,
  "4": evaluateAllowability_31_205_4,
  "5": evaluateAllowability_31_205_5,
  "7": evaluateAllowability_31_205_7,
  "8": evaluateAllowability_31_205_8,
  "9": evaluateAllowability_31_205_9,
  "10": evaluateAllowability_31_205_10,
  "11": evaluateAllowability_31_205_11,
  "12": evaluateAllowability_31_205_12,
  "13": evaluateAllowability_31_205_13,
  "14": evaluateAllowability_31_205_14,
  "15": evaluateAllowability_31_205_15,
  "16": evaluateAllowability_31_205_16,
  "17": evaluateAllowability_31_205_17,
  "18": evaluateAllowability_31_205_18,
  "19": evaluateAllowability_31_205_19,
  "20": evaluateAllowability_31_205_20,
  "21": evaluateAllowability_31_205_21,
  "22": evaluateAllowability_31_205_22,
  "23": evaluateAllowability_31_205_23,
  "24": evaluateAllowability_31_205_24,
  "25": evaluateAllowability_31_205_25,
  "26": evaluateAllowability_31_205_26,
  "27": evaluateAllowability_31_205_27,
  "28": evaluateAllowability_31_205_28,
  "29": evaluateAllowability_31_205_29,
  "30": evaluateAllowability_31_205_30,
  "31": evaluateAllowability_31_205_31,
  "32": evaluateAllowability_31_205_32,
  "33": evaluateAllowability_31_205_33,
  "34": evaluateAllowability_31_205_34,
  "35": evaluateAllowability_31_205_35,
  "36": evaluateAllowability_31_205_36,
  "37": evaluateAllowability_31_205_37,
  "38": evaluateAllowability_31_205_38,
  "39": evaluateAllowability_31_205_39,
  "40": evaluateAllowability_31_205_40,
  "41": evaluateAllowability_31_205_41,
  "42": evaluateAllowability_31_205_42,
  "43": evaluateAllowability_31_205_43,
  "44": evaluateAllowability_31_205_44,
  "45": evaluateAllowability_31_205_45,
  "47": evaluateAllowability_31_205_47,
  "48": evaluateAllowability_31_205_48,
  "49": evaluateAllowability_31_205_49,
  "50": evaluateAllowability_31_205_50,
  "51": evaluateAllowability_31_205_51,
  "52": evaluateAllowability_31_205_52,
};

export function evaluateFar31205Allowability(
  subsection: string,
  input: AllowabilityInput,
  emitter: GcAuditEmitter,
): AllowabilityResult {
  if (subsection === "6") return evaluateAllowability_31_205_6(input, emitter);
  if (subsection === "46") return evaluateAllowability_31_205_46(input, emitter);
  const evaluator = DISPATCH[subsection];
  if (!evaluator) {
    throw Object.assign(new Error(`Unknown FAR 31.205 subsection: ${subsection}`), {
      code: "GOVCON_FAR_UNKNOWN_SUBSECTION",
      escalationAudits: [{ channel: "escalation-audit", code: "GOVCON_FAR_UNKNOWN_SUBSECTION", message: `Unknown subsection ${subsection}` }],
    });
  }
  return evaluator(input, emitter);
}

export { evaluateAllowability_31_205_6 };
