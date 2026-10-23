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
  expect(Math.abs(paper.width / paper.height - 2 / 3)).toBeLessThan(0.04);
  expect(Math.abs(paper.width - canvas.width)).toBeLessThan(2);
  expect(Math.abs(paper.height - canvas.height)).toBeLessThan(2);
  expect(Math.abs(paper.x - canvas.x)).toBeLessThan(2);
  expect(Math.abs(paper.y - canvas.y)).toBeLessThan(2);
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
  await expect(panel.locator(".ls-pin-grid")).toHaveAttribute("data-library-kind", "stickers");
  await expect(panel.locator(".ls-pin-card").first().locator(".ls-pin-art")).toBeVisible();
  await panel.getByRole("button", { name: "Layouts" }).click();
  await expect(panel.locator('[data-lib-add="love-note"]')).toBeVisible();
  await expect(panel.locator('[data-lib-add="love-note"]')).toHaveClass(/ls-pin-layout/);
  await expect(panel.locator(".ls-pin-grid")).toHaveCSS("column-count", "2");
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

test("Move and resize match Smart Edit corner-handle behavior", async ({ page }) => {
  await openRealPaper(page);
  await openEditor(page);
  await page.locator('[data-tool="text"]').click();
  await page.locator(".ls-text-input").fill("Move and size me");
  await page.locator('[data-do="apply-text"]').click();

  const object = page.locator(".ls-object-text").first();
  const frame = page.locator(".ls-selection-frame");
  await expect(frame).toBeVisible();
  const handles = frame.locator(".ls-resize-handle");
  await expect(handles).toHaveCount(4);
  for (const corner of ["nw", "ne", "sw", "se"]) {
    await expect(frame.locator('[data-resize-corner="' + corner + '"]')).toBeVisible();
  }

  const beforeMove = await frame.boundingBox();
  const objectBox = await object.boundingBox();
  expect(beforeMove).not.toBeNull();
  expect(objectBox).not.toBeNull();
  await page.mouse.move(objectBox.x + objectBox.width / 2, objectBox.y + objectBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(objectBox.x + objectBox.width / 2 + 24, objectBox.y + objectBox.height / 2 + 18, { steps: 4 });
  await page.mouse.up();
  await expect.poll(async () => {
    const b = await frame.boundingBox();
    return b ? Math.abs(b.x - beforeMove.x) + Math.abs(b.y - beforeMove.y) : 0;
  }).toBeGreaterThan(8);

  const beforeResize = await frame.boundingBox();
  const grip = await frame.locator('[data-resize-corner="se"]').boundingBox();
  expect(beforeResize).not.toBeNull();
  expect(grip).not.toBeNull();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2 + 22, grip.y + grip.height / 2 + 22, { steps: 4 });
  await page.mouse.up();
  await expect.poll(async () => {
    const b = await frame.boundingBox();
    return b ? b.width : 0;
  }).toBeGreaterThan(beforeResize.width + 5);
  await expect(page.locator("#letter-paper")).toHaveCount(1);
  await expect(page.locator("#paper-page-viewport")).toBeVisible();
});

test("layers may extend beyond the canvas but stay clipped to paper bounds", async ({ page }) => {
  await openRealPaper(page);
  await openEditor(page);
  await page.locator('[data-tool="text"]').click();
  await page.locator(".ls-text-input").fill("Clipped at the paper edge");
  await page.locator('[data-do="apply-text"]').click();

  const viewport = page.locator("#paper-page-viewport");
  const object = page.locator(".ls-object-text").first();
  const canvas = await viewport.boundingBox();
  const before = await object.boundingBox();
  expect(canvas).not.toBeNull();
  expect(before).not.toBeNull();

  // Move the text partly beyond the top edge without changing its layer size.
  const startX = before.x + Math.min(16, before.width / 3);
  const startY = before.y + before.height / 2;
  const targetTop = canvas.y - before.height * 0.45;
  const deltaY = targetTop - before.y;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, startY + deltaY, { steps: 8 });
  await page.mouse.up();

  const after = await object.boundingBox();
  expect(after).not.toBeNull();
  expect(after.y).toBeLessThan(canvas.y);
  expect(after.y + after.height).toBeGreaterThan(canvas.y);

  const clipping = await page.locator("#paper-page-content").evaluate(el => {
    const style = getComputedStyle(el);
    return { overflow: style.overflow, clipPath: style.clipPath, contain: style.contain };
  });
  expect(clipping.overflow).toBe("hidden");
  expect(clipping.clipPath).toContain("inset");
  expect(clipping.contain).toContain("paint");
  await expect(viewport).toHaveCSS("overflow", "hidden");

  const hitTest = await page.evaluate(({ x, y, insideY }) => ({
    outside: Boolean(document.elementFromPoint(x, y)?.closest(".ls-object")),
    inside: Boolean(document.elementFromPoint(x, insideY)?.closest(".ls-object"))
  }), {
    x: after.x + 10,
    y: canvas.y - 2,
    insideY: canvas.y + 2
  });
  expect(hitTest.outside).toBe(false);
  expect(hitTest.inside).toBe(true);
  await expect(page.locator("#letter-paper")).toHaveCount(1);
});

