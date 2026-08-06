/**
 * MAJOR #2.3 Block B.1 — citation lookup.
 *
 * Server-side lookup from mapping_source (DB enum-ish text) to the customer-
 * facing citation label + URL. Single source of truth — Block B.2 never
 * hardcodes citation strings, it renders finding.citation directly.
 *
 * Every URL below appears verbatim in
 * research/schema_drift_assertion_mapping_research.md.
 */

import type { Citation, MappingSource } from "./types";

const ISA_315_URL =
  "https://www.ibr-ire.be/docs/default-source/nl/documents/regelgeving-en-publicaties/rechtsleer/normen-en-aanbevelingen/isa-s/isa-english-version/isa-315-revised-2019_en.pdf?sfvrsn=5d10e4d9_1";

const KPMG_ICFR_URL =
  "https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2023/handbook-internal-controls-over-financial-reporting.pdf";

const COBIT_MANAGED_DATA_URL =
  "https://www.studocu.com/fr-ca/document/hec-montreal/systemes-dinformation-en-gestion/it-control-objectives-for-sarbanes-oxley-97-118/121457358";

const METHODOLOGY_PAGE = "/methodology/platform-integrity";

const CITATIONS: Readonly<Record<MappingSource, Citation>> = {
  ISA_315_A190_a_iii: {
    source_key: "ISA_315_A190_a_iii",
    label: "ISA 315 Para A190(a)(iii)",
    url: ISA_315_URL,
    note: 'Accuracy: "amounts and other data relating to recorded transactions... have been recorded appropriately."',
  },
  ISA_315_A190_a_ii: {
    source_key: "ISA_315_A190_a_ii",
    label: "ISA 315 Para A190(a)(ii)",
    url: ISA_315_URL,
    note: "Completeness: transactions and events that should have been recorded have been recorded.",
  },
  ISA_315_12_d_i: {
    source_key: "ISA_315_12_d_i",
    label: "ISA 315 Para 12(d)/(i)",
    url: ISA_315_URL,
    note: "Integrity of information: completeness, accuracy and validity.",
  },
  COBIT_MANAGED_DATA: {
    source_key: "COBIT_MANAGED_DATA",
    label: "COBIT 2019 Managed Data",
    url: COBIT_MANAGED_DATA_URL,
    note: "Data management controls provide reasonable assurance that data recorded, processed and reported remain complete, accurate and valid.",
  },
  KPMG_Q6_4_110: {
    source_key: "KPMG_Q6_4_110",
    label: "KPMG ICFR Handbook Q6.4.110",
    url: KPMG_ICFR_URL,
    note: "Data integrity risks arise when information is incomplete or inaccurate because of how it is maintained within systems.",
  },
  judgment_required_marker: {
    source_key: "judgment_required_marker",
    label: "Auditor judgment required",
    url: METHODOLOGY_PAGE,
    note: "Table linkage exists but the specific assertion determination requires auditor judgment against account and materiality per ISA 315 Appendix 5 §19 and KPMG Q3.4.20.",
  },
  framework_definition_fallback: {
    source_key: "framework_definition_fallback",
    label: "ISA 315 Para 12(d)/(i) framework definition",
    url: ISA_315_URL,
    note: "Framework-definition minimum for information integrity: completeness + accuracy. Applied when table-specific mapping is not established.",
  },
};

export function resolveCitation(mapping_source: MappingSource | string): Citation {
  const known = CITATIONS[mapping_source as MappingSource];
  if (known) return known;
  // Unknown mapping_source — fall back to framework definition rather than
  // fabricating a citation. This is the honest default.
  return CITATIONS.framework_definition_fallback;
}

export const METHODOLOGY: {
  headline: string;
  subtitle: string;
  disclosure: string;
  primary_sources: readonly { label: string; url: string }[];
} = {
  headline: "Data-Integrity Monitoring Methodology",
  subtitle:
    "Contingent risk indicators from data-integrity monitoring, grounded in ISA 315 (Revised 2019) and SAS 145. Assertion relevance requires auditor confirmation against specific accounts and materiality.",
  disclosure:
    "Findings are contingent risk indicators, not audit conclusions. Per ISA 315 (Revised 2019) Para A150, a general IT control alone is typically not sufficient to address a risk of material misstatement at the assertion level. Auditor confirmation against specific accounts and materiality is required.",
  primary_sources: [
    {
      label: "ISA 315 (Revised 2019) — full text",
      url: ISA_315_URL,
    },
    {
      label: "KPMG Internal Control over Financial Reporting Handbook (2023)",
      url: KPMG_ICFR_URL,
    },
    {
      label: "COBIT 2019 Managed Data (ISACA/ITGI SOX guidance)",
      url: COBIT_MANAGED_DATA_URL,
    },
    {
      label: "PCAOB AS 2110",
      url: "https://pcaobus.org/oversight/standards/auditing-standards/details/AS2110",
    },
    {
      label: "AICPA SAS 145",
      url: "https://www.aicpa-cima.com/resources/download/aicpa-statement-on-auditing-standards-no-145",
    },
  ],
};
