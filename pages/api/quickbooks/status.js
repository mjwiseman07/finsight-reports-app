import { supabaseAdmin } from "../../../lib/supabase";
import { hasQuickBooksConnection } from "../../../lib/quickbooks";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
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

  const connected = await hasQuickBooksConnection(authData.user.id);
  return res.status(200).json({ connected });
}
