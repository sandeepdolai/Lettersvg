const { test, expect } = require("@playwright/test");

async function openRealPaper(page) {
  await page.goto("/");
  const envelope = page.locator("#letter-control");
  const bounds = await envelope.boundingBox();
  expect(bounds).not.toBeNull();
  await envelope.click({ position: { x: bounds.width * 0.5, y: bounds.height * 0.31 } });
  await expect(envelope).toHaveClass(/is-open/);
  await page.locator("#letter-paper").evaluate(el => new Promise(resolve => {
    let timer;
    const finish = event => {
      if (event && (event.target !== el || event.propertyName !== "transform")) return;
      el.removeEventListener("transitionend", finish);
      window.clearTimeout(timer);
      resolve();
    };
    el.addEventListener("transitionend", finish);
    timer = window.setTimeout(() => finish(), 1_500);
  }));
  const visibleSheet = page.locator("#paper-surface");
  const sheetBounds = await visibleSheet.boundingBox();
  expect(sheetBounds).not.toBeNull();
  await visibleSheet.click({ position: { x: sheetBounds.width * 0.5, y: sheetBounds.height * 0.32 } });
  await expect(page.locator("body")).toHaveClass(/is-paper-fullscreen/);
  await expect(page.locator("#letter-paper")).toHaveCount(1);
  await expect.poll(async () => {
    const canvas = await page.locator("#paper-page-viewport").boundingBox();
    return canvas ? Math.abs(canvas.width / canvas.height - 2 / 3) : 1;
  }, { timeout: 7_000 }).toBeLessThan(0.04);
  const paper = await page.locator("#paper-surface").boundingBox();
  const canvas = await page.locator("#paper-page-viewport").boundingBox();
  expect(paper).not.toBeNull();
  expect(canvas).not.toBeNull();
  expect(Math.abs(paper.width / paper.height - 16 / 9)).toBeLessThan(0.04);
  expect(Math.abs(paper.width / paper.height - canvas.width / canvas.height)).toBeGreaterThan(0.5);
}

async function openEditor(page) {
  await expect(page.locator("#paper-fullscreen-edit")).toBeVisible();
  await page.locator("#paper-fullscreen-edit").click();
  await expect(page.locator("body")).toHaveClass(/is-paper-editor-active/);
  await expect(page.locator(".ls-editor-shell")).toHaveClass(/is-active/);
}

async function openLibrary(page) {
  await page.locator('[data-do="more"]').click();
  const menu = page.locator(".ls-more-menu");
  await expect(menu).toHaveClass(/is-open/);
  await menu.locator('[data-do="library"]').click();
  const panel = page.locator(".ls-editor-panel");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { name: "Library" })).toBeVisible();
  return panel;
}

test.beforeEach(async ({ page }) => {
  page.pageErrors = [];
  page.on("pageerror", error => page.pageErrors.push(error.message));
});

test.afterEach(async ({ page }) => {
  expect(page.pageErrors, "the page should not throw JavaScript errors").toEqual([]);
});

test("the single fullscreen Edit button opens the existing editor directly", async ({ page }) => {
  await openRealPaper(page);
  await openEditor(page);
  await expect(page.locator("#paper-fullscreen-text")).toHaveCount(0);
  await expect(page.locator(".ls-editor-topbar")).toBeVisible();
  await expect(page.locator(".ls-editor-dock")).toBeVisible();
  await expect(page.locator('[data-tool="text"]')).toBeVisible();
  await expect(page.locator('[data-tool="photo"]')).toBeVisible();
  await expect(page.locator('[data-tool="draw"]')).toBeVisible();
});

test("text is added to the real paper and survives close/reopen", async ({ page }) => {
  await openRealPaper(page);
  await openEditor(page);
  await page.locator('[data-tool="text"]').click();
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
  await expect.poll(() => page.locator("#letter-paper").evaluate(node => node.closest("svg")?.id)).toBe("envelope-art");
  await expect(page.locator("#letter-paper")).not.toHaveClass(/is-in-fullscreen/);
  await expect(page.locator("#paper-page-content .ls-object-text")).toHaveCount(1);
  await expect(page.locator("#letter-paper")).toHaveCount(1);

  const reopenedSheet = page.locator("#paper-surface");
  const reopenedBounds = await reopenedSheet.boundingBox();
  expect(reopenedBounds).not.toBeNull();
  await reopenedSheet.click({ position: { x: reopenedBounds.width * 0.5, y: reopenedBounds.height * 0.32 } });
  await expect(page.locator("body")).toHaveClass(/is-paper-fullscreen/);
  await expect(page.locator("#letter-paper")).toHaveCount(1);
  await expect(page.locator("#paper-page-content .ls-object-text")).toHaveCount(1);
});

