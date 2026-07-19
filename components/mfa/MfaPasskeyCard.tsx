"use client";

import { useState, useEffect } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import type { WebAuthnCredential } from "@/types/mfa";
import { focusRing } from "@/components/site-ui";

export function MfaPasskeyCard() {
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [friendlyName, setFriendlyName] = useState("");
  const [supportsWebAuthn, setSupportsWebAuthn] = useState(false);

  useEffect(() => {
    setSupportsWebAuthn(typeof window !== "undefined" && !!window.PublicKeyCredential);
  }, []);

  async function loadCredentials() {
    const res = await fetch("/api/mfa/webauthn/credentials", { credentials: "same-origin" });
    if (res.ok) {
      const data = await res.json();
      setCredentials(data.credentials ?? []);
    }
  }

  useEffect(() => {
    void loadCredentials();
  }, []);

  async function addPasskey() {
    setError(null);
    setLoading(true);
    try {
      const optsRes = await fetch("/api/mfa/webauthn/register/options", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!optsRes.ok) throw new Error("Failed to start passkey registration");
      const options = await optsRes.json();
      const attResp = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetch("/api/mfa/webauthn/register/verify", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: attResp,
          friendlyName: friendlyName || "Security key",
        }),
      });
      if (!verifyRes.ok) {
        const j = await verifyRes.json().catch(() => ({}));
        throw new Error(j.error || "Passkey registration failed");
      }
      setFriendlyName("");
      await loadCredentials();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function removeCredential(id: string) {
    if (!confirm("Remove this passkey?")) return;
    await fetch(`/api/mfa/webauthn/credentials/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    await loadCredentials();
  }

  if (!supportsWebAuthn) {
    return (
      <div className="mt-6 rounded-2xl border border-[#C9A961]/25 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-[#111112]">Passkeys</h3>
        <p className="mt-2 text-sm text-[#7A7974]">
          Your browser does not support passkeys. Use TOTP or upgrade your browser.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-[#C9A961]/25 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-[#111112]">Passkeys</h3>
      <p className="mt-2 text-sm text-[#7A7974]">
        Use a security key or your device biometrics (Face ID, Touch ID, Windows Hello) as a
        second factor.
      </p>

      {credentials.length > 0 && (
        <ul className="mt-4 space-y-2">
          {credentials.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-xl border border-[#C9A961]/15 bg-[#F7F6F2] px-4 py-3"
            >
              <div>
                <p className="font-medium text-[#111112]">{c.friendly_name}</p>
                <p className="text-xs text-[#7A7974]">
                  Added {new Date(c.created_at).toLocaleDateString()}
                  {c.last_used_at
                    ? ` · Last used ${new Date(c.last_used_at).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeCredential(c.id)}
                className={`${focusRing("rounded-lg")} rounded-lg border border-red-500/30 px-3 py-1 text-xs text-red-700 hover:border-red-500/50`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={friendlyName}
          onChange={(e) => setFriendlyName(e.target.value)}
          placeholder="e.g. YubiKey, iPhone Face ID"
          className={`${focusRing("rounded-xl")} flex-1 rounded-xl border border-[#C9A961]/25 bg-[#F7F6F2] px-3 py-2 text-sm text-[#111112] placeholder:text-[#7A7974]`}
        />
        <button
          type="button"
          onClick={addPasskey}
          disabled={loading}
          className={`${focusRing("rounded-xl")} rounded-xl border border-[#C9A961]/40 bg-[#C9A961]/10 px-4 py-2 text-sm font-semibold text-[#111112] hover:bg-[#C9A961]/20 disabled:opacity-50`}
        >
          {loading ? "Registering..." : "Add a passkey"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
