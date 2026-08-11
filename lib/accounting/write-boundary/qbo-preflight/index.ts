// W1c.1 barrel — public surface of the ported Q7 preflight helpers.
// Callers should import from here, not from individual files.

export {
  QBO_EDITION_CAPABILITIES,
  parseOfferingSku,
  parseSubscriptionStatus,
  subscriptionAllowsWrites,
  capabilityForEdition,
  type QboEdition,
  type QboSubscriptionStatus,
  type QboCapability,
} from "./qbo-editions";

export {
  resolveQBOTokenForFirmClient,
  refreshQBOToken,
  type QBOTokenBundle,
  type QBOTokenSource,
  type ResolveTokenOptions,
} from "./token-resolver";

export {
  canPostToQBO,
  type WritePreflightResult,
  type WritePreflightReason,
  type CanPostOptions,
} from "./write-preflight";

export {
  validateJEPayload,
  type ValidationResult as QboJeValidationResult,
} from "./je-validator";

export {
  resolveCurrencyForFirmClient,
  type CurrencyResolution,
} from "./currency-resolver";

export {
  resolveExchangeRate,
  type ExchangeRateResult,
} from "./exchange-rate";

export {
  checkQBOHealth,
  type QBOHealthStatus,
  type QBOHealthResult,
} from "./health-checker";
