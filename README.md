# Lettersvg — Red Envelope

Lettersvg is a responsive, browser-based red envelope with a paper-based photo composition editor.

## Core behavior

- Open the red envelope to reveal the original SVG paper.
- Expand that same paper node into the fullscreen workspace; the editor is embedded in the paper rather than implemented as a second document.
- Use **Edit** to choose **Text**, **Add Photo**, or **Library**.
- Compose with text, device photos, stickers, shapes and premade layouts.
- Use layer ordering, visibility/locking, transform handles, rotation, opacity, duplicate/delete, crop, undo/redo and freehand drawing.
- Keep editor tools at the screen edges and the 16:9 canvas within the available viewport.

The paper and its editor content are kept in the same DOM/SVG structure while moving between envelope and fullscreen states. Do not replace the paper with a second canvas or discard its in-memory content during the close animation.

## Development checks

Requirements: Node.js 22+, Python 3, and npm.

```bash
npm install
npx playwright install chromium
npm test
```

The Playwright suite runs the app as a local static site and checks the fullscreen Edit menu, the three editing entry points, text persistence, paper-node uniqueness, and responsive canvas geometry. GitHub Actions runs the same checks for pull requests and pushes to `main`.

## Source files

- `index.html` — envelope SVG, page layout, fullscreen transition and accessible controls.
- `editor.js` — editing model, layers, crop workflow, drawing, history and tool actions.
- `editor.css` — editor workspace, responsive controls and canvas styling.
- `red-letter.svg` — reusable vector artwork for the red envelope.
