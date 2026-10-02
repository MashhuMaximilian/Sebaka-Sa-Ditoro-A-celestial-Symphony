// Browser smoke check; use an installed Playwright Core module and browser.
// PLAYWRIGHT_CORE=/path/to/playwright-core BROWSER_PATH=/path/to/chromium node scripts/inspect-observatory.cjs
const { chromium } = require(process.env.PLAYWRIGHT_CORE || "playwright-core");
const fs = require("node:fs");
const assert = require("node:assert/strict");

(async () => {
  fs.mkdirSync("output/playwright", { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_PATH,
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
    });
    const errors = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
      console.error("Browser:", error.message);
    });
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(process.env.PREVIEW_URL || "http://127.0.0.1:3100", {
      waitUntil: "networkidle",
    });
    await page
      .locator(".loading-sky")
      .waitFor({ state: "detached", timeout: 30000 });
    assert.equal(await page.locator("canvas").count(), 1);
    await page.screenshot({
      path: "output/playwright/observatory-desktop.png",
    });
    const initialDate = await page.locator(".date-display").innerText();
    await page.getByRole("button", { name: "The system", exact: true }).click();
    assert.equal(await page.locator(".date-display").innerText(), initialDate);
    await page.screenshot({ path: "output/playwright/observatory-orbit.png" });
    await page.getByRole("button", { name: "The sky", exact: true }).click();
    await page
      .getByRole("combobox", { name: "Choose a celestial body" })
      .selectOption("Spectris");
    await page.screenshot({
      path: "output/playwright/observatory-spectris.png",
    });
    await page
      .getByRole("combobox", { name: "Choose a celestial body" })
      .selectOption("Alpha");
    await page.getByRole("button", { name: "Find next rise" }).click();
    assert.match(
      await page.locator(".visibility-note").innerText(),
      /Above the horizon/,
    );
    await page.screenshot({ path: "output/playwright/observatory-suns.png" });
    await page.getByRole("button", { name: "Observatory settings" }).click();
    await page
      .getByRole("button", { name: "Return to the opening observation" })
      .click();
    const amplified = await page.locator(".readouts").innerText();
    await page.getByRole("button", { name: /Through the Weave/ }).click();
    const physical = await page.locator(".readouts").innerText();
    assert.notEqual(physical, amplified);
    await page.getByRole("button", { name: /Physical angular sizes/ }).click();
    await page.getByRole("button", { name: "Play time", exact: true }).click();
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: "Pause time", exact: true }).click();
    assert.notEqual(
      await page.locator(".date-display").innerText(),
      initialDate,
    );
    await page.getByRole("button", { name: "Next day", exact: true }).click();
    await page.getByRole("button", { name: "Observatory settings" }).click();
    await page
      .getByRole("spinbutton", { name: "Year", exact: true })
      .fill("2454");
    await page
      .getByRole("spinbutton", { name: "Day of year", exact: true })
      .fill("351");
    await page.getByRole("button", { name: "Open this moment" }).click();
    assert.match(
      await page.locator(".date-display").innerText(),
      /2,454.*Month 13.*Day 27/s,
    );
    await page.getByRole("button", { name: "Next day", exact: true }).click();
    assert.match(
      await page.locator(".date-display").innerText(),
      /2,455.*Month 01.*Day 01/s,
    );
    await page.getByRole("button", { name: "Observatory settings" }).click();
    await page
      .getByRole("button", { name: "Return to the opening observation" })
      .click();
    await page
      .getByRole("button", { name: "Field journal", exact: true })
      .click();
    await page.getByRole("button", { name: "Find the next Gathering" }).click();
    await page.locator(".search-result").waitFor({ timeout: 30000 });
    const gathering = await page.locator(".search-result").innerText();
    assert.match(gathering, /Found:/);
    await page.screenshot({
      path: "output/playwright/observatory-journal.png",
    });
    await page.getByRole("tab", { name: /Full Triune Alignment/ }).click();
    assert.match(
      await page.locator(".status-label").innerText(),
      /unverified/i,
    );
    await page.getByRole("button", { name: "Visit Year 2454" }).click();
    assert.match(
      await page.locator(".search-result").innerText(),
      /not a verified event/,
    );
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 0);
    await page.getByRole("button", { name: "Observatory settings" }).click();
    await page
      .getByRole("button", { name: "Return to the opening observation" })
      .click();
    await page.waitForTimeout(300);
    const heldFrames = await page
      .locator("canvas")
      .getAttribute("data-render-count");
    await page.waitForTimeout(500);
    assert.equal(
      await page.locator("canvas").getAttribute("data-render-count"),
      heldFrames,
      "Paused scene must stop redrawing",
    );
    await page.getByRole("button", { name: "Play time", exact: true }).click();
    const metrics = await page.evaluate(async () => {
      const times = [];
      let prev = performance.now();
      await new Promise((resolve) => {
        const frame = (now) => {
          times.push(now - prev);
          prev = now;
          if (times.length < 120) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
      return {
        rafMedianMs: times.sort((a, b) => a - b)[60],
        textureBytes: performance
          .getEntriesByType("resource")
          .filter((r) => r.name.includes("/observatory/"))
          .reduce((a, r) => a + r.transferSize, 0),
        canvasCount: document.querySelectorAll("canvas").length,
        renderedFrames: document.querySelector("canvas").dataset.renderCount,
        overflowing: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert.equal(metrics.overflowing, false);
    await page.getByRole("button", { name: "Pause time", exact: true }).click();
    assert.ok(
      Number(await page.locator("canvas").getAttribute("data-render-count")) >
        Number(heldFrames),
    );
    await page.getByRole("button", { name: "Observatory settings" }).click();
    await page
      .getByRole("button", { name: "Return to the opening observation" })
      .click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: "output/playwright/observatory-mobile.png" });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page
      .getByRole("button", { name: "Field journal", exact: true })
      .click();
    await page.screenshot({
      path: "output/playwright/observatory-mobile-journal.png",
    });
    await page.getByRole("button", { name: "Close panel" }).click();
    await page.getByRole("button", { name: "Observatory settings" }).click();
    await page.getByRole("slider", { name: "Observer latitude" }).fill("-24");
    await page.keyboard.press("Escape");
    assert.match(await page.locator(".horizon-caption").innerText(), /24° S/);
    await page.getByRole("button", { name: "Observatory settings" }).click();
    await page
      .getByRole("button", { name: "Return to the opening observation" })
      .click();
    await page.getByRole("button", { name: "The system", exact: true }).click();
    await page.screenshot({
      path: "output/playwright/observatory-mobile-orbit.png",
    });
    assert.deepEqual(errors, []);
    const result = {
      result: "passed",
      initialDate,
      gathering,
      metrics,
      errors,
    };
    fs.writeFileSync(
      "output/playwright/verification.json",
      JSON.stringify(result, null, 2),
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
