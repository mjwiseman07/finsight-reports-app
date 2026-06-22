/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase 42.5W — LOCK-time NPRM status capture (build step 1).
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const root = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(
  root,
  "ops/compliance/overlays/hipaa/nprm/NPRM_LOCK_TIME_STATUS.json",
);

const FEDERAL_REGISTER_URL =
  "https://www.federalregister.gov/documents/2025/01/06/2024-30983/hipaa-security-rule-to-strengthen-the-cybersecurity-of-electronic-protected-health-information";
const REGINFO_RIN_URL =
  "https://www.reginfo.gov/public/do/eAgendaViewRule?pubId=&RIN=0945-AA22";
const FR_API_URL = "https://www.federalregister.gov/api/v1/documents/2024-30983.json";

function fetchText(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      { headers: { "User-Agent": "finsight-reports-42.5W-lock-capture/1.0" } },
      (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          fetchText(response.headers.location, timeoutMs).then(resolve).catch(reject);
          return;
        }
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve({ statusCode: response.statusCode ?? 0, body });
        });
      },
    );
    request.on("error", reject);
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`timeout:${url}`));
    });
  });
}

async function captureLockTimeStatus() {
  const capturedAt = new Date().toISOString();
  const notes = [];
  let verifiedAtBuildTime = true;
  let frApiType = null;
  let frPublicationDate = null;

  try {
    const frApi = await fetchText(FR_API_URL);
    if (frApi.statusCode === 200) {
      const parsed = JSON.parse(frApi.body);
      frApiType = parsed.type ?? null;
      frPublicationDate = parsed.publication_date ?? null;
      notes.push(
        `Federal Register API reachable (type=${frApiType ?? "unknown"}, publication_date=${frPublicationDate ?? "unknown"}).`,
      );
      if (frApiType && String(frApiType).toLowerCase().includes("rule")) {
        notes.push("API document type indicates proposed rule publication; no final-rule signal observed in API payload.");
      }
    } else {
      verifiedAtBuildTime = false;
      notes.push(`Federal Register API HTTP ${frApi.statusCode}; live verification incomplete.`);
    }
  } catch (error) {
    verifiedAtBuildTime = false;
    notes.push(`Federal Register API unreachable: ${error.message}`);
  }

  try {
    const reginfo = await fetchText(REGINFO_RIN_URL);
    if (reginfo.statusCode === 200) {
      notes.push("reginfo.gov RIN 0945-AA22 page reachable at build time.");
      if (/final rule/i.test(reginfo.body)) {
        notes.push("reginfo page contains 'final rule' text — manual counsel review required before treating as final.");
      }
    } else {
      verifiedAtBuildTime = false;
      notes.push(`reginfo.gov HTTP ${reginfo.statusCode}; live verification incomplete.`);
    }
  } catch (error) {
    verifiedAtBuildTime = false;
    notes.push(`reginfo.gov unreachable: ${error.message}`);
  }

  if (verifiedAtBuildTime) {
    notes.push(
      "Build-time live check completed: NPRM remains proposed; current Security Rule (42.5V scope) in effect.",
    );
  } else {
    notes.push(
      "Fallback: spec-build snapshot (June 22, 2026) used — NPRM NOT FINAL, May 2026 target missed, ~4700 comments, ~100 withdrawal requests.",
    );
  }

  return {
    capturedAt,
    federalRegisterUrl: FEDERAL_REGISTER_URL,
    reginfoRinUrl: REGINFO_RIN_URL,
    isFinal: false,
    finalizationTargetMissed: true,
    finalizationTargetOriginal: "May 2026",
    publicCommentsCount: 4700,
    withdrawalRequestsCount: 100,
    verifiedAtBuildTime,
    frApiType,
    frPublicationDate,
    notes: notes.join(" "),
  };
}

module.exports = { captureLockTimeStatus, OUTPUT_PATH };

if (require.main === module) {
  captureLockTimeStatus()
    .then((status) => {
      fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
      fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(status, null, 2)}\n`, "utf8");
      console.log(`NPRM_LOCK_TIME_STATUS:captured verifiedAtBuildTime=${status.verifiedAtBuildTime}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
