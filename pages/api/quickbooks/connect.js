import { supabaseAdmin } from "../../../lib/supabase";
import { getQuickBooksAuthorizationUrl } from "../../../lib/quickbooks";
import { createQuickBooksState } from "../../../lib/quickbooks-state";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Supabase admin client is not configured" });
  }

  if (!process.env.QB_CLIENT_ID || !process.env.QB_CLIENT_SECRET || !process.env.QB_REDIRECT_URI) {
    return res.status(500).json({ error: "QuickBooks OAuth environment variables are not configured" });
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

  const state = createQuickBooksState(authData.user.id);
  const url = getQuickBooksAuthorizationUrl(state);

  return res.status(200).json({ url });
}
