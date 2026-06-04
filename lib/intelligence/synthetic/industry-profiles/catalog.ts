import type { SyntheticIndustryProfile } from "../types/industry-profile";
import { bookkeeperProfile } from "./bookkeeper/profile";
import { constructionProfile } from "./construction/profile";
import { cpaFirmProfile } from "./cpa-firm/profile";
import { healthcareProfile } from "./healthcare/profile";
import { manufacturingProfile } from "./manufacturing/profile";
import { professionalServicesProfile } from "./professional-services/profile";
import { retailProfile } from "./retail/profile";

export const syntheticIndustryProfileCatalog: SyntheticIndustryProfile[] = [
  healthcareProfile,
  constructionProfile,
  manufacturingProfile,
  retailProfile,
  professionalServicesProfile,
  cpaFirmProfile,
  bookkeeperProfile,
];
