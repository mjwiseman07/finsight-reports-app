/**
 * LOCK-VC C1 — vertical-discriminated election schema (42.7A extension).
 */
export type VerticalElectionCode = "RTL" | "MFG" | "NPO" | "HC" | "CROSS_VERTICAL";

export type VerticalElectionFieldType =
  | "enum"
  | "const"
  | "boolean"
  | "integer"
  | "discriminator"
  | "enum-deferred"
  | "iso-month-day";

export interface VerticalElectionFieldDefinition {
  readonly type: VerticalElectionFieldType;
  readonly values?: readonly string[];
  readonly default?: string | number | boolean;
  readonly value?: string | number | boolean;
  readonly lockedAtFirstClose?: boolean;
  readonly required?: boolean;
  readonly appliesTo?: string;
  readonly perProgram?: boolean;
  readonly lockedPerNetAssetPool?: boolean;
  readonly applicableWhenBasisIs?: string;
  readonly deferredToW3?: boolean;
  readonly min?: number;
  readonly max?: number;
  readonly qXRef?: string;
}

export type VerticalElectionGroup = Readonly<Record<string, VerticalElectionFieldDefinition>>;

export interface VerticalElectionsRegistry {
  readonly schemaVersion: string;
  readonly establishedAt: string;
  readonly verticalElections: Readonly<
    Record<VerticalElectionCode, VerticalElectionGroup>
  >;
}
