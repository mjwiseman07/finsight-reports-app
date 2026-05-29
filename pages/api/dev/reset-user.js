import { supabaseAdmin } from "../../../lib/supabase";

const TARGET_EMAIL = "mattjanice07@yahoo.com";

export default async function handler(req, res) {
  if (process.env.NODE_ENV !== "development") {
    return res.status(404).json({ error: "Not found" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Supabase admin client is not configured" });
  }

  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";

  if (!token) {
    return res.status(401).json({ error: "Missing Authorization bearer token" });
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !authData?.user?.id) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  if ((authData.user.email || "").toLowerCase() !== TARGET_EMAIL) {
    return res.status(403).json({ error: "This reset route is limited to the configured development test user" });
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .update({
      trial_used: false,
      subscription_status: "trial",
    })
    .eq("id", authData.user.id)
    .eq("email", TARGET_EMAIL)
    .select("id, email, trial_used, subscription_status")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({
    ok: true,
    user: data,
  });
}
