import { describe, it, expect } from "vitest";
import { AsnParser } from "@peculiar/asn1-schema";
import { Certificate } from "@peculiar/asn1-x509";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AuthorityKeyIdentifierExt,
  ExtendedKeyUsageExt,
  SubjectKeyIdentifierExt,
  OID,
} from "../asn1-extensions";

function pemToDer(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s+/g, "");
  return new Uint8Array(Buffer.from(b64, "base64"));
}

describe("hand-rolled X.509 extension schemas", () => {
  const certPath = resolve(__dirname, "../__fixtures__/freetsa_tsa.crt");
  const der = pemToDer(readFileSync(certPath, "utf8"));
  const cert = AsnParser.parse(der, Certificate);

  function getExt(oid: string) {
    return cert.tbsCertificate.extensions?.find((e) => e.extnID === oid);
  }

  it("decodes SubjectKeyIdentifier as an OCTET STRING", () => {
    const ext = getExt(OID.subjectKeyIdentifier);
    expect(ext).toBeDefined();
    const skid = AsnParser.parse(ext!.extnValue.buffer, SubjectKeyIdentifierExt);
    expect(skid.value.byteLength).toBeGreaterThan(0);
    expect(skid.value.byteLength).toBeLessThanOrEqual(64);
  });

  it("decodes AuthorityKeyIdentifier with a keyIdentifier field", () => {
    const ext = getExt(OID.authorityKeyIdentifier);
    expect(ext).toBeDefined();
    const akid = AsnParser.parse(ext!.extnValue.buffer, AuthorityKeyIdentifierExt);
    expect(akid.keyIdentifier).toBeDefined();
    expect(new Uint8Array(akid.keyIdentifier!).byteLength).toBeGreaterThan(0);
  });

  it("decodes ExtendedKeyUsage as an array of OIDs, containing id-kp-timeStamping", () => {
    const ext = getExt(OID.extendedKeyUsage);
    expect(ext).toBeDefined();
    expect(ext!.critical).toBe(true);
    const eku = AsnParser.parse(ext!.extnValue.buffer, ExtendedKeyUsageExt);
    const oids = Array.from(eku);
    expect(oids).toContain(OID.idKpTimeStamping);
  });
});
