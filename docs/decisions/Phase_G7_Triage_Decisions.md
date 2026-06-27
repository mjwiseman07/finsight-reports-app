# Phase G7 Triage Decisions

**Date:** 2026-06-27T23:44:11.005Z
**Triage SHA:** `518fb35e2febd003aed11c2dadf2c558a96266c5`
**Method:** cluster-form §5 apply algorithm (75 clusters → 201 gaps)

## Counts

| Triage | Gaps |
| --- | ---: |
| fix-now | 81 |
| document-limitation | 108 |
| defer-to-future | 12 |

## Reasoning patterns

1. **fix-now** — US GAAP / programmatic SEC & 990 extracts where C7a can expand XBRL tag harvest or N-CSR parsers.
2. **document-limitation** — Low-severity narrative, manual IFRS/IPSAS archives, and metadata-only GovCon MD&A assertions.
3. **defer-to-future (G10)** — Hospital §501(r) CHNA and manufacturing inventory/COGM rollforwards needing full filing text.

## Cluster decisions

- `con/ifrs/backlog-disclosure` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `con/ifrs/change-orders-claims` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `con/ifrs/contract-balances-rollforward` → **document-limitation**: Manual IFRS/IPSAS archive stub — full annual report text not ingested in G7 corpus.
- `con/ifrs/cost-to-cost-ratio` → **document-limitation**: Manual IFRS/IPSAS archive stub — full annual report text not ingested in G7 corpus.
- `con/ifrs/poc-method-declared` → **document-limitation**: Manual IFRS/IPSAS archive stub — full annual report text not ingested in G7 corpus.
- `con/us-gaap/asc606-over-time` → **fix-now**: Extractor/router enhancement scheduled for G7-C7a (expand tags or filing-type parsers).
- `con/us-gaap/backlog-disclosure` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `con/us-gaap/change-orders-claims` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `con/us-gaap/contract-balances-rollforward` → **fix-now**: Extractor/router enhancement scheduled for G7-C7a (expand tags or filing-type parsers).
- `con/us-gaap/cost-to-cost-ratio` → **fix-now**: Extractor/router enhancement scheduled for G7-C7a (expand tags or filing-type parsers).
- `con/us-gaap/poc-method-declared` → **fix-now**: Extractor/router enhancement scheduled for G7-C7a (expand tags or filing-type parsers).
- `fa/us-gaap/distributions` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `fa/us-gaap/expense-ratio` → **fix-now**: Extractor/router enhancement scheduled for G7-C7a (expand tags or filing-type parsers).
- `fa/us-gaap/fee-waivers` → **document-limitation**: Medium narrative assertions require prose sections beyond XBRL fact descriptions.
- `fa/us-gaap/nav-computation` → **fix-now**: Extractor/router enhancement scheduled for G7-C7a (expand tags or filing-type parsers).
- `fa/us-gaap/portfolio-composition` → **fix-now**: Extractor/router enhancement scheduled for G7-C7a (expand tags or filing-type parsers).
- `fa/us-gaap/realized-unrealized-gains` → **fix-now**: Extractor/router enhancement scheduled for G7-C7a (expand tags or filing-type parsers).
- `fa/us-gaap/top-holdings` → **fix-now**: Extractor/router enhancement scheduled for G7-C7a (expand tags or filing-type parsers).
- `gc/us-gaap/backlog-funded-split` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `gc/us-gaap/cas-410-gna-pool` → **fix-now**: Extractor/router enhancement scheduled for G7-C7a (expand tags or filing-type parsers).
- `gc/us-gaap/cas-418-overhead` → **fix-now**: Extractor/router enhancement scheduled for G7-C7a (expand tags or filing-type parsers).
- `gc/us-gaap/contract-type-mix` → **document-limitation**: Contract-type mix is disclosed in MD&A tables; not available in pruned companyfacts numeric slice.
- `hc/ifrs/bad-debt-vs-charity` → **document-limitation**: Manual IFRS/IPSAS archive stub — full annual report text not ingested in G7 corpus.
- `hc/ifrs/charity-care-policy` → **document-limitation**: Manual IFRS/IPSAS archive stub — full annual report text not ingested in G7 corpus.
- `hc/ifrs/chna-cycle` → **document-limitation**: Manual IFRS/IPSAS archive stub — full annual report text not ingested in G7 corpus.
- `hc/ifrs/payor-mix` → **document-limitation**: Manual IFRS/IPSAS archive stub — full annual report text not ingested in G7 corpus.
- `hc/ifrs/regulatory-narrative` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `hc/us-gaap/bad-debt-vs-charity` → **fix-now**: Extractor/router enhancement scheduled for G7-C7a (expand tags or filing-type parsers).
- `hc/us-gaap/charity-care-policy` → **document-limitation**: Medium narrative assertions require prose sections beyond XBRL fact descriptions.
- `hc/us-gaap/chna-cycle` → **defer-to-future** (G10): §501(r) CHNA cycle requires full 10-K narrative/HTML parse beyond companyfacts API.
- `hc/us-gaap/payor-mix` → **fix-now**: Extractor/router enhancement scheduled for G7-C7a (expand tags or filing-type parsers).
- `hc/us-gaap/regulatory-narrative` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `mfg/ifrs/capacity-utilization` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `mfg/ifrs/cogm-rollforward` → **document-limitation**: Manual IFRS/IPSAS archive stub — full annual report text not ingested in G7 corpus.
- `mfg/ifrs/inventory-decomposition` → **document-limitation**: Manual IFRS/IPSAS archive stub — full annual report text not ingested in G7 corpus.
- `mfg/ifrs/lcm-nrv-writedowns` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `mfg/ifrs/variance-disclosures` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `mfg/us-gaap/capacity-utilization` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `mfg/us-gaap/cogm-rollforward` → **defer-to-future** (G10): Manufacturing inventory/COGM rollforward needs instance-document or full 10-K note extraction.
- `mfg/us-gaap/inventory-decomposition` → **defer-to-future** (G10): Manufacturing inventory/COGM rollforward needs instance-document or full 10-K note extraction.
- `mfg/us-gaap/lcm-nrv-writedowns` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `mfg/us-gaap/variance-disclosures` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `npo/ipsas/endowment-composition` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `npo/ipsas/functional-expense-allocation` → **document-limitation**: Manual IFRS/IPSAS archive stub — full annual report text not ingested in G7 corpus.
- `npo/ipsas/liquidity-disclosure` → **document-limitation**: Manual IFRS/IPSAS archive stub — full annual report text not ingested in G7 corpus.
- `npo/ipsas/part9-part10-cross-tie` → **document-limitation**: Manual IFRS/IPSAS archive stub — full annual report text not ingested in G7 corpus.
- `npo/us-gaap/endowment-composition` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `npo/us-gaap/functional-expense-allocation` → **fix-now**: Extractor/router enhancement scheduled for G7-C7a (expand tags or filing-type parsers).
- `npo/us-gaap/liquidity-disclosure` → **document-limitation**: Medium narrative assertions require prose sections beyond XBRL fact descriptions.
- `npo/us-gaap/part9-part10-cross-tie` → **fix-now**: Extractor/router enhancement scheduled for G7-C7a (expand tags or filing-type parsers).
- `ps/ifrs/principal-agent-pass-through` → **document-limitation**: Manual IFRS/IPSAS archive stub — full annual report text not ingested in G7 corpus.
- `ps/ifrs/receivables-aging` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `ps/ifrs/unbilled-receivables` → **document-limitation**: Manual IFRS/IPSAS archive stub — full annual report text not ingested in G7 corpus.
- `ps/ifrs/utilization-rate` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `ps/us-gaap/principal-agent-pass-through` → **fix-now**: Extractor/router enhancement scheduled for G7-C7a (expand tags or filing-type parsers).
- `ps/us-gaap/receivables-aging` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `ps/us-gaap/revenue-mix-tm-fixed` → **fix-now**: Extractor/router enhancement scheduled for G7-C7a (expand tags or filing-type parsers).
- `ps/us-gaap/unbilled-receivables` → **fix-now**: Extractor/router enhancement scheduled for G7-C7a (expand tags or filing-type parsers).
- `ps/us-gaap/utilization-rate` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `rtl/ifrs/channel-disaggregation` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `rtl/ifrs/comp-sales-presence` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `rtl/ifrs/inventory-method-declared` → **document-limitation**: Manual IFRS/IPSAS archive stub — full annual report text not ingested in G7 corpus.
- `rtl/ifrs/lease-obligations` → **document-limitation**: Manual IFRS/IPSAS archive stub — full annual report text not ingested in G7 corpus.
- `rtl/us-gaap/channel-disaggregation` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `rtl/us-gaap/comp-sales-presence` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `rtl/us-gaap/lease-obligations` → **fix-now**: Extractor/router enhancement scheduled for G7-C7a (expand tags or filing-type parsers).
- `saas/ifrs/contract-asset-liability-split` → **document-limitation**: Manual IFRS/IPSAS archive stub — full annual report text not ingested in G7 corpus.
- `saas/ifrs/cost-to-obtain-contract` → **document-limitation**: Manual IFRS/IPSAS archive stub — full annual report text not ingested in G7 corpus.
- `saas/ifrs/deferred-revenue-rollforward` → **document-limitation**: Manual IFRS/IPSAS archive stub — full annual report text not ingested in G7 corpus.
- `saas/ifrs/revenue-disaggregation` → **document-limitation**: Manual IFRS/IPSAS archive stub — full annual report text not ingested in G7 corpus.
- `saas/ifrs/saas-metrics-presence` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.
- `saas/us-gaap/contract-asset-liability-split` → **fix-now**: Extractor/router enhancement scheduled for G7-C7a (expand tags or filing-type parsers).
- `saas/us-gaap/cost-to-obtain-contract` → **fix-now**: Extractor/router enhancement scheduled for G7-C7a (expand tags or filing-type parsers).
- `saas/us-gaap/deferred-revenue-rollforward` → **fix-now**: Extractor/router enhancement scheduled for G7-C7a (expand tags or filing-type parsers).
- `saas/us-gaap/saas-metrics-presence` → **document-limitation**: Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.

