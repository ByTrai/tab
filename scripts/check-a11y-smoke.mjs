/**
 * Lightweight accessibility smoke checks for private-alpha surfaces.
 * Complements the written audit in docs/accessibility/private-alpha-audit.md.
 * Does not replace NVDA/VoiceOver or Lighthouse CI.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

test("landing page exposes skip link and labelled landmarks", async () => {
  const source = await read("src/app/_components/landing-page.tsx");
  assert.match(source, /skip-link/);
  assert.match(source, /href="#main"/);
  assert.match(source, /aria-label="Primary"/);
  assert.match(source, /id="main"/);
  assert.match(source, /aria-labelledby="hero-brand"/);
});

test("workspace app labels search, dialogs, and settings affordances", async () => {
  const source = await read("src/app/_components/workspace-app.tsx");
  assert.match(source, /aria-label="Search workspace"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-labelledby="dialog-title"/);
  assert.match(source, /aria-expanded=\{menuOpen\}/);
  assert.match(source, /aria-pressed=\{kind === value\}/);
});

test("extension new-tab has lang, live status, and labelled search", async () => {
  const html = await read("apps/extension/newtab.html");
  const css = await read("apps/extension/newtab.css");
  assert.match(html, /<html lang="en">/);
  assert.match(html, /role="status"/);
  assert.match(html, /sr-only/);
  assert.match(html, /aria-labelledby="organize-title"/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /\.sr-only/);
});

test("extension popup has lang, heading, and focus-visible styles", async () => {
  const html = await read("apps/extension/popup.html");
  const css = await read("apps/extension/popup.css");
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<h1/);
  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(css, /:focus-visible/);
});

test("design tokens keep skip-link focus treatment", async () => {
  const tokens = await read("src/styles/tokens.css");
  assert.match(tokens, /\.skip-link:focus/);
  const globals = await read("src/styles/globals.css");
  assert.match(globals, /:focus-visible/);
});
