// Regression coverage for the controls that were lost in the first redesign.
// Uses Playwright Core directly, with the same environment as inspect-observatory.cjs.
const { chromium } = require(process.env.PLAYWRIGHT_CORE || "playwright-core");
const assert = require("node:assert/strict");
const fs = require("node:fs");

(async () => {
  fs.mkdirSync("output/playwright", { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_PATH,
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(process.env.PREVIEW_URL || "http://127.0.0.1:3100", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.locator(".loading-sky").waitFor({ state: "detached" });
    const canvas = page.locator("canvas");
    const data = (name) => canvas.getAttribute(`data-${name}`);
    await page.screenshot({
      path: "output/playwright/exploration-surface.png",
    });
    await page
      .getByRole("button", { name: "Move north on Sebaka", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("spinbutton", { name: "Surface latitude" })
        .inputValue(),
      "29",
    );
    await page
      .getByRole("button", { name: "Move east on Sebaka", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("spinbutton", { name: "Surface longitude" })
        .inputValue(),
      "5",
    );
    await canvas.focus();
    await page.keyboard.press("w");
    assert.equal(
      await page
        .getByRole("spinbutton", { name: "Surface latitude" })
        .inputValue(),
      "30",
    );

    await page
      .getByRole("button", { name: "Sebaka rotation", exact: true })
      .click();
    await page.waitForTimeout(100);
    const held = await data("rotation-hours");
    const heldGlobe = await data("selected-rotation");
    const before = Number(await data("simulation-hours"));
    await page.getByRole("combobox", { name: "Time speed" }).selectOption("6");
    await page.getByRole("button", { name: "Play time", exact: true }).click();
    await page.waitForTimeout(650);
    await page.getByRole("button", { name: "Pause time", exact: true }).click();
    await page.waitForTimeout(100);
    assert.equal(
      await data("rotation-hours"),
      held,
      "Hold rotation while ephemeris advances",
    );
    assert.equal(
      await data("selected-rotation"),
      heldGlobe,
      "The Sebaka globe must use the same held phase",
    );
    assert.ok(Number(await data("simulation-hours")) > before + 1);
    await page
      .getByRole("button", { name: "Sebaka rotation", exact: true })
      .click();
    await page.waitForTimeout(100);
    assert.ok(
      Math.abs(Number(await data("rotation-hours")) - Number(held)) < 1e-8,
      "Resume without snapping",
    );

    await page.getByRole("button", { name: "The system", exact: true }).click();
    const systemDistance = Number(await data("camera-distance"));
    for (const name of [
      "Sebaka",
      "Rutilis",
      "Spectris",
      "Viridis",
      "Aetheris",
      "Alpha",
      "Twilight",
      "Beacon",
    ]) {
      await page
        .getByRole("combobox", { name: "Choose a celestial body" })
        .selectOption(name);
      await page.waitForTimeout(1100);
      assert.equal(await data("camera-target"), name);
      assert.equal(await data("selected-visible"), "true");
      assert.ok(
        Number(await data("camera-distance")) < 200,
        `${name} should have a close-up`,
      );
      await page.screenshot({
        path: `output/playwright/closeup-${name.toLowerCase()}.png`,
      });
    }
    await page
      .getByRole("button", { name: "Orbit camera left", exact: true })
      .click();
    await page.waitForTimeout(100);
    const camera = await data("camera-position");
    await page
      .getByRole("button", { name: "Orbit camera right", exact: true })
      .click();
    await page.waitForTimeout(100);
    assert.notEqual(await data("camera-position"), camera);
    const distance = Number(await data("camera-distance"));
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await page.waitForTimeout(100);
    assert.ok(Number(await data("camera-distance")) < distance);
    const prePan = await data("camera-position");
    await page.mouse.move(720, 440);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(810, 470, { steps: 12 });
    await page.mouse.up({ button: "right" });
    await page.waitForTimeout(300);
    assert.notEqual(
      await data("camera-position"),
      prePan,
      "Right-drag should pan",
    );

    await page
      .getByRole("button", { name: "Beacon system", exact: true })
      .click();
    await page.waitForTimeout(1100);
    assert.equal(await data("camera-target"), "beacon");
    await page.screenshot({
      path: "output/playwright/exploration-beacon-system.png",
    });
    for (const name of ["Gelidis", "Liminis"]) {
      await page
        .getByRole("combobox", { name: "Choose a celestial body" })
        .selectOption(name);
      await page.waitForTimeout(1100);
      assert.equal(await data("selected-visible"), "true");
      assert.match(
        await page.locator(".visibility-note").innerText(),
        /undiscovered/,
      );
      assert.match(await page.locator(".readouts").innerText(), /AU/);
      assert.doesNotMatch(await page.locator(".readouts").innerText(), /Home/);
    }
    await page
      .getByRole("button", { name: "Inner system", exact: true })
      .click();
    await page.waitForTimeout(1100);
    assert.ok(Number(await data("camera-distance")) > 1000);
    assert.ok(systemDistance > 1000);
    await page
      .getByRole("combobox", { name: "Orbit appearance" })
      .selectOption("hidden");
    await page
      .getByRole("combobox", { name: "Choose a celestial body" })
      .selectOption("Spectris");
    await page.waitForTimeout(1100);
    await page
      .getByRole("button", { name: "Iridescent rings", exact: true })
      .click();
    await page.screenshot({
      path: "output/playwright/exploration-rings-off.png",
    });
    await page
      .getByRole("button", { name: "Iridescent rings", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Hide interface", exact: true })
      .click();
    assert.equal(await page.locator(".navigation-dock").isVisible(), false);
    await page.screenshot({
      path: "output/playwright/exploration-immersive.png",
    });
    await page
      .getByRole("button", { name: "Show interface", exact: true })
      .click();
    await page.getByRole("button", { name: "The sky", exact: true }).click();
    assert.equal(
      await page
        .getByRole("combobox", { name: "Choose a celestial body" })
        .locator("option")
        .count(),
      8,
    );
    await page.getByRole("button", { name: "Landscape", exact: true }).click();
    await page.getByRole("button", { name: "Landscape", exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole("button", { name: "Move west on Sebaka", exact: true })
      .click();
    for (const selector of [
      ".navigation-dock",
      ".explorer-options",
      ".body-instrument",
      ".time-console",
    ]) {
      const box = await page.locator(selector).boundingBox();
      assert.ok(
        box.x >= 0 &&
          box.x + box.width <= 390 &&
          box.y >= 0 &&
          box.y + box.height <= 844,
        `${selector} fits mobile`,
      );
    }
    await page.screenshot({ path: "output/playwright/exploration-mobile.png" });
    await page.getByRole("button", { name: "The system", exact: true }).click();
    await page
      .getByRole("combobox", { name: "Choose a celestial body" })
      .selectOption("Spectris");
    await page.waitForTimeout(1100);
    await page.screenshot({
      path: "output/playwright/exploration-mobile-closeup.png",
    });
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify(
        {
          status: "passed",
          checks: [
            "direct surface navigation",
            "WASD",
            "rotation isolation and continuous resume",
            "eight known-body close-ups",
            "camera orbit/pan/zoom",
            "Beacon and hidden planets",
            "system reset",
            "ring toggle",
            "immersive mode",
            "mobile controls",
          ],
          errors,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
