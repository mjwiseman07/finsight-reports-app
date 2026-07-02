import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";

// Pin the Chromium build to the installed @sparticuz/chromium-min major (v149).
// v149 ships arch-specific pack files; Vercel Node lambdas run x64.
// When bumping @sparticuz/chromium-min, update this URL to the matching release:
//   https://github.com/Sparticuz/chromium/releases
const CHROMIUM_PACK_URL =
  process.env.CHROMIUM_PACK_URL ||
  "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar";

/**
 * Render the packet HTML view to PDF bytes.
 * @param {object} args
 * @param {string} args.closePeriodId
 * @returns {Promise<Buffer>}
 */
export async function renderPacketPdf({ closePeriodId }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const renderToken = process.env.INTERNAL_RENDER_TOKEN;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL not set");
  if (!renderToken) throw new Error("INTERNAL_RENDER_TOKEN not set");

  const url = `${appUrl}/close-periods/${closePeriodId}/packet?render=true`;

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 1800 },
    executablePath: await chromium.executablePath(CHROMIUM_PACK_URL),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ "x-internal-render-token": renderToken });
    await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });
    await page.emulateMediaType("print");
    // Make sure web fonts are settled before snapshotting.
    await page.evaluate(() => document.fonts?.ready).catch(() => {});
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
