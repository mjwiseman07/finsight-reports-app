import type { AIPersonaId, CompanyJobDescriptionOverlay } from "../types";
import type { CompanyJobDescriptionReader } from "./CompanyJobDescriptionReader";

export class NullCompanyJobDescriptionReader implements CompanyJobDescriptionReader {
  read(_companyId: string | null, _personaId: AIPersonaId): CompanyJobDescriptionOverlay | null {
    return null;
  }
}