## Singleton clusters (count=1)

- `con/ifrs/poc-method-declared` → document-limitation (GAP-0001)
- `con/ifrs/cost-to-cost-ratio` → document-limitation (GAP-0002)
- `con/ifrs/contract-balances-rollforward` → document-limitation (GAP-0003)
- `con/ifrs/backlog-disclosure` → document-limitation (GAP-0004)
- `con/ifrs/change-orders-claims` → document-limitation (GAP-0005)
- `hc/ifrs/chna-cycle` → document-limitation (GAP-0080)
- `hc/ifrs/charity-care-policy` → document-limitation (GAP-0081)
- `hc/ifrs/bad-debt-vs-charity` → document-limitation (GAP-0082)
- `hc/ifrs/payor-mix` → document-limitation (GAP-0083)
- `hc/ifrs/regulatory-narrative` → document-limitation (GAP-0084)
- `mfg/ifrs/inventory-decomposition` → document-limitation (GAP-0105)
- `mfg/ifrs/cogm-rollforward` → document-limitation (GAP-0106)
- `mfg/ifrs/variance-disclosures` → document-limitation (GAP-0107)
- `mfg/ifrs/lcm-nrv-writedowns` → document-limitation (GAP-0108)
- `mfg/ifrs/capacity-utilization` → document-limitation (GAP-0109)
- `npo/ipsas/part9-part10-cross-tie` → document-limitation (GAP-0130)
- `npo/ipsas/liquidity-disclosure` → document-limitation (GAP-0131)
- `npo/ipsas/functional-expense-allocation` → document-limitation (GAP-0132)
- `npo/ipsas/endowment-composition` → document-limitation (GAP-0133)
- `npo/us-gaap/part9-part10-cross-tie` → fix-now (GAP-0143)
- `ps/ifrs/unbilled-receivables` → document-limitation (GAP-0147)
- `ps/ifrs/receivables-aging` → document-limitation (GAP-0148)
- `ps/ifrs/utilization-rate` → document-limitation (GAP-0149)
- `ps/ifrs/principal-agent-pass-through` → document-limitation (GAP-0150)
- `ps/us-gaap/receivables-aging` → document-limitation (GAP-0152)
- `saas/ifrs/deferred-revenue-rollforward` → document-limitation (GAP-0181)
- `saas/ifrs/contract-asset-liability-split` → document-limitation (GAP-0182)
- `saas/ifrs/revenue-disaggregation` → document-limitation (GAP-0183)
- `saas/ifrs/cost-to-obtain-contract` → document-limitation (GAP-0184)
- `saas/ifrs/saas-metrics-presence` → document-limitation (GAP-0185)

## Halts

_None — all 201 gaps classified._
