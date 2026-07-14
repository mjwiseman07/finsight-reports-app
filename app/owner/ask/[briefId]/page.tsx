"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { headingFont } from "@/components/site-ui";

type OwnerBrief = {
  id: string;
  report_type?: string;
  period_label?: string;
  package_level?: string;
  owner_summary?: string;
};

type ChatMessage = {
  role: "owner" | "advisacor";
  content: string;
};

export default function OwnerAskPage() {
  const params = useParams<{ briefId: string }>();
  const searchParams = useSearchParams();
  const briefId = params?.briefId || "";
  const magicToken = searchParams?.get("token") || "";

  const [brief, setBrief] = useState<OwnerBrief | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAsking, setIsAsking] = useState(false);

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("supabase_access_token") || "";
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    if (magicToken) headers["x-owner-magic-token"] = magicToken;
    return headers;
  }, [magicToken]);

  useEffect(() => {
    async function loadBrief() {
      setIsLoading(true);
      setError("");
      try {
        const query = magicToken ? `?token=${encodeURIComponent(magicToken)}` : "";
        const response = await fetch(`/api/owner/briefs/${encodeURIComponent(briefId)}${query}`, {
          headers: authHeaders,
        });
        const result = await response.json();
        if (!response.ok) {
          setError(result.error || "Unable to open this secure owner brief.");
          return;
        }
        setBrief(result.brief);
        setSuggestedQuestions(result.suggested_questions || []);
        setMessages([
          {
            role: "advisacor",
            content:
              result.brief?.owner_summary ||
              "Hi, I'm Pulse. I help you understand the financial and operational health of your business.",
          },
        ]);
      } catch {
        setError("Unable to open this secure owner brief.");
      } finally {
        setIsLoading(false);
      }
    }

    if (briefId) void loadBrief();
  }, [authHeaders, briefId, magicToken]);

  const submitQuestion = async (value: string) => {
    const trimmedQuestion = value.trim();
    if (!trimmedQuestion || isAsking) return;

    setQuestion("");
    setError("");
    setIsAsking(true);
    setMessages((current) => [...current, { role: "owner", content: trimmedQuestion }]);

    try {
      const query = magicToken ? `?token=${encodeURIComponent(magicToken)}` : "";
      const response = await fetch(`/api/owner/ask/${encodeURIComponent(briefId)}${query}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ question: trimmedQuestion }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Advisacor could not answer that question.");
        return;
      }
      setMessages((current) => [...current, { role: "advisacor", content: result.answer }]);
    } catch {
      setError("Advisacor could not answer that question.");
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className={`min-h-screen bg-[#111112] text-[#ECEBE7] ${headingFont}`}>
      <main className="px-4 py-6">
        <div className="mx-auto max-w-4xl">
          <header className="flex items-center justify-between rounded-3xl border border-[#C9A961]/25 bg-[#1A1A1C]/85 px-5 py-4 shadow-2xl shadow-black/40">
            <Link href="/" className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-[0.22em] text-[#C9A961]">Advisacor</span>
              <span className="mt-0.5 text-lg font-black text-[#ECEBE7]">Owner Brief</span>
            </Link>
            <span className="rounded-full border border-[#C9A961]/40 bg-[#C9A961]/15 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#DFC084]">
              Pulse
            </span>
          </header>

          <section className="mt-6 rounded-[2rem] border border-[#C9A961]/25 bg-[#1A1A1C] p-6 shadow-2xl shadow-black/40 md:p-8">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#C9A961]">Ask Pulse About This Report</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#ECEBE7] md:text-5xl">
              Your business intelligence assistant.
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-[#A29E93]">
              Pulse is tied to one company, one owner, one report, and one package level. Pulse keeps answers plain-English and owner-focused.
            </p>

            {brief && (
              <div className="mt-5 grid gap-3 rounded-3xl border border-[#C9A961]/20 bg-[#111112] p-4 text-sm md:grid-cols-3">
                <div>
                  <p className="font-black uppercase tracking-[0.14em] text-[#7A7974]">Report</p>
                  <p className="mt-1 font-bold text-[#ECEBE7]">{brief.report_type || "Owner Brief"}</p>
                </div>
                <div>
                  <p className="font-black uppercase tracking-[0.14em] text-[#7A7974]">Period</p>
                  <p className="mt-1 font-bold text-[#ECEBE7]">{brief.period_label || "Current report"}</p>
                </div>
                <div>
                  <p className="font-black uppercase tracking-[0.14em] text-[#7A7974]">Package</p>
                  <p className="mt-1 font-bold capitalize text-[#ECEBE7]">{brief.package_level || "Essential"}</p>
                </div>
              </div>
            )}
          </section>

          {isLoading && (
            <div className="mt-6 rounded-3xl border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-6 text-sm font-bold text-[#A29E93]">
              Opening secure owner brief...
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-3xl border border-[#B85C5C]/40 bg-[#B85C5C]/15 p-5 text-sm font-bold text-[#F0BFBF]">
              {error}
            </div>
          )}

          {!isLoading && brief && (
            <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.72fr]">
              <div className="rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C] p-4 shadow-2xl shadow-black/40 md:p-6">
                <div className="grid max-h-[520px] gap-4 overflow-y-auto pr-1">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`rounded-3xl px-5 py-4 text-sm leading-6 ${
                        message.role === "owner"
                          ? "ml-auto max-w-[86%] bg-[#C9A961] text-[#111112] font-semibold"
                          : "mr-auto max-w-[92%] border border-[#C9A961]/20 bg-[#111112] text-[#ECEBE7]"
                      }`}
                    >
                      {message.content}
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitQuestion(question);
                  }}
                  className="mt-5 flex flex-col gap-3 sm:flex-row"
                >
                  <input
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Ask a question about this report..."
                    className="min-h-12 flex-1 rounded-2xl border border-[#C9A961]/20 bg-[#111112] px-4 py-3 text-sm font-semibold text-[#ECEBE7] placeholder:text-[#7A7974] outline-none focus:border-[#C9A961]/60 focus:ring-2 focus:ring-[#C9A961]/40"
                  />
                  <button
                    type="submit"
                    disabled={isAsking}
                    className="rounded-full bg-[#C9A961] px-6 py-3 text-sm font-black text-[#111112] transition hover:bg-[#DFC084] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAsking ? "Asking..." : "Ask Pulse"}
                  </button>
                </form>
              </div>

              <aside className="rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C] p-5 shadow-2xl shadow-black/40">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[#C9A961]">Suggested questions</p>
                <div className="mt-4 grid gap-2">
                  {suggestedQuestions.map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => submitQuestion(item)}
                      className="rounded-2xl border border-[#C9A961]/20 bg-[#111112] px-4 py-3 text-left text-sm font-bold text-[#ECEBE7] transition hover:border-[#C9A961]/50 hover:bg-[#C9A961]/10"
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <p className="mt-5 rounded-2xl border border-[#C9A961]/15 bg-[#111112] px-4 py-3 text-xs leading-5 text-[#A29E93]">
                  Pulse answers avoid accounting jargon and only use authorized context from this secure report.
                </p>
              </aside>
            </section>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
