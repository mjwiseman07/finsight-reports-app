/* eslint-disable no-console */
import { readFileSync } from "node:fs";

function loadEnv(path: string) {
  try {
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const eq = trimmed.indexOf("=");
        if (eq === -1) return;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
      });
  } catch {
    // optional
  }
}
loadEnv(".env.local");

import { resolveQBOTokenForFirmClient } from "../../lib/erp/quickbooks/token-resolver";

const FIRM_CLIENT_ID = "71111111-1111-4111-8111-111111111111";

function qboApiBase() {
  return process.env.QB_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

async function main() {
  const token = await resolveQBOTokenForFirmClient(FIRM_CLIENT_ID);
  if (!token) throw new Error("no token");
  const query = encodeURIComponent(
    "SELECT Id, Name, AccountType, Classification FROM Account WHERE Active = true MAXRESULTS 50",
  );
  const resp = await fetch(
    `${qboApiBase()}/v3/company/${token.realmId}/query?query=${query}&minorversion=73`,
    { headers: { Authorization: `Bearer ${token.accessToken}`, Accept: "application/json" } },
  );
  const data = await resp.json();
  const accounts = data?.QueryResponse?.Account ?? [];
  for (const a of accounts) {
    console.log(`${a.Id}\t${a.Classification}\t${a.AccountType}\t${a.Name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
