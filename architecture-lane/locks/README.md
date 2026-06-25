# Architecture-Lane Locks

Every LOCK-* annotated tag in this repository MUST have:

1. An entry in [`INDEX.md`](./INDEX.md) with lock metadata and the Commit 3 SHA (filled via SHA-fill follow-up commit).
2. A dedicated attestation markdown file (`LOCK-<ID>-Attestation.md`).

The annotated git tag is placed on **Commit 3** (the LOCK commit), never on the SHA-fill follow-up commit.

Future locks (GC-2, MFG-2, RTL-7, FA-3, HC-3, …) land in this directory.
