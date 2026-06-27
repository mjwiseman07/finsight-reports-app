export function routeLegacyNonExchange(input: {
  jurisdiction: string;
  legacyStandard: "IPSAS_23";
}): { route: "legacy-non-exchange"; jurisdiction: string } {
  return {
    route: "legacy-non-exchange",
    jurisdiction: input.jurisdiction,
  };
}

export function isLegacyJurisdictionOpenWhitelist(jurisdiction: string): boolean {
  return jurisdiction.trim().length > 0;
}
