import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteNav } from "../../components/SiteNav";
export const metadata: Metadata = {
  title: "Privacy Policy | Advisacor™",
  description:
    "Privacy policy for Wiseman Financial Technologies, LLC and the Advisacor™ platform. How we collect, use, and protect customer data — including QuickBooks Online data.",
};
export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F7F6F2] text-[#28251D]">
      <SiteNav />
      <section className="bg-gradient-to-br from-[#F7F6F2] via-[#EEEDE7] to-[#D4D1CA] pb-20 pt-[240px] md:pt-[260px] lg:pt-[280px]">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-4 text-xs font-semibold tracking-wider text-[#C9A961]">PRIVACY POLICY</p>
          <h1 className="text-4xl font-bold leading-tight text-[#28251D] md:text-5xl">Privacy Policy</h1>
          <p className="mt-4 text-sm text-[#7A7974]">Last updated: July 14, 2026 · Effective: July 14, 2026</p>
        </div>
      </section>
      <section className="bg-[#F9F8F5] py-20">
        <div className="prose prose-slate mx-auto max-w-3xl px-6">
          <p>
            Wiseman Financial Technologies, LLC, a Virginia limited liability company (&quot;<strong>Advisacor</strong>,&quot;
            &quot;<strong>we</strong>,&quot; &quot;<strong>our</strong>,&quot; or &quot;<strong>us</strong>&quot;),
            operates the Advisacor™ platform available at{" "}
            <a href="https://www.advisacor.com">www.advisacor.com</a> (the &quot;<strong>Platform</strong>&quot;).
            This Privacy Policy explains what information we collect, how we use it, who we share it with, and the
            rights and choices available to you.
          </p>
          <p>
            By using the Platform you consent to the practices described in this Privacy Policy. If you do not agree,
            do not use the Platform. This Privacy Policy is incorporated by reference into our{" "}
            <Link href="/terms">Terms of Service</Link>.
          </p>
          <h2>1. Who This Policy Covers</h2>
          <p>
            This Privacy Policy applies to (a) visitors to our public website, (b) users who sign up for the Platform,
            (c) authorized users of a subscribing organization (accounting firms, bookkeeping firms, business owners,
            and their invited team members), and (d) individuals whose data is contained in accounting records
            connected to the Platform by a subscribing organization.
          </p>
          <h2>2. Information We Collect</h2>
          <h3>2.1 Information you provide directly</h3>
          <ul>
            <li><strong>Account information:</strong> name, email address, password (hashed), organization name, role, phone number (optional).</li>
            <li><strong>Billing information:</strong> handled by Stripe, Inc. We do not store payment card numbers on our systems. We retain billing metadata (subscription tier, invoice history, billing address) provided by Stripe.</li>
            <li><strong>Support communications:</strong> content of support tickets, chat messages, and emails sent to us.</li>
            <li><strong>Marketing communications:</strong> email address and name you submit through waitlist or contact forms.</li>
          </ul>
          <h3>2.2 Information collected from connected accounting systems</h3>
          <p>
            When an authorized user of your organization connects a QuickBooks Online (&quot;QBO&quot;) company to
            Advisacor, we request read-only access via Intuit&apos;s OAuth 2.0 authorization flow. With that access we
            retrieve, on your organization&apos;s behalf:
          </p>
          <ul>
            <li>Trial balance and general ledger entries</li>
            <li>Chart of accounts</li>
            <li>Company profile (legal name, EIN, address, fiscal year end, currency)</li>
            <li>Customers, vendors, and employees list (names and identifiers only; not payroll)</li>
            <li>Invoices, bills, journal entries, deposits, and other accounting transactions necessary to generate financial reviews</li>
          </ul>
          <p>
            We use the <code>com.intuit.quickbooks.accounting</code> scope only. We do not request the payroll, payments,
            or OpenID scopes. We do not modify data in your QBO company through the standard Review Assist and
            Continuous Intelligence tiers. Write-back automation, if enabled under a higher-tier subscription, is
            performed only with explicit user approval on a per-action basis.
          </p>
          <h3>2.3 Information collected automatically</h3>
          <ul>
            <li><strong>Usage data:</strong> pages viewed, features used, timestamps, actions taken. Used to operate, secure, and improve the Platform.</li>
            <li><strong>Device and log data:</strong> IP address, browser type, operating system, device identifiers, referring URLs, and error logs.</li>
            <li><strong>Cookies and similar technologies:</strong> see <a href="#cookies">Section 8 (Cookies)</a>.</li>
          </ul>
          <h2>3. How We Use Information</h2>
          <ul>
            <li><strong>Provide the Platform:</strong> generate financial reviews, findings memos, executive briefings, and other outputs requested by your organization.</li>
            <li><strong>AI-generated outputs:</strong> we use large language models (currently Anthropic Claude via AWS Bedrock) to analyze accounting data and produce human-readable narratives. See <a href="#ai">Section 7 (AI and Automated Processing)</a>.</li>
            <li><strong>Operate and secure:</strong> authenticate users, enforce entitlements, detect fraud, prevent abuse, monitor performance, and respond to security incidents.</li>
            <li><strong>Support and communicate:</strong> respond to inquiries, deliver service notifications, send transactional emails, and — with your consent — send marketing emails.</li>
            <li><strong>Billing:</strong> process subscriptions, invoices, refunds, and tax reporting.</li>
            <li><strong>Legal and compliance:</strong> comply with law, respond to lawful requests, protect rights, enforce our Terms.</li>
            <li><strong>Improve the Platform:</strong> aggregate usage patterns to improve reliability, add features, and correct defects. See Section 4 for our commitment on your data.</li>
          </ul>
          <h2>4. What We Do NOT Do With Your Data</h2>
          <ul>
            <li>We do not sell, rent, or lease personal information.</li>
            <li>We do not use your QuickBooks Online data to train machine learning models — ours or any third party&apos;s.</li>
            <li>We do not share individually identifiable QBO data with any third party except the sub-processors listed in Section 6 and only to the extent necessary to deliver the Platform.</li>
            <li>We do not advertise on the Platform and do not share data with advertising networks.</li>
          </ul>
          <h2 id="sharing">5. When We Share Information</h2>
          <p>We share information only in these circumstances:</p>
          <ul>
            <li><strong>With sub-processors</strong> that perform services on our behalf (Section 6). Sub-processors are contractually bound to confidentiality and to use data only as instructed by us.</li>
            <li><strong>With your organization:</strong> if you are an invited team member of a subscribing organization, your activity within the Platform is visible to your organization&apos;s administrator.</li>
            <li><strong>For legal reasons:</strong> to comply with law, valid legal process, government requests; to enforce our Terms; to detect or prevent fraud or security incidents; to protect our or others&apos; rights, property, or safety.</li>
            <li><strong>Corporate transactions:</strong> in connection with a merger, acquisition, financing, or sale of assets, subject to the acquirer honoring this Privacy Policy.</li>
            <li><strong>With your consent</strong> for any other purpose.</li>
          </ul>
          <h2 id="subprocessors">6. Sub-processors</h2>
          <p>
            We rely on the following sub-processors. This list is current as of the &quot;Last updated&quot; date above.
            Material changes will be announced in-app or by email at least thirty (30) days before they take effect.
          </p>
          <ul>
            <li><strong>Supabase Inc.</strong> — application database (PostgreSQL), authentication, and storage. Hosted in the United States. Encrypted at rest (AES-256) and in transit (TLS 1.2+).</li>
            <li><strong>Vercel Inc.</strong> — application hosting, CDN, and edge network. United States regions.</li>
            <li><strong>Stripe, Inc.</strong> — subscription billing and payment processing. PCI DSS Level 1 certified.</li>
            <li><strong>Amazon Web Services, Inc. (AWS Bedrock)</strong> — AI/LLM inference (Anthropic Claude models). Content is not used to train foundation models per AWS Bedrock&apos;s data usage terms.</li>
            <li><strong>Intuit Inc.</strong> — QuickBooks Online API provider. Governed by your separate agreement with Intuit and Intuit&apos;s privacy policy.</li>
            <li><strong>Resend, Inc.</strong> — transactional email delivery.</li>
            <li><strong>GitHub, Inc. (Microsoft Corporation)</strong> — source-code and internal engineering artifacts. No customer QBO data.</li>
          </ul>
          <h2 id="ai">7. AI and Automated Processing</h2>
          <p>
            The Platform uses generative AI models (currently Anthropic Claude, delivered via AWS Bedrock) to analyze
            connected accounting data and produce narratives, memos, and recommendations. Important properties of
            our AI usage:
          </p>
          <ul>
            <li><strong>No training on your data:</strong> we send prompts and receive completions. Inputs and outputs are not used by AWS or Anthropic to train foundation models.</li>
            <li><strong>Human review recommended:</strong> AI-generated outputs are drafts. You are responsible for reviewing and validating outputs before relying on them for financial reporting, tax, audit, or advisory decisions.</li>
            <li><strong>No automated decisions with legal effect:</strong> Advisacor does not make automated decisions that produce legal or similarly significant effects on individuals within the meaning of GDPR Article 22 or comparable laws.</li>
          </ul>
          <h2 id="retention">8. Data Retention and Deletion</h2>
          <ul>
            <li><strong>Active subscriptions:</strong> we retain data for as long as your subscription is active and for a reasonable period thereafter to allow for reactivation and to fulfill legal, tax, and audit obligations.</li>
            <li><strong>After cancellation:</strong> customer QBO-derived data is deleted from active systems within thirty (30) days of subscription cancellation. Anonymized or aggregated usage data may be retained longer for analytics purposes.</li>
            <li><strong>On request:</strong> you may request deletion at any time by emailing{" "}
              <a href="mailto:mwiseman@advisacor.com">mwiseman@advisacor.com</a>. We will delete data within thirty (30) days of a verified request, subject to legal retention obligations.
            </li>
            <li><strong>Backups:</strong> data may persist in encrypted backups for up to ninety (90) days after deletion from active systems.</li>
          </ul>
          <h2 id="security">9. Security</h2>
          <p>We use industry-standard administrative, technical, and physical safeguards, including:</p>
          <ul>
            <li>Encryption at rest (AES-256) and in transit (TLS 1.2 or higher)</li>
            <li>Row-level security in our application database</li>
            <li>Multi-factor authentication for all administrative access</li>
            <li>Principle of least privilege for internal access to production systems</li>
            <li>Audit logging of privileged actions</li>
            <li>Regular security review of dependencies and third-party sub-processors</li>
            <li>OAuth 2.0 for all external system connections; we never receive or store QuickBooks Online passwords</li>
          </ul>
          <p>
            No system is perfectly secure. If you believe your account has been compromised, contact us immediately at{" "}
            <a href="mailto:mwiseman@advisacor.com">mwiseman@advisacor.com</a>.
          </p>
          <h2 id="cookies">10. Cookies and Similar Technologies</h2>
          <p>We use three categories of cookies:</p>
          <ul>
            <li><strong>Strictly necessary:</strong> authentication (Supabase session JWT), CSRF tokens, OAuth state for QuickBooks connection, tier and entitlement gates. These cannot be disabled; without them the Platform cannot function.</li>
            <li><strong>Functional:</strong> user interface preferences, brand mode selections, dismissed banners.</li>
            <li><strong>Analytics:</strong> we do not currently deploy analytics cookies. If we adopt them, we will update this policy and re-prompt for consent through the cookie banner.</li>
          </ul>
          <p>
            You can manage your cookie preferences at any time through the &quot;Cookie preferences&quot; link in our
            website footer. Strictly necessary cookies cannot be disabled while you use the authenticated portions of
            the Platform.
          </p>
          <h2 id="rights">11. Your Privacy Rights</h2>
          <h3>11.1 California residents (CCPA / CPRA)</h3>
          <p>
            You have the right to (a) know what personal information we collect and how we use it, (b) request deletion
            of your personal information, (c) opt out of sale or sharing of personal information (we do not sell or
            share personal information as those terms are defined by California law), (d) correct inaccurate personal
            information, and (e) limit our use of sensitive personal information. To exercise these rights, email{" "}
            <a href="mailto:mwiseman@advisacor.com">mwiseman@advisacor.com</a>. We will verify your identity before
            fulfilling requests and will not discriminate against you for exercising these rights.
          </p>
          <h3>11.2 European Economic Area, United Kingdom, and Switzerland (GDPR / UK GDPR / FADP)</h3>
          <p>
            If you are located in the EEA, UK, or Switzerland, you have the rights of access, rectification, erasure,
            restriction of processing, portability, and objection. Where processing is based on consent, you may
            withdraw consent at any time. You have the right to lodge a complaint with your local supervisory
            authority. Our legal basis for processing is one or more of: performance of contract, legitimate interests
            (operating and securing the Platform), consent (marketing communications and analytics cookies where
            applicable), and legal obligation.
          </p>
          <p>
            Where we transfer personal data out of the EEA, UK, or Switzerland to the United States, we rely on
            Standard Contractual Clauses (SCCs) or an equivalent transfer mechanism required by law.
          </p>
          <p>
            <strong>Important limitation:</strong> the Platform is designed for use by organizations located in the
            United States. We do not currently market to consumers in the EEA, UK, or Switzerland. If you are located
            in a jurisdiction where the Platform is not offered, do not sign up.
          </p>
          <h3>11.3 Other US states</h3>
          <p>
            Residents of Virginia, Colorado, Connecticut, Utah, Texas, and other US states with comprehensive privacy
            laws have similar rights. Email <a href="mailto:mwiseman@advisacor.com">mwiseman@advisacor.com</a> to
            exercise them.
          </p>
          <h2 id="children">12. Children</h2>
          <p>
            The Platform is not directed to children under thirteen (13). We do not knowingly collect personal
            information from children under 13. If you believe a child has provided us information, contact us and
            we will delete it.
          </p>
          <h2 id="international">13. International Data Transfers</h2>
          <p>
            We are based in the United States. Data you provide is processed in the United States. If you access the
            Platform from outside the United States, you consent to the transfer of your information to the United
            States, which may have data-protection laws different from those in your jurisdiction.
          </p>
          <h2 id="changes">14. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. When we make material changes we will notify you by
            email (if we have your address on file) and by posting a notice in-app or on our website at least thirty
            (30) days before the change takes effect. Continued use of the Platform after the effective date
            constitutes acceptance of the revised Privacy Policy.
          </p>
          <h2 id="contact">15. Contact Us</h2>
          <p>
            For questions, requests, or complaints regarding this Privacy Policy or our data practices, contact:
          </p>
          <p>
            Wiseman Financial Technologies, LLC<br />
            Attn: Privacy<br />
            2023 South Stewart Ave<br />
            Covington, VA 24426<br />
            Email: <a href="mailto:mwiseman@advisacor.com">mwiseman@advisacor.com</a>
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
