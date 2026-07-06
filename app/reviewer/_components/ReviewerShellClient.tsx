"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext } from "react";
import { ADVISACOR_ACCESS_TOKEN_COOKIE } from "@/lib/reviewer/constants";
import type { AuthenticatedFirmContext } from "@/lib/reviewer/auth";

const SessionContext = createContext<AuthenticatedFirmContext | null>(null);

export function useReviewerSession(): AuthenticatedFirmContext {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useReviewerSession must be used inside ReviewerShellClient");
  }
  return session;
}

export function ReviewerShellClient({
  session,
  children,
}: {
  session: AuthenticatedFirmContext;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function logout() {
    window.localStorage.removeItem("supabase_access_token");
    document.cookie = `${ADVISACOR_ACCESS_TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    const next = pathname && pathname.startsWith("/reviewer") ? pathname : "/reviewer/queue";
    router.replace(`/signin?next=${encodeURIComponent(next)}`);
  }

  return (
    <SessionContext.Provider value={session}>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <nav className="flex gap-4 text-sm">
            <Link href="/reviewer/queue" className="hover:text-teal-300">
              Queue
            </Link>
            <Link href="/reviewer/cash-app" className="hover:text-teal-300">
              Cash App
            </Link>
            {session.writerFirmIds.length ? (
              <span className="text-slate-500">Settings (per engagement)</span>
            ) : null}
          </nav>
          <div className="text-xs text-slate-400">
            {session.firmIds.length} firm(s)
            <button type="button" onClick={logout} className="ml-4 underline">
              Logout
            </button>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </SessionContext.Provider>
  );
}
