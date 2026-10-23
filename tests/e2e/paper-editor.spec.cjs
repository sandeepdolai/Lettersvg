const { test, expect } = require("@playwright/test");

async function openRealPaper(page) {
  await page.goto("/");
  const envelope = page.locator("#letter-control");
  const bounds = await envelope.boundingBox();
  expect(bounds).not.toBeNull();

  // The envelope intentionally opens only when the real flap is tapped.
  await envelope.click({
    position: { x: bounds.width * 0.5, y: bounds.height * 0.31 }
  });
  await expect(envelope).toHaveClass(/is-open/);
  await page.locator("#paper-surface").click();
  await expect(page.locator("body")).toHaveClass(/is-paper-fullscreen/);
  await expect(page.locator("#letter-paper")).toHaveCount(1);
}

async function openEditMenu(page) {
  const editButton = page.locator("#paper-fullscreen-edit");
  await expect(editButton).toBeVisible();
  await editButton.click();
  const menu = page.locator("#paper-fullscreen-text");
  await expect(menu).toBeVisible();
  return menu;
}

test.beforeEach(async ({ page }) => {
  page.pageErrors = [];
  page.on("pageerror", error => page.pageErrors.push(error.message));
});

test.afterEach(async ({ page }) => {
  expect(page.pageErrors, "the page should not throw JavaScript errors").toEqual([]);
});

test("fullscreen Edit opens Text, Add Photo and Library choices", async ({ page }) => {
  await openRealPaper(page);
  const menu = await openEditMenu(page);

  await expect(menu.getByRole("button", { name: "Text" })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Add Photo" })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Library" })).toBeVisible();

  await menu.getByRole("button", { name: "Library" }).click();
  await expect(page.locator("body")).toHaveClass(/is-paper-editor-active/);
  const panel = page.locator(".ls-editor-panel");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { name: "Library" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Stickers" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Elements" })).toBeVisible();
  await panel.getByRole("button", { name: "Layouts" }).click();
  await expect(panel.locator('[data-lib-add="love-note"]')).toBeVisible();
});

test("text is added to the real paper and survives close/reopen", async ({ page }) => {
  await openRealPaper(page);
  const menu = await openEditMenu(page);
  await menu.getByRole("button", { name: "Text" }).click();

  const input = page.locator(".ls-text-input");
  await expect(input).toBeVisible();
  await input.fill("Still the same sheet");
  await page.locator('[data-do="apply-text"]').click();
  await expect(page.locator("#paper-page-content .ls-object-text")).toHaveCount(1);
  await expect(page.locator("#letter-paper")).toHaveCount(1);

  await page.locator(".ls-next-button").click();
  await expect(page.locator("body")).not.toHaveClass(/is-paper-editor-active/);
  await page.locator("#paper-fullscreen-close").click();
  await expect(page.locator("body")).not.toHaveClass(/is-paper-fullscreen/);
  await expect.poll(() =>
    page.locator("#letter-paper").evaluate(node => node.closest("svg")?.id)
  ).toBe("envelope-art");
  await expect(page.locator("#paper-page-content .ls-object-text")).toHaveCount(1);
  await expect(page.locator("#letter-paper")).toHaveCount(1);

  // Reopen the same envelope; no cloned or replacement sheet should be introduced.
  await page.locator("#paper-surface").click();
  await expect(page.locator("body")).toHaveClass(/is-paper-fullscreen/);
  await expect(page.locator("#letter-paper")).toHaveCount(1);
  await expect(page.locator("#paper-page-content .ls-object-text")).toHaveCount(1);
});

test("Add Photo imports a local image into the same paper canvas", async ({ page }) => {
  await openRealPaper(page);
  const menu = await openEditMenu(page);
  await menu.getByRole("button", { name: "Add Photo" }).click();

  await expect(page.locator("body")).toHaveClass(/is-paper-editor-active/);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="16" viewBox="0 0 24 16"><rect width="24" height="16" fill="#c63b3b"/></svg>';
  await page.locator(".ls-file-input").setInputFiles({
    name: "test-photo.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(svg)
  });
  await expect(page.locator("#paper-page-content .ls-object-image")).toHaveCount(1);
  await expect(page.locator("#letter-paper")).toHaveCount(1);
});

test("fullscreen canvas keeps the 16:9 target on desktop and mobile", async ({ page }) => {
  await openRealPaper(page);
  const canvas = page.locator("#paper-page-viewport");
  await expect(canvas).toBeVisible();
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds.width).toBeGreaterThan(0);
  expect(bounds.height).toBeGreaterThan(0);
  expect(Math.abs(bounds.width / bounds.height - 16 / 9)).toBeLessThan(0.04);
});
