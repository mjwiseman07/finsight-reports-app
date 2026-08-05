import { describe, it, expect } from "vitest";
import {
  merkleRoot,
  merkleInclusionProof,
  verifyMerkleProof,
  rowHashToBytes,
  bytesToRowHash,
} from "../merkle";
import { createHash } from "node:crypto";

const sha256 = async (d: Uint8Array): Promise<Uint8Array> =>
  new Uint8Array(createHash("sha256").update(d).digest());

function b(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

describe("merkle", () => {
  it("single-leaf tree: root == leaf", async () => {
    const leaf = b("a".repeat(64));
    const root = await merkleRoot([leaf], sha256);
    expect(Buffer.from(root).toString("hex")).toBe("a".repeat(64));
  });

  it("two-leaf tree: root == sha256(l || r)", async () => {
    const l = b("a".repeat(64));
    const r = b("b".repeat(64));
    const root = await merkleRoot([l, r], sha256);
    const buf = new Uint8Array(64);
    buf.set(l, 0);
    buf.set(r, 32);
    const expected = await sha256(buf);
    expect(Buffer.from(root).toString("hex")).toBe(Buffer.from(expected).toString("hex"));
  });

  it("odd-count tree: promotes last leaf unchanged", async () => {
    const leaves = [b("aa".repeat(32)), b("bb".repeat(32)), b("cc".repeat(32))];
    const root = await merkleRoot(leaves, sha256);
    // Level 1: [sha(aa+bb), cc]
    // Level 2 root: sha(sha(aa+bb) + cc)
    const lvl1a = await sha256(concat(leaves[0], leaves[1]));
    const expected = await sha256(concat(lvl1a, leaves[2]));
    expect(Buffer.from(root).toString("hex")).toBe(Buffer.from(expected).toString("hex"));
  });

  it("inclusion proof round-trips for every leaf index", async () => {
    const leaves = [];
    for (let i = 0; i < 7; i++) {
      const hex = i.toString(16).padStart(2, "0").repeat(32);
      leaves.push(b(hex));
    }
    const root = await merkleRoot(leaves, sha256);
    for (let i = 0; i < leaves.length; i++) {
      const proof = await merkleInclusionProof(leaves, i, sha256);
      const ok = await verifyMerkleProof(leaves[i], proof, root, sha256);
      expect(ok).toBe(true);
    }
  });

  it("proof for wrong leaf fails", async () => {
    const leaves = [b("aa".repeat(32)), b("bb".repeat(32)), b("cc".repeat(32)), b("dd".repeat(32))];
    const root = await merkleRoot(leaves, sha256);
    const proofFor0 = await merkleInclusionProof(leaves, 0, sha256);
    const ok = await verifyMerkleProof(leaves[1], proofFor0, root, sha256);
    expect(ok).toBe(false);
  });

  it("rowHashToBytes / bytesToRowHash round-trip", () => {
    const hex = "0123456789abcdef".repeat(4);
    expect(hex.length).toBe(64);
    const rh = `sha256:${hex}`;
    const bytes = rowHashToBytes(rh);
    expect(bytes.length).toBe(32);
    expect(bytesToRowHash(bytes)).toBe(rh);
  });

  it("rowHashToBytes rejects malformed input", () => {
    expect(() => rowHashToBytes("nope")).toThrow();
    expect(() => rowHashToBytes("sha256:short")).toThrow();
    expect(() => rowHashToBytes("md5:" + "0".repeat(64))).toThrow();
  });
});
