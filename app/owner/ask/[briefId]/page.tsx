"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdvisacorLogo } from "../../../../components/AdvisacorLogo";

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
              "This secure owner chat is ready. Ask a plain-English question about this report.",
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
    <main className="min-h-screen bg-[#F5F7FA] px-4 py-6 text-[#111827]">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <Link href="/" className="block w-[min(525px,46.5vw)] px-0 py-0">
            <AdvisacorLogo priority className="w-full" />
          </Link>
          <span className="rounded-full bg-[#0A1020] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white">
            Secure Owner Chat
          </span>
        </header>

        <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#FF7A1A]">Ask Advisacor About This Report</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#0A1020] md:text-5xl">
            Simple answers from your business snapshot.
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-[#6B7280]">
            This page is tied to one company, one owner, one report, and one package level. Advisacor keeps answers plain-English and owner-focused.
          </p>

          {brief && (
            <div className="mt-5 grid gap-3 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-4 text-sm md:grid-cols-3">
              <div>
                <p className="font-black text-slate-500">Report</p>
                <p className="mt-1 font-bold text-[#0A1020]">{brief.report_type || "Owner Brief"}</p>
              </div>
              <div>
                <p className="font-black text-slate-500">Period</p>
                <p className="mt-1 font-bold text-[#0A1020]">{brief.period_label || "Current report"}</p>
              </div>
              <div>
                <p className="font-black text-slate-500">Package</p>
                <p className="mt-1 font-bold capitalize text-[#0A1020]">{brief.package_level || "Essential"}</p>
              </div>
            </div>
          )}
        </section>

        {isLoading && (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 text-sm font-bold text-[#6B7280]">
            Opening secure owner brief...
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {!isLoading && brief && (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.72fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-4 md:p-6">
              <div className="grid max-h-[520px] gap-4 overflow-y-auto pr-1">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`rounded-3xl px-5 py-4 text-sm leading-6 ${
                      message.role === "owner"
                        ? "ml-auto max-w-[86%] bg-[#0A1020] text-white"
                        : "mr-auto max-w-[92%] bg-[#F5F7FA] text-[#111827]"
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
                  className="min-h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#FF7A1A]"
                />
                <button
                  type="submit"
                  disabled={isAsking}
                  className="rounded-2xl bg-[#FF7A1A] px-6 py-3 text-sm font-black text-white transition hover:bg-[#E5660F] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAsking ? "Asking..." : "Ask"}
                </button>
              </form>
            </div>

            <aside className="rounded-[2rem] border border-slate-200 bg-white p-5">
              <p className="text-sm font-black text-[#0A1020]">Suggested questions</p>
              <div className="mt-4 grid gap-2">
                {suggestedQuestions.map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => submitQuestion(item)}
                    className="rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3 text-left text-sm font-bold text-[#374151] transition hover:border-[#FF7A1A]/50 hover:bg-orange-50"
                  >
                    {item}
                  </button>
                ))}
              </div>
              <p className="mt-5 rounded-2xl bg-[#F5F7FA] px-4 py-3 text-xs leading-5 text-[#6B7280]">
                Owner answers avoid accounting jargon and only use authorized context from this secure report.
              </p>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}
