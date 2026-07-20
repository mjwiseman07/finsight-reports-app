"use client";

import React, { useState } from "react";
import { answerPulseCfoQuestion, pulseAiCoreQuestions } from "../lib/pulse-predict";
import {
  PulseJeAccountPicker,
  PulseJePreviewModal,
} from "./pulse/PulseJePreviewModal";
import type {
  JePreviewPayload,
  PulseJeAskResponse,
  ResolvedAccountCandidate,
} from "@/lib/pulse-je/types";

type Message = {
  id: string;
  role: "user" | "pulse";
  content: string;
  sourceQuestion?: string;
  isPlaceholder?: boolean;
};

export function GlobalPulseLauncher() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "greeting",
      role: "pulse",
      content:
        "Hi, I'm Pulse. I help explain what happened, predict what may happen next, and recommend what to do like an experienced CFO.",
    },
  ]);
  const [jePreview, setJePreview] = useState<JePreviewPayload | null>(null);
  const [jeOpen, setJeOpen] = useState(false);
  const [jeSubmitting, setJeSubmitting] = useState(false);
  const [jeError, setJeError] = useState<string | null>(null);
  const [jePicker, setJePicker] = useState<{
    subject: "from" | "to";
    hintPhrase: string;
    candidates: ResolvedAccountCandidate[];
    originalQuestion: string;
  } | null>(null);

  React.useEffect(() => {
    const onOpen = () => setOpen(true);
    document.addEventListener("advisacor:open-pulse", onOpen);
    return () => document.removeEventListener("advisacor:open-pulse", onOpen);
  }, []);

  const copyMessage = async (msg: Message) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId((cur) => (cur === msg.id ? null : cur)), 1200);
    } catch {
      /* clipboard may be unavailable in some browsers — silent no-op */
    }
  };

  const buildReportHref = (msg: Message) => {
    const q = (msg.sourceQuestion || "").slice(0, 500);
    const a = (msg.content || "").slice(0, 500);
    const params = new URLSearchParams({
      context: "pulse_handoff",
      pulse_message_id: msg.id,
      prefill_question: q,
      prefill_answer: a,
    });
    return `/support?${params.toString()}`;
  };

  const handleJeConfirm = async (preview: JePreviewPayload) => {
    setJeSubmitting(true);
    setJeError(null);
    try {
      const token = window.localStorage.getItem("supabase_access_token") || "";
      const resp = await fetch("/api/pulse/je/confirm", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ preview }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setJeError(data?.message || data?.error || `Post failed (HTTP ${resp.status})`);
        return;
      }
      if (data?.status === "posted") {
        setJeOpen(false);
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "pulse",
            content: `Journal entry posted. QBO ID: ${data.qbo_je_id}. Memo: "${preview.memo}".`,
            sourceQuestion: preview.intent_signal.raw_text,
          },
        ]);
      } else if (data?.status === "rejected") {
        setJeError(
          `Rejected: ${data.reason || "unknown"}${
            data.details ? ` — ${JSON.stringify(data.details)}` : ""
          }`,
        );
      } else {
        setJeError(`Failed: ${data?.error || "unknown"}`);
      }
    } catch (err: unknown) {
      setJeError((err as { message?: string })?.message || "Network error");
    } finally {
      setJeSubmitting(false);
    }
  };

  const applyJeResponse = (result: PulseJeAskResponse, originalQuestion: string) => {
    if (result.pulse_je === "preview") {
      setJeError(null);
      setJePreview(result.preview);
      setJeOpen(true);
      setJePicker(null);
      setMessages((current) => [
        ...current.slice(0, -1),
        {
          id: crypto.randomUUID(),
          role: "pulse",
          content: "I've prepared a journal entry preview — review and confirm in the modal.",
          sourceQuestion: originalQuestion,
        },
      ]);
      return true;
    }
    if (result.pulse_je === "picker") {
      setJePicker({
        subject: result.subject,
        hintPhrase: result.hint_phrase,
        candidates: result.candidates,
        originalQuestion,
      });
      setMessages((current) => [
        ...current.slice(0, -1),
        {
          id: crypto.randomUUID(),
          role: "pulse",
          content: `Which ${result.subject} account did you mean for "${result.hint_phrase}"?`,
          sourceQuestion: originalQuestion,
        },
      ]);
      return true;
    }
    if (
      result.pulse_je === "not_found" ||
      result.pulse_je === "insufficient_info" ||
      result.pulse_je === "not_entitled"
    ) {
      const content =
        result.pulse_je === "not_entitled"
          ? `${result.message}\n\nUpgrade: /pricing#ra-pro`
          : result.message;
      setMessages((current) => [
        ...current.slice(0, -1),
        {
          id: crypto.randomUUID(),
          role: "pulse",
          content,
          sourceQuestion: originalQuestion,
        },
      ]);
      return true;
    }
    return false;
  };

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
      { id: crypto.randomUUID(), role: "user", content: trimmedQuestion },
      {
        id: crypto.randomUUID(),
        role: "pulse",
        content:
          "Pulse is checking company memory, financial history, forecasts, and prior conversations...",
        isPlaceholder: true,
      },
    ]);
    setQuestion("");
    setOpen(true);
    setJePicker(null);

    void (async () => {
      let answer = fallbackAnswer;
      try {
        const token = window.localStorage.getItem("supabase_access_token") || "";
        if (token) {
          const companyId =
            typeof window !== "undefined"
              ? new URLSearchParams(window.location.search).get("companyId")
              : null;
          const response = await fetch("/api/pulse/ask", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              question: trimmedQuestion,
              companyId,
            }),
          });
          const result = await response.json().catch(() => ({}));
          if (response.ok && result.pulse_je) {
            if (applyJeResponse(result as PulseJeAskResponse, trimmedQuestion)) return;
          }
          if (response.ok && result.answer) answer = result.answer;
          else if (result.error) answer = `${fallbackAnswer}\n\nPulse API note: ${result.error}`;
        }
      } catch {
        answer = `${fallbackAnswer}\n\nPulse API note: using local CFO-mode response because the server context engine is unavailable.`;
      }

      setMessages((current) => [
        ...current.slice(0, -1),
        {
          id: crypto.randomUUID(),
          role: "pulse",
          content: answer,
          sourceQuestion: trimmedQuestion,
        },
      ]);
    })();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 rounded-full bg-[#C9A961] px-4 py-3 text-xs font-semibold text-[#111112] shadow-lg shadow-[#C9A961]/30 transition-colors hover:bg-[#B8975A]"
      >
        Pulse
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex max-h-[78vh] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1220] text-white shadow-2xl shadow-black/50">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A961]">
                  Pulse AI
                </p>
                <h3 className="mt-2 text-2xl font-semibold">Financial intelligence assistant</h3>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Ask about performance, forecasts, risk, cash, margins, hiring, and what-if
                  scenarios.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-[#111112] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#060E22]"
              >
                Close
              </button>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-4">
            {messages.map((message) => {
              const isPulse = message.role === "pulse";
              const showActionRow = isPulse && !message.isPlaceholder && message.id !== "greeting";
              return (
                <div key={message.id} className="grid gap-1">
                  <div
                    className={`rounded-3xl px-4 py-3 text-sm leading-6 ${
                      message.role === "user"
                        ? "ml-auto bg-[#C9A961] font-semibold text-[#111112]"
                        : "mr-auto flex gap-2.5 bg-[#111112] text-white/85"
                    }`}
                  >
                    {isPulse && (
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#C9A961]"
                        aria-hidden="true"
                      />
                    )}
                    <span className="whitespace-pre-wrap">{message.content}</span>
                  </div>
                  {showActionRow && (
                    <div className="mr-auto flex items-center gap-1 pl-4">
                      <button
                        type="button"
                        onClick={() => copyMessage(message)}
                        className="rounded-full border border-white/10 px-2 py-1 text-[11px] font-semibold text-white/50 hover:border-[#C9A961] hover:text-[#C9A961]"
                      >
                        {copiedId === message.id ? "Copied" : "Copy"}
                      </button>
                      <a
                        href={buildReportHref(message)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-white/10 px-2 py-1 text-[11px] font-semibold text-white/50 hover:border-[#C9A961] hover:text-[#C9A961]"
                      >
                        Report
                      </a>
                    </div>
                  )}
                </div>
              );
            })}

            {jePicker && (
              <PulseJeAccountPicker
                subject={jePicker.subject}
                hintPhrase={jePicker.hintPhrase}
                candidates={jePicker.candidates}
                onCancel={() => setJePicker(null)}
                onPick={(account) => {
                  const rewritten =
                    jePicker.subject === "from"
                      ? jePicker.originalQuestion.replace(
                          new RegExp(jePicker.hintPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
                          account.fully_qualified_name,
                        )
                      : jePicker.originalQuestion.replace(
                          new RegExp(
                            `(to\\s+)${jePicker.hintPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
                            "i",
                          ),
                          `$1${account.fully_qualified_name}`,
                        );
                  setJePicker(null);
                  askPulse(rewritten);
                }}
              />
            )}
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {pulseAiCoreQuestions.slice(0, 4).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => askPulse(item)}
                  className="rounded-full border border-[#C9A961]/30 bg-[#111112] px-4 py-2 text-sm text-white transition-colors hover:border-[#C9A961] hover:bg-[#0F1A3A]"
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
                className="rounded-full bg-[#C9A961] px-4 py-3 text-sm font-semibold text-[#111112] transition-colors hover:bg-[#B8975A]"
              >
                Ask
              </button>
            </div>
          </div>
        </div>
      )}

      {jePreview && (
        <PulseJePreviewModal
          open={jeOpen}
          preview={jePreview}
          onClose={() => setJeOpen(false)}
          onConfirm={handleJeConfirm}
          disabled={jeSubmitting}
          submitting={jeSubmitting}
          error={jeError}
        />
      )}
    </>
  );
}
