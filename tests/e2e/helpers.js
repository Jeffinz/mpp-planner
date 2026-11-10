// ABOUTME: Shared e2e setup: reset the emulators, create the owner account, sign in through the UI.
// ABOUTME: The owner uid comes from firestore.rules, the one place it lives.
import { readFileSync } from "node:fs";
import { expect } from "@playwright/test";

const PROJECT = "demo-mpp-planner";
const AUTH = `http://127.0.0.1:4183`;
const FIRESTORE = `http://127.0.0.1:4180`;
const OWNER = readFileSync("firestore.rules", "utf8").match(/request\.auth\.uid == "([^"]+)"/)[1];
const OWNER_EMAIL = "owner@example.com";

async function call(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${url} -> ${res.status} ${await res.text()}`);
  return res;
}

// Wipes both emulators and recreates the owner as a Google-linked account.
export async function resetEmulators() {
  await call(`${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: "DELETE" });
  await call(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });
  await call(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:batchCreate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
    body: JSON.stringify({
      users: [{
        localId: OWNER,
        email: OWNER_EMAIL,
        emailVerified: true,
        displayName: "Owner",
        providerUserInfo: [{ providerId: "google.com", rawId: "owner-google-id", email: OWNER_EMAIL, displayName: "Owner" }],
      }],
    }),
  });
}

// Opens the app against the emulators and signs in as the owner via the emulator's Google popup.
//
// Retries because sign-in through the emulator popup sometimes never completes: the popup
// closes, no error toast shows, and #app stays hidden. It happens at random positions in
// a run, more often after tests that write to Firestore; sign-in alone passed 5/5.
// Cause unconfirmed. Best guess: the SDK's popup-closed check beats the result message and
// app.js signIn() silently ignores auth/popup-closed-by-user, but no capture showed that error.
export async function signInAsOwner(page, attempts = 3) {
  await page.goto("/?emulators");
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (attempt > 1) await page.reload();
    if (await page.locator("#app").isVisible()) return;
    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("button", { name: /เข้าสู่ระบบ/ }).click();
    const popup = await popupPromise;
    await popup.getByText(OWNER_EMAIL).click();
    try {
      await expect(page.locator("#app")).toBeVisible({ timeout: 8000 });
      return;
    } catch (err) {
      if (attempt === attempts) throw err;
    }
  }
}
