import type { AssertionResult, ValidatorContext } from "../types";
import {
  assertNumericTolerance,
  assertPresence,
  findFactByPattern,
  hasFactTag,
  narrativeHas,
} from "../helpers";
import {
  emitterSatisfiesAssertion,
  runRetailRouter,
  withRouterNarratives,
} from "../../../../lib/router/retail";
import {
  hasAnyLeaseAsc842Input,
  hasAnyLeaseIfrs16Input,
} from "../../../../lib/router/lanes/retail/types";

function augmentedCtx(ctx: ValidatorContext): ValidatorContext {
  return { ...ctx, extracted: withRouterNarratives(ctx.extracted) };
}

function assertInventoryMethodDeclared(ctx: ValidatorContext): AssertionResult {
  const router = runRetailRouter(ctx.extracted);
  if (router.frameworkViolation) {
    return {
      id: "inventory-method-declared",
      pack: ctx.vertical,
      tier: "structural",
      passed: false,
      message: router.frameworkViolation.message,
      classification: "framework-mismatch",
      severity: "critical",
    };
  }
  const emitter = emitterSatisfiesAssertion(router.results, "inventory-method-declared");
  if (emitter.satisfied) {
    return {
      id: "inventory-method-declared",
      pack: ctx.vertical,
      tier: "structural",
      passed: true,
      message: `satisfied by emitter ${emitter.emitterPath} at citation ${emitter.citation}`,
    };
  }
  const inventoryDeclared =
    Boolean(ctx.extracted.inventory?.cost_formula) ||
    Boolean(ctx.extracted.inventoryMethod) ||
    narrativeHas(ctx.extracted, [/fifo/i, /lifo/i, /weighted average/i, /inventory method/i]);
  return assertPresence(
    augmentedCtx(ctx),
    "inventory-method-declared",
    "structural",
    inventoryDeclared,
    "Inventory measurement method not declared in filing extract",
    { classification: "missing-field", severity: "high" },
  );
}

function assertLeaseObligations(ctx: ValidatorContext): AssertionResult {
  const router = runRetailRouter(ctx.extracted);
  if (
    router.frameworkViolation &&
    ((ctx.extracted.framework === "ifrs" && hasAnyLeaseAsc842Input(ctx.extracted)) ||
      (ctx.extracted.framework === "us-gaap" && hasAnyLeaseIfrs16Input(ctx.extracted)))
  ) {
    return {
      id: "lease-obligations",
      pack: ctx.vertical,
      tier: "structural",
      passed: true,
      message: `framework rejection surfaced: ${router.frameworkViolation.citation} — ${router.frameworkViolation.remediation}`,
    };
  }
  const emitter = emitterSatisfiesAssertion(router.results, "lease-obligations");
  if (emitter.satisfied) {
    return {
      id: "lease-obligations",
      pack: ctx.vertical,
      tier: "structural",
      passed: true,
      message: `satisfied by emitter ${emitter.emitterPath} at citation ${emitter.citation}`,
    };
  }
  return assertPresence(
    augmentedCtx(ctx),
    "lease-obligations",
    "structural",
    hasFactTag(ctx.extracted, ["OperatingLeaseLiability", "FinanceLeaseLiability"]) ||
      narrativeHas(augmentedCtx(ctx).extracted, [/lease obligation/i, /asc 842/i, /ifrs 16/i]),
    "Lease obligations (ASC 842 / IFRS 16) not evidenced",
    { classification: "missing-field", severity: "medium" },
  );
}

export function assertions(ctx: ValidatorContext): AssertionResult[] {
  const out: AssertionResult[] = [];
  const { extracted, tolerances } = ctx;

  out.push(assertInventoryMethodDeclared(ctx));

  if (ctx.framework === "ifrs" || ctx.framework === "ipsas") {
    const router = runRetailRouter(extracted);
    if (router.frameworkViolation) {
      out.push({
        id: "ifrs-lifo-prohibition",
        pack: ctx.vertical,
        tier: "structural",
        passed: true,
        message: `framework violation surfaced: ${router.frameworkViolation.citation} — ${router.frameworkViolation.remediation}`,
      });
    } else {
      const lifoSuspect =
        extracted.inventory?.cost_formula === "LIFO" ||
        extracted.inventoryMethod?.toUpperCase().includes("LIFO") ||
        narrativeHas(extracted, [/\blifo\b/i]);
      out.push(
        assertPresence(
          ctx,
          "ifrs-lifo-prohibition",
          "structural",
          !lifoSuspect,
          "IFRS retail filing shows LIFO inventory (comingling suspect)",
          {
            classification: "comingling-suspect",
            severity: "critical",
            observed: extracted.inventoryMethod ?? "LIFO signal in narrative",
            expected: "FIFO or weighted-average only",
          },
        ),
      );
    }
  }

  const cogs = findFactByPattern(extracted, /CostOfGoods|CostOfRevenue|CostOfSales/i);
  if (cogs) {
    out.push(
      assertNumericTolerance(
        ctx,
        "cogs-tolerance",
        "numeric",
        cogs.tag,
        tolerances.tightPct,
        "tolerance-exceeded",
        "medium",
      ),
    );
  }

  out.push(
    assertPresence(
      augmentedCtx(ctx),
      "comp-sales-presence",
      "narrative",
      narrativeHas(augmentedCtx(ctx).extracted, [/comparable store/i, /same store/i, /comp sales/i]),
      "Same-store / comparable sales disclosure not present",
      { classification: "narrative-gap", severity: "low" },
    ),
  );

  out.push(assertLeaseObligations(ctx));

  out.push(
    assertPresence(
      augmentedCtx(ctx),
      "channel-disaggregation",
      "structural",
      narrativeHas(augmentedCtx(ctx).extracted, [/e-?commerce/i, /online/i, /in-?store/i, /digital/i]),
      "E-commerce vs in-store disaggregation not present when expected for retail",
      { classification: "narrative-gap", severity: "low" },
    ),
  );

  return out;
}
