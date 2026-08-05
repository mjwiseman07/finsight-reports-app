/**
 * Phase MEM_LIFECYCLE Block 9.1 — custom ASN.1 schema classes.
 *
 * @peculiar/asn1-x509 does NOT ship semantic classes for the three
 * X.509 extensions we need to decode (SKID, AKID, EKU) or for RSASSA-PSS-params.
 * The generic Extension class exposes extnValue as an OCTET STRING only.
 */

import {
  AsnProp,
  AsnPropTypes,
  AsnType,
  AsnTypeTypes,
  AsnArray,
  AsnIntegerBigIntConverter,
} from "@peculiar/asn1-schema";
import { AlgorithmIdentifier } from "@peculiar/asn1-x509";

/** RFC 5280 §4.2.1.2 — SubjectKeyIdentifier ::= KeyIdentifier ::= OCTET STRING */
@AsnType({ type: AsnTypeTypes.Choice })
export class SubjectKeyIdentifierExt {
  @AsnProp({ type: AsnPropTypes.OctetString })
  public value = new ArrayBuffer(0);
}

/** RFC 5280 §4.2.1.1 — AuthorityKeyIdentifier */
@AsnType({ type: AsnTypeTypes.Sequence })
export class AuthorityKeyIdentifierExt {
  @AsnProp({
    type: AsnPropTypes.OctetString,
    context: 0,
    implicit: true,
    optional: true,
  })
  public keyIdentifier?: ArrayBuffer;
}

/** RFC 5280 §4.2.1.12 — ExtKeyUsageSyntax ::= SEQUENCE OF KeyPurposeId */
@AsnType({ type: AsnTypeTypes.Sequence, itemType: AsnPropTypes.ObjectIdentifier })
export class ExtendedKeyUsageExt extends AsnArray<string> {
  constructor(items: string[] = []) {
    super(items);
    Object.setPrototypeOf(this, ExtendedKeyUsageExt.prototype);
  }
}

/** RFC 4055 §3.1 — RSASSA-PSS-params */
@AsnType({ type: AsnTypeTypes.Sequence })
export class RsaPssParams {
  @AsnProp({
    type: AlgorithmIdentifier,
    context: 0,
    optional: true,
  })
  public hashAlgorithm?: AlgorithmIdentifier;

  @AsnProp({
    type: AlgorithmIdentifier,
    context: 1,
    optional: true,
  })
  public maskGenAlgorithm?: AlgorithmIdentifier;

  @AsnProp({
    type: AsnPropTypes.Integer,
    context: 2,
    optional: true,
  })
  public saltLength = 20;

  @AsnProp({
    type: AsnPropTypes.Integer,
    context: 3,
    optional: true,
  })
  public trailerField = 1;
}

/** RFC 3279 §2.2.3 — Ecdsa-Sig-Value ::= SEQUENCE { r INTEGER, s INTEGER } */
@AsnType({ type: AsnTypeTypes.Sequence })
export class EcdsaSigValue {
  @AsnProp({ type: AsnPropTypes.Integer, converter: AsnIntegerBigIntConverter })
  public r = BigInt(0);

  @AsnProp({ type: AsnPropTypes.Integer, converter: AsnIntegerBigIntConverter })
  public s = BigInt(0);
}

export const OID = {
  subjectKeyIdentifier: "2.5.29.14",
  authorityKeyIdentifier: "2.5.29.35",
  extendedKeyUsage: "2.5.29.37",
  idKpTimeStamping: "1.3.6.1.5.5.7.3.8",
  rsaEncryption: "1.2.840.113549.1.1.1",
  sha256WithRSAEncryption: "1.2.840.113549.1.1.11",
  sha384WithRSAEncryption: "1.2.840.113549.1.1.12",
  sha512WithRSAEncryption: "1.2.840.113549.1.1.13",
  idRsassaPss: "1.2.840.113549.1.1.10",
  ecdsaWithSha256: "1.2.840.10045.4.3.2",
  ecdsaWithSha384: "1.2.840.10045.4.3.3",
  prime256v1: "1.2.840.10045.3.1.7",
  secp384r1: "1.3.132.0.34",
  sha1: "1.3.14.3.2.26",
  sha256: "2.16.840.1.101.3.4.2.1",
  sha384: "2.16.840.1.101.3.4.2.2",
  sha512: "2.16.840.1.101.3.4.2.3",
  contentType: "1.2.840.113549.1.9.3",
  messageDigest: "1.2.840.113549.1.9.4",
  signingTime: "1.2.840.113549.1.9.5",
  tstInfo: "1.2.840.113549.1.9.16.1.4",
} as const;
