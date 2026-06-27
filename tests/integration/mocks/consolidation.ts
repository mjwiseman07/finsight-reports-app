import type { FrameworkId } from "../../../lib/intelligence/synthetic/standards/resolver/org-edge/types";
import type {
  IFRSInventory,
  IFRS_PPE,
  Inventory,
  PPE,
  USGAAPInventory,
  USGAAP_PPE,
} from "../../../lib/intelligence/synthetic/industry/contracts/manufacturing/ManufacturingBasisContracts";
import type { RegistryElectionEntry } from "../harness/registry-snapshot";

export interface EntityRecord {
  readonly orgId: string;
  readonly entityId: string;
  readonly vertical: string;
  readonly framework: FrameworkId;
  readonly inventory?: Inventory | null;
  readonly ppe?: PPE | null;
}

export interface ConsolidatedLine {
  readonly entityId: string;
  readonly framework: FrameworkId;
  readonly inventory: Inventory | null;
  readonly ppe: PPE | null;
  readonly hasRevaluationSurplus: boolean;
  readonly hasLifoReserve: boolean;
}

export interface MockEntityFactory {
  entity(input: Omit<EntityRecord, "inventory" | "ppe"> & Partial<Pick<EntityRecord, "inventory" | "ppe">>): EntityRecord;
  usGaapInventory(method: USGAAPInventory["method"]): USGAAPInventory;
  ifrsInventory(method?: IFRSInventory["method"]): IFRSInventory;
  usGaapPpe(): USGAAP_PPE;
  ifrsPpeRevalued(surplus: number): IFRS_PPE;
  toRegistryEntry(entity: EntityRecord): RegistryElectionEntry;
  consolidate(entities: readonly EntityRecord[]): readonly ConsolidatedLine[];
}

export function createMockEntityFactory(): MockEntityFactory {
  return {
    entity(input) {
      return Object.freeze({
        orgId: input.orgId,
        entityId: input.entityId,
        vertical: input.vertical,
        framework: input.framework,
        inventory: input.inventory ?? null,
        ppe: input.ppe ?? null,
      });
    },
    usGaapInventory(method) {
      const inv: USGAAPInventory =
        method === "LIFO"
          ? { basis: "US_GAAP", method, lifoReserve: 1000 }
          : { basis: "US_GAAP", method };
      return Object.freeze(inv);
    },
    ifrsInventory(method = "FIFO") {
      return Object.freeze({ basis: "IFRS", method } satisfies IFRSInventory);
    },
    usGaapPpe() {
      return Object.freeze({
        basis: "US_GAAP",
        measurement: "historical_cost",
        componentized: false,
      } satisfies USGAAP_PPE);
    },
    ifrsPpeRevalued(surplus) {
      return Object.freeze({
        basis: "IFRS",
        measurement: "revaluation",
        componentized: true,
        revaluationSurplus: surplus,
      } satisfies IFRS_PPE);
    },
    toRegistryEntry(entity) {
      return Object.freeze({
        orgId: entity.orgId,
        entityId: entity.entityId,
        framework: entity.framework,
        vertical: entity.vertical,
        electionEvidenceRef: `evidence://${entity.orgId}/${entity.entityId}`,
      });
    },
    consolidate(entities) {
      return Object.freeze(
        entities.map((entity) => {
          const inv = entity.inventory ?? null;
          const ppe = entity.ppe ?? null;
          return Object.freeze({
            entityId: entity.entityId,
            framework: entity.framework,
            inventory: inv,
            ppe,
            hasRevaluationSurplus: ppe?.basis === "IFRS" && ppe.revaluationSurplus !== undefined,
            hasLifoReserve: inv?.basis === "US_GAAP" && inv.lifoReserve !== undefined,
          } satisfies ConsolidatedLine);
        }),
      );
    },
  };
}
