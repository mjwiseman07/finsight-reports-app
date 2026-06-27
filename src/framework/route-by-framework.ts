import type { AccountingFramework } from "./types";
import { FrameworkCrossBlendError, FrameworkUnsetError } from "./cross-blend";

export function routeByFramework<T>(
  entity: { framework: AccountingFramework | undefined | null },
  handlers: {
    US_GAAP: () => T;
    IFRS: () => T;
    IPSAS: () => T;
    NON_GAAP: () => T;
  },
): T {
  if (entity.framework == null) {
    throw new FrameworkUnsetError(
      "AccountingFramework not declared — explicit selection required (Q3=B).",
    );
  }
  switch (entity.framework) {
    case "US_GAAP":
      return handlers.US_GAAP();
    case "IFRS":
      return handlers.IFRS();
    case "IPSAS":
      return handlers.IPSAS();
    case "NON_GAAP":
      return handlers.NON_GAAP();
    default:
      throw new FrameworkCrossBlendError(
        `Unrecognized framework: ${String((entity as { framework: unknown }).framework)}`,
      );
  }
}
