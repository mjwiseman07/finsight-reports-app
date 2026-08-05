/**
 * Phase MEM_LIFECYCLE Block 8 — SEO drift monitor unit tests.
 */

import { describe, it, expect } from "vitest";
import { CANONICAL_TAG_RE } from "../seo-drift-probes";

describe("SEO drift monitor — canonical regex", () => {
  it("matches a well-formed canonical tag", () => {
    const html = `<html><head><link rel="canonical" href="https://advisacor.com/pricing" /></head></html>`;
    const m = html.match(CANONICAL_TAG_RE);
    expect(m?.[1]).toBe("https://advisacor.com/pricing");
  });

  it("matches single-quoted href", () => {
    const html = `<link rel='canonical' href='https://advisacor.com/'>`;
    const m = html.match(CANONICAL_TAG_RE);
    expect(m?.[1]).toBe("https://advisacor.com/");
  });

  it("returns null when no canonical tag present", () => {
    const html = `<html><head><title>x</title></head></html>`;
    const m = html.match(CANONICAL_TAG_RE);
    expect(m).toBeNull();
  });

  it("returns null on malformed rel attribute", () => {
    const html = `<link rel="canonicalX" href="https://advisacor.com/">`;
    const m = html.match(CANONICAL_TAG_RE);
    expect(m).toBeNull();
  });
});
