import type { AssertionResult, ValidatorContext } from "../types";
import { assertPresence, narrativeHas } from "../helpers";

export function assertions(ctx: ValidatorContext): AssertionResult[] {
  const out: AssertionResult[] = [];
  const { extracted, expected } = ctx;

  out.push(
    assertPresence(
      ctx,
      "framework-declaration",
      "structural",
      Boolean(extracted.framework && expected.frameworkBinding.primary),
      "Per-entity framework declaration missing",
      { classification: "missing-field", severity: "critical" },
    ),
  );

  if (expected.frameworkBinding.prohibitsLifo) {
    const lifoSuspect =
      extracted.inventoryMethod?.toUpperCase().includes("LIFO") ||
      narrativeHas(extracted, [/\blifo\b/i]);
    out.push(
      assertPresence(
        ctx,
        "non-comingling-lifo",
        "structural",
        !lifoSuspect,
        "IFRS/IPSAS entity with LIFO signal (comingling suspect)",
        { classification: "comingling-suspect", severity: "critical" },
      ),
    );
  }

  for (const topic of expected.topics) {
    if (topic.reportingFramework !== expected.frameworkBinding.primary) {
      out.push(
        assertPresence(
          ctx,
          `framework-consistency-${topic.topicIdentifier}`,
          "structural",
          false,
          `Topic ${topic.topicIdentifier} framework inconsistent with primary binding`,
          {
            classification: "comingling-suspect",
            severity: "critical",
            observed: topic.reportingFramework,
            expected: expected.frameworkBinding.primary,
          },
        ),
      );
    }
  }

  return out;
}
