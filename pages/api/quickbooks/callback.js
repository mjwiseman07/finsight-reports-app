import { getQuickBooksOAuthClient, upsertQuickBooksConnection } from "../../../lib/quickbooks";
import { verifyQuickBooksState } from "../../../lib/quickbooks-state";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const state = verifyQuickBooksState(req.query.state);
  const realmId = String(req.query.realmId || "");

  if (!state?.userId || !realmId) {
    return res.redirect(302, "/dashboard?quickbooks=failed");
  }

  try {
    const callbackUrl = new URL(req.url, process.env.QB_REDIRECT_URI).toString();
    const oauthClient = getQuickBooksOAuthClient();
    const authResponse = await oauthClient.createToken(callbackUrl);
    const token = authResponse.getToken();

    await upsertQuickBooksConnection({
      userId: state.userId,
      realmId,
      token,
    });

    return res.redirect(302, "/dashboard?quickbooks=connected");
  } catch (error) {
    console.error("QuickBooks OAuth callback failed", {
      message: error?.message,
      code: error?.error || error?.code,
      description: error?.error_description,
      intuitTid: error?.intuit_tid,
    });
    return res.redirect(302, "/dashboard?quickbooks=failed");
  }
}
