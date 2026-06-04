import type {
  SyntheticCompanyMemoryConfidence,
  SyntheticCompanyMemorySourceRef,
  SyntheticEntityAlias,
  SyntheticEntityAliasType,
} from "./types";
import { stableMemoryHash } from "./stableMemoryHash";

export function buildEntityAlias(input: {
  entityType: SyntheticEntityAliasType;
  canonicalEntityId?: string;
  canonicalName: string;
  aliases: string[];
  normalizationRules?: string[];
  firstObservedPeriod: string;
  lastObservedPeriod: string;
  sourceRefs: SyntheticCompanyMemorySourceRef[];
  confidence: SyntheticCompanyMemoryConfidence;
}): SyntheticEntityAlias {
  const aliases = [...new Set(input.aliases)].sort();
  const aliasId = stableMemoryHash({
    type: "entity_alias",
    entityType: input.entityType,
    canonicalEntityId: input.canonicalEntityId,
    canonicalName: input.canonicalName,
    aliases,
  });

  return {
    aliasId,
    entityType: input.entityType,
    canonicalEntityId: input.canonicalEntityId,
    canonicalName: input.canonicalName,
    aliases,
    normalizationRules: input.normalizationRules,
    firstObservedPeriod: input.firstObservedPeriod,
    lastObservedPeriod: input.lastObservedPeriod,
    sourceRefs: input.sourceRefs,
    confidence: input.confidence,
  };
}
