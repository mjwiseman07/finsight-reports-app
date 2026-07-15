# Advisacor Legal Documents — Audit Trail
## Effective date
- Terms of Service, Privacy Policy, Refund Policy: **July 14, 2026**
## What shipped in Phase TCP1 W3 Legal Pages
| Document | Route | File | Status |
| --- | --- | --- | --- |
| Privacy Policy | `/privacy` | `app/privacy/page.tsx` | Production (self-drafted) |
| Terms of Service | `/terms` | `app/terms/page.tsx` | Production (self-drafted) |
| Refund Policy | `/refund-policy` | `app/refund-policy/page.tsx` | Production (self-drafted) |
| Cookie banner | Global | `components/CookieBanner.tsx` | Production |
## What these documents cover
**Privacy Policy** covers: information categories (direct, QBO-derived, automatic), use, no-sale/no-training commitments, sub-processors (Supabase, Vercel, Stripe, AWS Bedrock, Intuit, Resend, GitHub), AI/automated processing, retention (30 days post-cancellation), security controls, cookies, CCPA/CPRA rights, GDPR/UK GDPR/FADP rights (with a limitation that Advisacor is not marketed to EEA/UK/CH consumers), other US state privacy laws, children (under 13), international transfers, change notification (30-day notice).
**Terms of Service** covers: the Service description, eligibility, connected-systems (QBO OAuth) provisions, subscription/billing/renewals, **30-day money-back guarantee (Section 5)**, acceptable use, customer-data ownership and license grant, AI outputs disclaimer (not professional advice), IP, confidentiality, termination, warranty disclaimer, limitation of liability (12-month fee cap), indemnification, **governing law = Commonwealth of Virginia, exclusive venue in Roanoke, Virginia**, waiver of jury trial, class-action waiver, modifications with 30-day notice, standard General terms.
**Refund Policy** covers: 30-day money-back guarantee scope (first paid payment only), request procedure via email, timeline (2-day response, 10-day payout), what is not covered (renewals, complimentary accounts, breach termination), cancellation vs. refund distinction, chargeback preference.
**Cookie banner** covers: three-tier consent (Accept all / Functional only / Decline non-essential), 12-month cookie persistence, event dispatch for future analytics, re-open link in footer.
## Recommended legal review milestones
The documents above use standard SaaS + fintech patterns and were drafted internally. Before the following business milestones, engage outside counsel to review:
1. **First enterprise / mid-market customer** — MSA, DPA, and Order Form will typically override these terms and need bespoke review.
2. **First customer subject to HIPAA** — needs a Business Associate Agreement (BAA) with Advisacor's sub-processors and additional PHI safeguards. Do not sign up healthcare customers who require BAA until this is in place.
3. **First customer in EEA, UK, or Switzerland** — need Standard Contractual Clauses (SCCs), potentially a data-protection representative, and a review of the "US-only" limitation currently in the Privacy Policy.
4. **First customer subject to a state accountancy board (e.g., California CPA firms with client accounting)** — check whether Advisacor's outputs create any regulated activity.
5. **First insurance policy purchase (E&O, Cyber, D&O)** — carriers may require specific ToS language.
6. **Any material change in AI usage** — new model providers, new automated decision-making features, EU AI Act compliance if targeting EU.
## Known gaps to close with counsel
- No arbitration clause. Some counsel recommend one; others don't. Discuss with lawyer.
- No DPA template for enterprise customers who ask (they will).
- No sub-processor change-notification form or process.
- No security incident notification SLA specified (currently "immediately notify" — enterprise contracts want 24- or 72-hour written notice).
- No SLA or uptime commitment. Consider a separate SLA doc if enterprise customers ask.
## Change log
| Date | Change | Author |
| --- | --- | --- |
| 2026-07-14 | Initial production release of ToS, Privacy Policy, Refund Policy, Cookie Banner | Matthew Wiseman |
