import { NextResponse } from "next/server";
import { handleCallback } from "../../../../../lib/integrations/accounting";

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
    const result = await handleCallback(provider, requestUrl);
    const redirectUrl = new URL(result.returnTo || "/dashboard", request.url);
    redirectUrl.searchParams.set("accountingConnected", "true");
    redirectUrl.searchParams.set("provider", provider);
    if (result.connectionId) redirectUrl.searchParams.set("connectionId", result.connectionId);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("[accounting/callback] failed", { provider, message: error?.message });
    return NextResponse.json({ error: error?.message || "Accounting OAuth callback failed" }, { status: 500 });
  }
}
