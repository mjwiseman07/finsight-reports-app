/**
 * Payer pattern classifier — the gate for D6.7 Part 2 Q3=B cross-tenant learning.
 */
const CORPORATE_SUFFIX_PATTERN =
  /\b(INC|INCORPORATED|CORP|CORPORATION|LLC|L\.L\.C\.|PLC|N\.A\.|NA|AG|CO|COMPANY|LTD|LIMITED|LP|LLP)\b\.?/i;

const CURATED_GENERIC_ENTITIES: readonly string[] = [
  "MICROSOFT", "GOOGLE", "ALPHABET", "APPLE", "AMAZON", "META", "FACEBOOK",
  "TESLA", "NVIDIA", "NETFLIX", "ORACLE", "SALESFORCE", "ADOBE", "IBM",
  "INTEL", "CISCO", "DELL", "HP", "HEWLETT PACKARD", "QUALCOMM", "BROADCOM",
  "PAYPAL", "VISA", "MASTERCARD", "AMERICAN EXPRESS", "AMEX",
  "WALMART", "TARGET", "COSTCO", "HOME DEPOT", "LOWES", "BEST BUY",
  "STARBUCKS", "MCDONALDS", "CHIPOTLE", "YUM BRANDS", "DOMINOS",
  "COCA COLA", "PEPSICO", "PEPSI", "PROCTER GAMBLE", "P&G", "UNILEVER",
  "JOHNSON JOHNSON", "PFIZER", "MODERNA", "MERCK", "ABBVIE", "ELI LILLY",
  "UNITEDHEALTH", "CIGNA", "ANTHEM", "ELEVANCE HEALTH", "AETNA", "HUMANA",
  "COMCAST", "CHARTER COMMUNICATIONS", "SPECTRUM", "DISH NETWORK",
  "AT&T", "ATT", "AT T", "AT AND T", "VERIZON", "T-MOBILE", "TMOBILE", "SPRINT",
  "FEDEX", "UPS", "UNITED PARCEL SERVICE", "DHL", "USPS",
  "BOEING", "LOCKHEED MARTIN", "RAYTHEON", "RTX", "NORTHROP GRUMMAN",
  "GENERAL ELECTRIC", "GE", "GENERAL MOTORS", "GM", "FORD MOTOR", "FORD",
  "EXXON MOBIL", "EXXONMOBIL", "CHEVRON", "SHELL", "BP", "CONOCOPHILLIPS",
  "CATERPILLAR", "DEERE", "JOHN DEERE", "HONEYWELL", "3M",
  "DISNEY", "WALT DISNEY", "WARNER BROS DISCOVERY", "PARAMOUNT", "SONY",
  "NIKE", "ADIDAS", "UNDER ARMOUR", "LULULEMON",
  "DELTA AIR LINES", "DELTA AIRLINES", "AMERICAN AIRLINES", "UNITED AIRLINES",
  "SOUTHWEST AIRLINES", "JETBLUE",
  "MARRIOTT", "HILTON", "HYATT", "IHG", "WYNDHAM",
  "ADP", "PAYCHEX", "INTUIT", "WORKDAY", "SAP", "SERVICENOW",
  "ACCENTURE", "DELOITTE", "PWC", "PRICEWATERHOUSECOOPERS", "KPMG", "EY",
  "ERNST YOUNG", "MCKINSEY", "BAIN", "BOSTON CONSULTING GROUP", "BCG",
  "UBER", "LYFT", "AIRBNB", "DOORDASH", "INSTACART", "GRUBHUB",
  "ZOOM", "SLACK", "DROPBOX", "BOX", "ATLASSIAN", "SHOPIFY", "SQUARE", "BLOCK",
  "STRIPE", "AFFIRM", "KLARNA",
  "JPMORGAN CHASE", "JPMORGAN", "JP MORGAN", "JP MORGAN CHASE", "JP MORGAN CHASE BANK", "CHASE", "CHASE BANK",
  "BANK OF AMERICA", "BOFA", "WELLS FARGO", "CITIGROUP", "CITIBANK", "CITI",
  "GOLDMAN SACHS", "MORGAN STANLEY", "US BANCORP", "US BANK", "USBANK",
  "PNC BANK", "PNC FINANCIAL", "TRUIST", "TRUIST BANK", "BB&T", "SUNTRUST",
  "CAPITAL ONE", "TD BANK", "TORONTO DOMINION", "FIFTH THIRD BANK",
  "FIFTH THIRD", "REGIONS BANK", "REGIONS FINANCIAL", "KEYBANK", "KEY BANK",
  "HUNTINGTON BANK", "HUNTINGTON NATIONAL", "CITIZENS BANK", "CITIZENS FINANCIAL",
  "M&T BANK", "MANUFACTURERS TRADERS", "ALLY BANK", "ALLY FINANCIAL",
  "DISCOVER BANK", "DISCOVER FINANCIAL", "SYNCHRONY BANK", "SYNCHRONY FINANCIAL",
  "BMO HARRIS", "BMO BANK", "BANK OF MONTREAL", "HSBC", "HSBC BANK",
  "SANTANDER BANK", "SANTANDER", "DEUTSCHE BANK", "BARCLAYS",
  "CHARLES SCHWAB", "SCHWAB", "FIDELITY", "FIDELITY INVESTMENTS",
  "VANGUARD", "BLACKROCK", "STATE STREET", "BNY MELLON", "BANK OF NEW YORK",
  "SILICON VALLEY BANK", "SVB", "FIRST REPUBLIC BANK", "FIRST REPUBLIC",
  "NAVY FEDERAL CREDIT UNION", "NAVY FEDERAL",
  "PG&E", "PG E", "PG AND E", "PACIFIC GAS ELECTRIC", "PACIFIC GAS AND ELECTRIC",
  "SOUTHERN CALIFORNIA EDISON", "SCE", "SAN DIEGO GAS ELECTRIC", "SDGE",
  "CON EDISON", "CONSOLIDATED EDISON", "CONED",
  "DUKE ENERGY", "DOMINION ENERGY", "DOMINION",
  "SOUTHERN COMPANY", "GEORGIA POWER", "ALABAMA POWER",
  "AMERICAN ELECTRIC POWER", "AEP", "EXELON", "COMED", "COMMONWEALTH EDISON",
  "PEPCO", "POTOMAC ELECTRIC", "NATIONAL GRID", "NATIONALGRID",
  "XCEL ENERGY", "XCEL", "ENTERGY", "FIRSTENERGY", "FIRST ENERGY",
  "NEXTERA ENERGY", "FLORIDA POWER LIGHT", "FPL",
  "CENTERPOINT ENERGY", "CENTERPOINT", "EVERSOURCE", "EVERSOURCE ENERGY",
  "PSEG", "PUBLIC SERVICE ELECTRIC GAS", "NISOURCE", "NIPSCO",
  "WEC ENERGY GROUP", "WE ENERGIES", "CMS ENERGY", "CONSUMERS ENERGY",
  "ATMOS ENERGY", "SEMPRA ENERGY", "SEMPRA",
  "AMERICAN WATER WORKS", "AMERICAN WATER",
  "WASTE MANAGEMENT", "REPUBLIC SERVICES",
] as const;

