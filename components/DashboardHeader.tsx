"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import heroLogo from "../public/advisacor-logo-framed-navy.png";
import { focusRing } from "./site-ui";
import { supabase } from "@/lib/supabase";
import { ADVISACOR_ACCESS_TOKEN_COOKIE } from "@/lib/reviewer/constants";

/**
 * Signed-in chrome for /dashboard/account/* (and other dashboard subtrees
 * that do not inherit the inline header from app/dashboard/page.jsx).
 * Visual language matches the Wave 1 dashboard header + marketing SiteNav.
 */
export function DashboardHeader() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const navLinkClass = `${focusRing("ring-offset-[#C9A961]")} text-sm font-bold text-[#111112] transition hover:text-[#0B1A3A]`;

  async function handleSignOut() {
    if (pending) return;
    setPending(true);
    try {
      // Mirror app/dashboard/page.jsx handleSignOut: supabase client signOut +
      // clear stored access token, then land on /signin.
      await supabase.auth.signOut();
      window.localStorage.removeItem("supabase_access_token");
      document.cookie = `${ADVISACOR_ACCESS_TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
      router.push("/signin");
      router.refresh();
    } catch {
      router.push("/signin");
    } finally {
      setPending(false);
    }
  }

  return (
    <header className="relative z-20 w-full border-b border-[#E8E6E0] bg-white min-h-[144px] md:min-h-[184px] lg:min-h-[216px]">
      <Link
        href="/dashboard"
        aria-label="Advisacor dashboard"
        className={`absolute top-3 left-3 z-20 md:top-5 md:left-6 ${focusRing("rounded-lg")}`}
      >
        <Image
          src={heroLogo}
          alt="Advisacor"
          width={360}
          height={280}
          priority
          className="pointer-events-none h-auto w-[140px] select-none md:w-[180px] lg:w-[220px]"
        />
      </Link>
      <nav className="absolute top-6 right-8 z-30 md:top-10" aria-label="Account navigation">
        <div className="flex items-center gap-6 rounded-full bg-[#C9A961] px-6 py-3 shadow-sm">
          <Link href="/dashboard" className={navLinkClass}>
            Dashboard
          </Link>
          <Link href="/support" className={navLinkClass}>
            Support
          </Link>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={pending}
            className={`${navLinkClass} disabled:opacity-60`}
          >
            {pending ? "Signing out…" : "Sign Out"}
          </button>
        </div>
      </nav>
    </header>
  );
}
