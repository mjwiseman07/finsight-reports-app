import { describe, it, expect } from 'vitest';
import {
  TIERS,
  getTier,
  getActiveTiers,
  isArchivedTier,
  getAttachableTiersFor,
  expandBundle,
  expandActiveTiers,
  mergeEntitlements,
  SUBSCRIPTION_TIER_KEYS,
  LOOKUP_KEY_TO_TIER,
} from '../product-tiers.js';

describe('product-tiers v1.4 catalog', () => {
  describe('new tier keys exist', () => {
    const expectedNewKeys = [
      'ra_cashapp_addon',
      'ra_je_write_addon',
      'review_assist_pro',
      'ra_pro_cashapp_addon',
      'ra_pro_ar_addon',
      'ra_pro_ap_addon',
      'ra_pro_billpay_connector_addon',
      'ra_pro_billpay_native_addon',
      'ra_pro_payroll_addon',
      'ra_pro_full_bundle',
      'ra_pro_full_native_bundle',
    ];

    it.each(expectedNewKeys)('%s is defined in TIERS', (key) => {
      expect(TIERS[key]).toBeDefined();
      expect(TIERS[key].key).toBe(key);
    });

    it.each(expectedNewKeys)('%s is retrievable via getTier', (key) => {
      expect(getTier(key)).toBeTruthy();
    });

    it.each(expectedNewKeys)('%s appears in SUBSCRIPTION_TIER_KEYS', (key) => {
      expect(SUBSCRIPTION_TIER_KEYS[key]).toBeDefined();
    });
  });

  describe('solo_bookkeeper archived', () => {
    it('is retained in TIERS', () => {
      expect(TIERS.solo_bookkeeper).toBeDefined();
    });

    it('has archived: true', () => {
      expect(TIERS.solo_bookkeeper.archived).toBe(true);
    });

    it('is flagged by isArchivedTier', () => {
      expect(isArchivedTier('solo_bookkeeper')).toBe(true);
    });

    it('is excluded from getActiveTiers', () => {
      const active = getActiveTiers();
      const keys = active.map(t => t.key);
      expect(keys).not.toContain('solo_bookkeeper');
    });

    it('lookup keys still resolve for historical subs', () => {
      const flat = LOOKUP_KEY_TO_TIER['solo_bk_std_mo'];
      expect(flat).toBeDefined();
      expect(flat.tier_key).toBe('solo_bookkeeper');
    });
  });

  describe('review_assist v1.4 entitlements', () => {
    const ent = TIERS.review_assist.entitlements;

    it('has bank matching flags', () => {
      expect(ent.review_assist_bank_matching_csv).toBe(true);
      expect(ent.review_assist_bank_matching_qbo_feed).toBe(true);
    });

    it('has JE proposal + rules engine', () => {
      expect(ent.review_assist_je_proposal).toBe(true);
      expect(ent.review_assist_matching_engine).toBe('rules');
    });

    it('has cadence defaults', () => {
      expect(ent.review_assist_je_cadence_configurable).toBe(true);
      expect(ent.review_assist_je_cadence_default).toBe('daily');
      expect(ent.review_assist_je_always_on).toBe(true);
    });

    it('has print/export flags', () => {
      expect(ent.review_assist_print_pdf).toBe(true);
      expect(ent.review_assist_print_csv).toBe(true);
    });

    it('does NOT have QBO write (needs add-on)', () => {
      expect(ent.review_assist_write_qbo).toBe(false);
    });

    it('does NOT have cash app by default', () => {
      expect(ent.review_assist_cash_app).toBe(false);
      expect(ent.review_assist_cash_app_engine).toBeNull();
    });
  });

  describe('review_assist_pro entitlements', () => {
    const ent = TIERS.review_assist_pro.entitlements;

    it('has QBO write native', () => {
      expect(ent.review_assist_write_qbo).toBe(true);
    });

    it('uses AI matching engine', () => {
      expect(ent.review_assist_matching_engine).toBe('ai_memory');
    });

    it('has memory substrate + AI reasoning', () => {
      expect(ent.review_assist_ai_reasoning).toBe(true);
      expect(ent.review_assist_memory_substrate).toBe(true);
    });

    it('has multi-client', () => {
      expect(ent.review_assist_multi_client).toBe(true);
      expect(ent.firm_seats).toBe(5);
    });

    it('defaults to realtime cadence', () => {
      expect(ent.review_assist_je_cadence_default).toBe('realtime');
    });

    it('has historical lookback', () => {
      expect(ent.review_assist_historical_cleanup).toBe(true);
      expect(ent.review_assist_historical_lookback_months).toBe(24);
    });

    it('has Ask Pulse Command Center access', () => {
      expect(ent.ask_pulse_command_center).toBe(true);
    });
  });

  describe('getAttachableTiersFor', () => {
    it('returns RA add-ons for RA base', () => {
      const attachable = getAttachableTiersFor('review_assist');
      const keys = attachable.map(t => t.key);
      expect(keys).toContain('ra_cashapp_addon');
      expect(keys).toContain('ra_je_write_addon');
    });

    it('returns RA Pro add-ons for RA Pro base', () => {
      const attachable = getAttachableTiersFor('review_assist_pro');
      const keys = attachable.map(t => t.key);
      expect(keys).toContain('ra_pro_cashapp_addon');
      expect(keys).toContain('ra_pro_ar_addon');
      expect(keys).toContain('ra_pro_ap_addon');
      expect(keys).toContain('ra_pro_billpay_connector_addon');
      expect(keys).toContain('ra_pro_billpay_native_addon');
      expect(keys).toContain('ra_pro_payroll_addon');
    });

    it('does not cross RA / RA Pro add-ons', () => {
      const ra = getAttachableTiersFor('review_assist');
      const raKeys = ra.map(t => t.key);
      expect(raKeys).not.toContain('ra_pro_cashapp_addon');
      expect(raKeys).not.toContain('ra_pro_ar_addon');

      const pro = getAttachableTiersFor('review_assist_pro');
      const proKeys = pro.map(t => t.key);
      expect(proKeys).not.toContain('ra_cashapp_addon');
      expect(proKeys).not.toContain('ra_je_write_addon');
    });
  });

  describe('bundle expansion', () => {
    it('ra_pro_full_bundle expands to 5 tiers', () => {
      const expanded = expandBundle('ra_pro_full_bundle');
      expect(expanded).toHaveLength(5);
      expect(expanded).toContain('review_assist_pro');
      expect(expanded).toContain('ra_pro_cashapp_addon');
      expect(expanded).toContain('ra_pro_ar_addon');
      expect(expanded).toContain('ra_pro_ap_addon');
      expect(expanded).toContain('ra_pro_billpay_connector_addon');
    });

    it('ra_pro_full_native_bundle swaps in native for connector', () => {
      const expanded = expandBundle('ra_pro_full_native_bundle');
      expect(expanded).toContain('ra_pro_billpay_native_addon');
      expect(expanded).not.toContain('ra_pro_billpay_connector_addon');
    });

    it('non-bundle expands to itself', () => {
      expect(expandBundle('review_assist_pro')).toEqual(['review_assist_pro']);
    });

    it('unknown tier expands to empty array', () => {
      expect(expandBundle('does_not_exist')).toEqual([]);
    });
  });

  describe('expandActiveTiers dedupes and expands', () => {
    it('handles a mix of base + add-ons', () => {
      const active = expandActiveTiers([
        'review_assist',
        'ra_cashapp_addon',
        'ra_je_write_addon',
      ]);
      expect(active).toHaveLength(3);
      expect(active).toContain('review_assist');
      expect(active).toContain('ra_cashapp_addon');
      expect(active).toContain('ra_je_write_addon');
    });

    it('expands bundles', () => {
      const active = expandActiveTiers(['ra_pro_full_bundle']);
      expect(active).toContain('review_assist_pro');
      expect(active).toContain('ra_pro_cashapp_addon');
    });

    it('dedupes overlapping bundle + explicit', () => {
      const active = expandActiveTiers([
        'ra_pro_full_bundle',
        'review_assist_pro',
      ]);
      // review_assist_pro should appear once
      expect(active.filter(k => k === 'review_assist_pro')).toHaveLength(1);
    });
  });

  describe('mergeEntitlements v1.4 combos', () => {
    it('RA + Cash App + JE Write union', () => {
      const merged = mergeEntitlements([
        'review_assist',
        'ra_cashapp_addon',
        'ra_je_write_addon',
      ]);
      expect(merged.review_assist_bank_matching_csv).toBe(true);
      expect(merged.review_assist_cash_app).toBe(true);
      expect(merged.review_assist_cash_app_engine).toBe('rules');
      expect(merged.review_assist_write_qbo).toBe(true);
      expect(merged.review_assist_je_audit_trail).toBe(true);
    });

    it('RA Pro + AP + Bill Pay Connector union', () => {
      const merged = mergeEntitlements([
        'review_assist_pro',
        'ra_pro_ap_addon',
        'ra_pro_billpay_connector_addon',
      ]);
      expect(merged.review_assist_write_qbo).toBe(true);
      expect(merged.ra_pro_ap_bills).toBe(true);
      expect(merged.ra_pro_ap_fraud_stack).toBe(true);
      expect(merged.ra_pro_billpay_connector).toBe(true);
    });

    it('cash app engine override: RA Pro Cash App wins over RA Cash App', () => {
      const merged = mergeEntitlements([
        'ra_cashapp_addon',        // rules
        'ra_pro_cashapp_addon',    // ai_memory
      ]);
      // last one wins per mergeEntitlements contract
      expect(merged.review_assist_cash_app_engine).toBe('ai_memory');
    });
  });

  describe('subscription entities', () => {
    it('RA Pro is company', () => {
      expect(TIERS.review_assist_pro.subscriptionEntity).toBe('company');
    });

    it('all add-ons have null subscriptionEntity', () => {
      const addons = [
        'ra_cashapp_addon',
        'ra_je_write_addon',
        'ra_pro_cashapp_addon',
        'ra_pro_ar_addon',
        'ra_pro_ap_addon',
        'ra_pro_billpay_connector_addon',
        'ra_pro_billpay_native_addon',
        'ra_pro_payroll_addon',
      ];
      for (const key of addons) {
        expect(TIERS[key].subscriptionEntity).toBeNull();
      }
    });

    it('bundle SKUs are company', () => {
      expect(TIERS.ra_pro_full_bundle.subscriptionEntity).toBe('company');
      expect(TIERS.ra_pro_full_native_bundle.subscriptionEntity).toBe('company');
    });
  });

  describe('LOOKUP_KEY_TO_TIER map', () => {
    it('contains new v1.4 lookup keys', () => {
      expect(LOOKUP_KEY_TO_TIER['review_assist_pro_std_mo']).toBeDefined();
      expect(LOOKUP_KEY_TO_TIER['ra_je_write_std_mo']).toBeDefined();
      expect(LOOKUP_KEY_TO_TIER['ra_pro_cashapp_std_mo']).toBeDefined();
      expect(LOOKUP_KEY_TO_TIER['ra_pro_full_std_mo']).toBeDefined();
    });

    it('preserves existing solo_bk keys for historical resolution', () => {
      expect(LOOKUP_KEY_TO_TIER['solo_bk_std_mo']).toBeDefined();
      expect(LOOKUP_KEY_TO_TIER['solo_bk_std_yr']).toBeDefined();
    });
  });

  describe('compliance status markers', () => {
    it('bill pay native marked compliance_pending', () => {
      expect(TIERS.ra_pro_billpay_native_addon.status).toBe('compliance_pending');
    });

    it('payroll marked coming_soon', () => {
      expect(TIERS.ra_pro_payroll_addon.status).toBe('coming_soon');
    });

    it('full_native_bundle marked compliance_pending', () => {
      expect(TIERS.ra_pro_full_native_bundle.status).toBe('compliance_pending');
    });
  });
});
