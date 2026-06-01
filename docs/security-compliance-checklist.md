# Advisacor Security and Compliance Control Checklist

This checklist documents backend/security controls for SOC 2 Type II readiness and HIPAA readiness from a control-design perspective. It is not a certification assertion.

## Access Controls

- Production secrets must be stored in environment variables or managed platform secret stores only.
- Client-exposed variables must be limited to `NEXT_PUBLIC_` values that are safe for browser use, such as Supabase URL and anon key.
- Server-only keys such as Supabase service role, Stripe secret, Stripe webhook secret, OpenAI key, Resend key, QuickBooks client secret, OAuth secrets, and owner magic-link secret must never be exposed to client components.
- API routes that use service-role access must authenticate the caller before querying customer, company, accounting, support, report, or AI data.
- Company-scoped access must be checked through `company_users` membership before returning or mutating company-scoped records.
- Admin APIs must require super-admin access checks and configured admin allowlists.
- Owner report links must use expiring, signed access tokens or authenticated owner access.

## Change Management

- All production changes should be committed to GitHub with descriptive commit messages.
- Database changes should be delivered through timestamped Supabase migrations.
- Security-relevant changes should include verification steps in the pull request or deployment notes.
- Changes to report formulas, KPI calculations, PDF layouts, PowerPoint layouts, dashboard presentation, or AI customer-facing output should be reviewed separately from backend control hardening.

## Audit Logging

Audit logs should be generated for:

- Server-observed authentication failures and authorization denials.
- Company access denials and permission denials.
- AI analysis requests.
- Report/package generation events.
- File uploads and data imports.
- Accounting data import requests.
- Admin actions and support ticket changes.
- Permission and invitation changes.
- Owner report exports/downloads.

Audit logs must not store tokens, passwords, API keys, OAuth secrets, or full raw financial payloads. Audit logging should be best-effort and should not block user workflows if audit storage is temporarily unavailable.

## Backup Expectations

- Supabase point-in-time recovery or scheduled backups should be enabled for production.
- Storage buckets containing reports or uploaded files should use private access and backup policies appropriate to customer contracts.
- Backup restoration should be tested periodically and documented.
- GitHub should remain the source of truth for application code and migrations.

## Incident Response Expectations

- Maintain an incident response owner and escalation process.
- Preserve audit logs during incident investigation.
- Rotate affected secrets immediately after suspected exposure.
- Review Supabase Auth logs, Vercel deployment logs, GitHub audit events, Stripe logs, Resend logs, OpenAI usage logs, and QuickBooks OAuth activity as applicable.
- Document timeline, customer impact, containment, eradication, recovery, and corrective actions.

## Vendor and Security Considerations

- Supabase: authentication, database, storage, RLS, audit tables, backups.
- Vercel: deployment controls, environment variables, production access, logs.
- GitHub: repository access, branch protection, change history.
- OpenAI: AI processing, data handling settings, usage monitoring.
- QuickBooks/Intuit: OAuth scopes, token storage, accounting data access.
- Stripe: billing data and webhook verification.
- Resend: support and notification emails.

For HIPAA readiness, execute BAAs where required, classify PHI touchpoints, minimize PHI in logs/prompts, and verify vendors can support HIPAA obligations before processing production PHI.

## Current Future Hardening Items

- Client-side Supabase login/logout events should be correlated with Supabase Auth logs or routed through a backend auth event collector if first-party audit copies are required.
- Static verification should be supplemented with integration tests using test users across multiple companies.
- Production branch protection, deployment approvals, and secret rotation cadence should be configured outside the codebase.
