import type { CompanyJobDescriptionOverlay } from "../types";

export function validateCompanyOverlayDocument(overlay: CompanyJobDescriptionOverlay): void {
  if (overlay.tier !== 2) {
    throw new Error("overlay tier must be 2");
  }
  if ("addedCapabilities" in (overlay as Record<string, unknown>)) {
    throw new Error("overlay may not contain addedCapabilities");
  }
  if ("removedRestrictionIds" in (overlay as Record<string, unknown>)) {
    throw new Error("overlay may not contain removedRestrictionIds");
  }
}
