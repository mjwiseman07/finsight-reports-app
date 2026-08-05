/**
 * Phase MEM_LIFECYCLE Block 9.2 — hexToBytes unit tests (paste Smoke 6).
 */
import { describe, it, expect } from "vitest";
import { hexToBytes } from "../anchor-fetch";

describe("hexToBytes", () => {
  it("decodes empty string", () =>
    expect(hexToBytes("")).toEqual(new Uint8Array(0)));
  it("decodes deadbeef", () =>
    expect(hexToBytes("deadbeef")).toEqual(
      new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
    ));
  it("strips \\x prefix", () =>
    expect(hexToBytes("\\xdeadbeef")).toEqual(
      new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
    ));
  it("throws on odd length", () =>
    expect(() => hexToBytes("abc")).toThrow(/odd-length/));
  it("throws on non-hex chars", () =>
    expect(() => hexToBytes("xyzq")).toThrow(/non-hex/));
});
