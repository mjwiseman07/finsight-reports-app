"use client";
import { useState } from "react";

export function WaitlistCapture({ skuKey }: { skuKey: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "ok" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku_key: skuKey, email, submitted_from: "pricing_page" }),
      });
      setState(res.ok ? "ok" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "ok") {
    return (
      <p className="text-sm text-[#C9A961]">
        You&apos;re on the list. We&apos;ll email you when it launches.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <input
        type="email"
        required
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#C9A961]/50"
      />
      <button
        type="submit"
        disabled={state === "submitting"}
        className="w-full rounded-md bg-white/10 hover:bg-white/15 text-white/80 text-sm font-medium py-2 transition disabled:opacity-50"
      >
        {state === "submitting" ? "Adding…" : "Notify me"}
      </button>
      {state === "error" && <p className="text-xs text-red-400">Something went wrong. Try again.</p>}
    </form>
  );
}
