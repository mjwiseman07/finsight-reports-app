import type {
  VerticalElectionFieldDefinition,
  VerticalElectionsRegistry,
} from "./election-schema";

function validateFieldDefinition(
  path: string,
  field: VerticalElectionFieldDefinition,
): void {
  if (!field.type) {
    throw new Error(`${path}: type required`);
  }
  if (field.type === "enum" && (!field.values || field.values.length === 0)) {
    throw new Error(`${path}: enum requires values`);
  }
  if (field.type === "const" && field.value === undefined) {
    throw new Error(`${path}: const requires value`);
  }
  if (field.type === "integer") {
    if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
      throw new Error(`${path}: integer min > max`);
    }
  }
}

function validateFieldGroup(
  path: string,
  fields: Readonly<Record<string, unknown>>,
): void {
  for (const [name, value] of Object.entries(fields)) {
    const childPath = `${path}.${name}`;
    if (!value || typeof value !== "object") {
      throw new Error(`${childPath}: expected object`);
    }
    if ("type" in value) {
      validateFieldDefinition(childPath, value as VerticalElectionFieldDefinition);
      continue;
    }
    validateFieldGroup(childPath, value as Readonly<Record<string, unknown>>);
  }
}

export function validateVerticalElectionsRegistry(
  registry: VerticalElectionsRegistry,
): void {
  if (!registry.schemaVersion) {
    throw new Error("verticalElections: schemaVersion required");
  }
  if (!registry.establishedAt) {
    throw new Error("verticalElections: establishedAt required");
  }
  if (!registry.verticalElections || typeof registry.verticalElections !== "object") {
    throw new Error("verticalElections: verticalElections object required");
  }
  for (const [group, fields] of Object.entries(registry.verticalElections)) {
    validateFieldGroup(`verticalElections.${group}`, fields as Readonly<Record<string, unknown>>);
  }
}

export function lookupDotPath(
  root: unknown,
  dotPath: string,
): unknown {
  return dotPath.split(".").reduce<unknown>((current, key) => {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    return (current as Record<string, unknown>)[key];
  }, root);
}