const CURATED_SET: ReadonlySet<string> = new Set(CURATED_GENERIC_ENTITIES);

function normalizeForClassifier(raw: string): string {
  let s = raw.trim().toUpperCase();
  s = s.replace(/&/g, " AND ");
  s = s.replace(/[.,;:'"`()[\]{}]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  for (let i = 0; i < 3; i++) {
    const next = s.replace(CORPORATE_SUFFIX_PATTERN, "").trim().replace(/\s+/g, " ");
    if (next === s) break;
    s = next;
  }
  return s;
}

function tokenSetOverlap(a: string, b: string): number {
  const ta = new Set(a.split(/\s+/).filter(Boolean));
  const tb = new Set(b.split(/\s+/).filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  const inter = [...ta].filter((x) => tb.has(x)).length;
  const union = new Set([...ta, ...tb]).size;
  return inter / union;
}

function isCuratedGenericEntity(rawName: string | null | undefined): boolean {
  if (!rawName) return false;
  const norm = normalizeForClassifier(rawName);
  if (!norm) return false;
  if (CURATED_SET.has(norm)) return true;
  for (const entry of CURATED_GENERIC_ENTITIES) {
    if (tokenSetOverlap(norm, entry) >= 0.9) return true;
  }
  return false;
}

export function isGenericEnoughToPool(
  payerName: string | null | undefined,
  resolvedCustomerName: string | null | undefined,
): boolean {
  return isCuratedGenericEntity(payerName) && isCuratedGenericEntity(resolvedCustomerName);
}

export function _debugNormalize(raw: string): string {
  return normalizeForClassifier(raw);
}
