#!/usr/bin/env node
"use strict";

/**
 * Two-stage apply-authorization publication sequence.
 * This script does not write, update refs, or create a real authorization.
 * Stage 1 is the reviewed executable tip, whose record stays UNPUBLISHED.
 * Stage 2 is a later descendant commit that changes only production_apply_authorization
 * and names authorized_executable_commit as that ancestor. It must not contain its own SHA.
 * Reseal must not be run in stage 2.
 */
const forbidden = process.argv.some((arg) => /^(--write|--publish|--update-ref)$/.test(arg));
if (forbidden) {
  process.stderr.write("PUBLICATION_WRITE_FORBIDDEN\n");
  process.exit(1);
}

process.stdout.write(
  `${JSON.stringify({
    verdict: "PUBLICATION_SEQUENCE_ONLY",
    write: false,
    real_authorization: "UNPUBLISHED",
    stage1: "reviewed executable commit; production_apply_authorization stays UNPUBLISHED",
    stage2:
      "later descendant changes only production_apply_authorization, names authorized_executable_commit, and does not store its own SHA",
  })}\n`,
);
