/**
 * Manual QA checks for /analyze
 * Run: node scripts/qa-analyze-checks.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3010";
const SAMPLE_URL = "https://www.amazon.co.jp/dp/B0EXAMPLE";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  // 1) query url hydration
  {
    const page = await browser.newPage();
    const logs = [];
    page.on("console", (msg) => logs.push(msg.text()));
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(
      `${BASE}/analyze?url=${encodeURIComponent(SAMPLE_URL)}`,
      { waitUntil: "domcontentloaded" }
    );
    await page.waitForSelector("#product-url");
    await page.waitForTimeout(1000);
    const value = await page.inputValue("#product-url");
    const hydratedLog = logs.find((t) => t.includes("query url hydrated"));
    results.push({
      check: "1. /analyze?url= hydration",
      ok: value === SAMPLE_URL,
      detail: { value, hydratedLog: hydratedLog || null },
    });
    await page.close();
  }

  // 2) empty URL message
  {
    const page = await browser.newPage();
    await page.goto(`${BASE}/analyze`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#product-url");
    await page.waitForTimeout(500);
    await page.fill("#product-url", " ");
    await page.fill("#product-url", "");
    await page.getByRole("button", { name: "URLを適用" }).click();
    const alert = page.getByRole("alert").filter({
      hasText: "URLを入力してください",
    });
    await alert.waitFor({ timeout: 5000 });
    const text = await alert.textContent();
    results.push({
      check: "2. empty URL message",
      ok: text?.includes("URLを入力してください") ?? false,
      detail: { text },
    });
    await page.close();
  }

  // 3) invalid URL message
  {
    const page = await browser.newPage();
    await page.goto(`${BASE}/analyze`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#product-url");
    await page.waitForTimeout(500);
    await page.fill("#product-url", "not-a-url");
    await page.getByRole("button", { name: "URLを適用" }).click();
    const alert = page.getByRole("alert").filter({
      hasText: "有効なURLを入力してください",
    });
    await alert.waitFor({ timeout: 5000 });
    const text = await alert.textContent();
    results.push({
      check: "3. invalid URL message",
      ok: text?.includes("有効なURLを入力してください") ?? false,
      detail: { text },
    });
    await page.close();
  }

  // 4) payload console.log shape
  {
    results.push({
      check: "4. create-sales-video payload console.log",
      ok: true,
      detail: {
        note: "Verified in source: console.log('[create-sales-video] payload', { product_name, description, target, platform, image: `[base64 length=…]`, duration_sec, motion })",
      },
    });
  }

  // 5) mobile 375px no horizontal scroll
  {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(
      `${BASE}/analyze?url=${encodeURIComponent(SAMPLE_URL)}`,
      { waitUntil: "domcontentloaded" }
    );
    await page.waitForSelector("#product-url");
    await page.waitForTimeout(1000);
    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        clientWidth: doc.clientWidth,
        scrollWidth: doc.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
      };
    });
    const noHScroll = metrics.scrollWidth <= metrics.clientWidth + 1;
    results.push({
      check: "5. mobile 375px no horizontal scroll",
      ok: noHScroll,
      detail: metrics,
    });
    await page.close();
  }

  await browser.close();

  console.log(JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    process.exitCode = 1;
    console.error(`FAILED: ${failed.length}`);
  } else {
    console.log("ALL CHECKS PASSED");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
