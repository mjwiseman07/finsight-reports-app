import {
  buildUniversalCanonicalSchema,
  type BuildUniversalCanonicalSchemaInput,
  type SyntheticUniversalCanonicalSchema,
} from "./buildUniversalCanonicalSchema";

export interface BuildUniversalCanonicalSchemasInput {
  items: BuildUniversalCanonicalSchemaInput[];
}

export interface BuildUniversalCanonicalSchemasResult {
  universalCanonicalSchemas: SyntheticUniversalCanonicalSchema[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildUniversalCanonicalSchemas(
  input: BuildUniversalCanonicalSchemasInput,
): BuildUniversalCanonicalSchemasResult {
  const universalCanonicalSchemas: SyntheticUniversalCanonicalSchema[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildUniversalCanonicalSchema(item);

    if (result.universalCanonicalSchema) {
      universalCanonicalSchemas.push(result.universalCanonicalSchema);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `universalCanonicalSchemas[${index}]: ${warning}`));
  });

  return {
    universalCanonicalSchemas,
    skippedIndexes,
    warnings,
  };
}
