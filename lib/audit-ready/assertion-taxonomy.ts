/**
 * Six-assertion taxonomy (PCAOB AS 2401, ISA 315).
 * Every parsed PBC request is classified against 1+ of these.
 * Locked constant — do not extend without updating Component E of Provisional #6.
 */

export const ASSERTIONS = [
  'existence',
  'completeness',
  'accuracy',
  'valuation',
  'rights_obligations',
  'presentation_disclosure',
] as const;

export type Assertion = (typeof ASSERTIONS)[number];

export const ASSERTION_METADATA: Record<
  Assertion,
  {
    label: string;
    short_definition: string;
    typical_pbc_signals: string[];
  }
> = {
  existence: {
    label: 'Existence',
    short_definition: 'Asset/liability actually exists at the balance-sheet date.',
    typical_pbc_signals: [
      'confirmation letters',
      'bank confirmations',
      'inventory count sheets',
      'AR aging',
      'fixed asset physical inspection',
      'lease confirmations',
    ],
  },
  completeness: {
    label: 'Completeness',
    short_definition: 'All transactions that should be recorded are recorded.',
    typical_pbc_signals: [
      'cutoff testing',
      'unrecorded liabilities search',
      'subsequent-events log',
      'PO commitments',
      'accruals rollforward',
    ],
  },
  accuracy: {
    label: 'Accuracy',
    short_definition: 'Amounts and other data are recorded appropriately.',
    typical_pbc_signals: [
      'invoice recalculation',
      'payroll register reconciliation',
      'tax computation support',
      'depreciation schedule tie-out',
    ],
  },
  valuation: {
    label: 'Valuation & Allocation',
    short_definition: 'Assets/liabilities are at appropriate carrying value.',
    typical_pbc_signals: [
      'inventory NRV analysis',
      'AR allowance methodology',
      'impairment tests',
      'FV measurement models',
      'goodwill impairment memo',
    ],
  },
  rights_obligations: {
    label: 'Rights & Obligations',
    short_definition:
      'Entity holds/controls rights to assets; obligations are of the entity.',
    typical_pbc_signals: [
      'title documents',
      'loan agreements',
      'lease agreements',
      'consignment terms',
      'factoring arrangements',
      'legal counsel letter',
    ],
  },
  presentation_disclosure: {
    label: 'Presentation & Disclosure',
    short_definition:
      'Components are appropriately presented, described, and disclosed.',
    typical_pbc_signals: [
      'related-party transactions',
      'segment reporting support',
      'subsequent-events disclosure',
      'commitments and contingencies',
      'going-concern assessment',
    ],
  },
};
