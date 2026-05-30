const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

function loadLocalEnv() {
  if (!fs.existsSync(".env.local")) {
    throw new Error(".env.local is missing.");
  }

  const envFile = fs.readFileSync(".env.local", "utf8");
  envFile.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  });
}

function isMissingOrPlaceholder(value) {
  return !value || value.includes("PASTE_") || value.includes("_HERE");
}

async function verify() {
  loadLocalEnv();

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY",
    "SUPER_ADMIN_EMAILS",
    "SUPER_ADMIN_DEV_PASSWORD",
  ];
  const missing = required.filter((key) => isMissingOrPlaceholder(process.env[key]));

  if (missing.length) {
    throw new Error(`Missing or placeholder env vars: ${missing.join(", ")}`);
  }

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error: supabaseError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (supabaseError) throw new Error(`Supabase admin check failed: ${supabaseError.message}`);
  console.log("Supabase connectivity: OK");

  const openAiResponse = await fetch("https://api.openai.com/v1/models", {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
  });

  if (!openAiResponse.ok) {
    throw new Error(`OpenAI check failed: HTTP ${openAiResponse.status}`);
  }
  console.log("OpenAI connectivity: OK");
  console.log("Super Admin seed requirements: OK");
}

verify().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
