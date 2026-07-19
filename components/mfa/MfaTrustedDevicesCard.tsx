"use client";

import { useState, useEffect } from "react";
import type { TrustedDevice } from "@/types/mfa";
import { focusRing } from "@/components/site-ui";

export function MfaTrustedDevicesCard() {
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/mfa/trusted-devices", { credentials: "same-origin" });
    if (res.ok) {
      const j = await res.json();
      setDevices(j.devices ?? []);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function revokeOne(id: string) {
    if (!confirm("Revoke this device? You'll be asked to verify again on next sign-in.")) return;
    setLoading(true);
    await fetch(`/api/mfa/trusted-devices/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    await load();
    setLoading(false);
  }

  async function revokeAll() {
    if (!confirm("Revoke ALL trusted devices? You'll re-verify on every device.")) return;
    setLoading(true);
    await fetch("/api/mfa/trusted-devices", {
      method: "DELETE",
      credentials: "same-origin",
    });
    await load();
    setLoading(false);
  }

  return (
    <div className="mt-6 rounded-2xl border border-[#C9A961]/25 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[#111112]">Trusted devices</h3>
          <p className="mt-1 text-sm text-[#7A7974]">
            Devices that skip the 2FA challenge for 30 days. Revoke any device you no longer use.
          </p>
        </div>
        {devices.length > 0 && (
          <button
            type="button"
            onClick={revokeAll}
            disabled={loading}
            className={`${focusRing("rounded-lg")} rounded-lg border border-red-500/30 px-3 py-1 text-xs text-red-700 hover:border-red-500/50`}
          >
            Revoke all
          </button>
        )}
      </div>

      {devices.length === 0 ? (
        <p className="mt-4 text-sm text-[#7A7974]">No trusted devices.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {devices.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between rounded-xl border border-[#C9A961]/15 bg-[#F7F6F2] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-[#111112]">
                  {(d.user_agent || "Unknown device").slice(0, 80)}
                </p>
                <p className="text-xs text-[#7A7974]">
                  Added {new Date(d.created_at).toLocaleDateString()}
                  {d.last_used_at
                    ? ` · Last used ${new Date(d.last_used_at).toLocaleDateString()}`
                    : ""}
                  {` · Expires ${new Date(d.expires_at).toLocaleDateString()}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revokeOne(d.id)}
                disabled={loading}
                className={`${focusRing("rounded-lg")} rounded-lg border border-red-500/30 px-3 py-1 text-xs text-red-700 hover:border-red-500/50`}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
