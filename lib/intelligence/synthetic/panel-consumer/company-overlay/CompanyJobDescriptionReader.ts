import type { AIPersonaId, CompanyJobDescriptionOverlay } from "../types";

export interface CompanyJobDescriptionReader {
  read(companyId: string | null, personaId: AIPersonaId): CompanyJobDescriptionOverlay | null;
}
