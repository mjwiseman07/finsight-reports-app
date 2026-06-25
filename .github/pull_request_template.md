## Title

<!-- Short description of the change -->

## Summary

<!-- What changed and why -->

## Testing notes

<!-- Verifiers run, manual checks, cumulative pass/fail count -->

---

## Registry Change Checklist

> Reviewer (mwiseman@advisacor.com) must explicitly approve all registry/governance changes per Phase 42.7A.5.

1. **Registry diff documented** — Does this PR change any file matched by CODEOWNERS registry/governance scope? Has a `REGISTRY_CHANGE_LOG.md` entry been added in this same PR? (Yes / No / N/A)
2. **Citation handle named** — Is the authoritative citation source named in the change-log entry (source name + URL or document handle)? (Yes / No / N/A)
3. **Audit schema impact assessed** — If `audit/types.ts` or audit entry shapes are touched, is the audit schema impact documented? (Yes / No / N/A)
4. **Doctrine bindings preserved** — Do modified files retain required doctrine headers (`builderNeverAuthorsContent`, `failClosedOnAuditWriteFailure`, compliance class)? (Yes / No / N/A)
5. **Compliance impact documented** — Are SOC 1 / SOC 2 / HIPAA impacts listed in the change-log `Risk impact` section? (Yes / No / N/A)
6. **Founder attestation complete** — Has the founder attestation block been filled out in the change-log entry? Are all verifiers still passing? (paste cumulative pass/fail count)

---

## Non-registry change

Use this section when the PR does **not** touch registry or governance scope matched by CODEOWNERS:

- [ ] This PR does not modify registries, `locked-citation-handles.ts`, `audit/types.ts`, or Phase planning/governance docs.
- [ ] No `REGISTRY_CHANGE_LOG.md` entry is required for this PR.
