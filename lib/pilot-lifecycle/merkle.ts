/**
 * Phase MEM_LIFECYCLE Block 9 — SHA-256 binary Merkle tree.
 *
 * Deterministic, byte-oriented, no framework dependencies. Used by
 *   - the server anchor job to compute the root submitted to TSAs
 *   - the browser verifier to recompute the inclusion path
 *
 * Convention (matches OpenTimestamps / Chainpoint / RFC 6962 CT):
 *   - Leaves are raw 32-byte sha256 digests (row_hash minus 'sha256:' prefix).
 *   - Internal node = sha256(left || right).
 *   - Odd-count levels: promote the last node unchanged to the next level
 *     (do NOT duplicate — CVE-avoidance pattern; matches RFC 6962 §2.1
 *     when we track leaf_count separately).
 *   - leaf_count is stored on the batch so the verifier can reconstruct
 *     the exact tree shape without ambiguity.
 */

export type Sha256 = (data: Uint8Array) => Promise<Uint8Array>;

/** Concatenate two 32-byte buffers. */
function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

/**
 * Compute the Merkle root over leaves (in the given order).
 * Returns the 32-byte root.
 */
export async function merkleRoot(
  leaves: readonly Uint8Array[],
  sha256: Sha256,
): Promise<Uint8Array> {
  if (leaves.length === 0) {
    throw new Error("merkleRoot: empty leaves");
  }
  let level: Uint8Array[] = leaves.map((l) => {
    if (l.length !== 32) {
      throw new Error(`merkleRoot: leaf must be 32 bytes, got ${l.length}`);
    }
    return l;
  });
  while (level.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) {
        next.push(await sha256(concat(level[i], level[i + 1])));
      } else {
        next.push(level[i]); // promote odd tail (RFC 6962-style)
      }
    }
    level = next;
  }
  return level[0];
}

/**
 * Compute the O(log N) inclusion proof for leaf at leafIndex.
 * Returns siblings in order from the leaf level up to (but not including)
 * the root. Each sibling entry is {hash, position: 'left' | 'right'} —
 * position tells the verifier which side to concatenate.
 */
export type MerkleProofStep = { hash: Uint8Array; position: "left" | "right" };

export async function merkleInclusionProof(
  leaves: readonly Uint8Array[],
  leafIndex: number,
  sha256: Sha256,
): Promise<MerkleProofStep[]> {
  if (leafIndex < 0 || leafIndex >= leaves.length) {
    throw new Error("merkleInclusionProof: leafIndex out of range");
  }
  const proof: MerkleProofStep[] = [];
  let level: Uint8Array[] = leaves.slice();
  let idx = leafIndex;
  while (level.length > 1) {
    if (idx % 2 === 0) {
      // Right sibling exists?
      if (idx + 1 < level.length) {
        proof.push({ hash: level[idx + 1], position: "right" });
      }
      // Else: no sibling — this leaf is the odd tail, promoted unchanged.
    } else {
      proof.push({ hash: level[idx - 1], position: "left" });
    }
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) {
        next.push(await sha256(concat(level[i], level[i + 1])));
      } else {
        next.push(level[i]);
      }
    }
    level = next;
    idx = Math.floor(idx / 2);
  }
  return proof;
}

/**
 * Verify an inclusion proof recomputes to the expected root.
 * Used by the browser verifier.
 */
export async function verifyMerkleProof(
  leaf: Uint8Array,
  proof: readonly MerkleProofStep[],
  expectedRoot: Uint8Array,
  sha256: Sha256,
): Promise<boolean> {
  let acc = leaf;
  for (const step of proof) {
    if (step.position === "left") {
      acc = await sha256(concat(step.hash, acc));
    } else {
      acc = await sha256(concat(acc, step.hash));
    }
  }
  if (acc.length !== expectedRoot.length) return false;
  for (let i = 0; i < acc.length; i++) {
    if (acc[i] !== expectedRoot[i]) return false;
  }
  return true;
}

/** Utility: 'sha256:<hex>' → 32 raw bytes. Throws if malformed. */
export function rowHashToBytes(rowHash: string): Uint8Array {
  const m = rowHash.match(/^sha256:([0-9a-fA-F]{64})$/);
  if (!m) {
    throw new Error(`rowHashToBytes: expected 'sha256:<64 hex>', got ${rowHash}`);
  }
  const hex = m[1];
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Utility: 32 raw bytes → 'sha256:<hex>' for logging/comparison. */
export function bytesToRowHash(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return `sha256:${hex}`;
}
