"use server";

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

type Result = { ok: true } | { ok: false; error: string };

export async function joinWaitlist(formData: FormData): Promise<Result> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const company = String(formData.get("company") || "").trim();
  const revenue_band = String(formData.get("revenue_band") || "").trim();
  const current_erp = String(formData.get("current_erp") || "").trim();
  const pain_point = String(formData.get("pain_point") || "").trim() || null;

  if (!name || !email || !company || !revenue_band || !current_erp) {
    return { ok: false, error: "Please fill in all required fields." };
  }

  // Basic email sanity check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  try {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from("mfg_waitlist").insert({
      name,
      email,
      company,
      revenue_band,
      current_erp,
      pain_point,
      source: "for/controller/manufacturing",
    });

    if (error) {
      // Handle duplicate email gracefully — already on the list is a success.
      if (error.code === "23505") {
        return { ok: true };
      }
      console.error("mfg_waitlist insert error:", error);
      return {
        ok: false,
        error: "Could not save your submission. Please try again.",
      };
    }

    return { ok: true };
  } catch (err) {
    console.error("mfg_waitlist server error:", err);
    return { ok: false, error: "Server error. Please try again." };
  }
}
