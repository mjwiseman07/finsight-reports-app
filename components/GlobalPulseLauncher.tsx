"use client";

import { useState } from "react";
import { answerPulseCfoQuestion, pulseAiCoreQuestions } from "../lib/pulse-predict";

type Message = {
  role: "user" | "pulse";
  content: string;
};

export function GlobalPulseLauncher() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "pulse",
      content:
        "Hi, I'm Pulse. I help explain what happened, predict what may happen next, and recommend what to do like an experienced CFO.",
    },
  ]);

  const askPulse = (value = question) => {
    const trimmedQuestion = value.trim();
    if (!trimmedQuestion) return;

    const fallbackAnswer = answerPulseCfoQuestion(trimmedQuestion, {
      companyName: "this company",
      tierName: "your Advisacor tier",
      scenarioHorizon: "the available forecast horizon",
      scenarioLimit: "your tier's scenario limit",
    });

    setMessages((current) => [
      ...current,
      { role: "user", content: trimmedQuestion },
      { role: "pulse", content: "Pulse is checking company memory, financial history, forecasts, and prior conversations..." },
    ]);
    setQuestion("");
    setOpen(true);

    void (async () => {
      let answer = fallbackAnswer;
      try {
        const token = window.localStorage.getItem("supabase_access_token") || "";
        if (token) {
          const response = await fetch("/api/pulse/ask", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ question: trimmedQuestion }),
          });
          const result = await response.json().catch(() => ({}));
          if (response.ok && result.answer) answer = result.answer;
          else if (result.error) answer = `${fallbackAnswer}\n\nPulse API note: ${result.error}`;
        }
      } catch {
        answer = `${fallbackAnswer}\n\nPulse API note: using local CFO-mode response because the server context engine is unavailable.`;
      }

      setMessages((current) => [
        ...current.slice(0, -1),
        { role: "pulse", content: answer },
      ]);
    })();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 rounded-full bg-[#C9A961] px-4 py-3 text-xs font-semibold text-[#0A1530] shadow-lg shadow-[#C9A961]/30 transition-colors hover:bg-[#B8975A]"
      >
        Pulse
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex max-h-[78vh] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1220] text-white shadow-2xl shadow-black/50">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#C9A961]">Pulse AI</p>
                <h3 className="mt-2 text-2xl font-black">Financial intelligence assistant</h3>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Ask about performance, forecasts, risk, cash, margins, hiring, and what-if scenarios.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-[#0A1530] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#060E22]"
              >
                Close
              </button>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-3xl px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "ml-auto bg-[#C9A961] font-semibold text-[#0A1530]"
                    : "mr-auto flex gap-2.5 bg-[#0A1530] text-white/85"
                }`}
              >
                {message.role === "pulse" && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#C9A961]" aria-hidden="true" />
                )}
                <span>{message.content}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {pulseAiCoreQuestions.slice(0, 4).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => askPulse(item)}
                  className="rounded-full border border-[#C9A961]/30 bg-[#0A1530] px-4 py-2 text-sm text-white transition-colors hover:border-[#C9A961] hover:bg-[#0F1A3A]"
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") askPulse();
                }}
                placeholder="Ask Pulse..."
                className="min-w-0 flex-1 rounded-full border border-[#C9A961]/20 bg-[#060E22] px-5 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/40 focus:border-[#C9A961] focus:ring-1 focus:ring-[#C9A961]"
              />
              <button
                type="button"
                onClick={() => askPulse()}
                className="rounded-full bg-[#C9A961] px-4 py-3 text-sm font-semibold text-[#0A1530] transition-colors hover:bg-[#B8975A]"
              >
                Ask
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