test("drawn strokes can be moved after leaving Draw mode", async ({ page }) => {
  await openRealPaper(page);
  await openEditor(page);
  await page.locator('[data-tool="draw"]').click();
  await expect(page.locator("body")).toHaveClass(/is-paper-drawing-mode/);

  const ink = page.locator(".ls-ink-layer");
  let canvas = await ink.boundingBox();
  expect(canvas).not.toBeNull();
  const start = { x: canvas.x + canvas.width * 0.25, y: canvas.y + canvas.height * 0.44 };
  const end = { x: canvas.x + canvas.width * 0.55, y: canvas.y + canvas.height * 0.44 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator(".ls-visible-ink > path")).toHaveCount(1);

  // Done exits freehand drawing and switches the existing stroke into move mode.
  await page.locator('[data-do="next"]').click();
  await expect(page.locator("body")).not.toHaveClass(/is-paper-drawing-mode/);
  const target = page.locator(".ls-ink-move-target").first();
  await expect(target).toBeVisible();
  const before = await page.locator(".ls-visible-ink > path").first().boundingBox();
  const hit = await target.boundingBox();
  expect(before).not.toBeNull();
  expect(hit).not.toBeNull();

  const sx = hit.x + hit.width * 0.5;
  const sy = hit.y + hit.height * 0.5;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 34, sy + 22, { steps: 6 });
  await page.mouse.up();

  const after = await page.locator(".ls-visible-ink > path").first().boundingBox();
  expect(after).not.toBeNull();
  expect(after.x).toBeGreaterThan(before.x + 18);
  expect(after.y).toBeGreaterThan(before.y + 10);
  await expect(page.locator("#paper-page-viewport")).toHaveCSS("overflow", "hidden");
  await expect(page.locator("#letter-paper")).toHaveCount(1);
});

test("Eraser removes existing ink instead of drawing a white layer", async ({ page }) => {
  await openRealPaper(page);
  await openEditor(page);
  await page.locator('[data-tool="draw"]').click();
  await expect(page.locator("body")).toHaveClass(/is-paper-drawing-mode/);

  const ink = page.locator(".ls-ink-layer");
  let canvas = await ink.boundingBox();
  expect(canvas).not.toBeNull();
  const start = { x: canvas.x + canvas.width * 0.18, y: canvas.y + canvas.height * 0.5 };
  const end = { x: canvas.x + canvas.width * 0.82, y: canvas.y + canvas.height * 0.5 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 12 });
  await page.mouse.up();

  const visibleInk = page.locator(".ls-ink-layer > g.ls-visible-ink > path");
  await expect(visibleInk).toHaveCount(1);
  const originalStroke = visibleInk.first();
  await expect(originalStroke).toHaveAttribute("stroke", "#ed1763");

  await page.locator('[data-brush="eraser"]').click();
  canvas = await ink.boundingBox();
  expect(canvas).not.toBeNull();
  // Cross the existing stroke with the eraser, leaving the original artwork
  // node masked rather than adding a white-colored stroke on top of it.
  await page.mouse.move(canvas.x + canvas.width * 0.48, canvas.y + canvas.height * 0.34);
  await page.mouse.down();
  await page.mouse.move(canvas.x + canvas.width * 0.52, canvas.y + canvas.height * 0.66, { steps: 10 });
  await page.mouse.up();

  await expect(visibleInk).toHaveCount(1);
  await expect(visibleInk.first()).toHaveAttribute("mask", /url\(#lettersvg-ink-erase-mask-0\)/);
  const maskId = await visibleInk.first().getAttribute("mask");
  const mask = page.locator(".ls-ink-layer defs mask#" + maskId.match(/#([^)]*)/)[1]);
  await expect(mask.locator('rect[fill="#fff"]')).toHaveCount(1);
  await expect(mask.locator('path[stroke="#000"]')).toHaveCount(1);
  await expect(mask.locator('path[stroke="#000"]')).toHaveAttribute("d", /L/);
  await expect(visibleInk.first()).not.toHaveAttribute("stroke", "#f7f7f7");
  await expect(page.locator("#letter-paper")).toHaveCount(1);
  await expect(page.locator("#paper-page-viewport")).toBeVisible();
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
});

test("fullscreen canvas and outer paper share the same 2:3 bounds", async ({ page }) => {
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
  expect(Math.abs(paper.width / paper.height - 2 / 3)).toBeLessThan(0.04);
  expect(Math.abs(paper.width - bounds.width)).toBeLessThan(2);
  expect(Math.abs(paper.height - bounds.height)).toBeLessThan(2);
  expect(Math.abs(paper.x - bounds.x)).toBeLessThan(2);
  expect(Math.abs(paper.y - bounds.y)).toBeLessThan(2);
});
