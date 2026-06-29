import Link from "next/link";
import { focusRing } from "./site-ui";

export function SiteFooter() {
  return (
    <footer className="relative w-full bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-700">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 lg:gap-12">
          <div className="md:col-span-4">
            <img src="/advisacor-logo-full-transparent.png" alt="Advisacor" className="h-20 w-auto" />
            <p className="mt-6 text-sm leading-relaxed text-slate-700">
              A product of Wiseman Financial Technologies LLC.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              2023 South Stewart Avenue · Covington, VA 24426
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B8975A]">Contact</p>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <a
                  href="mailto:sales@advisacor.com"
                  className={`text-slate-700 transition-colors hover:text-[#0A1530] ${focusRing("rounded")}`}
                >
                  sales@advisacor.com
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B8975A]">Company</p>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <Link
                  href="/about"
                  className={`font-medium text-slate-700 transition-colors hover:text-[#0A1530] ${focusRing("rounded")}`}
                >
                  About
                </Link>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/in/matthew-wiseman-807bb155"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`font-medium text-slate-700 transition-colors hover:text-[#0A1530] ${focusRing("rounded")}`}
                >
                  LinkedIn
                </a>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className={`font-medium text-slate-700 transition-colors hover:text-[#0A1530] ${focusRing("rounded")}`}
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B8975A]">Legal</p>
            <p className="mt-5 text-sm leading-relaxed text-slate-700">
              Advisacor<sup>™</sup> is a trademark of Wiseman Financial Technologies LLC. Trademark application pending.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              Patent Pending. Three U.S. provisional patent applications filed June 2026.
            </p>
          </div>
        </div>

        <div className="mt-14 border-t border-slate-400/40" />

        <div className="mt-8 flex flex-col items-start justify-between gap-3 text-xs text-slate-600 sm:flex-row sm:items-center">
          <p>© 2026 Wiseman Financial Technologies LLC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
