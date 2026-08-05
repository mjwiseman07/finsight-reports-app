# TSA Root Certificates (Block 9.1 dependency)

This directory will hold pinned PEM copies of:
  - DigiCert Trusted Root G4 (for `timestamp.digicert.com` chain)
  - Sectigo Public Time Stamping Root (for `timestamp.sectigo.com` chain)

Block 9 v1 ships an honest Merkle-inclusion verifier that DOES NOT trust
Advisacor's servers for the Merkle math but currently defers full CMS
SignedData signature verification to Block 9.1. The verifier reports this
explicitly in `notes` so it is not silently missing.

DO NOT populate this directory ad-hoc — Block 9.1 will fetch and pin the
certs from the CAs' official distribution channels with hash verification.
