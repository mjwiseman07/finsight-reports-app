# TSA Root Certificate Bundle

This directory contains the trust anchors for RFC 3161 timestamp verification in
Advisacor's zero-trust browser verifier (`lib/pilot-lifecycle/cms-verify.ts`).

## Trust Model

- Hash-pinning: each PEM's SHA-256 fingerprint is compiled into `TRUSTED_ROOT_FINGERPRINTS`
  in `lib/pilot-lifecycle/tsa-trust.ts`. A TSR's chain must terminate at a certificate whose
  SHA-256(DER) matches one of the pinned fingerprints, or verification fails with a specific
  actionable error (never a silent generic "invalid signature").
- DN-pinning is NOT used. Verified during Block 9.1 research: three distinct genuine certificates
  share the exact "Sectigo Public Time Stamping Root R46" DN, six share "DigiCert Trusted Root
  G4", and a real third-party CA mirror was found serving a fourth non-matching cert under one
  of these DNs. Only full-DER SHA-256 hash uniquely identifies these.

## Bundled Certificates

| File | Subject CN | Purpose |
|---|---|---|
| `digicert-trusted-root-g4-selfsigned.pem` | DigiCert Trusted Root G4 (self-signed) | DigiCert TSA trust anchor (v1) |
| `digicert-trusted-root-g4-crosssigned-assured-id.pem` | DigiCert Trusted Root G4 (cross-signed by Assured ID Root CA) | DigiCert TSA trust anchor (currently-served path) |
| `sectigo-public-tsp-root-r46-crosssigned-usertrust.pem` | Sectigo Public Time Stamping Root R46 (cross-signed by USERTrust RSA CA) | Sectigo TSA trust anchor (currently-served path) |
| `sectigo-public-tsp-root-r46-selfsigned.pem` | Sectigo Public Time Stamping Root R46 (self-signed) | Sectigo TSA trust anchor (path resilience) |
| `sectigo-public-tsp-root-r46-crosssigned-aaa.pem` | Sectigo Public Time Stamping Root R46 (cross-signed by AAA Certificate Services) | Sectigo TSA legacy path |

## Update Procedure

When DigiCert or Sectigo rotates a root:

1. Fetch new root from a verifiable source (CA's own knowledge base OR crt.sh with a
   Certificate Transparency-backed lookup).
2. Compute SHA-256(DER-of-cert) locally and compare to CA's published fingerprint.
3. Add the new PEM to this directory.
4. Add the new SHA-256 fingerprint to `TRUSTED_ROOT_FINGERPRINTS` in `tsa-trust.ts`.
5. Do NOT remove old fingerprints — a customer verifying a historical timestamp anchored
   under the old root must still succeed. Fingerprint set is APPEND-ONLY.

Never trust third-party PEM mirrors. Block 9.1 research caught
`https://sectigo.tbs-certificats.com/SectigoPublicTimeStampingRootR46.crt` serving
a fourth, non-matching cert under an identical DN. Always cross-check against crt.sh.
