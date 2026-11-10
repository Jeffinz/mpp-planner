// ABOUTME: End-to-end tests for creating and deleting tasks through the real UI.
// ABOUTME: Runs against the Auth and Firestore emulators; see tests/e2e/helpers.js.
import { test, expect } from "@playwright/test";
import { resetEmulators, signInAsOwner } from "./helpers.js";

test.beforeEach(async ({ page }) => {
  // The calendar opens on the current month, so pin the date the tests rely on.
  await page.clock.setFixedTime(new Date("2026-11-10T09:00:00"));
  await resetEmulators();
  await signInAsOwner(page);
});

test("owner adds a task and sees it on the calendar", async ({ page }) => {
  await page.getByRole("button", { name: "เพิ่มงานใหม่" }).click();
  await page.locator("#task-date").fill("02/11/2569"); // a Monday; the default 1st is a Sunday
  await page.locator("#task-project").fill("ตรวจงานสะพาน");
  await page.getByRole("button", { name: "บันทึก" }).click();
  await expect(page.locator("#task-modal")).toBeHidden();
  await expect(page.locator(".calendar .badge", { hasText: "ตรวจงานสะพาน" })).toBeVisible();
});

test("owner deletes a task via custom confirm dialog", async ({ page }) => {
  await page.getByRole("button", { name: "เพิ่มงานใหม่" }).click();
  await page.locator("#task-date").fill("02/11/2569");
  await page.locator("#task-project").fill("งานที่จะลบ");
  await page.getByRole("button", { name: "บันทึก" }).click();
  const badge = page.locator(".calendar .badge", { hasText: "งานที่จะลบ" });
  await badge.click();
  await page.getByRole("button", { name: "ลบงานนี้" }).click();
  // Custom confirm dialog — click the in-page confirm button (not browser's confirm())
  await expect(page.locator("#confirm-modal")).toBeVisible();
  await page.getByRole("button", { name: "ยืนยัน" }).click();
  await expect(badge).toHaveCount(0);
});

test("Escape closes the task modal without saving", async ({ page }) => {
  await page.getByRole("button", { name: "เพิ่มงานใหม่" }).click();
  await expect(page.locator("#task-modal")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#task-modal")).toBeHidden();
});

test("pressing Cancel on confirm dialog aborts the deletion", async ({ page }) => {
  await page.getByRole("button", { name: "เพิ่มงานใหม่" }).click();
  await page.locator("#task-date").fill("02/11/2569");
  await page.locator("#task-project").fill("งานเก็บไว้");
  await page.getByRole("button", { name: "บันทึก" }).click();
  const badge = page.locator(".calendar .badge", { hasText: "งานเก็บไว้" });
  await badge.click();
  await page.getByRole("button", { name: "ลบงานนี้" }).click();
  await page.locator("#confirm-cancel").click(); // the task modal behind has its own ยกเลิก
  await expect(page.locator("#confirm-modal")).toBeHidden();
  await expect(badge).toBeVisible(); // task still there
});
