// ABOUTME: Checks that every CSS custom property read with var(--x) in css/style.css is defined.
// ABOUTME: An undefined token silently drops its declaration (padding, gap, radius) in the browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync("css/style.css", "utf8");

test("every var(--token) used in style.css is defined", () => {
  const defined = new Set([...css.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]));
  const used = new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));
  const undefinedTokens = [...used].filter((name) => !defined.has(name));
  assert.deepEqual(undefinedTokens, []);
});
