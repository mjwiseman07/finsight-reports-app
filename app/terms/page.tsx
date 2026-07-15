import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteNav } from "../../components/SiteNav";
export const metadata: Metadata = {
  title: "Terms of Service | Advisacor™",
  description:
    "Terms of Service for the Advisacor™ platform, operated by Wiseman Financial Technologies, LLC.",
};
export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F7F6F2] text-[#28251D]">
      <SiteNav />
      <section className="bg-gradient-to-br from-[#F7F6F2] via-[#EEEDE7] to-[#D4D1CA] pb-20 pt-[240px] md:pt-[260px] lg:pt-[280px]">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-4 text-xs font-semibold tracking-wider text-[#C9A961]">TERMS OF SERVICE</p>
          <h1 className="text-4xl font-bold leading-tight text-[#28251D] md:text-5xl">Terms of Service</h1>
          <p className="mt-4 text-sm text-[#7A7974]">Last updated: July 14, 2026 · Effective: July 14, 2026</p>
        </div>
      </section>
      <section className="bg-[#F9F8F5] py-20">
        <div className="prose prose-slate mx-auto max-w-3xl px-6">
          <p>
            These Terms of Service (&quot;<strong>Terms</strong>&quot;) form a binding agreement between you and
            Wiseman Financial Technologies, LLC, a Virginia limited liability company (&quot;<strong>Advisacor</strong>,&quot;
            &quot;<strong>we</strong>,&quot; &quot;<strong>our</strong>,&quot; or &quot;<strong>us</strong>&quot;),
            governing your access to and use of the Advisacor™ platform, our website at{" "}
            <a href="https://www.advisacor.com">www.advisacor.com</a>, and all related services (collectively, the
            &quot;<strong>Service</strong>&quot;).
          </p>
          <p>
            <strong>By creating an account, accessing, or using the Service, you agree to these Terms.</strong> If you
            do not agree, do not use the Service. If you accept these Terms on behalf of an organization, you
            represent that you have authority to bind that organization, and &quot;you&quot; refers to the organization.
          </p>
          <h2>1. The Service</h2>
          <p>
            Advisacor is an AI-powered financial intelligence platform for bookkeepers, accounting firms, and business
            owners. Depending on your subscription tier, the Service reads accounting data (primarily from
            QuickBooks Online), generates financial reviews, findings memos, executive briefings, and other outputs,
            and delivers them through the Platform and by email.
          </p>
          <p>
            The Service is provided on a subscription basis. Available tiers, features, and prices are described at{" "}
            <a href="https://www.advisacor.com/pricing">www.advisacor.com/pricing</a> and may change from time to time.
            Material changes to your current subscription will be communicated to you before they take effect.
          </p>
          <h2>2. Eligibility and Accounts</h2>
          <p>
            To use the Service you must be at least eighteen (18) years old and legally able to enter into these Terms.
            You must provide accurate registration information and keep it current. You are responsible for all
            activity that occurs under your account and for maintaining the confidentiality of your credentials.
            Notify us immediately at <a href="mailto:mwiseman@advisacor.com">mwiseman@advisacor.com</a> if you suspect
            unauthorized use.
          </p>
          <h2>3. Connected Systems (QuickBooks Online)</h2>
          <p>
            The Service connects to third-party accounting systems, currently QuickBooks Online, through OAuth 2.0.
            By connecting a QuickBooks Online company you (a) represent that you are authorized by the company&apos;s
            owner or administrator to grant Advisacor access, (b) grant Advisacor permission to read the accounting
            data described in our <Link href="/privacy">Privacy Policy</Link>, and (c) acknowledge that your use of
            QuickBooks Online is governed by your separate agreement with Intuit Inc.
          </p>
          <p>
            You may disconnect QuickBooks Online at any time from within the Service or from within QuickBooks Online.
            Upon disconnection we cease accessing new data. Existing data retained by us is subject to our retention
            practices described in the Privacy Policy.
          </p>
          <h2>4. Subscriptions, Billing, and Fees</h2>
          <ul>
            <li><strong>Subscription term:</strong> subscriptions renew automatically at the end of each billing period (monthly or annual, as selected) unless cancelled beforehand.</li>
            <li><strong>Fees and taxes:</strong> you agree to pay all fees applicable to your subscription plus any taxes, duties, or similar charges. Fees are in US dollars unless otherwise stated.</li>
            <li><strong>Payment processor:</strong> we use Stripe, Inc. to process payments. Card and bank information is handled by Stripe under its own terms and PCI-DSS compliance.</li>
            <li><strong>Failed payments:</strong> if payment fails, we may suspend or downgrade your access after providing reasonable notice.</li>
            <li><strong>Price changes:</strong> we may change subscription prices with at least thirty (30) days&apos; notice. Price changes take effect at your next renewal.</li>
          </ul>
          <h2 id="refunds">5. Refund Policy — 30-Day Money-Back Guarantee</h2>
          <p>
            <strong>You may request a full refund of your first paid subscription payment for any reason within
            thirty (30) days of the payment date.</strong> To request a refund, email{" "}
            <a href="mailto:mwiseman@advisacor.com">mwiseman@advisacor.com</a> from the address associated with your
            account. Refunds are processed to the original payment method within ten (10) business days of approval.
          </p>
          <p>
            After the 30-day window, subscription fees are non-refundable except where required by law. Cancelling a
            subscription stops future renewals but does not entitle you to a refund of fees already paid for the
            current period. For full refund procedures see our <Link href="/refund-policy">Refund Policy</Link>.
          </p>
          <h2>6. Acceptable Use</h2>
          <p>You agree not to (and not to permit any user to):</p>
          <ul>
            <li>Use the Service in violation of any law, regulation, or third-party right;</li>
            <li>Upload or process data you do not have the right to process;</li>
            <li>Reverse engineer, decompile, or attempt to extract source code, except as expressly permitted by law;</li>
            <li>Interfere with, disrupt, probe, or overload the Service or its infrastructure;</li>
            <li>Access the Service through automated means (scrapers, bots) except through APIs we expressly provide;</li>
            <li>Resell, sublicense, or provide the Service to third parties except as expressly permitted by your subscription tier;</li>
            <li>Use the Service to build a competing product or copy any feature or user interface;</li>
            <li>Impersonate any person, misrepresent your affiliation, or provide false information;</li>
            <li>Transmit malware, viruses, or malicious code; or</li>
            <li>Circumvent authentication, authorization, tier gating, or rate limits.</li>
          </ul>
          <h2>7. Customer Data and License Grants</h2>
          <p>
            &quot;<strong>Customer Data</strong>&quot; means all data, information, and content that you or your users
            submit to the Service or that we retrieve from your connected systems on your instruction. As between you
            and us, you retain all right, title, and interest in Customer Data.
          </p>
          <p>
            You grant us a worldwide, non-exclusive, royalty-free license to host, copy, process, transmit, and
            display Customer Data solely to provide, secure, and improve the Service for you and to comply with law.
          </p>
          <p>
            We do not use Customer Data to train machine learning models. We do not sell Customer Data. We do not
            share Customer Data with third parties except sub-processors listed in our Privacy Policy.
          </p>
          <p>
            You are responsible for the accuracy, quality, and legality of Customer Data and for obtaining all rights
            and consents necessary for us to process it.
          </p>
          <h2>8. AI-Generated Outputs</h2>
          <p>
            The Service uses generative AI to produce narratives, findings memos, recommendations, and other outputs
            (&quot;<strong>AI Outputs</strong>&quot;). AI Outputs may contain errors, omissions, or inaccuracies. You
            are solely responsible for reviewing, validating, and approving AI Outputs before relying on them for
            financial reporting, tax filings, audit, advisory decisions, or any communications to third parties.
          </p>
          <p>
            AI Outputs are provided as informational drafts, not as professional accounting, tax, legal, investment,
            or advisory advice. Advisacor is not a CPA firm, is not registered as an investment adviser, and does not
            provide legal, tax, or fiduciary advice.
          </p>
          <h2>9. Intellectual Property</h2>
          <ul>
            <li><strong>Our IP:</strong> the Service, including software, models, prompts, workflows, methodologies, user interfaces, documentation, and all improvements, is owned by us and our licensors and is protected by intellectual property laws. Except for the limited access rights expressly granted in these Terms, we reserve all rights.</li>
            <li><strong>Feedback:</strong> if you provide feedback, suggestions, or ideas about the Service, you grant us a perpetual, irrevocable, royalty-free, worldwide license to use them without obligation to you.</li>
            <li><strong>Trademarks:</strong> Advisacor™ is a trademark of Wiseman Financial Technologies, LLC. All other trademarks are the property of their respective owners.</li>
            <li><strong>Patents:</strong> patent pending; multiple US provisional patent applications filed.</li>
          </ul>
          <h2>10. Confidentiality</h2>
          <p>
            Each party will protect the other&apos;s Confidential Information using the same degree of care it uses
            to protect its own confidential information of like importance, but no less than reasonable care.
            &quot;Confidential Information&quot; includes Customer Data, non-public product information, business
            plans, and pricing. Confidentiality obligations do not apply to information that is publicly available,
            independently developed, or received from a third party without confidentiality obligation.
          </p>
          <h2>11. Termination</h2>
          <p>
            You may cancel your subscription at any time through the Service. We may suspend or terminate your access
            (a) for material breach of these Terms, (b) for non-payment, (c) if required by law, (d) to protect the
            security or integrity of the Service, or (e) at our discretion on thirty (30) days&apos; notice for any
            reason. Upon termination, your right to use the Service ends immediately. Sections 5, 7, 8, 9, 10, 12, 13,
            14, 15, 16, 17, and 18 survive termination.
          </p>
          <p>
            You may export Customer Data at any time before termination through the Service&apos;s standard export
            mechanisms. After termination we will delete Customer Data on the schedule described in the Privacy Policy.
          </p>
          <h2 id="disclaimer">12. Disclaimers</h2>
          <p>
            <strong>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot; TO THE MAXIMUM EXTENT PERMITTED
              BY LAW, WE DISCLAIM ALL WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, AND ANY WARRANTY ARISING
              OUT OF COURSE OF DEALING OR USAGE OF TRADE. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED,
              ERROR-FREE, ACCURATE, RELIABLE, OR SECURE, OR THAT AI OUTPUTS WILL BE CORRECT.
            </strong>
          </p>
          <p>
            The Service is not a substitute for professional judgment of a certified public accountant, attorney,
            investment adviser, or other qualified professional. You are responsible for compliance with all laws
            and regulations applicable to your business.
          </p>
          <h2 id="liability">13. Limitation of Liability</h2>
          <p>
            <strong>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEITHER PARTY WILL BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              CONSEQUENTIAL, SPECIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, DATA,
              GOODWILL, OR BUSINESS OPPORTUNITY, ARISING OUT OF OR IN CONNECTION WITH THESE TERMS OR THE SERVICE,
              EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </strong>
          </p>
          <p>
            <strong>
              EXCEPT FOR YOUR PAYMENT OBLIGATIONS AND YOUR INDEMNIFICATION OBLIGATIONS, EACH PARTY&apos;S AGGREGATE
              LIABILITY UNDER THESE TERMS WILL NOT EXCEED THE AMOUNTS YOU PAID US FOR THE SERVICE IN THE TWELVE (12)
              MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM.
            </strong>
          </p>
          <p>
            The limitations in this Section apply whether based in contract, tort, statute, or any other legal theory,
            and even if a limited remedy fails of its essential purpose. Some jurisdictions do not allow the exclusion
            or limitation of certain damages; in those jurisdictions our liability is limited to the maximum extent
            permitted by law.
          </p>
          <h2 id="indemnity">14. Indemnification</h2>
          <p>
            You will defend, indemnify, and hold harmless Advisacor and its officers, directors, employees, and
            agents from and against any claims, damages, losses, liabilities, costs, and expenses (including
            reasonable attorneys&apos; fees) arising out of or relating to (a) your use of the Service, (b) your
            violation of these Terms, (c) your Customer Data, or (d) your violation of any law or third-party right.
          </p>
          <h2 id="governing-law">15. Governing Law and Dispute Resolution</h2>
          <p>
            These Terms are governed by the laws of the Commonwealth of Virginia, without regard to conflict-of-laws
            principles. The parties agree to the exclusive jurisdiction and venue of the state and federal courts
            located in Roanoke, Virginia for any dispute arising out of or relating to these Terms or the Service,
            except that either party may seek injunctive relief in any court of competent jurisdiction to protect its
            intellectual property or Confidential Information.
          </p>
          <p>
            <strong>Waiver of jury trial:</strong> to the extent permitted by law, each party irrevocably waives its
            right to a jury trial in any action arising out of these Terms.
          </p>
          <p>
            <strong>No class actions:</strong> disputes will be resolved on an individual basis; you and Advisacor
            waive any right to participate in a class action or class-wide arbitration.
          </p>
          <h2>16. Modifications</h2>
          <p>
            We may update these Terms from time to time. When we make material changes, we will notify you by email
            (if we have your address) and by posting a notice in-app or on our website at least thirty (30) days
            before the change takes effect. Continued use of the Service after the effective date constitutes
            acceptance of the revised Terms. If you do not agree to a change, you must stop using the Service before
            the change takes effect and, if applicable, cancel your subscription.
          </p>
          <h2>17. General</h2>
          <ul>
            <li><strong>Entire agreement:</strong> these Terms, together with the Privacy Policy and any order forms, are the entire agreement between the parties on the subject matter and supersede all prior agreements.</li>
            <li><strong>No waiver:</strong> our failure to enforce any right or provision does not waive it.</li>
            <li><strong>Severability:</strong> if any provision is held unenforceable, the remainder remains in force.</li>
            <li><strong>Assignment:</strong> you may not assign these Terms without our written consent. We may assign in connection with a merger, acquisition, financing, or sale of assets.</li>
            <li><strong>Force majeure:</strong> neither party is liable for failure or delay caused by events beyond its reasonable control.</li>
            <li><strong>Notices:</strong> we may give notice by email or through the Service. You must send legal notices to us at <a href="mailto:mwiseman@advisacor.com">mwiseman@advisacor.com</a> and by certified mail to the address below.</li>
            <li><strong>Independent contractors:</strong> the parties are independent contractors. Nothing in these Terms creates a partnership, joint venture, agency, or employment relationship.</li>
            <li><strong>Export controls:</strong> you agree to comply with applicable US export-control and sanctions laws.</li>
            <li><strong>US government users:</strong> the Service is a &quot;commercial item&quot; and &quot;commercial computer software&quot; as defined in the Federal Acquisition Regulation.</li>
          </ul>
          <h2 id="contact">18. Contact</h2>
          <p>
            Wiseman Financial Technologies, LLC<br />
            Attn: Legal<br />
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
