import { describe, it, expect } from "vitest";
import {
  normalizeTbNetToNaturalSign,
  type BsClassification,
} from "../sign-normalize";

describe("normalizeTbNetToNaturalSign", () => {
  describe("Asset classification (debit-normal)", () => {
    it("passes positive TB (normal asset balance) through unchanged", () => {
      // Cash with $10,000 balance: TB net_cents = +1_000_000
      expect(normalizeTbNetToNaturalSign(1_000_000, "Asset")).toBe(1_000_000);
    });

    it("passes negative TB (contra-asset like Accumulated Depreciation) through unchanged", () => {
      // Accumulated Depreciation shown as -$5,000 in natural QBO BS UI;
      // TB net_cents = -500_000; natural = -500_000
      expect(normalizeTbNetToNaturalSign(-500_000, "Asset")).toBe(-500_000);
    });

    it("returns 0 for zero balance", () => {
      expect(normalizeTbNetToNaturalSign(0, "Asset")).toBe(0);
    });
  });

  describe("Liability classification (credit-normal)", () => {
    it("negates a negative TB (normal AP credit balance) into positive natural-sign", () => {
      // AP with $50,000 credit balance: TB net_cents = -5_000_000
      expect(normalizeTbNetToNaturalSign(-5_000_000, "Liability")).toBe(
        5_000_000,
      );
    });

    it("negates a positive TB (rare debit-side AP anomaly) into negative natural-sign", () => {
      // AP with $2,000 debit balance: TB net_cents = +200_000
      expect(normalizeTbNetToNaturalSign(200_000, "Liability")).toBe(-200_000);
    });

    it("returns 0 for zero balance", () => {
      expect(normalizeTbNetToNaturalSign(0, "Liability")).toBe(0);
    });
  });

  describe("Equity classification (credit-normal)", () => {
    it("negates a negative TB (normal Retained Earnings credit) into positive natural-sign", () => {
      // Retained Earnings with $100,000 credit balance: TB = -10_000_000
      expect(normalizeTbNetToNaturalSign(-10_000_000, "Equity")).toBe(
        10_000_000,
      );
    });

    it("negates a positive TB (owner draws / dividends debit) into negative natural-sign", () => {
      // Draws with $5,000 debit balance: TB net_cents = +500_000
      expect(normalizeTbNetToNaturalSign(500_000, "Equity")).toBe(-500_000);
    });

    it("returns 0 for zero balance", () => {
      expect(normalizeTbNetToNaturalSign(0, "Equity")).toBe(0);
    });
  });

  describe("real production example from PR #195 smoke", () => {
    it("normalizes AP balance ($560,267 credit) so it ties with GL detail ending balance", () => {
      // From live QBO pilot data:
      //   fetchQboGeneralLedgerDetail → endingBalanceCents = +56_026_700
      //   fetchQboTrialBalance        → net_cents          = -56_026_700
      // After normalization the two sides agree:
      const glDetailNatural = 56_026_700;
      const tbSigned = -56_026_700;
      const tbNatural = normalizeTbNetToNaturalSign(tbSigned, "Liability");
      expect(tbNatural).toBe(glDetailNatural);
      // Which drives tieVariance to exactly 0.
      expect(glDetailNatural - tbNatural).toBe(0);
    });

    it("normalizes Retained Earnings ($40,150 credit) so it ties with GL detail", () => {
      // GL detail natural: -40_150 * 100 = -4_015_000 (negative because
      // the pilot has RE reflecting cumulative losses in this snapshot)
      // Actually production showed +4_015_000 for the GL and -4_015_000 for TB
      // The point: normalization brings the two into the same convention.
      const glDetailNatural = 4_015_000;
      const tbSigned = -4_015_000;
      const tbNatural = normalizeTbNetToNaturalSign(tbSigned, "Equity");
      expect(tbNatural).toBe(glDetailNatural);
      expect(glDetailNatural - tbNatural).toBe(0);
    });
  });

  describe("type safety", () => {
    it("accepts each BsClassification value", () => {
      const classifications: BsClassification[] = [
        "Asset",
        "Liability",
        "Equity",
      ];
      for (const c of classifications) {
        expect(typeof normalizeTbNetToNaturalSign(100, c)).toBe("number");
      }
    });
  });
});