test("Add Photo imports a local image into the same paper canvas", async ({ page }) => {
  await openRealPaper(page);
  await openEditor(page);
  await page.locator('[data-tool="photo"]').click();
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="16" viewBox="0 0 24 16"><rect width="24" height="16" fill="#c63b3b"/></svg>';
  await page.locator(".ls-file-input").setInputFiles({
    name: "test-photo.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(svg)
  });
  await expect(page.locator("#paper-page-content .ls-object-image")).toHaveCount(1);
  await expect(page.locator("#letter-paper")).toHaveCount(1);
});

test("the Library remains available through the existing More menu", async ({ page }) => {
  await openRealPaper(page);
  await openEditor(page);
  const panel = await openLibrary(page);
  await expect(panel.getByRole("button", { name: "Stickers" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Elements" })).toBeVisible();
  await panel.getByRole("button", { name: "Layouts" }).click();
  await expect(panel.locator('[data-lib-add="love-note"]')).toBeVisible();
});

test("Draw mode uses the bounded paper viewport and records a stroke", async ({ page }) => {
  await openRealPaper(page);
  await openEditor(page);
  await page.locator('[data-tool="draw"]').click();
  await expect(page.locator("body")).toHaveClass(/is-paper-drawing-mode/);
  const viewport = page.locator("#paper-page-viewport");
  await expect(viewport).toHaveCSS("overflow", "hidden");
  expect(await viewport.evaluate(el => getComputedStyle(el).backgroundImage)).toContain("radial-gradient");
  const canvas = await page.locator(".ls-ink-layer").boundingBox();
  expect(canvas).not.toBeNull();
  await page.mouse.move(canvas.x + canvas.width * 0.2, canvas.y + canvas.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(canvas.x + canvas.width * 0.8, canvas.y + canvas.height * 0.5, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator(".ls-ink-layer path")).toHaveCount(1);
  await expect(page.locator("#letter-paper")).toHaveCount(1);
});

test("the visible editing canvas fills its own centered 2:3 surface", async ({ page }) => {
  await openRealPaper(page);
  await openEditor(page);
  const canvas = page.locator("#paper-page-viewport");
  const content = page.locator("#paper-page-content");
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  expect(Math.abs(bounds.width / bounds.height - 2 / 3)).toBeLessThan(0.04);
  const background = await content.evaluate(el => {
    const style = getComputedStyle(el, "::before");
    return { top: style.top, right: style.right, bottom: style.bottom, left: style.left, width: style.width, height: style.height };
  });
  expect(background.top).toBe("0px");
  expect(background.right).toBe("0px");
  expect(background.bottom).toBe("0px");
  expect(background.left).toBe("0px");
  const contentBounds = await content.boundingBox();
  expect(contentBounds).not.toBeNull();
  expect(Math.abs(contentBounds.width / contentBounds.height - 2 / 3)).toBeLessThan(0.04);
  const hint = await page.locator(".ls-canvas-hint").boundingBox();
  expect(hint).not.toBeNull();
  expect(hint.width).toBeLessThan(bounds.width * 0.55);
  expect(hint.height).toBeLessThan(bounds.height * 0.6);
});

test("fullscreen canvas is 2:3 while the outer paper remains 16:9", async ({ page }) => {
  await openRealPaper(page);
  const canvas = page.locator("#paper-page-viewport");
  await expect(canvas).toBeVisible();
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds.width).toBeGreaterThan(0);
  expect(bounds.height).toBeGreaterThan(0);
  expect(Math.abs(bounds.width / bounds.height - 2 / 3)).toBeLessThan(0.04);
  const paper = await page.locator("#paper-surface").boundingBox();
  expect(paper).not.toBeNull();
  expect(Math.abs(paper.width / paper.height - 16 / 9)).toBeLessThan(0.04);
  expect(Math.abs(paper.width / paper.height - bounds.width / bounds.height)).toBeGreaterThan(0.5);
});
