// ABOUTME: End-to-end test that the app shows a loading message until Firestore data arrives.
// ABOUTME: Delays emulator traffic so the loading state is observable.
import { test, expect } from "@playwright/test";
import { resetEmulators, signInAsOwner } from "./helpers.js";

test("shows a loading message until tasks, holidays and workdays have loaded", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-10T09:00:00"));
  await resetEmulators();
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  await page.route("http://127.0.0.1:4180/**", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/?emulators");
  await signInAsOwner(page);

  await expect(page.locator("#loading")).toBeVisible();
  await expect(page.locator("#grid")).toBeHidden();

  release();
  await expect(page.locator("#loading")).toBeHidden();
  await expect(page.locator("#grid .cell").first()).toBeVisible();
});
