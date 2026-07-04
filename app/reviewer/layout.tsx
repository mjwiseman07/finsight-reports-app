"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type MeResponse = {
  userId: string;
  firmIds: string[];
  writerFirmIds: string[];
};

export default function ReviewerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = window.localStorage.getItem("supabase_access_token") || "";
    if (!token) {
      router.replace(`/signin?next=${encodeURIComponent(pathname || "/reviewer/queue")}`);
      return;
    }
    fetch("/api/reviewer/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "auth_failed");
        setMe(data);
      })
      .catch((e) => setError(e.message));
  }, [router, pathname]);

  function logout() {
    window.localStorage.removeItem("supabase_access_token");
    router.replace("/signin");
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <nav className="flex gap-4 text-sm">
          <Link href="/reviewer/queue" className="hover:text-teal-300">
            Queue
          </Link>
          {me?.writerFirmIds.length ? (
            <span className="text-slate-500">Settings (per engagement)</span>
          ) : null}
        </nav>
        <div className="text-xs text-slate-400">
          {me ? `${me.firmIds.length} firm(s)` : "Loading…"}
          <button type="button" onClick={logout} className="ml-4 underline">
            Logout
          </button>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
