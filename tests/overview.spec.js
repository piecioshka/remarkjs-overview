import { expect, test } from "@playwright/test";

const SLIDE_GROUPS = 15;

async function openDemo(page, hash = "") {
  await page.goto(`/demo/${hash}`);
  await page.waitForFunction(() =>
    document.querySelector(".remark-slides-area .remark-visible"),
  );
}

const currentSlide = (page) =>
  page.evaluate(() => window.slideshow.getCurrentSlideIndex() + 1);

const isOpen = (page) =>
  page.evaluate(() =>
    document.documentElement.classList.contains("remark-overview-mode"),
  );

test("the o key shows every slide on one screen", async ({ page }) => {
  await openDemo(page);
  await page.keyboard.press("o");

  const thumbnails = page.locator(
    ".remark-slides-area .remark-slide-container:not(.remark-overview-step)",
  );
  await expect(thumbnails).toHaveCount(SLIDE_GROUPS);

  const viewport = page.viewportSize();
  for (const box of await thumbnails.evaluateAll((items) =>
    items.map((item) => item.getBoundingClientRect().toJSON()),
  )) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(viewport.width);
    expect(box.bottom).toBeLessThanOrEqual(viewport.height);
  }
});

test("incremental steps collapse into their final slide", async ({ page }) => {
  await openDemo(page);
  await page.keyboard.press("o");
  await expect(
    page.locator(".remark-slides-area .remark-overview-step"),
  ).toHaveCount(2);
});

test("clicking a thumbnail opens that slide", async ({ page }) => {
  await openDemo(page);
  await page.keyboard.press("o");
  await page
    .locator(".remark-slides-area .remark-slide-container")
    .filter({ hasText: "Slide 7" })
    .click();

  expect(await isOpen(page)).toBe(false);
  // Slides 3, 4 and 5 are steps of one incremental slide.
  expect(await currentSlide(page)).toBe(9);
});

test("arrows move the selection and Enter opens it", async ({ page }) => {
  await openDemo(page);
  await page.keyboard.press("o");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");

  expect(await isOpen(page)).toBe(false);
  expect(await currentSlide(page)).toBe(5);
});

test("Escape goes back to the slide you were on", async ({ page }) => {
  await openDemo(page, "#2");
  await page.keyboard.press("o");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("PageDown");
  await page.keyboard.press("Escape");

  expect(await isOpen(page)).toBe(false);
  expect(await currentSlide(page)).toBe(2);
});

test("the help screen lists the shortcut", async ({ page }) => {
  await openDemo(page);
  const row = page
    .locator(".remark-help-content tr")
    .filter({ hasText: "Toggle slides overview" });
  await expect(row.locator(".key")).toHaveText("o");
  await expect(page.locator(".remark-help-content tr").last()).toContainText(
    "Toggle this help",
  );
});

test("the slide looks the same after closing the overview", async ({
  page,
}) => {
  await openDemo(page, "#2");
  const before = await page.screenshot();
  await page.keyboard.press("o");
  await page.keyboard.press("Escape");
  expect(await page.screenshot()).toEqual(before);
});

test("bestGrid picks the biggest thumbnails", async ({ page }) => {
  await openDemo(page);
  const grid = await page.evaluate(() =>
    window.remarkOverview.bestGrid(60, 1920, 1080, 16 / 9, 8),
  );
  expect(grid.columns).toBe(8);
});

test("works when remark loads slides from sourceUrl", async ({ page }) => {
  await page.goto("/tests/fixtures/source-url.html");
  await page.waitForFunction(() =>
    document.querySelector(".remark-slides-area .remark-visible"),
  );
  await expect(
    page.locator(".remark-help-content .remark-overview-help .key"),
  ).toHaveText("o");

  await page.keyboard.press("o");
  await expect(
    page.locator(".remark-slides-area .remark-slide-container"),
  ).toHaveCount(3);
});
