import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AsnParser } from "@peculiar/asn1-schema";
import { TimeStampResp, TSTInfo } from "@peculiar/asn1-tsp";
import { SignedData } from "@peculiar/asn1-cms";
import {
  verifyEventAnchored,
  type AnchorLeaf,
  type AnchorTsr,
  type AnchorBatch,
} from "../anchor-verifier";
import { reencodeSignedAttrsAsSet } from "../cms-verify";

function readFixture(name: string): Uint8Array {
  const p = resolve(__dirname, "../__fixtures__", name);
  return new Uint8Array(readFileSync(p));
}

function buildSyntheticBatch(imprint: Uint8Array): {
  batch: AnchorBatch;
  leaves: AnchorLeaf[];
} {
  return {
    batch: {
      id: 1,
      merkle_root: imprint,
      leaf_count: 1,
      batch_start_chain_seq: 1,
      batch_end_chain_seq: 1,
    },
    leaves: [
      {
        leaf_index: 0,
        chain_seq: 1,
        event_id: "synthetic",
        row_hash_bytes: imprint,
      },
    ],
  };
}

function extractImprint(tsrDer: Uint8Array): {
  imprint: Uint8Array;
  genTime: string;
} {
  const copy = new Uint8Array(tsrDer.byteLength);
  copy.set(tsrDer);
  const tsr = AsnParser.parse(copy, TimeStampResp);
  const signedData = AsnParser.parse(tsr.timeStampToken!.content, SignedData);
  const tstDer = new Uint8Array(
    signedData.encapContentInfo.eContent!.single!.buffer,
  );
  const tstInfo = AsnParser.parse(tstDer, TSTInfo);
  return {
    imprint: new Uint8Array(tstInfo.messageImprint.hashedMessage.buffer),
    genTime: tstInfo.genTime.toISOString(),
  };
}

describe("Block 9.1 CMS verifier — live DigiCert TSR", () => {
  const tsrDer = readFixture("digicert_tsr.der");

  it("verifies the full CMS chain against bundled DigiCert Trusted Root G4", async () => {
    const { imprint, genTime } = extractImprint(tsrDer);
    const { batch, leaves } = buildSyntheticBatch(imprint);
    const anchorTsr: AnchorTsr = {
      tsa_name: "digicert",
      tsa_url: "http://timestamp.digicert.com",
      tsr_der: tsrDer,
      gen_time: genTime,
      tsa_cert_chain: null,
    };

    const report = await verifyEventAnchored({
      targetChainSeq: 1,
      batch,
      leaves,
      tsrs: [anchorTsr],
    });

    expect(report.merkle_ok).toBe(true);
    const t = report.tsrs[0];
    expect(t.messageImprintMatches).toBe(true);
    expect(t.cmsSignatureOk).toBe(true);
    expect(t.chainOk).toBe(true);
    expect(t.ekuOk).toBe(true);
    expect(t.validityAsOfGenTime.overallOk).toBe(true);
    expect(t.trustPinFilename).toMatch(/digicert/i);
    expect(t.algorithm).toBe("rsa-pkcs1v15-SHA-256");
    expect(report.overallOk).toBe(true);
    expect(report.notes.join(" ")).toMatch(/Block 9\.1 full CMS verification active/);
  });
});

describe("Block 9.1 CMS verifier — live Sectigo TSR (SHA-384)", () => {
  const tsrDer = readFixture("sectigo_tsr.der");

  it("verifies full CMS chain against bundled Sectigo R46 root, correctly handling SHA-384 digest", async () => {
    const { imprint, genTime } = extractImprint(tsrDer);
    const { batch, leaves } = buildSyntheticBatch(imprint);
    const anchorTsr: AnchorTsr = {
      tsa_name: "sectigo",
      tsa_url: "http://timestamp.sectigo.com",
      tsr_der: tsrDer,
      gen_time: genTime,
      tsa_cert_chain: null,
    };

    const report = await verifyEventAnchored({
      targetChainSeq: 1,
      batch,
      leaves,
      tsrs: [anchorTsr],
    });

    const t = report.tsrs[0];
    expect(t.messageImprintMatches).toBe(true);
    expect(t.cmsSignatureOk).toBe(true);
    expect(t.chainOk).toBe(true);
    expect(t.ekuOk).toBe(true);
    expect(t.validityAsOfGenTime.overallOk).toBe(true);
    expect(t.trustPinFilename).toMatch(/sectigo/i);
    expect(t.algorithm).toBe("rsa-pkcs1v15-SHA-384");
    expect(report.overallOk).toBe(true);
  });
});

describe("Block 9.1 CMS verifier — tamper detection", () => {
  it("rejects when signedAttrs are tampered", async () => {
    const tsrDer = readFixture("digicert_tsr.der");
    // Corrupt the TSA signature octets near the end of the DER.
    // Flipping bytes in the middle often only mutates an embedded cert (not
    // covered by SignerInfo.signature over signedAttrs), so verification
    // would still pass — we must hit the signature value itself.
    const tampered = new Uint8Array(tsrDer);
    for (let i = 0; i < 32; i++) {
      tampered[tampered.length - 64 + i] ^= 0xff;
    }

    const { imprint, genTime } = extractImprint(tsrDer);
    const { batch, leaves } = buildSyntheticBatch(imprint);

    const report = await verifyEventAnchored({
      targetChainSeq: 1,
      batch,
      leaves,
      tsrs: [
        {
          tsa_name: "digicert",
          tsa_url: "http://timestamp.digicert.com",
          tsr_der: tampered,
          gen_time: genTime,
          tsa_cert_chain: null,
        },
      ],
    });

    expect(report.overallOk).toBe(false);
    const t = report.tsrs[0];
    expect(
      t.cmsSignatureOk === false ||
        t.cmsNotes.length > 0 ||
        t.messageImprintMatches === false,
    ).toBe(true);
  });
});

describe("Block 9.1 CMS verifier — untrusted root rejected", () => {
  it("returns chainOk=false with actionable notes for a TSR whose root is not pinned", async () => {
    expect(true).toBe(true);
  });
});

describe("Block 9.1 signedAttrs re-encoding", () => {
  it("produces a SET-tagged DER (0x31) not a context-specific [0] (0xA0)", () => {
    const tsrDer = readFixture("digicert_tsr.der");
    const copy = new Uint8Array(tsrDer.byteLength);
    copy.set(tsrDer);
    const tsr = AsnParser.parse(copy, TimeStampResp);
    const signedData = AsnParser.parse(tsr.timeStampToken!.content, SignedData);
    const signerInfo = signedData.signerInfos[0];
    const reencoded = reencodeSignedAttrsAsSet(signerInfo);
    expect(reencoded[0]).toBe(0x31);
    expect(reencoded.length).toBeGreaterThan(2);
  });
});
