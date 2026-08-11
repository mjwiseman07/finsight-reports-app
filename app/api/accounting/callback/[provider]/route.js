import { NextResponse } from "next/server";
import { handleCallback, clearOAuthCookiesOnResponse } from "../../../../../lib/integrations/accounting";

export async function GET(request, { params }) {
  const provider = params?.provider || "";
  const requestUrl = new URL(request.url);
  const providerError = requestUrl.searchParams.get("error") || "";

  if (providerError) {
    return NextResponse.json(
      {
        error: providerError,
        description: requestUrl.searchParams.get("error_description") || "",
      },
      { status: 400 },
    );
  }

  try {
    const result = await handleCallback(provider, request);
    const redirectUrl = new URL(result.returnTo || "/dashboard", request.url);
    redirectUrl.searchParams.set("accountingConnected", "true");
    redirectUrl.searchParams.set("provider", provider);
    if (result.connectionId) redirectUrl.searchParams.set("connectionId", result.connectionId);
    const response = NextResponse.redirect(redirectUrl);
    clearOAuthCookiesOnResponse(response);
    return response;
  } catch (error) {
    console.error("[accounting/callback] failed", { provider, message: error?.message });
    return NextResponse.json({ error: error?.message || "Accounting OAuth callback failed" }, { status: 500 });
  }
}
