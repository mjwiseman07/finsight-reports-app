import type { TieOutKind } from "@/lib/audit-ready/tie-out-kind-classifier";
import type { WorkpaperEmitter } from "@/lib/audit-ready/tie-out/workpaper-emitter";
import { bsAccountEmitter } from "./bs-account-emitter";
import { faRollforwardEmitter } from "./fa-rollforward-emitter";
import { bsSummaryEmitter } from "./bs-summary-emitter";
import { apEmitter } from "./ap-emitter";
import { arEmitter } from "./ar-emitter";
import { inventoryEmitter } from "./inventory-emitter";
import { grniEmitter } from "./grni-emitter";

export const EMITTER_REGISTRY: Partial<Record<TieOutKind, WorkpaperEmitter>> = {
  bs_account_recon: bsAccountEmitter,
  fixed_asset_rollforward: faRollforwardEmitter,
  bs_recon_summary: bsSummaryEmitter,
  ap_aging: apEmitter,
  ar_aging: arEmitter,
  inventory: inventoryEmitter,
  grni: grniEmitter,
};

export const SHIPPED_EMITTER_KINDS = Object.keys(
  EMITTER_REGISTRY,
) as TieOutKind[];

export function getEmitter(kind: TieOutKind): WorkpaperEmitter | null {
  return EMITTER_REGISTRY[kind] ?? null;
}
